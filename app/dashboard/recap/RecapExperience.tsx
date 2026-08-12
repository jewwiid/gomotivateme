"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Flag,
  ImageIcon,
  Loader2,
  RotateCcw,
  Share2,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { RequireAuth } from "@/components/RequireAuth";
import { useCurrentUser } from "@/lib/useCurrentUser";

type MonthDatum = { label: string; updates: number };

type RecapSummary = {
  year: number;
  startMs: number;
  endMs: number;
  updatesPosted: number;
  activeDays: number;
  goalsMoved: number;
  goalsStarted: number;
  goalsCompleted: number;
  milestonesReached: number;
  achievementsEarned: number;
  badgesEarned: number;
  messagesReceived: number;
  checkInsReceived: number;
  newSupporters: number;
  peopleShowingUp: number;
  bestStreak: number;
  topGoal: {
    goalId: string;
    title: string;
    updates: number;
    progressPct: number;
  } | null;
  mostActiveMonth: { label: string; updates: number } | null;
  months: MonthDatum[];
};

const PREVIEW_MONTHS = [3, 5, 8, 7, 11, 9, 13, 12, 14, 18, 15, 9];

function previewSummary(year: number): RecapSummary {
  const labels = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return {
    year,
    startMs: new Date(year, 0, 1).getTime(),
    endMs: new Date(year + 1, 0, 1).getTime(),
    updatesPosted: 124,
    activeDays: 84,
    goalsMoved: 12,
    goalsStarted: 6,
    goalsCompleted: 1,
    milestonesReached: 4,
    achievementsEarned: 5,
    badgesEarned: 4,
    messagesReceived: 31,
    checkInsReceived: 18,
    newSupporters: 9,
    peopleShowingUp: 58,
    bestStreak: 21,
    topGoal: {
      goalId: "preview-goal",
      title: "Build a consistent running habit",
      updates: 38,
      progressPct: 82,
    },
    mostActiveMonth: { label: "October", updates: 18 },
    months: labels.map((label, index) => ({ label, updates: PREVIEW_MONTHS[index] })),
  };
}

export function RecapRoute({ preview, year }: { preview: boolean; year: number }) {
  if (preview) {
    return <RecapExperience summary={previewSummary(year)} firstName="Alex" />;
  }

  return (
    <RequireAuth>
      <AuthenticatedRecap year={year} />
    </RequireAuth>
  );
}

function AuthenticatedRecap({ year }: { year: number }) {
  const { user } = useCurrentUser();
  const startMs = useMemo(() => new Date(year, 0, 1).getTime(), [year]);
  const endMs = useMemo(() => new Date(year + 1, 0, 1).getTime(), [year]);
  const summary = useQuery(api.insights.yearlySummary, {
    year,
    startMs,
    endMs,
    tzOffsetMinutes: new Date().getTimezoneOffset(),
  }) as RecapSummary | null | undefined;

  if (summary === undefined) return <RecapLoading />;
  if (!summary) return null;

  return (
    <RecapExperience
      summary={summary}
      firstName={user?.name?.trim().split(/\s+/)[0] ?? undefined}
    />
  );
}

function RecapLoading() {
  return (
    <main className="fixed inset-0 z-[80] grid place-items-center bg-[var(--color-bg)]">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        <p className="mt-4 text-sm font-medium text-[var(--color-text-muted)]">
          Gathering your year…
        </p>
      </div>
    </main>
  );
}

function identityFor(summary: RecapSummary) {
  if (summary.activeDays >= 180) return "The Everyday Builder";
  if (summary.activeDays >= 75) return "The Steady Builder";
  if (summary.goalsCompleted >= 2) return "The Goal Finisher";
  if (summary.peopleShowingUp >= 20) return "The Community Builder";
  if (summary.activeDays > 0) return "The Momentum Maker";
  return "The New Beginning";
}

function RecapExperience({
  summary,
  firstName,
}: {
  summary: RecapSummary;
  firstName?: string;
}) {
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [shareComposerOpen, setShareComposerOpen] = useState(false);
  const touchStart = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const slideCount = 7;

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(slideCount - 1, next));
      if (clamped === slide) return;
      setDirection(clamped > slide ? 1 : -1);
      setSlide(clamped);
    },
    [slide]
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (shareComposerOpen) return;
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        goTo(slide + 1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(slide - 1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goTo, shareComposerOpen, slide]);

  const content = [
    <IntroSlide key="intro" summary={summary} firstName={firstName} />,
    <ShowingUpSlide key="showing-up" summary={summary} />,
    <GoalSlide key="goal" summary={summary} />,
    <RhythmSlide key="rhythm" summary={summary} />,
    <CommunitySlide key="community" summary={summary} />,
    <MilestoneSlide key="milestones" summary={summary} />,
    <FinalSlide
      key="final"
      summary={summary}
      identity={identityFor(summary)}
      onShare={() => setShareComposerOpen(true)}
      onReplay={() => goTo(0)}
    />,
  ];

  return (
    <main
      className="fixed inset-0 z-[80] overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]"
      onTouchStart={(event) => {
        if (shareComposerOpen) return;
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const end = event.changedTouches[0]?.clientX;
        touchStart.current = null;
        if (start === null || end === undefined || Math.abs(end - start) < 48) return;
        goTo(end < start ? slide + 1 : slide - 1);
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-[42rem] flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <div className="relative z-20 flex items-center gap-4">
          <div className="grid flex-1 grid-cols-7 gap-1.5" aria-label={`Slide ${slide + 1} of ${slideCount}`}>
            {Array.from({ length: slideCount }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Go to recap slide ${index + 1}`}
                aria-current={index === slide ? "step" : undefined}
                className={`h-1 rounded-full transition-colors ${
                  index <= slide ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
                }`}
              />
            ))}
          </div>
          <Link
            href="/dashboard"
            aria-label="Close recap"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <X size={17} />
          </Link>
        </div>

        <div className="relative min-h-0 flex-1">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.section
              key={slide}
              custom={direction}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -28 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              {content[slide]}
            </motion.section>
          </AnimatePresence>
        </div>

        {slide < slideCount - 1 && (
          <nav className="relative z-20 flex items-center justify-between gap-4 pt-4" aria-label="Recap navigation">
            <button
              type="button"
              onClick={() => goTo(slide - 1)}
              disabled={slide === 0}
              className="inline-flex h-12 items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 text-sm font-semibold transition hover:border-[var(--color-primary)] disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronLeft size={17} /> Back
            </button>
            <button
              type="button"
              onClick={() => goTo(slide + 1)}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)]"
            >
              Next <ChevronRight size={17} />
            </button>
          </nav>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        Showing recap slide {slide + 1} of {slideCount}
      </p>
      <AnimatePresence>
        {shareComposerOpen && (
          <SocialShareComposer
            summary={summary}
            identity={identityFor(summary)}
            onClose={() => setShareComposerOpen(false)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function StoryLabel({ year }: { year: number }) {
  return (
    <p className="font-mono text-[11px] font-medium tracking-[0.04em] text-[var(--color-primary)] sm:text-xs">
      Your year in motion, {year}
    </p>
  );
}

function IntroSlide({ summary, firstName }: { summary: RecapSummary; firstName?: string }) {
  return (
    <div className="flex h-full flex-col justify-center py-5 sm:py-8">
      <StoryLabel year={summary.year} />
      <h1 className="mt-5 max-w-lg font-display text-[clamp(2.7rem,12vw,5rem)] font-semibold leading-[0.93] tracking-[-0.055em]">
        {firstName ? `${firstName}, this was` : "This was"} your year in motion.
      </h1>
      <p className="mt-5 max-w-md text-base leading-7 text-[var(--color-text-secondary)] sm:text-lg">
        The goals you began, the days you returned, and the people who kept showing up beside you.
      </p>
      <div className="mt-8 min-h-0 flex-1 overflow-hidden rounded-[2rem] bg-[var(--color-bg-elev)] sm:mt-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/journey/begin.webp"
          alt="A person taking their first step onto a mountain trail"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}

function ShowingUpSlide({ summary }: { summary: RecapSummary }) {
  return (
    <div className="flex h-full flex-col py-5 sm:py-8">
      <StoryLabel year={summary.year} />
      <h2 className="mt-5 font-display text-[clamp(2.5rem,11vw,4.75rem)] font-semibold leading-[0.92] tracking-[-0.055em]">
        You kept showing up.
      </h2>
      <div className="mt-5 flex items-end gap-3 text-[var(--color-primary)]">
        <span className="font-display text-[clamp(5rem,25vw,9rem)] font-semibold leading-none tracking-[-0.075em] tabular-nums">
          {summary.activeDays}
        </span>
        <span className="max-w-28 pb-3 text-lg font-semibold leading-5">active days</span>
      </div>
      <div className="mt-5 min-h-0 flex-1 overflow-hidden rounded-[2rem] bg-[var(--color-bg-elev)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/journey/move.webp"
          alt="A person steadily climbing a rising mountain trail"
          className="h-full w-full object-cover"
        />
      </div>
      <p className="mt-5 text-base leading-7 text-[var(--color-text-secondary)]">
        {summary.updatesPosted} progress updates moved {summary.goalsMoved} goal{summary.goalsMoved === 1 ? "" : "s"} forward. Every return counted.
      </p>
    </div>
  );
}

function GoalSlide({ summary }: { summary: RecapSummary }) {
  return (
    <div className="flex h-full flex-col py-5 sm:py-8">
      <StoryLabel year={summary.year} />
      <h2 className="mt-5 max-w-lg font-display text-[clamp(2.6rem,11vw,4.75rem)] font-semibold leading-[0.93] tracking-[-0.055em]">
        One goal carried your momentum.
      </h2>
      <div className="mt-6 border-y border-[var(--color-border)] py-5">
        <p className="font-mono text-[11px] text-[var(--color-text-muted)]">Your most active goal</p>
        <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
          {summary.topGoal?.title ?? "Your next goal is waiting"}
        </p>
        {summary.topGoal && (
          <div className="mt-4 flex gap-6 text-sm text-[var(--color-text-secondary)]">
            <span><strong className="text-[var(--color-text)]">{summary.topGoal.updates}</strong> updates</span>
            <span><strong className="text-[var(--color-text)]">{summary.topGoal.progressPct}%</strong> progress</span>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/journey/move.webp"
          alt="A person moving upward along a mountain trail"
          className="h-full w-full object-contain mix-blend-multiply"
        />
      </div>
      <p className="text-base leading-7 text-[var(--color-text-secondary)]">
        Progress wasn’t one big leap. It was a trail of small decisions that kept pointing forward.
      </p>
    </div>
  );
}

function RhythmSlide({ summary }: { summary: RecapSummary }) {
  const activeMonths = [...summary.months]
    .filter((month) => month.updates > 0)
    .sort((a, b) => b.updates - a.updates)
    .slice(0, 4);
  return (
    <div className="flex h-full flex-col justify-center py-5 sm:py-8">
      <StoryLabel year={summary.year} />
      <h2 className="mt-5 font-display text-[clamp(2.6rem,11vw,4.75rem)] font-semibold leading-[0.93] tracking-[-0.055em]">
        {summary.mostActiveMonth?.label ?? "Every season"} was your momentum month.
      </h2>
      <p className="mt-5 max-w-md text-base leading-7 text-[var(--color-text-secondary)]">
        {summary.mostActiveMonth
          ? `You posted ${summary.mostActiveMonth.updates} updates, the strongest rhythm of your year.`
          : "There’s no perfect month to begin. The day you return becomes the start."}
      </p>
      <div className="mt-10 border-y border-[var(--color-border)]">
        {(activeMonths.length ? activeMonths : summary.months.slice(0, 4)).map((month, index) => (
          <div key={month.label} className="flex items-center gap-4 border-b border-[var(--color-border-subtle)] py-4 last:border-0">
            <span className="w-7 font-mono text-xs text-[var(--color-text-muted)]">0{index + 1}</span>
            <span className="flex-1 text-lg font-semibold">{month.label}</span>
            <span className="font-mono text-sm text-[var(--color-primary)]">{month.updates} updates</span>
          </div>
        ))}
      </div>
      {summary.bestStreak > 0 && (
        <div className="mt-8 flex items-center gap-4 rounded-2xl bg-[var(--color-primary-soft)] p-5 text-[var(--color-primary-dark)]">
          <CalendarDays size={24} />
          <p><strong className="text-2xl tabular-nums">{summary.bestStreak}</strong> day best streak</p>
        </div>
      )}
    </div>
  );
}

function CommunitySlide({ summary }: { summary: RecapSummary }) {
  return (
    <div className="flex h-full flex-col py-5 sm:py-8">
      <StoryLabel year={summary.year} />
      <h2 className="mt-5 font-display text-[clamp(2.6rem,11vw,4.75rem)] font-semibold leading-[0.93] tracking-[-0.055em]">
        You didn’t do it alone.
      </h2>
      <p className="mt-4 text-[var(--color-primary)]">
        <strong className="font-display text-6xl font-semibold tracking-[-0.06em] tabular-nums">{summary.peopleShowingUp}</strong>
        <span className="ml-3 text-lg font-semibold">moments of support</span>
      </p>
      <div className="mt-6 min-h-0 flex-1 overflow-hidden rounded-[2rem] bg-[var(--color-bg-elev)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/journey/support.webp"
          alt="Two people helping one another climb a mountain ridge"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="mt-5 grid grid-cols-3 divide-x divide-[var(--color-border)] text-center">
        <SmallStat value={summary.checkInsReceived} label="check-ins" />
        <SmallStat value={summary.messagesReceived} label="messages" />
        <SmallStat value={summary.newSupporters} label="supporters" />
      </div>
    </div>
  );
}

function MilestoneSlide({ summary }: { summary: RecapSummary }) {
  return (
    <div className="flex h-full flex-col justify-center py-5 sm:py-8">
      <StoryLabel year={summary.year} />
      <h2 className="mt-5 font-display text-[clamp(2.6rem,11vw,4.75rem)] font-semibold leading-[0.93] tracking-[-0.055em]">
        You turned intention into proof.
      </h2>
      <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-border)]">
        <ProofStat icon={Flag} value={summary.milestonesReached} label="milestones reached" />
        <ProofStat icon={Trophy} value={summary.goalsCompleted} label="goals completed" />
        <ProofStat icon={Sparkles} value={summary.achievementsEarned} label="achievements earned" />
        <ProofStat icon={Target} value={summary.goalsStarted} label="new goals begun" />
      </div>
      <div className="mt-8 min-h-0 flex-1 overflow-hidden rounded-[2rem] bg-[var(--color-bg-elev)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/journey/milestone.webp"
          alt="A person pausing beside a milestone flag before continuing"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}

function FinalSlide({
  summary,
  identity,
  onShare,
  onReplay,
}: {
  summary: RecapSummary;
  identity: string;
  onShare: () => void;
  onReplay: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center overflow-y-auto py-4 text-center sm:py-6">
      <StoryLabel year={summary.year} />
      <h2 className="mt-4 max-w-xl font-display text-[clamp(2.45rem,10.5vw,4.5rem)] font-semibold leading-[0.93] tracking-[-0.055em]">
        Your superpower:<br />Showing up.
      </h2>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-[var(--color-primary)]">
        <Flag size={15} /> {identity}
      </div>

      <div className="mt-6 grid w-full grid-cols-3 divide-x divide-[var(--color-border)]">
        <BigStat value={summary.activeDays} label="active days" />
        <BigStat value={summary.milestonesReached} label="milestones reached" />
        <BigStat value={summary.goalsCompleted} label="goals completed" />
      </div>

      <div className="-mx-5 min-h-[10rem] w-[calc(100%+2.5rem)] flex-1 overflow-hidden sm:-mx-8 sm:w-[calc(100%+4rem)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/journey/summit.webp"
          alt="A person standing at the summit of a blue mountain"
          className="h-full w-full scale-[1.04] object-cover object-[50%_58%] mix-blend-multiply [mask-image:radial-gradient(ellipse_88%_88%_at_50%_52%,black_66%,transparent_100%)]"
        />
      </div>

      <p className="max-w-sm text-sm leading-6 text-[var(--color-text-secondary)] sm:text-base">
        <strong className="text-[var(--color-text)]">You turned intention into impact.</strong><br />
        Here’s to carrying that momentum forward.
      </p>

      <div className="mt-5 w-full space-y-2.5">
        <button
          type="button"
          onClick={onShare}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)]"
        >
          <Share2 size={17} /> Create a social post
        </button>
        <button
          type="button"
          onClick={onReplay}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 text-sm font-semibold text-[var(--color-primary)] transition hover:border-[var(--color-primary)]"
        >
          <RotateCcw size={16} /> Replay from the beginning
        </button>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/GoMotivateMe_Logo_Wordmark.png"
        alt="GoMotivateMe"
        className="mt-4 h-8 w-auto object-contain"
      />
    </div>
  );
}

type ShareFormat = "story" | "portrait" | "square";

const SHARE_FORMATS: Array<{
  id: ShareFormat;
  label: string;
  detail: string;
  width: number;
  height: number;
}> = [
  { id: "story", label: "Story", detail: "9:16", width: 1080, height: 1920 },
  { id: "portrait", label: "Post", detail: "4:5", width: 1080, height: 1350 },
  { id: "square", label: "Square", detail: "1:1", width: 1080, height: 1080 },
];

function shareCaption(summary: RecapSummary) {
  return `My ${summary.year} in motion: ${summary.activeDays} active days, ${summary.milestonesReached} milestones reached, and ${summary.goalsCompleted} goal${summary.goalsCompleted === 1 ? "" : "s"} completed. #GoMotivateMe`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = src;
  });
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

async function renderShareImage(
  summary: RecapSummary,
  identity: string,
  format: ShareFormat
) {
  const spec = SHARE_FORMATS.find((item) => item.id === format) ?? SHARE_FORMATS[0];
  const canvas = document.createElement("canvas");
  canvas.width = spec.width;
  canvas.height = spec.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image rendering is not supported in this browser.");

  await document.fonts.ready;
  const [summit, logo] = await Promise.all([
    loadImage("/illustrations/journey/summit.webp"),
    loadImage("/brand/GoMotivateMe_Logo_Wordmark.png"),
  ]);

  const { width, height } = spec;
  const isStory = format === "story";
  const isSquare = format === "square";
  const top = isStory ? 116 : isSquare ? 68 : 82;
  const titleSize = isStory ? 84 : isSquare ? 64 : 72;
  const titleLine = titleSize * 0.96;

  context.fillStyle = "#fbfaf6";
  context.fillRect(0, 0, width, height);

  context.textAlign = "center";
  context.fillStyle = "#1554c5";
  context.font = '500 26px "IBM Plex Mono", monospace';
  context.fillText(`YOUR YEAR IN MOTION — ${summary.year}`, width / 2, top);

  context.fillStyle = "#101813";
  context.font = `600 ${titleSize}px "IBM Plex Sans", sans-serif`;
  context.fillText("Your superpower:", width / 2, top + 108);
  context.fillText("Showing up.", width / 2, top + 108 + titleLine);

  const pillY = top + 108 + titleLine + 54;
  const pillWidth = Math.min(560, context.measureText(identity).width + 130);
  roundedRect(context, (width - pillWidth) / 2, pillY, pillWidth, 72, 36);
  context.strokeStyle = "#1554c5";
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = "#1554c5";
  context.font = '500 29px "IBM Plex Sans", sans-serif';
  context.fillText(identity, width / 2, pillY + 47);

  const statsY = pillY + (isSquare ? 138 : 164);
  const stats = [
    { value: summary.activeDays, label: "active days" },
    { value: summary.milestonesReached, label: "milestones reached" },
    { value: summary.goalsCompleted, label: "goals completed" },
  ];
  stats.forEach((stat, index) => {
    const x = width * ((index * 2 + 1) / 6);
    context.fillStyle = "#1554c5";
    context.font = `600 ${isSquare ? 46 : 58}px "IBM Plex Sans", sans-serif`;
    context.fillText(String(stat.value), x, statsY);
    context.fillStyle = "#2f3732";
    context.font = `400 ${isSquare ? 19 : 23}px "IBM Plex Sans", sans-serif`;
    context.fillText(stat.label, x, statsY + (isSquare ? 32 : 40));
    if (index < 2) {
      const dividerX = width * ((index + 1) / 3);
      context.strokeStyle = "#d5d1c8";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(dividerX, statsY - 58);
      context.lineTo(dividerX, statsY + 46);
      context.stroke();
    }
  });

  const artSize = isStory ? 1180 : isSquare ? 760 : 930;
  const artY = isStory ? height - artSize - 178 : isSquare ? 365 : height - artSize - 80;
  context.drawImage(summit, (width - artSize) / 2, artY, artSize, artSize);

  const footerY = height - (isStory ? 92 : 52);
  context.fillStyle = "rgba(251,250,246,0.92)";
  roundedRect(context, 48, footerY - 62, width - 96, 88, 28);
  context.fill();
  const logoHeight = 48;
  const logoWidth = (logo.naturalWidth / logo.naturalHeight) * logoHeight;
  context.drawImage(logo, (width - logoWidth) / 2, footerY - 43, logoWidth, logoHeight);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create the social image."));
    }, "image/png");
  });
}

function SocialShareComposer({
  summary,
  identity,
  onClose,
}: {
  summary: RecapSummary;
  identity: string;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<ShareFormat>("story");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [status, setStatus] = useState<"idle" | "copied" | "shared" | "downloaded" | "error">("idle");

  const filename = `gomotivateme-${summary.year}-year-in-motion-${format}.png`;

  useEffect(() => {
    let active = true;
    let nextUrl: string | null = null;
    setIsRendering(true);
    setStatus("idle");
    renderShareImage(summary, identity, format)
      .then((nextBlob) => {
        if (!active) return;
        nextUrl = URL.createObjectURL(nextBlob);
        setBlob(nextBlob);
        setPreviewUrl(nextUrl);
        setIsRendering(false);
      })
      .catch(() => {
        if (!active) return;
        setStatus("error");
        setIsRendering(false);
      });
    return () => {
      active = false;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [format, identity, summary]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const download = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("downloaded");
  };

  const copyCaption = async () => {
    await navigator.clipboard.writeText(shareCaption(summary));
    setStatus("copied");
  };

  const shareImage = async () => {
    if (!blob) return;
    const file = new File([blob], filename, { type: "image/png" });
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `My ${summary.year} year in motion`,
          text: shareCaption(summary),
        });
        setStatus("shared");
      } else {
        download();
      }
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") setStatus("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-recap-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 28, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[2rem] bg-[var(--color-surface)] shadow-2xl sm:rounded-[2rem]"
      >
        <div className="flex items-start justify-between border-b border-[var(--color-border)] px-5 py-4 sm:px-7">
          <div>
            <p className="font-mono text-[10px] font-medium tracking-[0.04em] text-[var(--color-primary)]">
              Ready for your socials
            </p>
            <h2 id="share-recap-title" className="mt-1 font-display text-2xl font-semibold tracking-[-0.035em]">
              Create your recap post
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share composer"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 sm:grid-cols-[minmax(0,1fr)_18rem] sm:p-7">
          <div className="grid min-h-[22rem] place-items-center overflow-hidden rounded-[1.5rem] bg-[var(--color-bg-elev)] p-4">
            {isRendering ? (
              <div className="text-center text-[var(--color-text-muted)]">
                <Loader2 className="mx-auto animate-spin text-[var(--color-primary)]" size={28} />
                <p className="mt-3 text-sm">Rendering your post…</p>
              </div>
            ) : previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={`Preview of your ${summary.year} ${format} recap post`}
                className="max-h-[58dvh] max-w-full rounded-xl object-contain shadow-lg"
              />
            ) : (
              <p className="text-sm text-[var(--color-danger)]">We couldn’t render this image. Try another format.</p>
            )}
          </div>

          <div className="flex flex-col">
            <p className="text-sm font-semibold">Choose a format</p>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-1">
              {SHARE_FORMATS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFormat(item.id)}
                  aria-pressed={format === item.id}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-left text-xs font-semibold transition sm:justify-between sm:text-sm ${
                    format === item.id
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{item.detail}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-[var(--color-bg-elev)] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <ImageIcon size={15} className="text-[var(--color-primary)]" /> Included on the image
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
                Your identity and aggregate recap stats. Goal names and private updates stay private.
              </p>
            </div>

            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={shareImage}
                disabled={!blob || isRendering}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)] disabled:cursor-wait disabled:opacity-50"
              >
                {status === "shared" ? <Check size={17} /> : <Share2 size={17} />}
                {status === "shared" ? "Shared" : "Share image"}
              </button>
              <button
                type="button"
                onClick={download}
                disabled={!blob || isRendering}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--color-border-strong)] text-sm font-semibold text-[var(--color-primary)] transition hover:border-[var(--color-primary)] disabled:opacity-50"
              >
                {status === "downloaded" ? <Check size={16} /> : <Download size={16} />}
                {status === "downloaded" ? "Downloaded" : "Download PNG"}
              </button>
              <button
                type="button"
                onClick={copyCaption}
                className="inline-flex h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:text-[var(--color-primary)]"
              >
                {status === "copied" ? <Check size={16} /> : <Copy size={16} />}
                {status === "copied" ? "Caption copied" : "Copy caption"}
              </button>
              {status === "error" && (
                <p className="text-center text-xs text-[var(--color-danger)]">Something went wrong. Please try again.</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SmallStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-2">
      <p className="font-display text-2xl font-semibold tracking-[-0.04em] tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}

function BigStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-2">
      <p className="font-display text-3xl font-semibold tracking-[-0.05em] text-[var(--color-primary)] tabular-nums sm:text-4xl">
        {value}
      </p>
      <p className="mx-auto mt-1 max-w-24 text-[11px] leading-4 text-[var(--color-text-secondary)] sm:text-xs">{label}</p>
    </div>
  );
}

function ProofStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Trophy;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-[var(--color-surface)] p-5 sm:p-7">
      <Icon size={20} className="text-[var(--color-primary)]" />
      <p className="mt-5 font-display text-4xl font-semibold tracking-[-0.055em] tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}
