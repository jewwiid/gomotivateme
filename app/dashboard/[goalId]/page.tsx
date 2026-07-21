"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/Header";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ProgressBar } from "@/components/ProgressBar";
import { BadgeChip } from "@/components/BadgeChip";
import { UpdateCard } from "@/components/UpdateCard";
import { formatDate, formatNumber, relativeTime } from "@/lib/format";
import { RequireAuth } from "@/components/RequireAuth";

export default function GoalDetailPage() {
  return (
    <RequireAuth>
      <GoalDetailContent />
    </RequireAuth>
  );
}

function GoalDetailContent() {
  const params = useParams<{ goalId: string }>();
  const goalId = params.goalId as Id<"goals">;

  const goal = useQuery(api.goals.getMine, { goalId });
  const updates = useQuery(api.updates.listForOwner, { goalId });
  const badges = useQuery(api.badges.listForGoal, { goalId });
  const messages = useQuery(api.reactions.listForOwner, { goalId });
  const stats = useQuery(api.reactions.publicStats, { goalId });

  const [showUpdate, setShowUpdate] = useState<null | "note" | "image" | "link" | "value">(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const publicUrl = useMemo(() => {
    if (!goal) return "";
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    return `${base}/o/${goal.slug}`;
  }, [goal]);

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      // fallback: select text
    }
  };

  if (goal === undefined) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-3xl px-6 py-10">
          <div className="h-40 animate-pulse rounded-2xl bg-[var(--color-bg-card)]" />
        </main>
      </div>
    );
  }
  if (goal === null) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-3xl px-6 py-10 text-center">
          <p className="text-[var(--color-text-muted)]">Goal not found.</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-accent)]"
          >
            <ArrowLeft size={14} />
            Back to goals
          </Link>
        </main>
      </div>
    );
  }

  const progress = computeProgress(goal);
  const daysLeft = Math.ceil((goal.targetDate - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
        >
          <ArrowLeft size={14} />
          Back to goals
        </Link>

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6"
        >
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--color-text-dim)]">
            <CategoryIcon category={goal.category} size={12} />
            {goal.category}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{goal.title}</h1>
          {goal.description && (
            <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">{goal.description}</p>
          )}

          <div className="mt-5 flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} />
              Target: {formatDate(goal.targetDate)}
            </span>
            <span
              className={`tabular-nums ${
                daysLeft < 0
                  ? "text-[var(--color-danger)]"
                  : daysLeft < 7
                  ? "text-[var(--color-gold)]"
                  : ""
              }`}
            >
              {daysLeft < 0
                ? `${Math.abs(daysLeft)}d overdue`
                : daysLeft === 0
                ? "Due today"
                : `${daysLeft}d left`}
            </span>
          </div>

          <div className="mt-5">
            <ProgressBar value={progress} size="lg" showLabel />
            <div className="mt-3 flex items-baseline justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">
                <span className="text-base font-semibold text-[var(--color-text)]">
                  {formatNumber(goal.currentValue)}
                </span>{" "}
                of {formatNumber(goal.targetValue)} {goal.unit}
              </span>
              {badges && badges.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {badges
                    .sort((a: any, b: any) => a.tier - b.tier)
                    .map((b: any) => (
                      <BadgeChip key={b._id} tier={b.tier} awardedAt={b.awardedAt} />
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Share link */}
          <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] p-3">
            <p className="mb-1.5 text-xs font-medium text-[var(--color-text-muted)]">
              Your public link
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-[var(--color-bg)] px-2 py-1.5 font-mono text-xs text-[var(--color-text)]">
                {publicUrl}
              </code>
              <button
                onClick={onCopyLink}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[var(--color-accent-soft)]"
              >
                {linkCopied ? <Check size={12} /> : <Copy size={12} />}
                {linkCopied ? "Copied" : "Copy"}
              </button>
              <Link
                href={`/o/${goal.slug}`}
                target="_blank"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] px-3 py-1.5 text-xs text-[var(--color-text)] transition hover:border-[var(--color-text-muted)]"
              >
                <ExternalLink size={12} />
                Open
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Quick add */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-6"
        >
          <h2 className="mb-2 text-sm font-medium text-[var(--color-text-muted)]">
            Log progress
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <QuickAddButton
              icon={TrendingUp}
              label="New value"
              onClick={() => setShowUpdate("value")}
            />
            <QuickAddButton
              icon={MessageSquare}
              label="Note"
              onClick={() => setShowUpdate("note")}
            />
            <QuickAddButton
              icon={ImageIcon}
              label="Photo"
              onClick={() => setShowUpdate("image")}
            />
            <QuickAddButton
              icon={LinkIcon}
              label="Link"
              onClick={() => setShowUpdate("link")}
            />
          </div>
        </motion.div>

        {/* Update modal */}
        <AnimatePresence>
          {showUpdate && (
            <UpdateModal
              type={showUpdate}
              goalId={goalId}
              unit={goal.unit}
              onClose={() => setShowUpdate(null)}
            />
          )}
        </AnimatePresence>

        {/* Messages inbox */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mt-10"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--color-text-muted)]">
              Messages{" "}
              <span className="ml-1 text-[var(--color-text-dim)]">
                ({stats?.messages.length ?? 0} public · {messages?.length ?? 0} total)
              </span>
            </h2>
          </div>
          {messages === undefined ? (
            <div className="h-20 animate-pulse rounded-2xl bg-[var(--color-bg-card)]" />
          ) : messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-card)]/40 p-6 text-center text-sm text-[var(--color-text-dim)]">
              No messages yet. Share your link to start receiving notes.
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((m: any) => (
                <MessageRow key={m._id} reactionId={m._id} message={m} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Public timeline preview (owner view) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-10"
        >
          <h2 className="mb-3 text-sm font-medium text-[var(--color-text-muted)]">
            Public timeline
          </h2>
          {updates === undefined ? (
            <div className="h-32 animate-pulse rounded-2xl bg-[var(--color-bg-card)]" />
          ) : updates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-card)]/40 p-6 text-center text-sm text-[var(--color-text-dim)]">
              No updates yet. Log a value or post a note to start the timeline.
            </div>
          ) : (
            <div className="space-y-3">
              {updates.map((u: any, i: number) => (
                <UpdateCard
                  key={u._id}
                  update={u}
                  unit={goal.unit}
                  direction={goal.direction}
                  index={i}
                />
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

function computeProgress(g: {
  startValue: number;
  currentValue: number;
  targetValue: number;
  direction: "increase" | "decrease";
}) {
  const total = g.direction === "decrease" ? g.startValue - g.targetValue : g.targetValue - g.startValue;
  if (total <= 0) return 0;
  const moved = g.direction === "decrease" ? g.startValue - g.currentValue : g.currentValue - g.startValue;
  return Math.max(0, Math.min(100, (moved / total) * 100));
}

function QuickAddButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof TrendingUp;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function MessageRow({
  reactionId,
  message,
}: {
  reactionId: Id<"reactions">;
  message: { message?: string; displayName?: string; approved: boolean; createdAt: number };
}) {
  const approve = useMutation(api.reactions.approve);
  const unapprove = useMutation(api.reactions.unapprove);
  const remove = useMutation(api.reactions.remove);

  return (
    <div
      className={`rounded-2xl border p-3 ${
        message.approved
          ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/5"
          : "border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-card)]"
      }`}
    >
      <p className="text-sm leading-relaxed text-[var(--color-text)]">"{message.message}"</p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-[var(--color-text-dim)]">
          <span className="font-medium text-[var(--color-text-muted)]">
            {message.displayName || "Anonymous"}
          </span>{" "}
          · {relativeTime(message.createdAt)}
          {message.approved ? " · public" : " · pending"}
        </span>
        <div className="flex items-center gap-1">
          {message.approved ? (
            <button
              onClick={() => unapprove({ reactionId })}
              className="rounded-md px-2 py-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-text)]"
            >
              Hide
            </button>
          ) : (
            <button
              onClick={() => approve({ reactionId })}
              className="rounded-md bg-[var(--color-success)]/15 px-2 py-1 font-medium text-[var(--color-success)] transition hover:bg-[var(--color-success)]/25"
            >
              Approve
            </button>
          )}
          <button
            onClick={() => {
              if (confirm("Delete this message?")) remove({ reactionId });
            }}
            className="rounded-md p-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-danger)]"
            aria-label="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function UpdateModal({
  type,
  goalId,
  unit,
  onClose,
}: {
  type: "note" | "image" | "link" | "value";
  goalId: Id<"goals">;
  unit: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {type === "note" && "Add a note"}
            {type === "image" && "Add a photo"}
            {type === "link" && "Add a link"}
            {type === "value" && `New ${unit} value`}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-text)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {type === "note" && <NoteForm goalId={goalId} onDone={onClose} />}
        {type === "image" && <ImageForm goalId={goalId} onDone={onClose} />}
        {type === "link" && <LinkForm goalId={goalId} onDone={onClose} />}
        {type === "value" && <ValueForm goalId={goalId} unit={unit} onDone={onClose} />}
      </motion.div>
    </motion.div>
  );
}

function NoteForm({ goalId, onDone }: { goalId: Id<"goals">; onDone: () => void }) {
  const add = useMutation(api.updates.add);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await add({ goalId, type: "note", note: text });
          onDone();
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-3"
    >
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        required
        placeholder="What happened today?"
        className="w-full resize-none rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] py-2 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
      >
        <Send size={14} />
        {busy ? "Posting..." : "Post update"}
      </button>
    </form>
  );
}

function ImageForm({ goalId, onDone }: { goalId: Id<"goals">; onDone: () => void }) {
  const generateUploadUrl = useMutation(api.updates.generateUploadUrl);
  const add = useMutation(api.updates.add);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onFile = (f: File | null) => {
    setFile(f);
    setErr(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!file) return;
        setBusy(true);
        setErr(null);
        try {
          const uploadUrl = await generateUploadUrl();
          const res = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!res.ok) throw new Error("Upload failed");
          const { storageId } = await res.json();
          await add({ goalId, type: "image", imageId: storageId as Id<"_storage"> });
          onDone();
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Upload failed");
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-3"
    >
      <div
        onClick={() => fileInput.current?.click()}
        className="flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] transition hover:border-[var(--color-accent)]"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-xs text-[var(--color-text-dim)]">
            <ImageIcon size={20} />
            <span>Click to choose a photo</span>
          </div>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {err && <p className="text-xs text-[var(--color-danger)]">{err}</p>}
      <button
        type="submit"
        disabled={busy || !file}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] py-2 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
      >
        <Plus size={14} />
        {busy ? "Uploading..." : "Post photo"}
      </button>
    </form>
  );
}

function LinkForm({ goalId, onDone }: { goalId: Id<"goals">; onDone: () => void }) {
  const add = useMutation(api.updates.add);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await add({ goalId, type: "link", linkUrl: url, linkTitle: title || undefined });
          onDone();
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-3"
    >
      <input
        autoFocus
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
        placeholder="https://..."
        className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Optional title"
        className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] py-2 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
      >
        <Send size={14} />
        {busy ? "Posting..." : "Post link"}
      </button>
    </form>
  );
}

function ValueForm({
  goalId,
  unit,
  onDone,
}: {
  goalId: Id<"goals">;
  unit: string;
  onDone: () => void;
}) {
  const recordValue = useMutation(api.goals.recordValue);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await recordValue({
            goalId,
            value: parseFloat(value),
            note: note || undefined,
          });
          onDone();
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-3"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
          New measured value ({unit})
        </label>
        <input
          autoFocus
          type="number"
          step="any"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
        />
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="How did it go? (optional)"
        className="w-full resize-none rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy || !value}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] py-2 text-sm font-semibold text-black transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
      >
        <Plus size={14} />
        {busy ? "Saving..." : "Log value"}
      </button>
    </form>
  );
}
