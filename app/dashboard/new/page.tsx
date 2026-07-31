"use client";

import { useAction, useMutation } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
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
  ImagePlus,
  ChevronRight,
  BarChart3,
  Flame,
  ListChecks,
} from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CATEGORIES, CategoryId, getCategory, getDefaultMilestones } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { RequireAuth } from "@/components/RequireAuth";
import { Wordmark } from "@/components/Wordmark";
import {
  AiAssistButton,
  AiDraftCard,
  AiDraftDisclosure,
} from "@/components/AiAssist";
import {
  aiAssistantErrorMessage,
  type AiDraft,
  type AiSuggestion,
  type AiTask,
} from "@/lib/aiAssistant";

const WIZARD_COPY = [
  {
    title: "What's your goal about?",
    detail: "A clear category helps people understand what you're working toward.",
  },
  {
    title: "Let's set up your goal",
    detail: "We'll guide you through the essentials, then help you invite the right people in.",
  },
  {
    title: "Choose your progress style",
    detail: "Pick a way of measuring that makes progress visible.",
  },
  {
    title: "Set a target that matters",
    detail: "Make the destination clear. You can always adjust the details later.",
  },
  {
    title: "Add a horizon if it helps",
    detail: "A target date is optional. Add one for a time-bound goal, or leave it open-ended.",
  },
  {
    title: "Tell people why it matters",
    detail: "A few words help your circle understand why this goal matters.",
  },
  {
    title: "Tell people how to help",
    detail: "Choose the kind of support that would make the biggest difference.",
  },
  {
    title: "Decide who can see it",
    detail: "Keep it public for discovery, or share it only with people you choose.",
  },
  {
    title: "Review your goal",
    detail: "Take a final look before you bring your circle together.",
  },
];

const PROGRESS_WIDTHS = ["w-[11.111%]", "w-[22.222%]", "w-1/3", "w-[44.444%]", "w-[55.555%]", "w-2/3", "w-[77.777%]", "w-[88.888%]", "w-full"];

const PROGRESS_TEMPLATES = [
  {
    id: "number" as const,
    label: "Number target",
    description: "Hit a specific number: kg, books, miles, days, dollars.",
    icon: BarChart3,
  },
  {
    id: "streak" as const,
    label: "Daily streak",
    description: "Show up every day and watch the count climb.",
    icon: Flame,
  },
  {
    id: "milestones" as const,
    label: "Milestone checklist",
    description: "Tick off a series of named steps: research, draft, publish, etc.",
    icon: ListChecks,
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
  const searchParams = useSearchParams();
  const showDesignPreview =
    process.env.NODE_ENV !== "production" &&
    searchParams.get("designPreview") === "1";

  if (showDesignPreview) {
    return <NewGoalContent designPreview />;
  }

  return (
    <RequireAuth>
      <NewGoalContent />
    </RequireAuth>
  );
}

function NewGoalContent({ designPreview = false }: { designPreview?: boolean }) {
  const router = useRouter();
  const create = useMutation(api.goals.create);
  const generateUploadUrl = useMutation(api.updates.generateUploadUrl);
  const suggest = useAction(api.aiAssistant.suggest);

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [story, setStory] = useState("");
  const [category, setCategory] = useState<CategoryId>("creative");
  const [progressType, setProgressType] = useState<"number" | "streak" | "milestones">("number");
  const [direction, setDirection] = useState<"increase" | "decrease">("increase");
  const [unit, setUnit] = useState("pages");
  const [startValue, setStartValue] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [milestones, setMilestones] = useState<Array<{ id: string; title: string }>>(() =>
    getDefaultMilestones("creative")
  );
  const [supporterTarget, setSupporterTarget] = useState("");
  const [supportTypes, setSupportTypes] = useState<string[]>(["encourage", "checkin"]);
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<AiTask | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [aiError, setAiError] = useState<{
    task: AiTask;
    message: string;
  } | null>(null);

  const requestAiSuggestion = async (task: AiTask) => {
    setAiBusy(task);
    setAiSuggestion(null);
    setAiError(null);

    if (designPreview) {
      const preview: AiSuggestion = {
        task,
        title: task === "shapeGoal" ? "Finish my first short film" : null,
        summary:
          task === "shapeGoal"
            ? "Turn my draft into a finished short film and share it with an audience."
            : null,
        story:
          task === "draftStory"
            ? "I have carried this story for a long time. Finishing the film would turn that idea into something real, and encouragement along the way would help me keep moving."
            : null,
        milestones:
          task === "suggestMilestones"
            ? [
                "Lock the final script",
                "Plan the shoot",
                "Film the key scenes",
                "Complete the edit",
                "Host a first screening",
              ]
            : [],
        updateText: null,
        rationale:
          "This keeps your original meaning while making the next step easier to understand.",
      };
      setAiSuggestion(preview);
      setAiBusy(null);
      return;
    }

    const draft: AiDraft = {
      category,
      progressType,
      direction,
    };
    if (title.trim()) draft.title = title.trim();
    if (summary.trim()) draft.summary = summary.trim();
    if (story.trim()) draft.story = story.trim();
    if (unit.trim()) draft.unit = unit.trim();

    const start = Number(startValue);
    const target = Number(targetValue);
    if (Number.isFinite(start) && startValue.trim()) draft.startValue = start;
    if (Number.isFinite(target) && targetValue.trim()) draft.targetValue = target;

    const milestoneTitles = milestones
      .map((milestone) => milestone.title.trim())
      .filter(Boolean);
    if (milestoneTitles.length) draft.milestones = milestoneTitles;

    try {
      const result = await suggest({ task, draft });
      setAiSuggestion(result);
    } catch (error) {
      setAiError({ task, message: aiAssistantErrorMessage(error) });
    } finally {
      setAiBusy(null);
    }
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    if (aiSuggestion.task === "shapeGoal") {
      if (aiSuggestion.title) setTitle(aiSuggestion.title);
      if (aiSuggestion.summary) setSummary(aiSuggestion.summary);
    }
    if (
      aiSuggestion.task === "suggestMilestones" &&
      aiSuggestion.milestones.length
    ) {
      setMilestones(
        aiSuggestion.milestones.map((milestone, index) => ({
          id: `ai_${Date.now()}_${index}`,
          title: milestone,
        }))
      );
    }
    if (aiSuggestion.task === "draftStory" && aiSuggestion.story) {
      setStory(aiSuggestion.story);
    }
    setAiSuggestion(null);
    setAiError(null);
  };

  const onCategoryChange = (id: CategoryId) => {
    setCategory(id);
    const c = CATEGORIES.find((x) => x.id === id)!;
    setDirection(c.defaultDirection);
    setUnit(c.unitOptions[0] ?? "units");
    // Pre-select the category's preferred progress type.
    if (c.defaultProgressType !== progressType) {
      setProgressType(c.defaultProgressType);
      // Update milestone defaults when switching to milestones.
      if (c.defaultProgressType === "milestones") {
        setMilestones(getDefaultMilestones(id));
      }
    }
  };

  const canAdvance = () => {
    if (step === 0) return true; // category has a default
    if (step === 1) return title.trim().length > 0;
    if (step === 2) return true; // progress type has a default
    if (step === 3) {
      if (progressType === "number") {
        const s = parseFloat(startValue);
        const t = parseFloat(targetValue);
        if (!Number.isFinite(s) || !Number.isFinite(t)) return false;
        if (s === t) return false;
        if (direction === "decrease" ? t >= s : t <= s) return false;
        if (!unit.trim()) return false;
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
      return !targetDate || new Date(`${targetDate}T12:00:00`).getTime() > Date.now();
    }
    if (step === 6) {
      return supportTypes.length > 0;
    }
    return true;
  };

  /** Human-readable validation message for the current step (empty = OK). */
  const stepError = (): string | null => {
    if (step === 1 && title.trim().length === 0) return "Enter a title to continue";
    if (step === 3) {
      if (progressType === "number") {
        const s = parseFloat(startValue);
        const t = parseFloat(targetValue);
        if (!Number.isFinite(s)) return "Enter a starting value";
        if (!Number.isFinite(t)) return "Enter a target value";
        if (s === t) return "Target must be different from your starting value";
        if (direction === "decrease" ? t >= s : t <= s)
          return direction === "decrease"
            ? "Target should be lower than your starting value"
            : "Target should be higher than your starting value";
      }
      if (progressType === "streak") {
        const t = parseInt(targetValue, 10);
        if (!Number.isFinite(t) || t <= 0) return "Enter how many days you're aiming for";
      }
      if (progressType === "milestones") {
        if (!milestones.some((m) => m.title.trim().length > 0))
          return "Add at least one milestone";
      }
    }
    if (
      step === 4 &&
      targetDate &&
      new Date(`${targetDate}T12:00:00`).getTime() <= Date.now()
    )
      return "Pick a date in the future";
    return null;
  };

  const totalSteps = WIZARD_COPY.length;
  const stepCopy = WIZARD_COPY[step];

  const onSubmit = async () => {
    setBusy(true);
    setErr(null);
    try {
      let coverImageId: Id<"_storage"> | undefined;
      if (coverFile) {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": coverFile.type },
          body: coverFile,
        });
        if (!response.ok) throw new Error("Could not upload cover photo");
        const uploaded = (await response.json()) as { storageId: Id<"_storage"> };
        coverImageId = uploaded.storageId;
      }
      const start =
        progressType === "streak" || progressType === "milestones"
          ? 0
          : parseFloat(startValue);
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
        targetDate: targetDate
          ? new Date(`${targetDate}T12:00:00`).getTime()
          : undefined,
        milestones: progressType === "milestones" ? milestones : undefined,
        supporterTarget: supporterTarget
          ? parseInt(supporterTarget, 10)
          : undefined,
        supportTypes,
        visibility,
        isAnonymous,
        coverImageId,
      });
      router.push(`/dashboard/${goalId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create goal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--color-bg-elev)] text-[var(--color-text)] lg:grid lg:grid-cols-[minmax(20rem,33%)_1fr]">
      <aside className="hidden min-h-dvh flex-col justify-between px-14 py-12 lg:flex xl:px-20">
        <Wordmark href="/dashboard" size="xl" />
        <div className="max-w-xs pb-16">
          <p className="text-sm font-semibold text-[var(--color-primary)]">Step {step + 1} of {totalSteps}</p>
          <h1 className="mt-5 title-hero">{stepCopy.title}</h1>
          <p className="mt-8 text-base leading-7 text-[var(--color-text-secondary)]">{stepCopy.detail}</p>
        </div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-primary)]">
          <ArrowLeft size={15} /> Leave setup
        </Link>
      </aside>

      <section className="flow-form flex min-h-dvh flex-col rounded-tl-[0] bg-white lg:rounded-tl-[4rem]">
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-5 py-5 lg:hidden">
          <Wordmark href="/dashboard" size="md" />
          <span className="text-xs font-semibold text-[var(--color-primary)]">{step + 1} / {totalSteps}</span>
        </div>
        <div className="flex-1 px-5 pb-10 pt-10 sm:px-12 sm:pt-16 lg:px-[10vw] lg:pt-28">
          <div className="mx-auto w-full max-w-[42rem]">
          {step === 0 && (
            <Step title="Pick a category">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onCategoryChange(c.id)}
                    className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition ${
                      category === c.id
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                        : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]"
                    }`}
                  >
                    <CategoryIcon
                      category={c.id}
                      size={18}
                      className={
                        category === c.id
                          ? "text-[var(--color-primary)]"
                          : "text-[var(--color-text-muted)]"
                      }
                    />
                    <div>
                      <div className="text-sm font-medium">{c.label}</div>
                      {c.hint && <div className="text-xs text-[var(--color-text-dim)]">{c.hint}</div>}
                    </div>
                  </button>
                ))}
              </div>
            </Step>
          )}

          {step === 1 && (
            <Step title="What are you trying to achieve?">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
                  Goal title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder={getCategory(category).titlePlaceholder ?? "e.g. Write my first novel"}
                  autoFocus
                  className="w-full rounded-xl border border-[var(--color-border-strong)] bg-white px-4 py-3.5 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
                  Summary <span className="font-normal text-[var(--color-text-dim)]">(optional)</span>
                </label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  maxLength={280}
                  placeholder={getCategory(category).summaryPlaceholder ?? "e.g. One-line summary"}
                  className="w-full rounded-xl border border-[var(--color-border-strong)] bg-white px-4 py-3.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
              <div className="mt-5 border-t border-[var(--color-border-subtle)] pt-5">
                <AiAssistButton
                  label="Help me shape this"
                  busyLabel="Shaping your goal…"
                  busy={aiBusy === "shapeGoal"}
                  disabled={
                    aiBusy !== null ||
                    (!title.trim() && !summary.trim())
                  }
                  onClick={() => requestAiSuggestion("shapeGoal")}
                />
                <AiDraftDisclosure />
                {aiError?.task === "shapeGoal" ? (
                  <p className="mt-3 text-sm text-[var(--color-danger)]">
                    {aiError.message}
                  </p>
                ) : null}
                {aiSuggestion?.task === "shapeGoal" ? (
                  <AiDraftCard
                    rationale={aiSuggestion.rationale}
                    onApply={applyAiSuggestion}
                    onDismiss={() => setAiSuggestion(null)}
                    applyLabel="Use title and summary"
                  >
                    {aiSuggestion.title ? (
                      <p className="font-semibold">{aiSuggestion.title}</p>
                    ) : null}
                    {aiSuggestion.summary ? (
                      <p className="mt-1 text-[var(--color-text-secondary)]">
                        {aiSuggestion.summary}
                      </p>
                    ) : null}
                  </AiDraftCard>
                ) : null}
              </div>
            </Step>
          )}

          {step === 2 && (
            <Step title="How will you measure progress?">
              <div className="space-y-2">
                {PROGRESS_TEMPLATES.map((t) => {
                  const Icon = t.icon;
                  return (
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
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                          : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          progressType === t.id
                            ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                            : "bg-[var(--color-bg-elev)] text-[var(--color-text-muted)]"
                        }`}
                      >
                        <Icon size={19} aria-hidden />
                      </span>
                      <div>
                        <div className="text-sm font-semibold">{t.label}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{t.description}</div>
                      </div>
                    </button>
                  );
                })}
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
                    <select
                      value={
                        getCategory(category).unitOptions.includes(unit)
                          ? unit
                          : "__custom"
                      }
                      onChange={(e) => {
                        if (e.target.value === "__custom") {
                          setUnit("");
                        } else {
                          setUnit(e.target.value);
                        }
                      }}
                      className="w-full rounded-xl border border-[var(--color-border-strong)] bg-white px-3 py-3 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
                    >
                      {getCategory(category).unitOptions.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                      {!getCategory(category).unitOptions.includes(unit) && unit && (
                        <option value="__custom">{unit} (custom)</option>
                      )}
                      <option value="__custom">Custom…</option>
                    </select>
                    {!getCategory(category).unitOptions.includes(unit) && (
                      <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="Type your unit…"
                        autoFocus
                        className="mt-2 w-full rounded-xl border border-[var(--color-border-strong)] bg-white px-3 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-primary)] focus:outline-none"
                      />
                    )}
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
                          maxLength={120}
                          className="flex-1 rounded-xl border border-[var(--color-border-strong)] bg-white px-3 py-2.5 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
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
                      disabled={milestones.length >= 8}
                      className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                      <Plus size={12} />
                      Add milestone
                    </button>
                  </div>
                  <div className="mt-5 border-t border-[var(--color-border-subtle)] pt-5">
                    <AiAssistButton
                      label="Suggest milestones"
                      busyLabel="Planning steps…"
                      busy={aiBusy === "suggestMilestones"}
                      disabled={
                        aiBusy !== null ||
                        (!title.trim() && !summary.trim())
                      }
                      onClick={() => requestAiSuggestion("suggestMilestones")}
                    />
                    <AiDraftDisclosure />
                    {aiError?.task === "suggestMilestones" ? (
                      <p className="mt-3 text-sm text-[var(--color-danger)]">
                        {aiError.message}
                      </p>
                    ) : null}
                    {aiSuggestion?.task === "suggestMilestones" ? (
                      <AiDraftCard
                        rationale={aiSuggestion.rationale}
                        onApply={applyAiSuggestion}
                        onDismiss={() => setAiSuggestion(null)}
                        applyLabel="Use these milestones"
                      >
                        <ol className="list-decimal space-y-1 pl-5">
                          {aiSuggestion.milestones.map((milestone) => (
                            <li key={milestone}>{milestone}</li>
                          ))}
                        </ol>
                      </AiDraftCard>
                    ) : null}
                  </div>
                </div>
              )}
            </Step>
          )}

          {step === 4 && (
            <Step title="Would a target date help?">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-strong)] bg-white px-4 py-3.5 text-base text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
              />
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                Optional. Leave this blank for an open-ended goal—you can add a
                date later from goal settings.
              </p>
            </Step>
          )}

          {step === 5 && (
            <Step title="Tell your story">
              <p className="mb-5 max-w-lg text-sm leading-6 text-[var(--color-text-muted)]">
                {getCategory(category).storyPrompt ?? "Share what this goal means to you and what support could change."}
              </p>
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                maxLength={3000}
                placeholder="Write your story…"
                rows={9}
                className="w-full resize-none rounded-xl border border-[var(--color-border-strong)] bg-white px-4 py-4 text-sm leading-6 text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-primary)] focus:outline-none"
              />
              <div className="mt-5 border-t border-[var(--color-border-subtle)] pt-5">
                <AiAssistButton
                  label="Help me draft this"
                  busyLabel="Drafting your story…"
                  busy={aiBusy === "draftStory"}
                  disabled={
                    aiBusy !== null ||
                    (!title.trim() && !summary.trim() && !story.trim())
                  }
                  onClick={() => requestAiSuggestion("draftStory")}
                />
                <AiDraftDisclosure />
                {aiError?.task === "draftStory" ? (
                  <p className="mt-3 text-sm text-[var(--color-danger)]">
                    {aiError.message}
                  </p>
                ) : null}
                {aiSuggestion?.task === "draftStory" ? (
                  <AiDraftCard
                    rationale={aiSuggestion.rationale}
                    onApply={applyAiSuggestion}
                    onDismiss={() => setAiSuggestion(null)}
                    applyLabel="Use this story"
                  >
                    <p className="whitespace-pre-wrap">{aiSuggestion.story}</p>
                  </AiDraftCard>
                ) : null}
              </div>
            </Step>
          )}

          {step === 6 && (
            <Step title="What kind of support would help?">
              <p className="mb-4 text-sm text-[var(--color-text-muted)]">
                Pick the kinds of help you want. People in your Motivation Circle will see these when they open your goal.
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
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                          : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          active ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]" : "bg-[var(--color-bg-elev)] text-[var(--color-text-muted)]"
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
                  How many motivators would you like in your circle? <span className="text-[var(--color-text-dim)]">(optional)</span>
                </label>
                <input
                  type="number"
                  value={supporterTarget}
                  onChange={(e) => setSupporterTarget(e.target.value)}
                  placeholder="e.g. 50"
                  min={0}
                  className="w-full rounded-xl border border-[var(--color-border-strong)] bg-white px-3 py-3 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
                />
                <p className="mt-1.5 text-xs text-[var(--color-text-dim)]">
                  Shown alongside goal progress. We wait until three people join your circle before showing the target.
                </p>
              </div>
            </Step>
          )}

          {step === 7 && (
            <Step title="Who's this visible to?">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                    visibility === "public"
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                      : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]"
                  }`}
                >
                  <Globe
                    size={20}
                    className={visibility === "public" ? "mt-0.5 text-[var(--color-primary)]" : "mt-0.5 text-[var(--color-text-muted)]"}
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
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                      : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]"
                  }`}
                >
                  <Lock
                    size={20}
                    className={visibility === "unlisted" ? "mt-0.5 text-[var(--color-primary)]" : "mt-0.5 text-[var(--color-text-muted)]"}
                  />
                  <div>
                    <div className="text-sm font-semibold">Unlisted</div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Only people with the link can see it. Not in the discovery feed.
                    </div>
                  </div>
                </button>
              </div>

              <label
                className={`mt-4 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  isAnonymous
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                    : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                    isAnonymous
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                      : "border-[var(--color-border-strong)] bg-white"
                  }`}
                  onClick={() => setIsAnonymous((v) => !v)}
                >
                  {isAnonymous && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">Keep me anonymous</div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    Your name, avatar, and profile link won't appear on the goal page or in the discovery feed. People can still find and support the goal.
                  </div>
                </div>
              </label>
            </Step>
          )}

          {step === totalSteps - 1 && (
            <Step title="Everything looks good?">
              <label
                htmlFor="goal-cover"
                className="block cursor-pointer rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg)] px-6 py-10 text-center transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
              >
                <input
                  id="goal-cover"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
                />
                <ImagePlus className="mx-auto text-[var(--color-primary)]" size={24} />
                <p className="mt-3 text-sm font-semibold">{coverFile ? coverFile.name : "Add a cover photo"}</p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[var(--color-text-muted)]">
                  {coverFile ? "Your cover will be added when you create the goal." : "A bright, clear image helps people connect with your goal. You can change it later."}
                </p>
                <span className="mt-5 inline-flex rounded-full border border-[var(--color-border-strong)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-text)]">
                  {coverFile ? "Choose another" : "Choose a photo"}
                </span>
              </label>
              <div className="mt-8 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                <ReviewItem label="Goal" value={title || "Untitled goal"} onEdit={() => setStep(1)} />
                <ReviewItem label="Category" value={CATEGORIES.find((item) => item.id === category)?.label ?? category} onEdit={() => setStep(0)} />
                <ReviewItem label="Progress" value={PROGRESS_TEMPLATES.find((item) => item.id === progressType)?.label ?? progressType} onEdit={() => setStep(2)} />
                <ReviewItem
                  label="Target"
                  value={
                    progressType === "milestones"
                      ? `${milestones.filter((milestone) => milestone.title.trim()).length} milestones`
                      : progressType === "streak"
                      ? `${targetValue || "—"} days`
                      : `${startValue || "—"} → ${targetValue || "—"} ${unit}`
                  }
                  onEdit={() => setStep(3)}
                />
                <ReviewItem label="Timeline" value={targetDate ? new Date(`${targetDate}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "No date set"} onEdit={() => setStep(4)} />
                <ReviewItem label="Story" value={story || "Add your story later"} onEdit={() => setStep(5)} />
                <ReviewItem label="Support" value={`${supportTypes.length} ways to show up`} onEdit={() => setStep(6)} />
                <ReviewItem label="Visibility" value={`${visibility === "public" ? "Public" : "Unlisted"}${isAnonymous ? " · Anonymous" : ""}`} onEdit={() => setStep(7)} />
              </div>
            </Step>
          )}
          </div>

          {err && <p className="mx-auto mt-4 w-full max-w-[42rem] text-sm text-[var(--color-danger)]">{err}</p>}
        </div>

        <footer className="relative mt-auto border-t border-[var(--color-border)] bg-white px-5 py-5 sm:px-12 sm:py-7 lg:px-[4.5rem]">
          <div className="absolute inset-x-0 top-0 h-px bg-[var(--color-bg-sunken)]">
            <div className={`h-px bg-[var(--color-primary)] transition-[width] duration-300 ${PROGRESS_WIDTHS[step]}`} />
          </div>
          <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-border-strong)] bg-white text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Go back"
          >
            <ArrowLeft size={19} />
          </button>
          {step < totalSteps - 1 ? (
            <button
              type="button"
              onClick={() => canAdvance() && setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="inline-flex min-w-32 items-center justify-center gap-1.5 rounded-full bg-[var(--color-primary)] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canAdvance() || busy}
              className="min-w-36 rounded-full bg-[var(--color-primary)] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Creating..." : "Create goal"}
            </button>
          )}
          </div>
          {stepError() && (
            <p className="mt-2 text-center text-xs text-[var(--color-danger)]">{stepError()}</p>
          )}
        </footer>
        </section>
    </div>
  );
}

function ReviewItem({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: React.ReactNode;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-[var(--color-text)]">{label}</p>
        <p className="mt-1 truncate text-sm text-[var(--color-text-muted)]">{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--color-primary)] transition hover:text-[var(--color-primary-dark)]"
      >
        Edit <ChevronRight size={15} />
      </button>
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
      <h2 className="mb-7 max-w-3xl font-display text-4xl font-bold leading-[0.96] tracking-[-0.05em] sm:text-5xl">{title}</h2>
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
        className="w-full rounded-xl border border-[var(--color-border-strong)] bg-white px-3 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-primary)] focus:outline-none"
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
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          {d === "decrease" ? "↓ decrease" : "↑ increase"}
        </button>
      ))}
    </div>
  );
}
