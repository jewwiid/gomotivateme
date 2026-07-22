"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Heart,
  Sparkles,
  Lightbulb,
  Calendar,
  Users,
  Lock,
  Globe,
} from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/Header";
import { CATEGORIES, CategoryId } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { RequireAuth } from "@/components/RequireAuth";

const PROGRESS_TEMPLATES = [
  {
    id: "number" as const,
    label: "Number target",
    description: "Hit a specific number — kg, books, miles, days, dollars.",
    icon: "📊",
  },
  {
    id: "streak" as const,
    label: "Daily streak",
    description: "Show up every day and watch the count climb.",
    icon: "🔥",
  },
  {
    id: "milestones" as const,
    label: "Milestone checklist",
    description: "Tick off a series of named steps — research, draft, publish, etc.",
    icon: "✅",
  },
];

const SUPPORT_OPTIONS = [
  { id: "encourage" as const, label: "Encouragement", icon: Heart, desc: "Cheer me on" },
  { id: "experience" as const, label: "Shared experience", icon: Sparkles, desc: "You've done this" },
  { id: "advice" as const, label: "Practical advice", icon: Lightbulb, desc: "Tips and resources" },
  { id: "checkin" as const, label: "Regular check-ins", icon: Calendar, desc: "Keep me accountable" },
  { id: "join" as const, label: "Join me", icon: Users, desc: "Do it together" },
];

export default function NewGoalPage() {
  return (
    <RequireAuth>
      <NewGoalContent />
    </RequireAuth>
  );
}

function NewGoalContent() {
  const router = useRouter();
  const create = useMutation(api.goals.create);

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [story, setStory] = useState("");
  const [category, setCategory] = useState<CategoryId>("creative");
  const [progressType, setProgressType] = useState<"number" | "streak" | "milestones">("number");
  const [direction, setDirection] = useState<"increase" | "decrease">("decrease");
  const [unit, setUnit] = useState("kg");
  const [startValue, setStartValue] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [milestones, setMilestones] = useState<Array<{ id: string; title: string }>>(() => [
    { id: "m1", title: "Research" },
    { id: "m2", title: "Plan" },
    { id: "m3", title: "Execute" },
    { id: "m4", title: "Complete" },
  ]);
  const [supporterTarget, setSupporterTarget] = useState("");
  const [supportTypes, setSupportTypes] = useState<string[]>(["encourage", "checkin"]);
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onCategoryChange = (id: CategoryId) => {
    setCategory(id);
    const c = CATEGORIES.find((x) => x.id === id)!;
    setDirection(c.defaultDirection);
    setUnit(c.hint.split(" ")[0]);
  };

  const canAdvance = () => {
    if (step === 0) return title.trim().length > 0;
    if (step === 1) return true; // category has a default
    if (step === 2) return true; // progress type has a default
    if (step === 3) {
      if (progressType === "number") {
        const s = parseFloat(startValue);
        const t = parseFloat(targetValue);
        if (!Number.isFinite(s) || !Number.isFinite(t)) return false;
        if (s === t) return false;
        if (direction === "decrease" ? t >= s : t <= s) return false;
      }
      if (progressType === "streak") {
        const t = parseInt(targetValue, 10);
        if (!Number.isFinite(t) || t <= 0) return false;
      }
      if (progressType === "milestones") {
        return milestones.some((m) => m.title.trim().length > 0);
      }
      return true;
    }
    if (step === 4) {
      return new Date(targetDate).getTime() > Date.now();
    }
    if (step === 5) {
      return supportTypes.length > 0;
    }
    return true;
  };

  const onSubmit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const start =
        progressType === "streak" ? 0 : parseFloat(startValue);
      const target =
        progressType === "streak"
          ? parseInt(targetValue, 10)
          : progressType === "milestones"
          ? milestones.length
          : parseFloat(targetValue);
      const { goalId } = await create({
        title: title.trim(),
        summary: summary.trim() || undefined,
        story: story.trim() || undefined,
        category,
        unit:
          progressType === "milestones"
            ? "milestones"
            : progressType === "streak"
            ? "days"
            : unit.trim() || "units",
        progressType,
        startValue: start,
        targetValue: target,
        direction: progressType === "milestones" ? "increase" : direction,
        targetDate: new Date(targetDate).getTime(),
        milestones: progressType === "milestones" ? milestones : undefined,
        supporterTarget: supporterTarget
          ? parseInt(supporterTarget, 10)
          : undefined,
        supportTypes,
        visibility,
      });
      router.push(`/dashboard/${goalId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create goal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
        >
          <ArrowLeft size={14} />
          Back to goals
        </Link>

        <StepIndicator step={step} />

        <div className="mt-8">
          {step === 0 && (
            <Step title="What are you trying to achieve?">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Write my first novel"
                autoFocus
                className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-4 py-3 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="One-line pitch (optional)"
                className="mt-3 w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Why does this matter? (optional — can edit later)"
                rows={4}
                className="mt-3 w-full resize-none rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
              />
            </Step>
          )}

          {step === 1 && (
            <Step title="Pick a category">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onCategoryChange(c.id)}
                    className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition ${
                      category === c.id
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                        : "border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    <CategoryIcon
                      category={c.id}
                      size={18}
                      className={
                        category === c.id
                          ? "text-[var(--color-accent)]"
                          : "text-[var(--color-text-muted)]"
                      }
                    />
                    <div>
                      <div className="text-sm font-medium">{c.label}</div>
                      <div className="text-xs text-[var(--color-text-dim)]">{c.hint}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Step>
          )}

          {step === 2 && (
            <Step title="How will you measure progress?">
              <div className="space-y-2">
                {PROGRESS_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setProgressType(t.id);
                      if (t.id === "streak") {
                        setDirection("increase");
                        setUnit("days");
                      }
                      if (t.id === "milestones") {
                        setDirection("increase");
                      }
                    }}
                    className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                      progressType === t.id
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                        : "border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    <span className="text-2xl leading-none">{t.icon}</span>
                    <div>
                      <div className="text-sm font-semibold">{t.label}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">{t.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step title="Set your numbers">
              {progressType === "number" && (
                <>
                  <div className="mb-3 flex gap-2">
                    <DirectionToggle value={direction} onChange={setDirection} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Start value"
                      value={startValue}
                      onChange={setStartValue}
                      type="number"
                      step="any"
                    />
                    <Field
                      label="Target value"
                      value={targetValue}
                      onChange={setTargetValue}
                      type="number"
                      step="any"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="kg, lbs, miles, books..."
                      className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
                    />
                  </div>
                </>
              )}
              {progressType === "streak" && (
                <Field
                  label="How many days?"
                  value={targetValue}
                  onChange={setTargetValue}
                  type="number"
                  step="1"
                />
              )}
              {progressType === "milestones" && (
                <div>
                  <p className="mb-3 text-sm text-[var(--color-text-muted)]">
                    List the steps. You'll check them off as you go.
                  </p>
                  <div className="space-y-2">
                    {milestones.map((m, i) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <span className="w-6 text-center text-xs text-[var(--color-text-dim)]">{i + 1}</span>
                        <input
                          value={m.title}
                          onChange={(e) => {
                            const v = e.target.value;
                            setMilestones((arr) =>
                              arr.map((x) => (x.id === m.id ? { ...x, title: v } : x))
                            );
                          }}
                          className="flex-1 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setMilestones((arr) => arr.filter((_, idx) => idx !== i))}
                          disabled={milestones.length <= 1}
                          className="rounded-md p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-danger)] disabled:opacity-30"
                          aria-label="Remove milestone"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setMilestones((arr) => [
                          ...arr,
                          { id: `m${arr.length + 1}_${Date.now()}`, title: "" },
                        ])
                      }
                      className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                      <Plus size={12} />
                      Add milestone
                    </button>
                  </div>
                </div>
              )}
            </Step>
          )}

          {step === 4 && (
            <Step title="When's the target date?">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-4 py-3 text-base text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                We'll show a countdown and award badges as you pass 25, 50, 75, and 100%.
              </p>
            </Step>
          )}

          {step === 5 && (
            <Step title="What kind of support would help?">
              <p className="mb-4 text-sm text-[var(--color-text-muted)]">
                Pick the kinds of help you want. Supporters will see these when they open your page.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SUPPORT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = supportTypes.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSupportTypes((arr) =>
                          active ? arr.filter((x) => x !== opt.id) : [...arr, opt.id]
                        );
                      }}
                      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                          : "border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-strong)]"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          active ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)]" : "bg-[var(--color-bg-elev)] text-[var(--color-text-muted)]"
                        }`}
                      >
                        <Icon size={14} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{opt.label}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5">
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
                  How many supporters are you hoping for? <span className="text-[var(--color-text-dim)]">(optional)</span>
                </label>
                <input
                  type="number"
                  value={supporterTarget}
                  onChange={(e) => setSupporterTarget(e.target.value)}
                  placeholder="e.g. 50"
                  min={0}
                  className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
                />
                <p className="mt-1.5 text-xs text-[var(--color-text-dim)]">
                  Shown alongside your goal progress. We hide the target until your first 3 supporters join, so new visitors don't see "0 of 50."
                </p>
              </div>
            </Step>
          )}

          {step === 6 && (
            <Step title="Who's this visible to?">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                    visibility === "public"
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                      : "border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <Globe
                    size={20}
                    className={visibility === "public" ? "mt-0.5 text-[var(--color-accent)]" : "mt-0.5 text-[var(--color-text-muted)]"}
                  />
                  <div>
                    <div className="text-sm font-semibold">Public</div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Indexed in the homepage feed. Anyone can find and support you.
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("unlisted")}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                    visibility === "unlisted"
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                      : "border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <Lock
                    size={20}
                    className={visibility === "unlisted" ? "mt-0.5 text-[var(--color-accent)]" : "mt-0.5 text-[var(--color-text-muted)]"}
                  />
                  <div>
                    <div className="text-sm font-semibold">Unlisted</div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Only people with the link can see it. Not in the discovery feed.
                    </div>
                  </div>
                </button>
              </div>
            </Step>
          )}
        </div>

        {err && <p className="mt-4 text-sm text-[var(--color-danger)]">{err}</p>}

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-lg px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-30"
          >
            Back
          </button>
          {step < 6 ? (
            <button
              type="button"
              onClick={() => canAdvance() && setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
            >
              Next
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canAdvance() || busy}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
            >
              {busy ? "Creating..." : "Create campaign"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  const labels = ["Title", "Category", "Type", "Numbers", "Date", "Support", "Visibility"];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
              i < step
                ? "bg-[var(--color-accent)] text-black"
                : i === step
                ? "border border-[var(--color-accent)] text-[var(--color-accent)]"
                : "border border-[var(--color-border)] text-[var(--color-text-dim)]"
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`text-xs ${
              i === step ? "text-[var(--color-text)]" : "text-[var(--color-text-dim)]"
            }`}
          >
            {l}
          </span>
          {i < labels.length - 1 && (
            <div
              className={`h-px w-4 sm:w-6 ${
                i < step ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      key={title}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </motion.div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={step}
        className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
      />
    </div>
  );
}

function DirectionToggle({
  value,
  onChange,
}: {
  value: "increase" | "decrease";
  onChange: (v: "increase" | "decrease") => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] p-0.5">
      {(["decrease", "increase"] as const).map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            value === d
              ? "bg-[var(--color-accent)] text-black"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          {d === "decrease" ? "↓ decrease" : "↑ increase"}
        </button>
      ))}
    </div>
  );
}
