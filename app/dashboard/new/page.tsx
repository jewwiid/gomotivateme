"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  CircleDollarSign,
  GitBranch,
  Clock3,
  Dumbbell,
  Flame,
  ListChecks,
  Route,
  Scale,
  X,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CATEGORIES, CategoryId, getCategory, getDefaultMilestones } from "@/lib/categories";
import {
  DEFAULT_METRIC_BY_CATEGORY,
  getDefaultMeasurement,
  getMeasurementMetric,
  getMeasurementsForCategory,
  type GoalMeasurementMetric,
  type MeasurementIcon,
} from "@/lib/goalMeasurementCatalog";
import { CategoryIcon } from "@/components/CategoryIcon";
import { RequireAuth } from "@/components/RequireAuth";
import { Wordmark } from "@/components/Wordmark";
import { AiblWordmark } from "@/components/AiblMark";
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
import { trackDataFastGoal } from "@/lib/analytics";
import { JOURNEY_ILLUSTRATIONS } from "@/lib/journeyIllustrations";

/** Capitalize the first letter of a unit string for display. */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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
    title: "Choose what progress means",
    detail: "Your category now narrows this to measurements that fit the goal.",
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

const WIZARD_ART = [
  {
    illustration: JOURNEY_ILLUSTRATIONS.begin,
    caption: "Every meaningful goal starts by choosing a direction.",
  },
  {
    illustration: JOURNEY_ILLUSTRATIONS.begin,
    caption: "A clear destination gives the first step somewhere to go.",
  },
  {
    illustration: JOURNEY_ILLUSTRATIONS.move,
    caption: "Progress becomes visible when you decide what counts.",
  },
  {
    illustration: JOURNEY_ILLUSTRATIONS.milestone,
    caption: "Milestones turn the climb into reachable ground.",
  },
  {
    illustration: JOURNEY_ILLUSTRATIONS.move,
    caption: "A horizon can help you pace the journey.",
  },
  {
    illustration: JOURNEY_ILLUSTRATIONS.return,
    caption: "Your reason is what helps you return to the work.",
  },
  {
    illustration: JOURNEY_ILLUSTRATIONS.support,
    caption: "Support changes what you have to carry alone.",
  },
  {
    illustration: JOURNEY_ILLUSTRATIONS.support,
    caption: "Choose how widely you want to open the trail.",
  },
  {
    illustration: JOURNEY_ILLUSTRATIONS.summit,
    caption: "The plan is ready. Your next step is to begin.",
  },
] as const;

const PROGRESS_WIDTHS = ["w-[11.111%]", "w-[22.222%]", "w-1/3", "w-[44.444%]", "w-[55.555%]", "w-2/3", "w-[77.777%]", "w-[88.888%]", "w-full"];

const MEASUREMENT_ICONS: Record<MeasurementIcon, typeof BarChart3> = {
  count: BarChart3,
  distance: Route,
  duration: Clock3,
  money: CircleDollarSign,
  plan: ListChecks,
  streak: Flame,
  strength: Dumbbell,
  people: Users,
  weight: Scale,
};

const INITIAL_MEASUREMENT = getDefaultMeasurement("creative");

const numericFieldValue = (value: number | undefined) =>
  value === undefined ? "" : String(value);

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
  const searchParams = useSearchParams();
  const create = useMutation(api.goals.create);
  const createGitHubGoalLink = useMutation(api.github.createGoalLink);
  const generateUploadUrl = useMutation(api.updates.generateUploadUrl);
  const suggest = useAction(api.aiAssistant.suggest);
  const syncGitHubLink = useAction(api.github.syncLink);
  const aiblLinks = useQuery(api.partner.listMine);
  const pushGoalToAibl = useAction(api.partnerPush.pushGoalToAibl);
  const githubRepositoryId = searchParams.get("githubRepositoryId");
  const githubActivity = searchParams.get("githubActivity") === "merged_prs" ? "merged_prs" : "commits";
  const githubTarget = Number(searchParams.get("githubTarget"));
  const githubBackfillFrom = Number(searchParams.get("githubBackfillFrom"));
  const githubDraft = useQuery(
    api.github.getRepositoryGoalDraft,
    githubRepositoryId ? { repositoryId: githubRepositoryId as Id<"githubRepositories"> } : "skip"
  );

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [story, setStory] = useState("");
  const [category, setCategory] = useState<CategoryId>("creative");
  const [metricId, setMetricId] = useState(INITIAL_MEASUREMENT.id);
  const [progressType, setProgressType] = useState<"number" | "streak" | "milestones">(INITIAL_MEASUREMENT.progressType);
  const [direction, setDirection] = useState<"increase" | "decrease">(INITIAL_MEASUREMENT.defaultDirection);
  const [unit, setUnit] = useState(INITIAL_MEASUREMENT.defaultUnit);
  const [startValue, setStartValue] = useState(numericFieldValue(INITIAL_MEASUREMENT.defaultStartValue));
  const [targetValue, setTargetValue] = useState(numericFieldValue(INITIAL_MEASUREMENT.suggestedTargetValue));
  const [targetDate, setTargetDate] = useState("");
  const [milestones, setMilestones] = useState<Array<{ id: string; title: string }>>(() =>
    getDefaultMilestones("creative")
  );
  const [supporterTarget, setSupporterTarget] = useState("");
  const [supportTypes, setSupportTypes] = useState<string[]>(["encourage", "checkin"]);
  const [countBackfilledGitHubProgress, setCountBackfilledGitHubProgress] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">("public");
  const [syncToAibl, setSyncToAibl] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverDragOver, setCoverDragOver] = useState(false);
  const coverDropRef = useRef<HTMLLabelElement>(null);
  const githubDraftApplied = useRef(false);

  const handleCoverDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCoverDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setCoverFile(file);
    }
  }, []);

  const handleCoverDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCoverDragOver(true);
  }, []);

  const handleCoverDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCoverDragOver(false);
  }, []);

  // Generate / revoke object URL for preview when coverFile changes.
  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    if (!githubDraft || githubDraftApplied.current) return;
    githubDraftApplied.current = true;
    const metricId = githubActivity === "merged_prs" ? "launch.github-pull-requests" : "launch.github-commits";
    const target = Number.isFinite(githubTarget) && githubTarget > 0
      ? githubTarget
      : githubActivity === "merged_prs" ? 10 : githubDraft.suggestedTarget;
    setCategory("launch");
    setMetricId(metricId);
    setProgressType("number");
    setDirection("increase");
    setUnit(githubActivity === "merged_prs" ? "pull requests" : "commits");
    setStartValue("0");
    setTargetValue(String(target));
    setTitle(`Build ${githubDraft.name}`);
    setSummary(`Build and maintain ${githubDraft.fullName}; verified GitHub ${githubActivity === "merged_prs" ? "pull requests" : "commits"} will show the project's progress.`);
    setStory(`Project context\n${githubDraft.htmlUrl}\n\nDefault branch: ${githubDraft.defaultBranch}\n\nGitHub activity from this repository will be linked and backfilled after this goal is published.`);
    setStep(1);
  }, [githubActivity, githubDraft, githubTarget]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<AiTask | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [aiError, setAiError] = useState<{
    task: AiTask;
    message: string;
  } | null>(null);
  const measurementOptions = getMeasurementsForCategory(category);
  const selectedMeasurement =
    getMeasurementMetric(category, metricId) ?? getDefaultMeasurement(category);
  const isGitHubMetric = metricId.endsWith("github-commits") || metricId.endsWith("github-pull-requests");
  const githubBackfillDate = githubDraft
    ? new Date(Number.isFinite(githubBackfillFrom) ? githubBackfillFrom : githubDraft.suggestedBackfillFrom)
    : null;

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

  const addSuggestedMilestone = (title: string) => {
    setMilestones((current) => mergeMilestones(current, [title]));
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
      setMilestones((current) =>
        mergeMilestones(current, aiSuggestion.milestones)
      );
    }
    if (aiSuggestion.task === "draftStory" && aiSuggestion.story) {
      setStory(aiSuggestion.story);
    }
    setAiSuggestion(null);
    setAiError(null);
  };

  const applyMeasurementSelection = (definition: GoalMeasurementMetric) => {
    setMetricId(definition.id);
    setProgressType(definition.progressType);
    setDirection(definition.defaultDirection);
    setUnit(definition.defaultUnit);
    setStartValue(numericFieldValue(definition.defaultStartValue));
    setTargetValue(numericFieldValue(definition.suggestedTargetValue));
    if (definition.progressType === "milestones") {
      const titles = definition.milestones ?? getDefaultMilestones(definition.categoryId).map((item) => item.title);
      setMilestones(titles.map((milestone, index) => ({ id: `m${index + 1}`, title: milestone })));
    }
  };

  const onCategoryChange = (id: CategoryId) => {
    setCategory(id);
    applyMeasurementSelection(getDefaultMeasurement(id));
  };

  const canAdvance = () => {
    if (step === 0) return true; // category has a default
    if (step === 1) return title.trim().length > 0;
    if (step === 2) return Boolean(getMeasurementMetric(category, metricId));
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
        if (!unit.trim()) return "Choose or enter a unit";
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
  const stepArt = WIZARD_ART[step];

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
        metricId,
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
        tzOffsetMinutes:
          progressType === "streak" ? new Date().getTimezoneOffset() : undefined,
        milestones: progressType === "milestones" ? milestones : undefined,
        supporterTarget: supporterTarget
          ? parseInt(supporterTarget, 10)
          : undefined,
        supportTypes,
        visibility,
        isAnonymous,
        coverImageId,
      });
      if (syncToAibl && (aiblLinks?.length ?? 0) > 0) {
        try {
          await pushGoalToAibl({ goalId });
        } catch (error) {
          console.error("[partner] create-goal AIBL sync failed", error);
        }
      }
      // A goal started from a repository is connected automatically. If the
      // creator changes its metric in the wizard, we preserve the activity
      // link but only update the measurement when that metric is compatible.
      if (githubRepositoryId && githubDraft) {
        try {
          const progressMode = metricId === "launch.github-commits" || metricId === "career.github-commits" || metricId === "launch.github-pull-requests" || metricId === "career.github-pull-requests"
            ? "progress"
            : "activity";
          const link = await createGitHubGoalLink({
            goalId,
            repositoryId: githubRepositoryId as Id<"githubRepositories">,
            activityKind: githubActivity,
            progressMode,
            countBackfilledProgress: countBackfilledGitHubProgress,
            backfillFrom: Number.isFinite(githubBackfillFrom) && githubBackfillFrom < Date.now()
              ? githubBackfillFrom
              : githubDraft.suggestedBackfillFrom,
          });
          await syncGitHubLink({ linkId: link.linkId });
        } catch (githubError) {
          // The goal itself is valid even if GitHub is temporarily unavailable.
          // The owner can retry from Settings without losing their draft.
          console.error("[github] create-from-repository sync failed", githubError);
        }
      }
      trackDataFastGoal("goal_created", {
        progress_type: progressType,
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
    <div className="min-h-dvh bg-[var(--color-bg-elev)] text-[var(--color-text)] lg:grid lg:grid-cols-[minmax(22rem,36%)_1fr]">
      <aside className="hidden min-h-dvh flex-col px-12 py-10 lg:flex xl:px-16">
        <Wordmark href="/dashboard" size="xl" />
        <div className="flex flex-1 flex-col justify-center py-8">
          <GoalSetupArtwork art={stepArt} />
          <div className="mt-7 max-w-md">
            <p className="text-sm font-semibold text-[var(--color-primary)]">Step {step + 1} of {totalSteps}</p>
            <h1 className="mt-4 max-w-[12ch] text-balance font-display text-[clamp(2.6rem,4vw,4.6rem)] font-semibold leading-[0.91] tracking-[-0.055em]">{stepCopy.title}</h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[var(--color-text-secondary)] xl:text-base xl:leading-7">{stepCopy.detail}</p>
          </div>
        </div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-primary)]">
          <ArrowLeft size={15} /> Leave setup
        </Link>
      </aside>

      <section className="flow-form flex min-h-dvh flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-5 py-5 lg:hidden">
          <Wordmark href="/dashboard" size="md" />
          <span className="text-xs font-semibold text-[var(--color-primary)]">{step + 1} / {totalSteps}</span>
        </div>
        <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-elev)] px-5 py-5 lg:hidden">
          <div className="mx-auto grid max-w-[42rem] grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-4">
            <motion.div
              key={stepArt.illustration.src}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative aspect-square overflow-hidden rounded-[1.25rem] bg-[var(--color-surface)]"
            >
              <Image
                src={stepArt.illustration.src}
                alt=""
                fill
                sizes="92px"
                className="object-cover mix-blend-multiply"
              />
            </motion.div>
            <div>
              <p className="text-xs font-semibold text-[var(--color-primary)]">Your goal journey</p>
              <p className="mt-1 text-balance font-display text-xl font-semibold leading-tight tracking-[-0.035em]">{stepCopy.title}</p>
              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[var(--color-text-muted)]">{stepCopy.detail}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 px-5 pb-10 pt-8 sm:px-12 sm:pt-12 lg:px-[8vw] lg:pt-24">
          <div className="mx-auto w-full max-w-[42rem]">
          {githubDraft && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-4">
              <GitBranch size={18} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--color-text)]">Goal from {githubDraft.fullName}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">{githubActivity === "merged_prs" ? "Merged pull requests" : "Commits"} will measure this goal. We will backfill verified activity from {new Date(Number.isFinite(githubBackfillFrom) ? githubBackfillFrom : githubDraft.suggestedBackfillFrom).toLocaleDateString()} after you publish.</p>
              </div>
            </div>
          )}
          {step === 0 && (
            <Step title="Pick a category">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onCategoryChange(c.id)}
                    className={`flex flex-col items-start gap-1.5 rounded-[var(--workspace-radius)] border p-3 text-left transition ${
                      category === c.id
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-sm"
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
                  className="workspace-input px-4 py-3.5"
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
                  className="workspace-input px-4 py-3.5"
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
              <p className="mb-5 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
                These measurements fit {getCategory(category).label.toLowerCase()} goals. Choose what you can update consistently, not merely what sounds impressive.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {measurementOptions.map((measurement) => {
                  const Icon = MEASUREMENT_ICONS[measurement.icon];
                  const active = metricId === measurement.id;
                  const recommended = DEFAULT_METRIC_BY_CATEGORY[category] === measurement.id;
                  const metricSummary =
                    measurement.progressType === "streak"
                      ? "Daily check-in"
                      : measurement.progressType === "milestones"
                      ? `${measurement.milestones?.length ?? 0} editable stages`
                      : measurement.allowsCustomUnit
                      ? "Custom unit"
                      : measurement.units.slice(0, 3).join(" · ");
                  return (
                    <button
                      key={measurement.id}
                      type="button"
                      onClick={() => applyMeasurementSelection(measurement)}
                      className={`flex w-full items-start gap-3 rounded-[var(--workspace-radius)] border p-4 text-left transition ${
                        active
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-sm"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          active
                            ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                            : "bg-[var(--color-bg-elev)] text-[var(--color-text-muted)]"
                        }`}
                      >
                        <Icon size={19} aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{measurement.label}</span>
                          {recommended ? (
                            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--color-primary)]">Recommended</span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{measurement.description}</div>
                        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-dim)]">{metricSummary}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step
              title={
                progressType === "milestones"
                  ? "Map the steps"
                  : progressType === "streak"
                  ? "Set your streak target"
                  : isGitHubMetric
                  ? `Set your ${selectedMeasurement.label} target`
                  : `Set your ${selectedMeasurement.label.toLowerCase()} target`
              }
            >
              <div className="mb-5 border-l-2 border-[var(--color-primary)] pl-4">
                <p className="text-sm font-semibold text-[var(--color-text)]">{selectedMeasurement.label}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{selectedMeasurement.description}</p>
              </div>
              {progressType === "number" && (
                <>
                  {selectedMeasurement.directions.length > 1 ? (
                    <div className="mb-3 flex gap-2">
                      <DirectionToggle value={direction} onChange={setDirection} />
                    </div>
                  ) : null}
                  {isGitHubMetric ? (
                    <div className="mb-4 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-4">
                      <p className="text-sm font-semibold text-[var(--color-text)]">Backfill preserves history; your goal begins fresh</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                        We will import verified {metricId.endsWith("github-pull-requests") ? "merged pull requests" : "commits"}{githubBackfillDate ? ` from ${githubBackfillDate.toLocaleDateString()}` : " from the selected backfill date"} for your timeline, AI recaps, and AIBL context. They will not count toward this new target unless you choose otherwise below.
                      </p>
                    </div>
                  ) : null}
                  <div className={`grid grid-cols-1 gap-3 ${isGitHubMetric ? "" : "sm:grid-cols-2"}`}>
                    {!isGitHubMetric ? (
                      <Field
                        label={selectedMeasurement.startLabel ?? "Starting value"}
                        value={startValue}
                        onChange={setStartValue}
                        type="number"
                        step="any"
                      />
                    ) : null}
                    <Field
                      label={isGitHubMetric ? `New verified ${metricId.endsWith("github-pull-requests") ? "pull requests" : "commits"} target` : selectedMeasurement.targetLabel ?? "Target value"}
                      value={targetValue}
                      onChange={setTargetValue}
                      type="number"
                      step="any"
                    />
                  </div>
                  {isGitHubMetric ? (
                    <label className="mt-3 flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-white p-3 text-xs leading-5 text-[var(--color-text-secondary)]">
                      <input
                        type="checkbox"
                        checked={countBackfilledGitHubProgress}
                        onChange={(event) => setCountBackfilledGitHubProgress(event.target.checked)}
                        className="mt-0.5"
                      />
                      <span><strong className="text-[var(--color-text)]">Include historic activity in this target.</strong> Turn this on only when the target means the total commits or pull requests since the backfill date. Choose a target higher than your existing history.</span>
                    </label>
                  ) : null}
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                      Unit
                    </label>
                    {isGitHubMetric ? (
                      <div className="workspace-input bg-[var(--color-bg-elev)] px-3 py-3 text-[var(--color-text-secondary)]">
                        {metricId.endsWith("github-pull-requests") ? "Merged pull requests" : "Commits"} · verified by GitHub
                      </div>
                    ) : (
                    <select
                      value={
                        selectedMeasurement.units.includes(unit)
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
                      className="workspace-input px-3 py-3"
                    >
                      {selectedMeasurement.units.map((u) => (
                        <option key={u} value={u}>
                          {cap(u)}
                        </option>
                      ))}
                      {!selectedMeasurement.units.includes(unit) && unit && (
                        <option value="__custom">{cap(unit)} (custom)</option>
                      )}
                      {selectedMeasurement.allowsCustomUnit ? <option value="__custom">Custom…</option> : null}
                    </select>
                    )}
                    {selectedMeasurement.allowsCustomUnit && !selectedMeasurement.units.includes(unit) && (
                      <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="Type your unit…"
                        autoFocus
                        className="workspace-input mt-2 px-3 py-3"
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
                          className="workspace-input flex-1 px-3 py-2.5"
                        />
                        <button
                          type="button"
                          onClick={() => setMilestones((arr) => arr.filter((_, idx) => idx !== i))}
                          disabled={milestones.length <= 1}
                          className="rounded-xl p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-danger)] disabled:opacity-30"
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
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-40"
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
                        applyLabel="Add all"
                      >
                        <ul className="space-y-2">
                          {aiSuggestion.milestones.map((milestone) => {
                            const added = milestones.some(
                              (existing) =>
                                milestoneKey(existing.title) ===
                                milestoneKey(milestone)
                            );
                            const full =
                              !added && milestones.length >= MAX_MILESTONES &&
                              milestones.every((entry) => entry.title.trim());
                            return (
                              <li
                                key={milestone}
                                className="flex items-start justify-between gap-3"
                              >
                                <span className="flex-1">{milestone}</span>
                                <button
                                  type="button"
                                  onClick={() => addSuggestedMilestone(milestone)}
                                  disabled={added || full}
                                  className="shrink-0 rounded-full border border-[var(--color-primary)]/40 bg-white px-3 py-1 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:cursor-default disabled:border-[var(--color-border)] disabled:bg-transparent disabled:text-[var(--color-text-muted)] disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-muted)]"
                                >
                                  {added ? "Added" : full ? "Full" : "Add"}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </AiDraftCard>
                    ) : null}
                  </div>
                </div>
              )}
            </Step>
          )}

          {step === 4 && (
            <Step title="Would a target date help?">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="workspace-input px-4 py-3.5"
                />
                {targetDate ? (
                  <button
                    type="button"
                    onClick={() => setTargetDate("")}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[var(--color-border-strong)] px-4 text-sm font-semibold text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] active:translate-y-px"
                  >
                    <X size={15} aria-hidden />
                    Remove date
                  </button>
                ) : null}
              </div>
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                Optional. Leave this blank for an open-ended goal. You can add a
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
                className="workspace-input resize-none px-4 py-4 leading-6"
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
                      className={`flex items-start gap-3 rounded-[var(--workspace-radius)] border p-3 text-left transition ${
                        active
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-sm"
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
                  className="workspace-input px-3 py-3"
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
                  className={`flex w-full items-start gap-3 rounded-[var(--workspace-radius)] border p-4 text-left transition ${
                    visibility === "public"
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-sm"
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
                  className={`flex w-full items-start gap-3 rounded-[var(--workspace-radius)] border p-4 text-left transition ${
                    visibility === "unlisted"
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-sm"
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
                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  className={`flex w-full items-start gap-3 rounded-[var(--workspace-radius)] border p-4 text-left transition ${
                    visibility === "private"
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-sm"
                  }`}
                >
                  <Lock
                    size={20}
                    className={visibility === "private" ? "mt-0.5 text-[var(--color-primary)]" : "mt-0.5 text-[var(--color-text-muted)]"}
                  />
                  <div>
                    <div className="text-sm font-semibold">Private</div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Only your approved followers can see this goal. Not in discovery or search.
                    </div>
                  </div>
                </button>
              </div>

              <label
                className={`mt-4 flex cursor-pointer items-start gap-3 rounded-[var(--workspace-radius)] border p-4 transition ${
                  isAnonymous
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-sm"
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
              {(aiblLinks?.length ?? 0) > 0 && (
                <label
                  className={`mt-4 flex cursor-pointer items-start gap-3 rounded-[var(--workspace-radius)] border p-4 transition ${
                    syncToAibl
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-sm"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={syncToAibl}
                    onChange={(e) => setSyncToAibl(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                      syncToAibl
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                        : "border-[var(--color-border-strong)] bg-white"
                    }`}
                    onClick={() => setSyncToAibl((v) => !v)}
                  >
                    {syncToAibl && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">
                      Also create a campaign in <AiblWordmark className="align-middle text-sm" />
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Turns this goal into operator tasks in AIBL. You will get a confirmation email.
                    </div>
                  </div>
                </label>
              )}
            </Step>
          )}

          {step === totalSteps - 1 && (
            <Step title="Review your goal">
              {coverPreview ? (
                <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-sunken)]">
                  <div className="relative aspect-[1.45/1] w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCoverFile(null)}
                      className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] shadow-sm backdrop-blur transition hover:bg-white"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <p className="truncate text-xs font-medium text-[var(--color-text-muted)]">
                      {coverFile?.name}
                    </p>
                    <label
                      htmlFor="goal-cover"
                      className="shrink-0 cursor-pointer text-xs font-semibold text-[var(--color-primary)] transition hover:text-[var(--color-primary-dark)]"
                    >
                      Change photo
                    </label>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="goal-cover"
                  ref={coverDropRef}
                  onDrop={handleCoverDrop}
                  onDragOver={handleCoverDragOver}
                  onDragLeave={handleCoverDragLeave}
                  className={`grid cursor-pointer overflow-hidden rounded-2xl border text-left transition sm:grid-cols-[1.05fr_0.95fr] ${
                    coverDragOver
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] scale-[1.01]"
                      : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-primary)]"
                  }`}
                >
                  <input
                    id="goal-cover"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
                  />
                  <span className="relative min-h-44 overflow-hidden bg-[var(--color-surface)]">
                    <Image
                      src={JOURNEY_ILLUSTRATIONS.summit.src}
                      alt="A person standing at the summit of a blue mountain"
                      fill
                      sizes="(min-width: 640px) 340px, 100vw"
                      className="object-cover mix-blend-multiply"
                    />
                  </span>
                  <span className="flex flex-col justify-center p-6">
                    <ImagePlus className="text-[var(--color-primary)]" size={22} />
                    <span className="mt-3 text-sm font-semibold">Your goal has a journey cover</span>
                    <span className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                      {coverDragOver
                        ? "Drop to use this image instead"
                        : "Keep the branded artwork, or add a personal photo that makes the goal feel unmistakably yours."}
                    </span>
                    <span className="mt-4 inline-flex w-fit rounded-full border border-[var(--color-border-strong)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-text)]">
                      Add my own photo
                    </span>
                  </span>
                </label>
              )}
              {/* Hidden input always present so "Change photo" works even when preview is showing */}
              {coverPreview && (
                <input
                  id="goal-cover"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
                />
              )}
              <div className="mt-8 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                <ReviewItem label="Goal" value={title || "Untitled goal"} onEdit={() => setStep(1)} />
                <ReviewItem label="Category" value={CATEGORIES.find((item) => item.id === category)?.label ?? category} onEdit={() => setStep(0)} />
                <ReviewItem label="Measurement" value={selectedMeasurement.label} onEdit={() => setStep(2)} />
                <ReviewItem
                  label="Target"
                  value={
                    progressType === "milestones"
                      ? `${milestones.filter((milestone) => milestone.title.trim()).length} milestones`
                      : progressType === "streak"
                      ? `${targetValue || "—"} days`
                      : `${startValue || "—"} → ${targetValue || "—"} ${cap(unit)}`
                  }
                  onEdit={() => setStep(3)}
                />
                <ReviewItem label="Timeline" value={targetDate ? new Date(`${targetDate}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "No date set"} onEdit={() => setStep(4)} />
                <ReviewItem label="Story" value={story || "Add your story later"} onEdit={() => setStep(5)} />
                <ReviewItem label="Support" value={`${supportTypes.length} ways to show up`} onEdit={() => setStep(6)} />
                <ReviewItem label="Visibility" value={`${visibility === "public" ? "Public" : visibility === "unlisted" ? "Unlisted" : "Private"}${isAnonymous ? " · Anonymous" : ""}`} onEdit={() => setStep(7)} />
              </div>
            </Step>
          )}
          </div>

          {err && <p className="mx-auto mt-4 w-full max-w-[42rem] text-sm text-[var(--color-danger)]">{err}</p>}
        </div>

        <footer className="relative mt-auto border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-5 sm:px-12 sm:py-7 lg:px-[4.5rem]">
          <div className="absolute inset-x-0 top-0 h-px bg-[var(--color-bg-sunken)]">
            <div className={`h-px bg-[var(--color-primary)] transition-[width] duration-300 ${PROGRESS_WIDTHS[step]}`} />
          </div>
          <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--workspace-radius)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-30"
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

function GoalSetupArtwork({ art }: { art: (typeof WIZARD_ART)[number] }) {
  return (
    <motion.figure
      key={art.illustration.src}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-[1.75rem] bg-[var(--color-surface)]"
    >
      <Image
        src={art.illustration.src}
        alt={art.illustration.alt}
        fill
        priority
        sizes="(min-width: 1280px) 420px, 36vw"
        className="object-cover mix-blend-multiply"
      />
      <figcaption className="absolute bottom-4 left-4 max-w-[15rem] border-l-2 border-[var(--color-sun)] bg-[color:rgba(251,250,246,0.9)] py-2 pl-3 pr-4 text-xs font-medium leading-5 text-[var(--color-text-secondary)] backdrop-blur-sm">
        {art.caption}
      </figcaption>
    </motion.figure>
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

const MAX_MILESTONES = 8;

/** Case- and whitespace-insensitive key, so "Run 5k" and "run 5k " count as one. */
function milestoneKey(title: string) {
  return title.trim().toLowerCase();
}

/**
 * Folds suggested milestones into whatever the user has already written instead of
 * replacing it. Blank rows are filled first, duplicates are skipped, and the list
 * stays within the 8-milestone cap the form enforces elsewhere.
 */
function mergeMilestones(
  existing: Array<{ id: string; title: string }>,
  incoming: string[]
) {
  const seen = new Set(
    existing.map((milestone) => milestoneKey(milestone.title)).filter(Boolean)
  );
  const next = [...existing];

  for (const raw of incoming) {
    const title = raw.trim();
    if (!title || seen.has(milestoneKey(title))) continue;

    const blank = next.findIndex((milestone) => !milestone.title.trim());
    if (blank >= 0) {
      next[blank] = { ...next[blank], title };
    } else {
      if (next.length >= MAX_MILESTONES) break;
      next.push({ id: `ai_${Date.now()}_${next.length}`, title });
    }
    seen.add(milestoneKey(title));
  }
  return next;
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
        className="workspace-input px-3 py-3"
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
    <div className="inline-flex rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] p-1">
      {(["decrease", "increase"] as const).map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
            value === d
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          {d === "decrease" ? "↓ Decrease" : "↑ Increase"}
        </button>
      ))}
    </div>
  );
}
