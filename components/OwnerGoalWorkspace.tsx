"use client";

import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleGauge,
  Copy,
  ExternalLink,
  FileText,
  Flag,
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
  | "streak";

type WorkspaceGoal = {
  title: string;
  summary?: string;
  category?: string;
  status: string;
  currentValue?: number;
  targetValue?: number;
  supporterCount?: number;
  coreMotivatorMin?: number;
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
  owner,
  progress,
  publicUrl,
  linkCopied,
  updates,
  supporters,
  motivators,
  supporterName,
  onCopyLink,
  onOpenUpdate,
  onPostUpdate,
  milestoneEditor,
  updatesArchive,
  supporterInbox,
  circleManager,
  applicationQueue,
  settingsPanel,
}: {
  goal: WorkspaceGoal;
  coverUrl: string | null;
  owner: { name: string; image?: string | null };
  progress: number;
  publicUrl: string;
  linkCopied: boolean;
  updates: WorkspaceUpdate[] | undefined;
  supporters: WorkspaceSupporter[] | undefined;
  motivators: WorkspaceMotivator[] | undefined;
  supporterName?: string;
  onCopyLink: () => void;
  onOpenUpdate: (kind: OwnerUpdateKind) => void;
  onPostUpdate: (note: string) => Promise<void>;
  milestoneEditor?: ReactNode;
  updatesArchive?: ReactNode;
  supporterInbox?: ReactNode;
  circleManager?: ReactNode;
  applicationQueue?: ReactNode;
  settingsPanel?: ReactNode;
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
  const publicPath = publicUrl
    ? publicUrl.replace(/^https?:\/\/[^/]+/, "")
    : "/o/your-handle/your-goal";
  const publicLabel = publicUrl.startsWith("http")
    ? publicUrl.replace(/^https?:\/\//, "")
    : `gomotivateme.com${publicPath}`;

  const navItems: WorkspaceNavItem[] = [
    { label: "Overview", href: "#overview", icon: Home, active: true },
    { label: "Milestones", href: "#milestones", icon: Flag },
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

  const nextAction = firstIncomplete?.title
    ? `Define your ${firstIncomplete.title.toLowerCase()}`
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
    <WorkspaceShell
      items={navItems}
      asideFooter={
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <p className="text-sm font-bold text-[#282925]">Your public link</p>
          <p className="mt-2 break-all text-xs leading-5 text-[#6c706f]">{publicLabel}</p>
          <a
            href={publicUrl || "#public-page"}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border-strong)] px-3 text-xs font-semibold text-[#30312d] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            View public page
            <ArrowUpRight size={14} aria-hidden />
          </a>
          <button
            type="button"
            onClick={onCopyLink}
            className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border-strong)] px-3 text-xs font-semibold text-[#30312d] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            {linkCopied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
            {linkCopied ? "Copied" : "Copy link"}
          </button>
        </div>
      }
    >
      <div id="overview" className="scroll-mt-24 space-y-4">
        <section className="workspace-card grid min-h-[11rem] gap-5 p-4 md:grid-cols-[17.5rem_minmax(0,1fr)] xl:grid-cols-[17.5rem_minmax(0,1fr)_14rem]">
          <div className="relative min-h-40 overflow-hidden rounded-[0.95rem] bg-[#eceae1] md:min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl || "/illustrations/hero-community-v3.webp"}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>

          <div className="flex min-w-0 flex-col justify-center py-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#d9f5e4] px-3 py-1 text-xs font-bold text-[#188451]">
                {titleCase(goal.status)}
              </span>
              <span className="text-xs font-medium text-[#777872]">
                {titleCase(goal.category || "Goal")}
              </span>
            </div>
            <h1 className="mt-5 font-display text-[clamp(2rem,3vw,2.65rem)] font-bold leading-[0.96] tracking-[-0.055em] text-[#242421]">
              {goal.title}
            </h1>
            <p className="mt-3 max-w-[42rem] text-sm leading-6 text-[#6c706f]">
              {goal.summary || "A public goal made stronger by the people behind it."}
            </p>
          </div>

          <div className="flex flex-col justify-center gap-2 md:col-span-2 xl:col-span-1">
            <a
              href={publicUrl || "#public-page"}
              target="_blank"
              rel="noreferrer"
              className="workspace-button-primary"
            >
              Preview public page
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
          className="workspace-card !mt-[1.125rem] overflow-hidden"
        >
          <div className="grid min-h-[7rem] grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-[1.15fr_repeat(4,1fr)]">
            <MomentumStat
              icon={CircleGauge}
              label="Goal progress"
              value={`${Math.round(safeProgress)}%`}
              detail={safeProgress >= 100 ? "Complete" : "On track"}
              progress={safeProgress}
            />
            <MomentumStat
              icon={Flag}
              label="Milestones"
              value={`${goal.currentValue ?? milestones.filter((m) => m.done).length} of ${
                goal.targetValue ?? milestones.length
              }`}
              detail={firstIncomplete?.title || "All complete"}
            />
            <MomentumStat
              icon={Users}
              label="Supporters"
              value={String(supporterCount)}
              detail={resolvedSupporterName}
            />
            <MomentumStat
              icon={Target}
              label="Motivation circle"
              value={`${coreMotivators.length} of 6`}
              detail={coreMotivators.length ? "motivators set" : "motivators to add"}
            />
            <MomentumStat
              icon={MessageCircle}
              label="Updates"
              value={String(updates?.length ?? 0)}
              detail="updates shared"
              className="min-[420px]:col-span-2 sm:col-span-1"
            />
          </div>
        </section>

        <div className="!mt-[1.3125rem] grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.94fr)]">
          <div className="space-y-3">
            <form onSubmit={postNote} className="workspace-card p-4">
              <h2 className="text-base font-bold text-[#262723]">Share an update</h2>
              <div className="mt-2 flex items-start gap-3">
                <Avatar name={owner.name} image={owner.image} size="md" />
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={2}
                  placeholder="What progress have you made?"
                  className="min-h-16 flex-1 resize-none rounded-xl border border-[var(--color-border-strong)] bg-white px-4 py-2.5 text-base leading-6 text-[#292929] placeholder:text-[#93958e] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 pl-0 sm:pl-12">
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
                  icon={Flag}
                  label="Milestone"
                  onClick={() => onOpenUpdate("milestone")}
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

            <section id="milestones" className="workspace-card scroll-mt-24 p-4 pb-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#262723]">Milestone path</h2>
                </div>
                <a
                  href="#milestone-editor"
                  className="text-xs font-bold text-[var(--color-primary)] hover:underline"
                >
                  Manage
                </a>
              </div>
              <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {milestones.map((milestone, index) => (
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
                          milestone.done ? "bg-[#39a96b]" : "bg-[#deddd6]"
                        }`}
                      />
                    ) : null}
                    <span
                      className={`relative z-10 grid h-9 w-9 place-items-center rounded-full border-2 bg-white text-sm font-bold transition ${
                        milestone.done
                          ? "border-[#25a85f] bg-[#e9f8ef] text-[#168046]"
                          : index === milestones.findIndex((item) => !item.done)
                          ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                          : "border-[#deddd6] text-[#777872] group-hover:border-[var(--color-primary)]"
                      }`}
                    >
                      {milestone.done ? <Check size={18} aria-hidden /> : index + 1}
                    </span>
                    <span className="mt-2 block truncate text-sm font-bold text-[#30312d]">
                      {milestone.title}
                    </span>
                    <span
                      className={`mt-1 block text-xs ${
                        milestone.done
                          ? "text-[#1f8d51]"
                          : index === milestones.findIndex((item) => !item.done)
                          ? "text-[var(--color-primary)]"
                          : "text-[#8b8d86]"
                      }`}
                    >
                      {milestone.done ? "Complete" : index === milestones.findIndex((item) => !item.done) ? "Next" : "Upcoming"}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section id="updates" className="workspace-card scroll-mt-24 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#262723]">Recent activity</h2>
                <a href="#all-updates" className="text-xs font-bold text-[var(--color-primary)] hover:underline">
                  View all updates
                </a>
              </div>
              <div className="mt-4 space-y-4">
                {updates === undefined ? (
                  <>
                    <div className="h-14 animate-pulse rounded-xl bg-[#f2f0e9]" />
                    <div className="h-14 animate-pulse rounded-xl bg-[#f2f0e9]" />
                  </>
                ) : updates.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] px-4 py-7 text-center">
                    <Sparkles className="mx-auto text-[var(--color-primary)]" size={22} aria-hidden />
                    <p className="mt-2 text-sm font-semibold text-[#33342f]">Your first update starts the story.</p>
                  </div>
                ) : (
                  updates.slice(0, 3).map((update) => (
                    <div key={update._id} className="flex gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        {update.type === "milestone" ? <Flag size={16} aria-hidden /> : <MessageCircle size={16} aria-hidden />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-bold text-[#2e2f2a]">
                            {update.type === "milestone" ? "Milestone updated" : "Update posted"}
                          </p>
                          <time className="text-xs text-[#92948e]">{timeAgo(update.createdAt)}</time>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#6c706f]">
                          {update.note || "Progress shared with your support circle."}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="workspace-card p-3">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-gold-soft)] text-[#9a6b00]">
                  <Sparkles size={18} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#292a26]">Next best action</p>
                  <div className="mt-2 rounded-xl border border-[var(--color-border)] bg-[#fbfaf5] p-2.5">
                    <p className="font-bold text-[#292a26]">{nextAction}</p>
                    <p className="mt-1.5 text-xs leading-5 text-[#6c706f]">
                      Clarify the outcome, success metrics, and the next concrete step.
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenUpdate("milestone")}
                      className="workspace-button-primary mt-2 min-h-9"
                    >
                      Create plan
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="workspace-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#292a26]">Top supporter</h2>
                <a href="#supporters" className="text-xs font-bold text-[var(--color-primary)] hover:underline">
                  View all
                </a>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={resolvedSupporterName} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#292a26]">{resolvedSupporterName}</p>
                  <p className="mt-0.5 truncate text-xs text-[#777872]">
                    Encourager · Regular check-ins
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => document.getElementById("supporters")?.scrollIntoView({ behavior: "smooth" })}
                className="mt-3 min-h-10 w-full rounded-xl bg-[#f2f0e9] px-3 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]"
              >
                Send thank you
              </button>
            </section>

            <section id="support-circle" className="workspace-card scroll-mt-24 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#292a26]">Motivation circle</h2>
                <a href="#circle-manager" className="text-xs font-bold text-[var(--color-primary)] hover:underline">
                  View all
                </a>
              </div>
              <p className="mt-1 text-xs font-semibold text-[#4f514b]">
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
                      className="aspect-square rounded-full border border-dashed border-[#c9c8c0] bg-[#faf9f5]"
                    />
                  );
                })}
              </div>
              <div className="mt-4 rounded-xl border border-[#d7e6ff] bg-[#eef6ff] p-3">
                <p className="text-xs leading-5 text-[#53616f]">
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

        {milestoneEditor ? (
          <section id="milestone-editor" className="workspace-detail-section scroll-mt-24">
            {milestoneEditor}
          </section>
        ) : null}
        {updatesArchive ? (
          <section id="all-updates" className="workspace-detail-section scroll-mt-24">
            {updatesArchive}
          </section>
        ) : null}
        {supporterInbox ? (
          <section id="supporters" className="workspace-detail-section scroll-mt-24">
            {supporterInbox}
          </section>
        ) : null}
        {circleManager || applicationQueue ? (
          <section id="circle-manager" className="workspace-detail-section scroll-mt-24">
            <div className="grid gap-4 xl:grid-cols-2">
              {circleManager}
              {applicationQueue}
            </div>
          </section>
        ) : null}
        {settingsPanel ? (
          <section id="settings" className="workspace-detail-section scroll-mt-24">
            {settingsPanel}
          </section>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] py-5 text-xs text-[#85877f] lg:hidden">
          <span>{publicLabel}</span>
          <button
            type="button"
            onClick={onCopyLink}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border-strong)] px-4 font-bold text-[#33342f]"
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
  className = "",
}: {
  icon: typeof CircleGauge;
  label: string;
  value: string;
  detail: string;
  progress?: number;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 items-center gap-3 border-r border-b border-[var(--color-border)] px-4 py-4 last:border-r-0 xl:border-b-0 ${className}`}>
      <Icon
        size={32}
        strokeWidth={1.65}
        aria-hidden
        className={progress !== undefined ? "shrink-0 text-[var(--color-primary)]" : "shrink-0 text-[#4d4f49]"}
      />
      <div className="min-w-0">
        <p className="truncate text-[0.67rem] font-bold uppercase tracking-[0.12em] text-[#858780]">
          {label}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <strong className="truncate text-xl tracking-[-0.035em] text-[#242521]">{value}</strong>
          {progress !== undefined ? (
            <span className="text-xs font-bold text-[var(--color-primary)]">On track</span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-[#7b7d76]">{detail}</p>
        {progress !== undefined ? (
          <div className="mt-2 h-1 w-24 overflow-hidden rounded-full bg-[#e4e3dc]">
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
      className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--color-border-strong)] bg-white px-3 text-xs font-semibold text-[#33342f] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
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
    return <img src={image} alt="" className={`${dimensions} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-[#5865c7] font-bold text-white ${dimensions}`}
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
