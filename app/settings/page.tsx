"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Image as ImageIcon,
  Loader2,
  X,
  Camera,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DashboardWorkspaceShell } from "@/components/DashboardWorkspaceShell";
import { RequireAuth } from "@/components/RequireAuth";
import { AvatarCropModal } from "@/components/AvatarCropModal";
import {
  MAX_HANDLE_LENGTH,
  validateHandleClient,
} from "@/lib/handle";

type Tab = "account" | "notifications";

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsContent />
    </RequireAuth>
  );
}

function SettingsContent() {
  const [tab, setTab] = useState<Tab>("account");
  return (
    <DashboardWorkspaceShell active="settings">
      <main className="mx-auto max-w-[52rem]">
        <p className="brand-kicker">Account workspace</p>
        <h1 className="mt-2 title-page">Settings</h1>

        {/* Tabs */}
        <div className="workspace-card mt-7 overflow-hidden">
          <div className="border-b border-[var(--color-border)] px-5 pt-2">
            <div className="flex gap-8">
              <TabButton
                active={tab === "account"}
                onClick={() => setTab("account")}
              >
                Account
              </TabButton>
              <TabButton
                active={tab === "notifications"}
                onClick={() => setTab("notifications")}
              >
                Notifications
              </TabButton>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            <AnimatePresence mode="wait">
              {tab === "account" ? (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <AccountTab />
                </motion.div>
              ) : (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <NotificationsTab />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </DashboardWorkspaceShell>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative -mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "border-[var(--color-primary)] text-[var(--color-primary)]"
          : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      }`}
    >
      {children}
    </button>
  );
}

// =====================
// Account tab
// =====================

function AccountTab() {
  const me = useQuery(api.users.me);
  const updateProfile = useMutation(api.users.updateProfile);
  const setHandle = useMutation(api.users.setHandle);
  const generateCoverUploadUrl = useMutation(
    api.users.generateCoverUploadUrl
  );
  const setCoverImage = useMutation(api.users.setCoverImage);
  const removeCoverImage = useMutation(api.users.removeCoverImage);
  const setAvatar = useMutation(api.users.setAvatar);
  const removeAvatar = useMutation(api.users.removeAvatar);
  const coverUrl = useQuery(
    api.storage.getUrls,
    me?.coverImageId
      ? { ids: [me.coverImageId as Id<"_storage">] }
      : "skip"
  );
  const coverImageUrl = me?.coverImageId
    ? coverUrl?.[me.coverImageId as Id<"_storage">] ?? null
    : null;

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [handle, setHandleInput] = useState("");
  const [handleErr, setHandleErr] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Once the user query resolves, populate the form.
  useEffect(() => {
    if (!me) return;
    setName(me.name ?? "");
    setBio(me.bio ?? "");
    setHandleInput(me.handle ?? "");
  }, [me]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await updateProfile({
        name: name !== (me?.name ?? "") ? name : undefined,
        bio: bio !== (me?.bio ?? "") ? bio : undefined,
        // image is set via the avatar uploader below, not the form
        image: undefined,
      });
      if (handle !== (me?.handle ?? "")) {
        await setHandle({ handle });
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPending, setAvatarPending] = useState<File | null>(null);
  const onPickCover = () => fileInputRef.current?.click();
  const onUploadCover = async (file: File) => {
    setBusy(true);
    setErr(null);
    try {
      const url = await generateCoverUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json();
      await setCoverImage({ storageId: storageId as Id<"_storage"> });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't upload cover");
    } finally {
      setBusy(false);
    }
  };

  const onPickAvatar = () => avatarInputRef.current?.click();
  const onUploadAvatar = async (file: File) => {
    // The crop modal has already produced a square 256x256 JPEG — no further
    // client-side processing needed. Just upload.
    setBusy(true);
    setErr(null);
    try {
      const url = await generateCoverUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json();
      await setAvatar({ storageId: storageId as Id<"_storage"> });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't upload avatar");
    } finally {
      setBusy(false);
    }
  };

  const onHandleInput = (v: string) => {
    const lower = v.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, MAX_HANDLE_LENGTH);
    setHandleInput(lower);
    setHandleErr(validateHandleClient(lower));
  };

  const profileInitials = (me?.name ?? me?.handle ?? "?")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-0">
      {/* Cover photo + Avatar row */}
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Section title="Cover photo" className="!mt-0 !border-0 !pt-0">
          <div className="relative h-36 w-full overflow-hidden rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-primary)]">
            {coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : null}
            <div className="absolute right-3 top-3 flex gap-2">
              <button
                type="button"
                onClick={onPickCover}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] backdrop-blur hover:bg-white"
              >
                <Camera size={11} />
                {coverImageUrl ? "Change" : "Add cover"}
              </button>
              {coverImageUrl && (
                <button
                  type="button"
                  onClick={() => removeCoverImage({})}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] backdrop-blur hover:bg-white"
                >
                  <X size={11} />
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadCover(f);
              }}
            />
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
            Shown at the top of your public profile. 16:9 works best.
          </p>
        </Section>

        <Section title="Profile photo" className="!mt-0 !border-0 !pt-0">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onPickAvatar}
              disabled={busy}
              className="group relative h-28 w-28 overflow-hidden rounded-[1.25rem] border-2 border-dashed border-[var(--color-border-strong)] transition hover:border-[var(--color-primary)]"
            >
              {me?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={me.image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[var(--color-primary)] text-xl font-bold text-white">
                  {profileInitials}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                {me?.image ? "Change" : "Add photo"}
              </div>
            </button>
            {me?.image && (
              <button
                type="button"
                onClick={() => removeAvatar({})}
                disabled={busy}
                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-danger-text)]"
              >
                Remove
              </button>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setAvatarPending(f);
                // Reset the input so picking the same file again re-opens the modal.
                e.target.value = "";
              }}
            />
            <AvatarCropModal
              file={avatarPending}
              onCancel={() => setAvatarPending(null)}
              onConfirm={(cropped) => {
                setAvatarPending(null);
                void onUploadAvatar(cropped);
              }}
            />
          </div>
        </Section>
      </div>

      {/* Name + handle */}
      <Section title="Public identity">
        <form onSubmit={onSave} className="space-y-3">
          <Field
            label="Name"
            value={name}
            onChange={setName}
            placeholder="Your name"
            maxLength={80}
            hint={`${name.length}/80`}
          />
          <Field
            label="Handle"
            value={handle}
            onChange={onHandleInput}
            placeholder="your-handle"
            prefix="@"
            maxLength={MAX_HANDLE_LENGTH}
            hint={
              handle.length === 0
                ? "3-30 chars · lowercase letters, digits, _ or -"
                : `Profile: gomotivateme.com/@${handle}`
            }
            error={handleErr}
          />
          <Field
            label="Bio"
            value={bio}
            onChange={setBio}
            placeholder="What you're focused on right now"
            maxLength={280}
            multiline
            rows={3}
            hint={`${bio.length}/280`}
          />

          {err && (
            <div className="rounded-lg border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] px-3 py-2 text-xs text-[var(--color-danger-text)]">
              {err}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            {savedFlash && (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--color-success-text)]">
                <Check size={12} />
                Saved
              </span>
            )}
            <button
              type="submit"
              disabled={busy || !!handleErr}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Check size={12} />
              )}
              Save changes
            </button>
          </div>
        </form>
      </Section>

      {/* Email (read-only) */}
      <Section title="Email">
        <div className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text-secondary)]">
          {me?.email ?? (
            <span className="text-[var(--color-text-dim)]">No email on file</span>
          )}
        </div>
        <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
          Email is managed by your sign-in method. Reach out if you need to
          change it.
        </p>
      </Section>

      {/* Deactivate */}
      <DeactivateSection />
    </div>
  );
}

function DeactivateSection() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const deleteAccount = useMutation(api.users.deleteAccount);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  const onDelete = async () => {
    if (!canDelete) return;
    setBusy(true);
    setErr(null);
    try {
      await deleteAccount({});
      await signOut();
      router.push("/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't delete account");
      setBusy(false);
    }
  };

  return (
    <Section title="Delete account">
      <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
        Permanently deletes your account, all your goals, updates, messages,
        and notifications. This cannot be undone.
      </p>
      {confirming ? (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Type DELETE to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              disabled={busy}
              className="w-full rounded-lg border border-[var(--color-danger)] bg-white px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-danger)] focus:outline-none"
              placeholder="DELETE"
            />
          </div>
          {err && (
            <div className="rounded-lg border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] px-3 py-2 text-xs text-[var(--color-danger-text)]">
              {err}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onDelete}
              disabled={busy || !canDelete}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-danger)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-danger)] disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Deleting account...
                </>
              ) : (
                "Permanently delete"
              )}
            </button>
            <button
              onClick={() => {
                setConfirming(false);
                setConfirmText("");
                setErr(null);
              }}
              disabled={busy}
              className="text-xs text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-danger-soft)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-danger-text)] transition hover:bg-[var(--color-danger-soft)]"
        >
          Delete account
        </button>
      )}
    </Section>
  );
}

// =====================
// Notifications tab
// =====================

function NotificationsTab() {
  const prefs = useQuery(api.notificationPrefs.get, {});
  const update = useMutation(api.notificationPrefs.update);

  const toggle = (key: "yourMotivations" | "supportedGoalUpdates" | "newMotivatorOnGoal" | "weeklyDigest" | "urgentCauses" | "productUpdates") => {
    if (!prefs) return;
    void update({ [key]: !prefs[key] });
  };

  return (
    <div className="space-y-6">
      <Section title="How you'd like to hear from us">
        {prefs?.unsubscribedAll && (
          <p className="mb-4 rounded-lg bg-[var(--color-warning-soft)] px-3 py-2 text-xs text-[var(--color-warning)]">
            You've unsubscribed from all email. Turn a category back on below
            or visit your{" "}
            <Link href="/settings" className="underline">
              preferences
            </Link>{" "}
            to resubscribe.
          </p>
        )}
        <div className="divide-y divide-[var(--color-border-subtle)]">
          <Toggle
            label="Updates on goals you motivate"
            description="Reactions, milestone posts, replies from the goal owner"
            on={prefs?.yourMotivations ?? true}
            onChange={() => toggle("yourMotivations")}
          />
          <Toggle
            label="Updates on goals you support"
            description="Progress posts from creators whose goals you've supported"
            on={prefs?.supportedGoalUpdates ?? true}
            onChange={() => toggle("supportedGoalUpdates")}
          />
          <Toggle
            label="A new motivator joins one of your goals"
            description="When someone commits to your Motivation Circle"
            on={prefs?.newMotivatorOnGoal ?? true}
            onChange={() => toggle("newMotivatorOnGoal")}
          />
          <Toggle
            label="Weekly digest"
            description="A Monday-morning summary of activity across your goals"
            on={prefs?.weeklyDigest ?? false}
            onChange={() => toggle("weeklyDigest")}
          />
          <Toggle
            label="Urgent causes near you"
            description="Medical, emergency, and memorial goals in your area"
            on={prefs?.urgentCauses ?? true}
            onChange={() => toggle("urgentCauses")}
          />
          <Toggle
            label="Product updates"
            description="New features, design changes, occasional surveys"
            on={prefs?.productUpdates ?? false}
            onChange={() => toggle("productUpdates")}
          />
        </div>
      </Section>
    </div>
  );
}

function Toggle({
  label,
  description,
  on,
  onChange,
}: {
  label: string;
  description: string;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div>
        <div className="text-sm font-medium text-[var(--color-text)]">{label}</div>
        <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{description}</div>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          on ? "bg-[var(--color-primary)]" : "bg-[var(--color-bg-sunken)]"
        }`}
        aria-pressed={on}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            on ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// =====================
// Shared bits
// =====================

function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-t border-[var(--color-border)] py-8 first:border-t-0 ${className}`}>
      <h2 className="text-sm font-bold text-[var(--color-text)]">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  multiline,
  rows = 2,
  maxLength,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  hint?: string;
  error?: string | null;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </label>
      <div
        className={`flex items-center rounded-lg border bg-white transition ${
          error
            ? "border-[var(--color-danger)] focus-within:border-[var(--color-danger)]"
            : "border-[var(--color-border)] focus-within:border-[var(--color-text)]"
        } ${multiline ? "" : "px-3"}`}
      >
        {prefix && !multiline && (
          <span className="mr-1 select-none text-sm text-[var(--color-text-dim)]">
            {prefix}
          </span>
        )}
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
            className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-text)] focus:outline-none"
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            className="w-full bg-transparent py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none"
          />
        )}
      </div>
      {error ? (
        <div className="mt-1 text-right text-[10px] text-[var(--color-danger-text)]">{error}</div>
      ) : hint ? (
        <div className="mt-1 text-right text-[10px] text-[var(--color-text-muted)]">{hint}</div>
      ) : null}
    </div>
  );
}
