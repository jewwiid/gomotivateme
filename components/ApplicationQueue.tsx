"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Heart,
  Lightbulb,
  Calendar,
  Target,
  Users,
  X,
  Clock,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { displayName } from "@/lib/format";
import { AiAssistButton, AiDraftDisclosure } from "@/components/AiAssist";
import { aiAssistantErrorMessage } from "@/lib/aiAssistant";
import { trackDataFastGoal } from "@/lib/analytics";

const ROLE_META: Record<
  string,
  { label: string; icon: typeof Heart; color: string }
> = {
  encourager: { label: "Encourager", icon: Heart, color: "text-[var(--color-danger)]" },
  accountability: {
    label: "Accountability",
    icon: Calendar,
    color: "text-[var(--color-success-text)]",
  },
  advice: { label: "Advice", icon: Lightbulb, color: "text-[var(--color-gold)]" },
  review: { label: "Review", icon: Target, color: "text-[var(--color-primary)]" },
  challenge: { label: "Challenge", icon: Users, color: "text-[var(--color-primary)]" },
};

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function ApplicationQueue({ goalId }: { goalId: Id<"goals"> }) {
  const apps = useQuery(api.motivation.listPendingApplications, { goalId });
  const approve = useMutation(api.motivation.approveApplication);
  const decline = useMutation(api.motivation.declineApplication);
  const summarizeApplications = useAction(api.aiCoach.summarizeApplications);
  const recordAiOutcome = useMutation(api.aiOperations.recordOutcome);
  const [busyId, setBusyId] = useState<Id<"motivatorApplications"> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<{
    overview: string;
    applications: Array<{
      index: number;
      intent: string;
      clarifyQuestion: string | null;
      caution: string | null;
    }>;
  } | null>(null);

  const list = apps ?? [];
  const count = list.length;

  if (count === 0) {
    return (
      <div className="workspace-card p-5">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[var(--color-text-dim)]" />
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">
            Public motivator applications
          </div>
        </div>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          None pending. When someone applies to motivate this goal, it'll show
          up here.
        </p>
      </div>
    );
  }

  const onApprove = async (appId: Id<"motivatorApplications">) => {
    setBusyId(appId);
    setErr(null);
    try {
      await approve({ applicationId: appId });
      setAiSummary(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't approve");
    } finally {
      setBusyId(null);
    }
  };

  const onDecline = async (appId: Id<"motivatorApplications">) => {
    setBusyId(appId);
    setErr(null);
    try {
      await decline({ applicationId: appId });
      setAiSummary(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't decline");
    } finally {
      setBusyId(null);
    }
  };

  const requestSummary = async () => {
    setAiBusy(true);
    setAiErr(null);
    try {
      const result = await summarizeApplications({ goalId });
      setAiSummary({ overview: result.overview, applications: result.applications });
      void recordAiOutcome({ usageEventId: result.usageEventId, outcome: "viewed" });
      trackDataFastGoal("ai_summary_viewed", { feature: "applications" });
    } catch (error) {
      setAiErr(aiAssistantErrorMessage(error));
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="workspace-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-[var(--color-gold)]" />
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">
            Public motivator applications
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AiAssistButton
            label={aiSummary ? "Refresh summary" : "Summarize applications"}
            busyLabel="Summarizing…"
            busy={aiBusy}
            onClick={() => void requestSummary()}
          />
          <span className="inline-flex items-center justify-center rounded-full bg-[var(--color-gold-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-gold)]">
            {count} pending
          </span>
        </div>
      </div>

      {aiErr ? <p className="mt-3 text-xs text-[var(--color-danger-text)]">{aiErr}</p> : null}
      {aiSummary ? (
        <div className="mt-4 rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-primary)]">
            <Sparkles size={13} aria-hidden /> AI overview
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--color-text)]">{aiSummary.overview}</p>
          <p className="mt-2 text-[10px] leading-4 text-[var(--color-text-muted)]">
            This summary does not recommend accepting or declining anyone. Review every original application.
          </p>
          <AiDraftDisclosure />
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <AnimatePresence>
          {list.map((app, index) => {
            const meta = ROLE_META[app.requestedRole] ?? ROLE_META.encourager;
            const Icon = meta.icon;
            const summary = aiSummary?.applications.find((item) => item.index === index);
            const initials = (app.applicant?.name ?? app.applicant?.email ?? "?")
              .split(/\s+/)
              .map((w: string) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <motion.div
                key={app._id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="workspace-card-soft p-3"
              >
                <div className="flex items-start gap-3">
                  {app.applicant?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={app.applicant.image}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-[10px] font-semibold text-white">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate text-xs font-semibold">
                        {app.applicant?.name
                          ? displayName(app.applicant.name)
                          : app.applicant?.email ?? "Someone"}
                      </div>
                      <div className={`flex items-center gap-1 text-[10px] ${meta.color}`}>
                        <Icon size={9} />
                        {meta.label}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-dim)]">
                        · {timeAgo(app.createdAt)}
                      </div>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                      "{app.message}"
                    </p>
                    {summary ? (
                      <div className="mt-2 border-l-2 border-[var(--color-primary)]/40 pl-3 text-[10px] leading-4 text-[var(--color-text-muted)]">
                        <p><span className="font-bold text-[var(--color-text)]">Stated intent:</span> {summary.intent}</p>
                        {summary.clarifyQuestion ? (
                          <p className="mt-1"><span className="font-bold text-[var(--color-text)]">Ask:</span> {summary.clarifyQuestion}</p>
                        ) : null}
                        {summary.caution ? (
                          <p className="mt-1 text-[var(--color-gold-text)]">{summary.caution}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => onApprove(app._id)}
                        disabled={busyId === app._id}
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-soft)] px-2.5 py-1 text-[10px] font-medium text-[var(--color-success)] transition hover:bg-[var(--color-success-soft)] disabled:opacity-50"
                      >
                        <Check size={10} />
                        Accept
                      </button>
                      <button
                        onClick={() => onDecline(app._id)}
                        disabled={busyId === app._id}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-transparent px-2.5 py-1 text-[10px] font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-50"
                      >
                        <X size={10} />
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {err && <p className="mt-2 text-[10px] text-[var(--color-danger)]">{err}</p>}
    </div>
  );
}
