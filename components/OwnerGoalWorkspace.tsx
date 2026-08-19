"use client";

import {
  CalendarDays,
  Check,
  CircleGauge,
  Copy,
  ExternalLink,
  FileText,
  Flag,
  Flame,
  Home,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageCircle,
  Send,
  Settings,
  Share2,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { FormEvent, ReactNode, useMemo, useState } from "react";
import { WorkspaceShell, type WorkspaceNavItem } from "@/components/WorkspaceShell";

export type OwnerUpdateKind =
  | "note"
  | "media"
  | "link"
  | "value"
  | "milestone"
  | "streak"
  | "progress";

type WorkspaceGoal = {
  title: string;
  summary?: string;
  category?: string;
  status: string;
  currentValue?: number;
  targetValue?: number;
  supporterCount?: number;
  coreMotivatorMin?: number;
  progressType?: string;
  unit?: string;
  streakBest?: number;
  streakLastLoggedDay?: string;
  streakTimezoneOffsetMinutes?: number;
  streakIsBroken?: boolean;
  milestones?: Array<{
    id: string;
    title: string;
    done: boolean;
    completedAt?: number;
  }>;
};

type WorkspaceUpdate = {
  _id: string;
  type: string;
  note?: string;
  value?: number;
  createdAt: number;
};

type WorkspaceSupporter = {
  _id: string;
  supportType?: string;
  pledge?: string;
  createdAt: number;
};

type WorkspaceMotivator = {
  _id: string;
  role?: string;
  checkInFrequency?: string;
  user?: {
    displayName?: string | null;
    name?: string | null;
    image?: string | null;
  } | null;
};

export function OwnerGoalWorkspace({
  goal,
  coverUrl,
  progress,
  publicUrl,
  linkCopied,
  updates,
  supporters,
  motivators,
  supporterName,
  nextActionPanel,
  onCopyLink,
  onOpenUpdate,
  onPostUpdate,
  onUndoUpdate,
  milestoneEditor,
  updatesArchive,
  supporterInbox,
  circleManager,
  applicationQueue,
  settingsPanel,
  partnerPanel,
}: {
  goal: WorkspaceGoal;
  coverUrl: string | null | undefined;
  progress: number;
  publicUrl: string;
  linkCopied: boolean;
  updates: WorkspaceUpdate[] | undefined;
  supporters: WorkspaceSupporter[] | undefined;
  motivators: WorkspaceMotivator[] | undefined;
  supporterName?: string;
  nextActionPanel?: ReactNode;
  onCopyLink: () => void;
  onOpenUpdate: (kind: OwnerUpdateKind) => void;
  onPostUpdate: (note: string) => Promise<void>;
  onUndoUpdate?: (updateId: string) => void;
  milestoneEditor?: ReactNode;
  updatesArchive?: ReactNode;
  supporterInbox?: ReactNode;
  circleManager?: ReactNode;
  applicationQueue?: ReactNode;
  settingsPanel?: ReactNode;
  partnerPanel?: ReactNode;
}) {
  const [note, setNote] = useState("");
  const [posting, setPosting] = useState(false);
  const safeProgress = Math.max(0, Math.min(100, progress));
  const milestones = goal.milestones ?? [];
  const firstIncomplete = milestones.find((milestone) => !milestone.done);
  const supporterCount = goal.supporterCount ?? supporters?.length ?? 0;
  const coreMotivators = (motivators ?? []).filter((motivator: any) =>
    "isCoreMotivator" in motivator ? motivator.isCoreMotivator : true
  );
  const streakOffset =
    goal.streakTimezoneOffsetMinutes ?? new Date().getTimezoneOffset();
  const streakTodayKey = new Date(Date.now() - streakOffset * 60_000)
    .toISOString()
    .slice(0, 10);
  const streakLoggedToday = goal.streakLastLoggedDay === streakTodayKey;
  const publicPath = publicUrl
    ? publicUrl.replace(/^https?:\/\/[^/]+/, "")
    : "/o/your-handle/your-goal";
  const publicLabel = publicUrl.startsWith("http")
    ? publicUrl.replace(/^https?:\/\//, "")
    : `gomotivateme.com${publicPath}`;

  const navItems: WorkspaceNavItem[] = [
    { label: "Overview", href: "#overview", icon: Home, active: true },
    ...(goal.progressType === "milestones"
      ? [{ label: "Milestones", href: "#milestones", icon: Flag }]
      : []),
    { label: "Updates", href: "#updates", icon: MessageCircle },
    { label: "Support circle", href: "#support-circle", icon: Users },
    { label: "Public page", href: publicUrl || "#public-page", icon: ExternalLink, external: true },
    { label: "Settings", href: "#settings", icon: Settings },
  ];

  const postNote = async (event: FormEvent) => {
    event.preventDefault();
    const value = note.trim();
    if (!value || posting) return;
    setPosting(true);
    try {
      await onPostUpdate(value);
      setNote("");
    } finally {
      setPosting(false);
    }
  };

  const nextAction =
    goal.progressType === "milestones" && firstIncomplete?.title
      ? `Define your ${firstIncomplete.title.toLowerCase()}`
      : goal.progressType === "streak"
      ? streakLoggedToday
        ? "Today's streak is safe"
        : "Mark today's progress"
      : goal.progressType === "number"
      ? `Log your ${goal.unit ?? "progress"}`
      : "Share what you learned";

  const resolvedSupporterName =
    supporterName ??
    coreMotivators[0]?.user?.displayName ??
    coreMotivators[0]?.user?.name ??
    (supporterCount > 0 ? "A supporter" : "No supporters yet");

  const relative = useMemo(
    () =>
      new Intl.RelativeTimeFormat("en", {
        numeric: "auto",
        style: "narrow",
      }),
    []
  );

  const timeAgo = (timestamp: number) => {
    const delta = timestamp - Date.now();
    const hours = Math.round(delta / 3_600_000);
    if (Math.abs(hours) < 24) return relative.format(hours, "hour");
    return relative.format(Math.round(hours / 24), "day");
  };

  return (
    <WorkspaceShell items={navItems}>
      <div id="overview" className="scroll-mt-24 space-y-4">
        <section className="grid min-h-[12rem] gap-5 overflow-hidden rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)_14rem]">
          <div className="relative min-h-48 overflow-hidden rounded-[1.25rem] bg-[var(--color-bg-sunken)] md:min-h-0">
            {coverUrl === undefined ? (
              <div className="absolute inset-0 animate-pulse bg-[var(--color-bg-sunken)]" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl || "/illustrations/journey/move.webp"}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </div>

          <div className="flex min-w-0 flex-col justify-center py-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-[2px] bg-[var(--color-success-soft)] px-3 py-1 font-mono text-xs font-medium text-[var(--color-success-text)]">
                {titleCase(goal.status)}
              </span>
              <span className="text-xs font-medium text-[var(--color-text-muted)]">
                {titleCase(goal.category || "Goal")}
              </span>
            </div>
            <h1 className="mt-5 max-w-[19ch] text-balance font-display text-[clamp(2.35rem,3.8vw,3.5rem)] font-semibold leading-[0.94] tracking-[-0.06em] text-[var(--color-text)]">
              {goal.title}
            </h1>
            <p className="mt-3 max-w-[42rem] text-sm leading-6 text-[var(--color-text-muted)]">
              {goal.summary || "A public goal."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 md:col-span-2 xl:col-span-1 xl:flex xl:flex-col">
            <a
              href={publicUrl || "#public-page"}
              target="_blank"
              rel="noreferrer"
              className="workspace-button-primary"
            >
              <span className="sm:hidden">Preview</span>
              <span className="hidden sm:inline">Preview public page</span>
              <ExternalLink size={15} aria-hidden />
            </a>
            <button type="button" onClick={onCopyLink} className="workspace-button-secondary">
              <Share2 size={16} aria-hidden />
              {linkCopied ? "Link copied" : "Share goal"}
            </button>
          </div>
        </section>

        <section
          aria-label="Goal momentum"
          className="!mt-[1.125rem] overflow-hidden rounded-[1.5rem] bg-[var(--color-bg-elev)] p-3"
        >
          <div className="grid min-h-[7rem] grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-12">
            <MomentumStat
              icon={CircleGauge}
              label="Goal progress"
              value={`${Math.round(safeProgress)}%`}
              detail={safeProgress >= 100 ? "Complete" : "On track"}
              progress={safeProgress}
              variant="card"
              className="col-span-2 sm:col-span-1 xl:col-span-4"
            />
            <MomentumStat
              icon={goal.progressType === "streak" ? Flame : goal.progressType === "number" ? CircleGauge : Flag}
              label={goal.progressType === "streak" ? "Streak" : goal.progressType === "number" ? "Progress" : "Milestones"}
              value={
                goal.progressType === "streak"
                  ? `${goal.currentValue ?? 0}d`
                  : `${goal.currentValue ?? milestones.filter((m) => m.done).length} of ${goal.targetValue ?? milestones.length}`
              }
              detail={
                goal.progressType === "milestones"
                  ? firstIncomplete?.title || "All complete"
                  : goal.progressType === "streak"
                  ? `best ${goal.streakBest ?? goal.currentValue ?? 0}d`
                  : goal.unit ?? "units"
              }
              variant="card"
              className="xl:col-span-2"
            />
            <MomentumStat
              icon={Users}
              label="Supporters"
              value={String(supporterCount)}
              detail={resolvedSupporterName}
              variant="card"
              className="xl:col-span-2"
            />
            <MomentumStat
              icon={Target}
              label="Motivation circle"
              value={`${coreMotivators.length} of 6`}
              detail={coreMotivators.length ? "motivators set" : "motivators to add"}
              variant="card"
              className="xl:col-span-2"
            />
            <MomentumStat
              icon={MessageCircle}
              label="Updates"
              value={String(updates?.length ?? 0)}
              detail="updates shared"
              variant="card"
              className="xl:col-span-2"
            />
          </div>
        </section>

        <div className="!mt-[1.3125rem] grid items-start gap-4 xl:grid-cols-12">
          <div className="space-y-3 xl:col-span-8">
            <form onSubmit={postNote} className="workspace-card p-4">
              <h2 className="text-base font-bold text-[var(--color-text)]">Share an update</h2>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                placeholder="What progress have you made?"
                className="workspace-input mt-2 min-h-16 w-full resize-none px-4 py-2.5 leading-6"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ComposerAction
                  icon={FileText}
                  label="Note"
                  onClick={() => onOpenUpdate("note")}
                />
                <ComposerAction
                  icon={ImageIcon}
                  label="Photo"
                  onClick={() => onOpenUpdate("media")}
                />
                <ComposerAction
                  icon={LinkIcon}
                  label="Link"
                  onClick={() => onOpenUpdate("link")}
                />
                <button
                  type="submit"
                  disabled={!note.trim() || posting}
                  className="workspace-button-primary ml-auto min-h-9 w-auto px-5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {posting ? "Posting…" : "Post update"}
                  <Send size={14} aria-hidden />
                </button>
              </div>
            </form>

            {goal.progressType === "milestones" && (
            <section id="milestones" className="workspace-card scroll-mt-24 p-4 pb-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[var(--color-text)]">Milestone path</h2>
                </div>
                <a
                  href="#milestone-editor"
                  className="text-xs font-bold text-[var(--color-primary)] hover:underline"
                >
                  Manage
                </a>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 lg:grid-cols-4">
                {milestones.length === 0 ? (
                  <p className="col-span-full py-4 text-center text-sm text-[var(--color-text-muted)]">
                    No milestones yet. Add some below.
                  </p>
                ) : milestones.map((milestone, index) => (
                  <button
                    key={milestone.id}
                    type="button"
                    onClick={() => onOpenUpdate("milestone")}
                    className="group relative min-w-0 text-left"
                  >
                    {index < milestones.length - 1 ? (
                      <span
                        aria-hidden
                        className={`absolute left-9 right-[-1rem] top-[1.125rem] hidden h-px sm:block ${
                          milestone.done ? "bg-[var(--color-success)]" : "bg-[var(--color-bg-sunken)]"
                        }`}
                      />
                    ) : null}
                    <span
                      className={`relative z-10 grid h-9 w-9 place-items-center rounded-full border-2 bg-white text-sm font-bold transition ${
                        milestone.done
                          ? "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success-text)]"
                          : index === milestones.findIndex((item) => !item.done)
                          ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                          : "border-[var(--color-border)] text-[var(--color-text-muted)] group-hover:border-[var(--color-primary)]"
                      }`}
                    >
                      {milestone.done ? <Check size={18} aria-hidden /> : index + 1}
                    </span>
                    <span className="mt-2 block truncate text-sm font-bold text-[var(--color-text)]">
                      {milestone.title}
                    </span>
                    <span
                      className={`mt-1 block text-xs ${
                        milestone.done
                          ? "text-[var(--color-success-text)]"
                          : index === milestones.findIndex((item) => !item.done)
                          ? "text-[var(--color-primary)]"
                          : "text-[var(--color-text-dim)]"
                      }`}
                    >
                      {milestone.done ? "Complete" : index === milestones.findIndex((item) => !item.done) ? "Next" : "Upcoming"}
                    </span>
                  </button>
                ))}
              </div>
            </section>
            )}

            <section id="updates" className="workspace-card scroll-mt-24 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[var(--color-text)]">Recent activity</h2>
                <a href="#all-updates" className="text-xs font-bold text-[var(--color-primary)] hover:underline">
                  View all updates
                </a>
              </div>
              <div className="mt-4 space-y-3 sm:space-y-4">
                {updates === undefined ? (
                  <>
                    <div className="h-14 animate-pulse rounded-[var(--workspace-radius)] bg-[var(--color-bg-elev)]" />
                    <div className="h-14 animate-pulse rounded-[var(--workspace-radius)] bg-[var(--color-bg-elev)]" />
                  </>
                ) : updates.length === 0 ? (
                  <div className="rounded-[var(--workspace-radius)] border border-dashed border-[var(--color-border-strong)] px-4 py-7 text-center">
                    <Sparkles className="mx-auto text-[var(--color-primary)]" size={22} aria-hidden />
                    <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">Your first update starts the story.</p>
                  </div>
                ) : (
                  updates.slice(0, 3).map((update) => (
                    <div key={update._id} className="flex gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        {update.type === "milestone" ? <Flag size={16} aria-hidden /> : update.type === "value" ? <CircleGauge size={16} aria-hidden /> : <MessageCircle size={16} aria-hidden />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-bold text-[var(--color-text)]">
                            {update.type === "milestone"
                              ? "Milestone updated"
                              : update.type === "value"
                              ? goal.unit === "days"
                                ? `Day ${update.value ?? 0} streak`
                                : `Reached ${update.value ?? 0} ${goal.unit ?? ""}`.trim()
                              : "Update posted"}
                          </p>
                          <div className="flex items-center gap-2">
                            {(update.type === "value" || update.type === "milestone") && onUndoUpdate && (
                              <button
                                type="button"
                                onClick={() => onUndoUpdate(update._id)}
                                className="text-xs font-medium text-[var(--color-text-dim)] underline transition hover:text-[var(--color-danger)]"
                              >
                                Undo
                              </button>
                            )}
                            <time className="text-xs text-[var(--color-text-dim)]">{timeAgo(update.createdAt)}</time>
                          </div>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--color-text-muted)]">
                          {update.note || "Progress shared with your support circle."}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-4 xl:col-span-4">
            <div>
            {nextActionPanel ?? <section className="workspace-card p-3">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-gold-soft)] text-[var(--color-gold-text)]">
                  <Sparkles size={18} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[var(--color-text)]">Next best action</p>
                  <div className="mt-2">
                    <p className="font-bold text-[var(--color-text)]">{nextAction}</p>
                    <p className="mt-1.5 text-xs leading-5 text-[var(--color-text-muted)]">
                      {goal.progressType === "milestones"
                        ? "Clarify the outcome, success metrics, and the next concrete step."
                        : goal.progressType === "streak"
                        ? streakLoggedToday
                          ? "You showed up today. Come back tomorrow to keep the chain going."
                          : "Keep your streak alive. Log today and stay on track."
                        : "Update your progress and keep your supporters in the loop."}
                    </p>
                    <button
                      type="button"
                      disabled={goal.progressType === "streak" && streakLoggedToday}
                      onClick={() =>
                        onOpenUpdate(
                          goal.progressType === "milestones"
                            ? "milestone"
                            : goal.progressType === "streak"
                            ? "streak"
                            : "progress"
                        )
                      }
                      className="workspace-button-primary mt-2 min-h-9 disabled:cursor-default disabled:opacity-55"
                    >
                      {goal.progressType === "milestones"
                        ? "Create plan"
                        : goal.progressType === "streak"
                        ? streakLoggedToday ? "Done for today" : "Mark today"
                        : "Log progress"}
                    </button>
                  </div>
                </div>
              </div>
            </section>}
            </div>
            {partnerPanel}

            <section className="workspace-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[var(--color-text)]">Top supporter</h2>
                <a href="#supporters" className="text-xs font-bold text-[var(--color-primary)] hover:underline">
                  View all
                </a>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={resolvedSupporterName} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--color-text)]">{resolvedSupporterName}</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                    Encourager · Regular check-ins
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => document.getElementById("supporters")?.scrollIntoView({ behavior: "smooth" })}
                className="workspace-button-secondary mt-3 min-h-10 px-3 text-xs"
              >
                Send thank you
              </button>
            </section>

            <section id="support-circle" className="workspace-card scroll-mt-24 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[var(--color-text)]">Motivation circle</h2>
                <a href="#circle-manager" className="text-xs font-bold text-[var(--color-primary)] hover:underline">
                  View all
                </a>
              </div>
              <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                {coreMotivators.length} of 6 core motivators
              </p>
              <div className="mt-4 grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, index) => {
                  const motivator = coreMotivators[index];
                  const name =
                    motivator?.user?.displayName ?? motivator?.user?.name ?? `Motivator ${index + 1}`;
                  if (motivator) {
                    return <Avatar key={motivator._id} name={name} image={motivator.user?.image} size="slot" />;
                  }
                  return (
                    <span
                      key={index}
                      aria-label="Open motivator spot"
                      className="aspect-square rounded-full border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg)]"
                    />
                  );
                })}
              </div>
              <div className="workspace-card-soft mt-4 border-[var(--color-primary-soft)] bg-[var(--color-accent-soft)] p-3">
                <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
                  Add the people and reasons that keep you going when momentum dips.
                </p>
                <a
                  href="#circle-manager"
                  className="mt-2 inline-flex min-h-9 items-center font-bold text-[var(--color-primary)]"
                >
                  Add motivators
                </a>
              </div>
            </section>
          </aside>
        </div>

        <div className="!mt-4 grid items-start gap-4 xl:grid-flow-row-dense xl:grid-cols-12">
        {milestoneEditor ? (
          <section id="milestone-editor" className="scroll-mt-24 xl:col-span-8">
            {milestoneEditor}
          </section>
        ) : null}
        {updatesArchive ? (
          <section id="all-updates" className="scroll-mt-24 xl:col-span-8">
            {updatesArchive}
          </section>
        ) : null}
        {supporterInbox ? (
          <section id="supporters" className="scroll-mt-24 xl:col-span-4">
            {supporterInbox}
          </section>
        ) : null}
        {circleManager || applicationQueue ? (
          <section id="circle-manager" className="scroll-mt-24 xl:col-span-4">
            <div className="grid gap-4">
              {circleManager}
              {applicationQueue}
            </div>
          </section>
        ) : null}
        {settingsPanel ? (
          <section id="settings" className="scroll-mt-24 xl:col-span-12">
            {settingsPanel}
          </section>
        ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] py-5 text-xs text-[var(--color-text-dim)] lg:hidden">
          <span>{publicLabel}</span>
          <button
            type="button"
            onClick={onCopyLink}
            className="workspace-button-secondary min-h-11 w-auto px-4"
          >
            {linkCopied ? <Check size={14} /> : <Copy size={14} />}
            {linkCopied ? "Copied" : "Copy public link"}
          </button>
        </div>
      </div>
    </WorkspaceShell>
  );
}

export function MomentumStat({
  icon: Icon,
  label,
  value,
  detail,
  progress,
  variant = "joined",
  className = "",
}: {
  icon: typeof CircleGauge;
  label: string;
  value: string;
  detail: string;
  progress?: number;
  variant?: "joined" | "card";
  className?: string;
}) {
  const containerClass =
    variant === "card"
      ? "rounded-[1.25rem] bg-[var(--color-surface)] px-3 py-4 sm:px-4"
      : "border-r border-b border-[var(--color-border)] px-3 py-3 last:border-r-0 sm:px-4 sm:py-4 xl:border-b-0";
  return (
    <div className={`flex min-w-0 items-center gap-2.5 sm:gap-3 ${containerClass} ${className}`}>
      <Icon
        size={32}
        strokeWidth={1.65}
        aria-hidden
        className={
          progress !== undefined
            ? "h-7 w-7 shrink-0 text-[var(--color-primary)] sm:h-8 sm:w-8"
            : "h-7 w-7 shrink-0 text-[var(--color-text-secondary)] sm:h-8 sm:w-8"
        }
      />
      <div className="min-w-0">
        <p className="truncate font-mono text-[0.67rem] font-medium text-[var(--color-text-dim)]">
          {label}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <strong className="truncate text-lg tracking-[-0.035em] text-[var(--color-text)] sm:text-xl">{value}</strong>
        </div>
        <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{detail}</p>
        {progress !== undefined ? (
          <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-bg-sunken)]">
            <div
              className="h-full rounded-full bg-[var(--color-primary)]"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ComposerAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof FileText;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-9 items-center gap-2 rounded-[2px] border border-[var(--color-border-strong)] bg-white px-3 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] active:translate-y-px"
    >
      <Icon size={15} strokeWidth={1.8} aria-hidden />
      {label}
    </button>
  );
}

export function Avatar({
  name,
  image,
  size = "md",
}: {
  name: string;
  image?: string | null;
  size?: "md" | "lg" | "slot";
}) {
  const dimensions =
    size === "lg"
      ? "h-11 w-11 text-sm"
      : size === "slot"
      ? "aspect-square w-full text-[0.65rem]"
      : "h-9 w-9 text-xs";
  const initials =
    name
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={`${name}'s avatar`} className={`${dimensions} shrink-0 rounded-full border-2 border-white object-cover shadow-sm`} />;
  }
  return (
    <span
      aria-label={`${name}'s avatar`}
      className={`grid shrink-0 place-items-center rounded-full border-2 border-white bg-[var(--color-primary)] font-bold text-white shadow-sm ${dimensions}`}
    >
      {initials}
    </span>
  );
}

export function titleCase(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
