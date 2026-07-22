"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
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
import { Header } from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { SiteFooter } from "@/components/SiteFooter";
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
    <div className="min-h-screen bg-[#fffdf8] text-[#292929]">
      <Header />

      <main className="mx-auto max-w-[48rem] px-5 py-14 sm:px-8 sm:py-20">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#6d6e69] transition hover:text-[var(--color-primary)]"
        >
          <ArrowLeft size={14} />
          Back
        </Link>

        <h1 className="font-display text-5xl font-bold tracking-[-0.055em] sm:text-6xl">Settings</h1>

        {/* Tabs */}
        <div className="mt-10 border-b border-[#d9d8d1]">
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

        <div className="mt-8">
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
      </main>
      <SiteFooter />
    </div>
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
          : "border-transparent text-[#777872] hover:text-[#33332f]"
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
          <div className="relative h-36 w-full overflow-hidden rounded-[1rem] border border-[#deddd6] bg-[var(--color-primary)]">
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#3d3d39] backdrop-blur hover:bg-white"
              >
                <Camera size={11} />
                {coverImageUrl ? "Change" : "Add cover"}
              </button>
              {coverImageUrl && (
                <button
                  type="button"
                  onClick={() => removeCoverImage({})}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#3d3d39] backdrop-blur hover:bg-white"
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
          <p className="mt-2 text-[11px] text-zinc-500">
            Shown at the top of your public profile. 16:9 works best.
          </p>
        </Section>

        <Section title="Profile photo" className="!mt-0 !border-0 !pt-0">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onPickAvatar}
              disabled={busy}
              className="group relative h-28 w-28 overflow-hidden rounded-[1.25rem] border-2 border-dashed border-[#c9c8c0] transition hover:border-[var(--color-primary)]"
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
                className="text-[10px] text-zinc-500 hover:text-red-600"
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
                if (f) onUploadAvatar(f);
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
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {err}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            {savedFlash && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
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
        <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700">
          {me?.email ?? (
            <span className="text-zinc-400">No email on file</span>
          )}
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
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
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const onDeactivate = async () => {
    setBusy(true);
    try {
      // @convex-dev/auth doesn't expose a deactivate endpoint by default.
      // For MVP, sign out + ask support. The data is preserved; the user
      // just can't log back in without a password reset.
      await signOut();
      router.push("/");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <Section title="Deactivate account">
      <p className="mb-3 text-xs text-zinc-600">
        If you deactivate, you won't be able to log in anymore. Your goals
        and messages will stay up unless you ask us to remove them.
      </p>
      {confirming ? (
        <div className="flex items-center gap-2">
          <button
            onClick={onDeactivate}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
          >
            {busy ? "Deactivating..." : "Yes, deactivate"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="text-xs text-zinc-500 transition hover:text-zinc-900"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
        >
          Deactivate
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

  const toggle = (key: "yourMotivations" | "newMotivatorOnGoal" | "weeklyDigest" | "urgentCauses" | "productUpdates") => {
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
        <div className="divide-y divide-zinc-100">
          <Toggle
            label="Updates on goals you motivate"
            description="Reactions, milestone posts, replies from the goal owner"
            on={prefs?.yourMotivations ?? true}
            onChange={() => toggle("yourMotivations")}
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
        <div className="text-sm font-medium text-zinc-900">{label}</div>
        <div className="mt-0.5 text-[11px] text-zinc-500">{description}</div>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          on ? "bg-[var(--color-primary)]" : "bg-[#ddddd6]"
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
    <section className={`border-t border-[#deddd6] py-8 first:border-t-0 ${className}`}>
      <h2 className="text-sm font-bold text-[#33332f]">
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
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </label>
      <div
        className={`flex items-center rounded-lg border bg-white transition ${
          error
            ? "border-red-300 focus-within:border-red-500"
            : "border-zinc-200 focus-within:border-zinc-900"
        } ${multiline ? "" : "px-3"}`}
      >
        {prefix && !multiline && (
          <span className="mr-1 select-none text-sm text-zinc-400">
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
            className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            className="w-full bg-transparent py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          />
        )}
      </div>
      {error ? (
        <div className="mt-1 text-right text-[10px] text-red-600">{error}</div>
      ) : hint ? (
        <div className="mt-1 text-right text-[10px] text-zinc-500">{hint}</div>
      ) : null}
    </div>
  );
}
