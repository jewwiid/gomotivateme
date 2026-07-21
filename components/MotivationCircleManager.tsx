"use client";

import { useMutation, useQuery } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Copy,
  Heart,
  Lightbulb,
  Calendar,
  Target,
  Users,
  Plus,
  X,
  Mail,
  ExternalLink,
  Rocket,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const ROLE_META: Record<
  string,
  { label: string; icon: typeof Heart; color: string }
> = {
  encourager: { label: "Encourager", icon: Heart, color: "text-rose-400" },
  accountability: {
    label: "Accountability",
    icon: Calendar,
    color: "text-emerald-400",
  },
  advice: { label: "Advice", icon: Lightbulb, color: "text-amber-400" },
  review: { label: "Review", icon: Target, color: "text-sky-400" },
  challenge: { label: "Challenge", icon: Users, color: "text-violet-400" },
};

const FREQ_LABEL: Record<string, string> = {
  afterUpdate: "After each update",
  weekly: "Weekly",
  monthly: "Monthly",
  onRequest: "On request",
};

export function MotivationCircleManager({
  goalId,
  goalStatus,
  coreMotivatorMin = 3,
  preLaunchDeadline,
}: {
  goalId: Id<"goals">;
  goalStatus: string;
  coreMotivatorMin?: number;
  preLaunchDeadline?: number;
}) {
  const invites = useQuery(api.motivation.listInvitesForGoal, { goalId });
  const motivators = useQuery(api.motivation.listActiveMotivators, { goalId });

  const addInvite = useMutation(api.motivation.addInvite);
  const revokeInvite = useMutation(api.motivation.revokeInvite);
  const launchGoal = useMutation(api.goals.launch);

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<string>("encourager");
  const [formFreq, setFormFreq] = useState<string>("weekly");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchErr, setLaunchErr] = useState<string | null>(null);

  const isPreLaunch = goalStatus === "draft";
  const allInvites = invites ?? [];
  const core = (motivators ?? []).filter((m) => m.isCoreMotivator);
  const acceptedCount = core.length;
  const pendingCount = allInvites.filter((i) => i.status === "pending").length;

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await addInvite({
        goalId,
        name: formName.trim(),
        email: formEmail.trim() || undefined,
        proposedRole: formRole as any,
        proposedFrequency: formFreq as any,
      });
      setFormName("");
      setFormEmail("");
      setShowForm(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add invite");
    } finally {
      setBusy(false);
    }
  };

  const onLaunch = async () => {
    setLaunching(true);
    setLaunchErr(null);
    try {
      await launchGoal({ goalId });
    } catch (e) {
      setLaunchErr(e instanceof Error ? e.message : "Couldn't launch");
    } finally {
      setLaunching(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1800);
  };

  const totalInvites = allInvites.length;
  const slotsRemaining = 6 - totalInvites;

  return (
    <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">
            Motivation Circle
          </div>
          <div className="mt-1 font-display text-base font-semibold">
            {acceptedCount} of 6 core motivators
          </div>
        </div>
        {isPreLaunch && (
          <div className="text-right">
            <div className="text-[10px] font-medium text-[var(--color-text-dim)]">
              {acceptedCount >= coreMotivatorMin
                ? "Ready to launch"
                : `Launch needs ${coreMotivatorMin - acceptedCount} more`}
            </div>
            {preLaunchDeadline && (
              <div className="mt-0.5 text-[10px] text-[var(--color-text-dim)]">
                Auto-launch {new Date(preLaunchDeadline).toLocaleDateString()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6-slot avatar grid */}
      <div className="mt-4 grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => {
          const m = core[i];
          if (!m) {
            return (
              <div
                key={i}
                className="aspect-square rounded-full border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-elev)]"
                title="Open slot"
              />
            );
          }
          return (
            <div
              key={m._id}
              className="flex aspect-square items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-[10px] font-semibold text-white"
              title={m.user?.name ?? "Motivator"}
            >
              {(m.user?.name ?? "M")
                .split(" ")
                .map((w: string) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          );
        })}
      </div>

      {/* Pending invites — with copyable links */}
      {allInvites.length > 0 && (
        <div className="mt-5 space-y-2">
          {allInvites.map((inv) => {
            const meta = ROLE_META[inv.proposedRole] ?? ROLE_META.encourager;
            const Icon = meta.icon;
            const isPending = inv.status === "pending";
            const isAccepted = inv.status === "accepted";
            return (
              <div
                key={inv._id}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2"
              >
                <div className={`shrink-0 ${meta.color}`}>
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <div className="truncate text-xs font-semibold">
                      {inv.name}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-dim)]">
                      {meta.label} · {FREQ_LABEL[inv.proposedFrequency]}
                    </div>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--color-text-dim)]">
                    {inv.email && (
                      <>
                        <Mail size={9} />
                        <span className="truncate">{inv.email}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {isPending && (
                    <>
                      <button
                        onClick={() => copyLink(inv.token)}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1 text-[10px] font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        title="Copy invite link"
                      >
                        {copiedToken === inv.token ? (
                          <>
                            <Check size={10} /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={10} /> Copy link
                          </>
                        )}
                      </button>
                      <a
                        href={`/invite/${inv.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md p-1 text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                        title="Open invite"
                      >
                        <ExternalLink size={10} />
                      </a>
                      <button
                        onClick={() => revokeInvite({ inviteId: inv._id })}
                        className="rounded-md p-1 text-[var(--color-text-muted)] transition hover:text-[var(--color-danger)]"
                        title="Revoke"
                      >
                        <Trash2 size={10} />
                      </button>
                    </>
                  )}
                  {isAccepted && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                      <Check size={9} /> Accepted
                    </span>
                  )}
                  {inv.status === "declined" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/15 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                      <X size={9} /> Declined
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add invite form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={onAdd}
            className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Name (e.g. Maya)"
                required
                maxLength={60}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="Email (optional)"
                maxLength={120}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
              />
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {Object.entries(ROLE_META).map(([id, m]) => {
                const Icon = m.icon;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFormRole(id)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] transition ${
                      formRole === id
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                        : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                    }`}
                    title={m.label}
                  >
                    <Icon size={12} className={m.color} />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {(["afterUpdate", "weekly", "monthly", "onRequest"] as const).map(
                (f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormFreq(f)}
                    className={`rounded-lg border px-2 py-1.5 text-[10px] transition ${
                      formFreq === f
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                        : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    {FREQ_LABEL[f]}
                  </button>
                )
              )}
            </div>
            {err && <p className="mt-2 text-[10px] text-[var(--color-danger)]">{err}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full border border-[var(--color-border-strong)] bg-transparent px-3 py-1.5 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !formName.trim()}
                className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
              >
                {busy ? "Adding…" : "Add invite"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Add invite button */}
      {!showForm && slotsRemaining > 0 && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-dashed border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          <Plus size={12} />
          Invite someone ({slotsRemaining} slot{slotsRemaining === 1 ? "" : "s"} left)
        </button>
      )}

      {/* Launch button (pre-launch only) */}
      {isPreLaunch && (
        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          {acceptedCount >= coreMotivatorMin ||
          (preLaunchDeadline && preLaunchDeadline <= Date.now()) ? (
            <button
              onClick={onLaunch}
              disabled={launching}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Rocket size={14} />
              {launching ? "Launching…" : "Launch this goal publicly"}
            </button>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-text-muted)]">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--color-text)]">
                <Sparkles size={11} className="text-[var(--color-accent)]" />
                {coreMotivatorMin - acceptedCount} more
                {coreMotivatorMin - acceptedCount === 1 ? " motivator" : " motivators"} to launch
              </div>
              <div className="mt-1 text-[10px]">
                Share the invite links above. You can also launch early once you have {coreMotivatorMin}.
              </div>
            </div>
          )}
          {launchErr && (
            <p className="mt-2 text-xs text-[var(--color-danger)]">{launchErr}</p>
          )}
        </div>
      )}
    </div>
  );
}
