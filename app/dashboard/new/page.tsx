"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/Header";
import { CATEGORIES, CategoryId } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { RequireAuth } from "@/components/RequireAuth";

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
  const [story, setStory] = useState("");
  const [category, setCategory] = useState<CategoryId>("weight");
  const [direction, setDirection] = useState<"increase" | "decrease">("decrease");
  const [unit, setUnit] = useState("kg");
  const [startValue, setStartValue] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
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
    if (step === 2) {
      const s = parseFloat(startValue);
      const t = parseFloat(targetValue);
      if (!Number.isFinite(s) || !Number.isFinite(t)) return false;
      if (s === t) return false;
      if (direction === "decrease" ? t >= s : t <= s) return false;
      return true;
    }
    if (step === 3) {
      return new Date(targetDate).getTime() > Date.now();
    }
    return true;
  };

  const onSubmit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { goalId } = await create({
        title: title.trim(),
        story: story.trim() || undefined,
        category,
        unit: unit.trim() || "units",
        startValue: parseFloat(startValue),
        targetValue: parseFloat(targetValue),
        direction,
        targetDate: new Date(targetDate).getTime(),
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
            <Step title="What's the goal?">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lose 20kg by summer"
                autoFocus
                className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-4 py-3 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Why does this matter? (optional)"
                rows={3}
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
            <Step title="What's the start and target?">
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
            </Step>
          )}

          {step === 3 && (
            <Step title="When's the target date?">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-4 py-3 text-base text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                We'll show a countdown on the public page and award you badges as you pass 25,
                50, 75, and 100%.
              </p>
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
          {step < 3 ? (
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
              {busy ? "Creating..." : "Create goal"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  const labels = ["Title", "Category", "Numbers", "Date"];
  return (
    <div className="flex items-center gap-2">
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
              className={`h-px w-6 sm:w-10 ${
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
