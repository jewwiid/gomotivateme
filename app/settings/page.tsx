"use client";

import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Plus,
  Image as ImageIcon,
  Loader2,
  X,
  Camera,
  GitBranch,
  Link2,
  RefreshCw,
  Sparkles,
  Unplug,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { AiblWordmark } from "@/components/AiblMark";
import { Id } from "@/convex/_generated/dataModel";
import { DashboardWorkspaceShell } from "@/components/DashboardWorkspaceShell";
import { RequireAuth } from "@/components/RequireAuth";
import { AvatarCropModal } from "@/components/AvatarCropModal";
import {
  MAX_HANDLE_LENGTH,
  validateHandleClient,
} from "@/lib/handle";
import { trackDataFastGoal } from "@/lib/analytics";

type Tab = "account" | "integrations" | "notifications";

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsContent />
    </RequireAuth>
  );
}

function SettingsContent() {
  const [tab, setTab] = useState<Tab>("account");
  const githubConnection = useQuery(api.github.getConnection);
  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get("tab");
    if (selected === "notifications" || selected === "integrations") setTab(selected);
  }, []);
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
                active={tab === "integrations"}
                onClick={() => setTab("integrations")}
              >
                <span className="inline-flex items-center gap-2">
                  Integrations
                  {githubConnection?.connected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-success-text)]">
                      <Check size={11} strokeWidth={3} /> GitHub installed
                    </span>
                  )}
                </span>
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
              ) : tab === "integrations" ? (
                <motion.div
                  key="integrations"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <IntegrationsTab />
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

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [handle, setHandleInput] = useState("");
  const [handleErr, setHandleErr] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Once the user query resolves, populate the form.
  useEffect(() => {
    if (!me) return;
    setFirstName(me.firstName ?? "");
    setLastName(me.lastName ?? "");
    setBio(me.bio ?? "");
    setHandleInput(me.handle ?? "");
  }, [me]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const nameChanged =
        firstName !== (me?.firstName ?? "") || lastName !== (me?.lastName ?? "");
      await updateProfile({
        // Sent as a pair — the mutation recomposes `name` from both.
        firstName: nameChanged ? firstName : undefined,
        lastName: nameChanged ? lastName : undefined,
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
    .map((w: string) => w[0])
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
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="First name"
              value={firstName}
              onChange={setFirstName}
              placeholder="Jane"
              maxLength={40}
            />
            <Field
              label="Last name"
              value={lastName}
              onChange={setLastName}
              placeholder="Doe"
              maxLength={40}
            />
          </div>
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

      {/* Follow policy */}
      <FollowPolicySection policy={me?.followPolicy ?? "approval"} />

      <AiblConnectionSection />

      {/* Deactivate */}
      <DeactivateSection />
    </div>
  );
}

/**
 * Follow policy — controls who can follow the current user.
 * "approval" (default): new followers send a request the user must approve.
 * "open": follow requests are accepted automatically.
 */
function FollowPolicySection({
  policy,
}: {
  policy: "approval" | "open";
}) {
  const updateFollowPolicy = useMutation(api.users.updateFollowPolicy);
  const [busy, setBusy] = useState(false);

  const choose = async (next: "approval" | "open") => {
    if (next === policy) return;
    setBusy(true);
    try {
      await updateFollowPolicy({ policy: next });
    } finally {
      setBusy(false);
    }
  };

  const options: Array<{
    id: "approval" | "open";
    label: string;
    description: string;
  }> = [
    {
      id: "approval",
      label: "Approve followers",
      description: "New followers send a request you accept or decline.",
    },
    {
      id: "open",
      label: "Open",
      description: "Anyone can follow you instantly, no approval needed.",
    },
  ];

  return (
    <Section title="Follow policy">
      <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
        Choose who can follow you and see your private goals.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const active = policy === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => choose(opt.id)}
              disabled={busy}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition disabled:opacity-50 ${
                active
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                  : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]"
              }`}
            >
              <div
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                  active
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                    : "border-[var(--color-border-strong)] bg-white"
                }`}
              >
                {active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--color-text)]">
                  {opt.label}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {opt.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function AiblConnectionSection() {
  const links = useQuery(api.partner.listMine);
  const revoke = useMutation(api.partner.revoke);
  const [busy, setBusy] = useState(false);
  const connected = (links ?? []).length > 0;

  const onRevoke = async () => {
    if (!connected) return;
    if (!confirm("Disconnect AI Boss Leader? Campaigns will stop syncing to goals.")) {
      return;
    }
    setBusy(true);
    try {
      await revoke({});
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="AI Boss Leader">
      <div className="mb-3">
        <AiblWordmark className="text-base" />
      </div>
      <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
        AI Boss Leader is invite-only. Connect from AIBL Profile after you have access.
        Then campaigns can become public goals and finished tasks sync here.
      </p>
      {links === undefined ? (
        <p className="text-xs text-[var(--color-text-muted)]">Checking connection…</p>
      ) : connected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-white px-3 py-3">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">Connected</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Campaigns can create and update goals on this account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onRevoke()}
            disabled={busy}
            className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] disabled:opacity-50"
          >
            {busy ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)]">
          Not connected. Start from AI Boss Leader → Profile → GoMotivateMe.
        </p>
      )}
    </Section>
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
// Integrations tab
// =====================

function IntegrationsTab() {
  const router = useRouter();
  const connection = useQuery(api.github.getConnection);
  const authorizationCandidates = useQuery(api.github.listAuthorizationCandidates);
  const repositories = useQuery(api.github.listRepositories);
  const goals = useQuery(api.goals.listMine);
  const links = useQuery(api.github.listGoalLinks);
  const beginConnect = useAction(api.github.beginConnect);
  const selectAuthorizedInstallation = useAction(api.github.selectAuthorizedInstallation);
  const refreshRepositories = useAction(api.github.refreshRepositories);
  const syncLink = useAction(api.github.syncLink);
  const summarizeGoal = useAction(api.github.summarizeGoal);
  const createGoalLink = useMutation(api.github.createGoalLink);
  const disconnect = useMutation(api.github.disconnect);
  const deleteGoalLink = useMutation(api.github.deleteGoalLink);
  const [repositoryId, setRepositoryId] = useState("");
  const [goalId, setGoalId] = useState("");
  const [activityKind, setActivityKind] = useState<"commits" | "merged_prs" | "both">("commits");
  const [progressMode, setProgressMode] = useState<"activity" | "progress">("activity");
  const [backfillDate, setBackfillDate] = useState(() => new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10));
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const hasAutoRefreshedRepositories = useRef(false);

  useEffect(() => {
    const githubResult = new URLSearchParams(window.location.search).get("github");
    if (githubResult === "connected") setMessage("GitHub is connected. Choose a repository and link it to a goal below.");
    if (githubResult === "choose-installation") setMessage("Choose the GitHub installation you want to use with this profile.");
    if (githubResult === "failed") setMessage("GitHub could not complete the connection. Please try again.");
    if (githubResult === "cancelled") setMessage("GitHub connection was cancelled.");
  }, []);

  const selectedGoal = goals?.find((goal: any) => String(goal._id) === goalId);
  const selectedRepository = repositories?.find((repository: any) => String(repository._id) === repositoryId);
  const canCountProgress = Boolean(
    selectedGoal &&
      selectedGoal.progressType === "number" &&
      selectedGoal.direction === "increase" &&
      ((activityKind === "commits" && String(selectedGoal.metricId || "").endsWith("github-commits")) ||
        (activityKind === "merged_prs" && String(selectedGoal.metricId || "").endsWith("github-pull-requests")))
  );

  const onConnect = async () => {
    setBusy("connect");
    setMessage(null);
    try {
      const { authorizationUrl } = await beginConnect({});
      window.location.assign(authorizationUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start GitHub connection");
      setBusy(null);
    }
  };

  const onSelectInstallation = async (installationId: string) => {
    setBusy(`installation-${installationId}`);
    setMessage(null);
    try {
      await selectAuthorizedInstallation({ installationId });
      setMessage("GitHub is connected. Your repositories are ready to link to goals.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not connect that GitHub installation");
    } finally {
      setBusy(null);
    }
  };

  const onRefresh = async () => {
    setBusy("repositories");
    setMessage(null);
    try {
      const result = await refreshRepositories({});
      setMessage(`Loaded ${result.count} GitHub repositories.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load repositories");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (!connection?.connected || !repositories || repositories.length > 0 || hasAutoRefreshedRepositories.current) return;
    hasAutoRefreshedRepositories.current = true;
    void onRefresh();
  }, [connection?.connected, repositories]);

  useEffect(() => {
    const requestedGoalId = new URLSearchParams(window.location.search).get("goalId");
    if (requestedGoalId && goals?.some((goal: any) => String(goal._id) === requestedGoalId)) setGoalId(requestedGoalId);
  }, [goals]);

  const onCreateLink = async () => {
    if (!repositoryId || !goalId) {
      setMessage("Choose both a repository and a goal.");
      return;
    }
    setBusy("link");
    setMessage(null);
    try {
      const backfillFrom = Date.parse(`${backfillDate}T00:00:00`);
      const result = await createGoalLink({
        repositoryId: repositoryId as Id<"githubRepositories">,
        goalId: goalId as Id<"goals">,
        activityKind,
        progressMode: progressMode === "progress" && canCountProgress ? "progress" : "activity",
        backfillFrom: Number.isFinite(backfillFrom) ? backfillFrom : undefined,
      });
      const synced = await syncLink({ linkId: result.linkId });
      setMessage(`Linked and backfilled ${synced.imported} verified GitHub activities.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not link this repository");
    } finally {
      setBusy(null);
    }
  };

  const onCreateGoalFromRepository = () => {
    if (!repositoryId) {
      setMessage("Choose the repository you want this goal to represent.");
      return;
    }
    const backfillFrom = Date.parse(`${backfillDate}T00:00:00`);
    const parameters = new URLSearchParams({
      githubRepositoryId: repositoryId,
      githubActivity: activityKind === "merged_prs" ? "merged_prs" : "commits",
      githubTarget: activityKind === "merged_prs" ? "10" : "50",
    });
    if (Number.isFinite(backfillFrom)) parameters.set("githubBackfillFrom", String(backfillFrom));
    router.push(`/dashboard/new?${parameters.toString()}`);
  };

  const onSync = async (linkId: Id<"githubGoalLinks">) => {
    setBusy(`sync-${linkId}`);
    setMessage(null);
    try {
      const result = await syncLink({ linkId });
      setMessage(result.imported > 0 ? `Imported ${result.imported} new GitHub activities.` : "GitHub is already up to date.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sync GitHub activity");
    } finally {
      setBusy(null);
    }
  };

  const onSummary = async (goal: Id<"goals">) => {
    setBusy(`summary-${goal}`);
    setSummary(null);
    try {
      const result = await summarizeGoal({ goalId: goal, days: 7 });
      setSummary(result.content);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create a GitHub summary");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Section title="GitHub App">
        {!connection?.connected && authorizationCandidates && authorizationCandidates.length > 0 && (
          <div className="mb-4 rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-4">
            <p className="text-sm font-bold text-[var(--color-text)]">Choose where GitHub should send progress</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">We found more than one installation you can manage. Select the one that contains the repositories for these goals.</p>
            <div className="mt-3 space-y-2">
              {authorizationCandidates.map((candidate: any) => (
                <button
                  key={candidate.installationId}
                  type="button"
                  onClick={() => void onSelectInstallation(candidate.installationId)}
                  disabled={busy !== null}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white px-3 py-3 text-left transition hover:border-[var(--color-primary)]/40 active:scale-[0.99] disabled:opacity-50"
                >
                  {candidate.installationAvatarUrl ? (
                    <img src={candidate.installationAvatarUrl} alt="" className="h-8 w-8 rounded-lg" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-bg-sunken)] text-[var(--color-text-muted)]"><GitBranch size={15} /></div>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--color-text)]">{candidate.installationLogin}</span>
                    <span className="block text-xs text-[var(--color-text-muted)]">{candidate.repositorySelection === "selected" ? "Selected repositories" : "All repositories"}</span>
                  </span>
                  {busy === `installation-${candidate.installationId}` ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} className="text-[var(--color-primary)]" />}
                </button>
              ))}
            </div>
          </div>
        )}
        {connection?.connected ? (
          <div className="rounded-2xl border border-[var(--color-success-soft)] bg-[var(--color-success-soft)]/40 p-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--color-primary)] shadow-sm">
                <GitBranch size={19} />
              </div>
              <div className="mr-auto">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-[var(--color-text)]">GoMotivateMe GitHub App</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-text)] px-2 py-0.5 text-[10px] font-bold text-white">
                    <Check size={11} strokeWidth={3} /> Installed
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">Connected as @{connection.login}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {connection.repositorySelection === "selected" ? "Selected repositories only" : "Repository-scoped read access"} · Never pushes code or stores a personal token.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void onRefresh()}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-text)] disabled:opacity-50"
                >
                  <RefreshCw size={14} className={busy === "repositories" ? "animate-spin" : ""} />
                  Refresh repositories
                </button>
                <button
                  type="button"
                  onClick={() => void disconnect({})}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[var(--color-danger-text)] disabled:opacity-50"
                >
                  <Unplug size={14} /> Disconnect
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-bg-sunken)] text-[var(--color-text-muted)]">
                <GitBranch size={19} />
              </div>
              <div className="mr-auto">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[var(--color-text)]">GoMotivateMe GitHub App</p>
                  <span className="rounded-full bg-[var(--color-bg-sunken)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)]">Not installed</span>
                </div>
                <p className="mt-1 max-w-2xl text-xs text-[var(--color-text-secondary)]">Connect once and we will verify your existing GitHub App installation, or guide you through a new one. Then link verified repository progress to any existing goal.</p>
              </div>
              <button
                type="button"
                onClick={() => void onConnect()}
                disabled={busy === "connect"}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy === "connect" ? <Loader2 size={15} className="animate-spin" /> : <GitBranch size={15} />}
                Connect GitHub
              </button>
            </div>
          </div>
        )}
        {message && <p className="mt-3 rounded-lg bg-[var(--color-bg-sunken)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">{message}</p>}
      </Section>

      {connection?.connected && (
        <Section title="Link a repository to a goal">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">
              Repository
              <select value={repositoryId} onChange={(event) => setRepositoryId(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text)]">
                <option value="">Select a repository</option>
                {repositories?.filter((repository: any) => !repository.archived).map((repository: any) => <option key={repository._id} value={repository._id}>{repository.fullName}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-[var(--color-text-muted)]">
              GoMotivateMe goal
              <select value={goalId} onChange={(event) => setGoalId(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text)]">
                <option value="">Select a goal</option>
                {goals?.filter((goal: any) => goal.status !== "closed").map((goal: any) => <option key={goal._id} value={goal._id}>{goal.title}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-[var(--color-text-muted)]">
              Measure
              <select value={activityKind} onChange={(event) => setActivityKind(event.target.value as "commits" | "merged_prs" | "both")} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text)]">
                <option value="commits">Commits</option>
                <option value="merged_prs">Merged pull requests</option>
                <option value="both">Commits and merged pull requests</option>
              </select>
            </label>
            <label className="text-xs font-medium text-[var(--color-text-muted)]">
              Backfill from
              <input type="date" value={backfillDate} onChange={(event) => setBackfillDate(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text)]" />
            </label>
          </div>
          <label className="mt-4 flex items-start gap-3 rounded-lg bg-[var(--color-bg-sunken)] p-3 text-xs text-[var(--color-text-secondary)]">
            <input type="checkbox" checked={progressMode === "progress"} disabled={!canCountProgress} onChange={(event) => setProgressMode(event.target.checked ? "progress" : "activity")} className="mt-0.5" />
            <span>
              Count this activity toward the goal measurement.
              {!canCountProgress && " Choose a goal created with the GitHub commits or merged pull requests measurement to enable this; every other goal can still receive activity, backfill, and summaries."}
            </span>
          </label>
          {selectedGoal && selectedRepository && (
            <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-white px-3 py-3 text-xs leading-5 text-[var(--color-text-secondary)]">
              {canCountProgress ? (
                <span><strong className="text-[var(--color-text)]">GitHub will update the primary measurement.</strong> Verified {activityKind === "merged_prs" ? "merged pull requests" : "commits"} from {selectedRepository.fullName} will count toward this goal.</span>
              ) : (
                <span><strong className="text-[var(--color-text)]">Keep {selectedGoal.currentValue ?? selectedGoal.startValue ?? 0} / {selectedGoal.targetValue} {selectedGoal.unit} as the primary measurement.</strong> GitHub activity from {selectedRepository.fullName} will be backfilled as a dated delivery signal, used in updates and AI recaps, without changing what this goal promises.</span>
              )}
            </div>
          )}
          <button type="button" onClick={() => void onCreateLink()} disabled={busy !== null || !repositories?.length || !goals?.length} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy === "link" ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
            {canCountProgress ? "Link, count and backfill" : "Link delivery activity and backfill"}
          </button>
          <button
            type="button"
            onClick={onCreateGoalFromRepository}
            disabled={busy !== null || !repositories?.length}
            className="mt-4 ml-2 inline-flex items-center gap-2 rounded-xl border border-[var(--color-primary)]/30 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/5 active:scale-[0.98] disabled:opacity-50"
          >
            <Plus size={15} /> Create goal from repo
          </button>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">Creates a pre-filled GitHub commits or pull-requests goal, then links and backfills this repository when you publish it.</p>
        </Section>
      )}

      {links && links.length > 0 && (
        <Section title="Linked repositories">
          <div className="space-y-3">
            {links.map((link: any) => (
              <div key={link.id} className="rounded-xl border border-[var(--color-border)] bg-white p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="mr-auto">
                    <p className="text-sm font-semibold text-[var(--color-text)]">{link.goalTitle}</p>
                    <a href={link.repositoryUrl} target="_blank" rel="noreferrer" className="text-xs text-[var(--color-primary)] hover:underline">{link.repository}</a>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">{link.activityCount} logged · {link.progressMode === "progress" ? "updates the goal measurement" : "activity and summary only"}{link.lastSyncedAt ? ` · last synced ${new Date(link.lastSyncedAt).toLocaleString()}` : ""}</p>
                  </div>
                  <button type="button" onClick={() => void onSync(link.id as Id<"githubGoalLinks">)} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold disabled:opacity-50">
                    <RefreshCw size={13} className={busy === `sync-${link.id}` ? "animate-spin" : ""} /> Sync
                  </button>
                  <button type="button" onClick={() => void onSummary(link.goalId as Id<"goals">)} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold disabled:opacity-50">
                    <Sparkles size={13} /> AI recap
                  </button>
                  <button type="button" onClick={() => void deleteGoalLink({ linkId: link.id as Id<"githubGoalLinks"> })} disabled={busy !== null} className="text-xs text-[var(--color-danger-text)] disabled:opacity-50">Unlink</button>
                </div>
              </div>
            ))}
          </div>
          {summary && <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-sunken)] p-4 text-sm leading-6 text-[var(--color-text-secondary)]"><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">GitHub AI recap</div>{summary}</div>}
        </Section>
      )}
    </div>
  );
}

// =====================
// Notifications tab
// =====================

function NotificationsTab() {
  const prefs = useQuery(api.notificationPrefs.get, {});
  const update = useMutation(api.notificationPrefs.update);

  const toggle = (key: "yourMotivations" | "supportedGoalUpdates" | "goalActivity" | "motivationActivity" | "socialActivity" | "accountActivity" | "newMotivatorOnGoal" | "weeklyDigest" | "dailyStreakReminder" | "deadlineReminders" | "urgentCauses" | "productUpdates") => {
    if (!prefs) return;
    const defaultOn = key !== "weeklyDigest" && key !== "productUpdates";
    void update({ [key]: !(prefs[key] ?? defaultOn) });
  };

  const allNonEssentialEmailOn = !(prefs?.unsubscribedAll ?? false);

  return (
    <div className="space-y-6">
      <Section title="Email preferences">
        {prefs?.unsubscribedAll && (
          <p className="mb-4 rounded-lg bg-[var(--color-warning-soft)] px-3 py-2 text-xs text-[var(--color-warning)]">
            Non-essential email is paused. Turn it back on below, or enable
            any category to resume the emails you choose.
          </p>
        )}
        <div className="divide-y divide-[var(--color-border-subtle)]">
          <Toggle
            label="All non-essential email"
            description="Pause or resume every reminder and activity email at once"
            on={allNonEssentialEmailOn}
            onChange={() => void update({ unsubscribedAll: allNonEssentialEmailOn })}
          />
          <Toggle
            label="Activity on your goals"
            description="Applications, cheers, messages, and people joining goals you own"
            on={prefs?.goalActivity ?? true}
            onChange={() => toggle("goalActivity")}
          />
          <Toggle
            label="Motivation Circle activity"
            description="Invitations, application decisions, and check-in reminders for goals you motivate or pledged to check in on"
            on={prefs?.motivationActivity ?? true}
            onChange={() => toggle("motivationActivity")}
          />
          <Toggle
            label="Updates on goals you motivate"
            description="Progress posts and status changes from creators you motivate"
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
            label="Followers and follow requests"
            description="When someone follows you or asks to follow"
            on={prefs?.socialActivity ?? true}
            onChange={() => toggle("socialActivity")}
          />
          <Toggle
            label="Goal confirmations"
            description="A welcome, plus confirmation when a goal goes live or reaches its target"
            on={prefs?.accountActivity ?? true}
            onChange={() => toggle("accountActivity")}
          />
          <Toggle
            label="Weekly activity digest"
            description="A Monday-morning summary of activity across your goals"
            on={prefs?.weeklyDigest ?? false}
            onChange={() => toggle("weeklyDigest")}
          />
          <Toggle
            label="Daily streak reminder"
            description="A local-evening nudge when today's streak is still unlogged"
            on={prefs?.dailyStreakReminder ?? true}
            onChange={() => toggle("dailyStreakReminder")}
          />
          <ReminderCadence
            value={prefs?.goalUpdateReminderCadence ?? "weekly"}
            onChange={(goalUpdateReminderCadence) =>
              void update({ goalUpdateReminderCadence })
            }
          />
          <Toggle
            label="Deadline reminders"
            description="A heads-up before your target date and once it has passed"
            on={prefs?.deadlineReminders ?? true}
            onChange={() => toggle("deadlineReminders")}
          />
          <PlatformDigestCadence
            value={prefs?.platformDigestCadence ?? "off"}
            onChange={(platformDigestCadence) => {
              void (async () => {
                await update({ platformDigestCadence });
                if (platformDigestCadence !== "off") {
                  trackDataFastGoal("marketing_email_opt_in", {
                    category: "discover_digest",
                    cadence: platformDigestCadence,
                  });
                }
              })();
            }}
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
        <p className="mt-4 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
          Password resets and account verification are essential security emails and stay on.
        </p>
      </Section>
    </div>
  );
}

function PlatformDigestCadence({
  value,
  onChange,
}: {
  value: "off" | "daily" | "weekly";
  onChange: (value: "off" | "daily" | "weekly") => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <div className="text-sm font-medium text-[var(--color-text)]">
          Discover new goals
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
          A short selection of new, approved public goals from other members
        </div>
        <div className="mt-1 text-[10px] text-[var(--color-text-dim)]">
          Sent on your chosen schedule when new goals are available. Off by default.
        </div>
      </div>
      <select
        aria-label="Discover new goals email frequency"
        value={value}
        onChange={(event) => onChange(event.target.value as "off" | "daily" | "weekly")}
        className="h-8 shrink-0 rounded-lg border border-[var(--color-border)] bg-white px-2 text-xs font-medium text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
      >
        <option value="off">Off</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
      </select>
    </div>
  );
}

function ReminderCadence({
  value,
  onChange,
}: {
  value: "off" | "daily" | "weekly";
  onChange: (value: "off" | "daily" | "weekly") => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <div className="text-sm font-medium text-[var(--color-text)]">Goal update reminder</div>
        <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
          A nudge to post an update when an active goal goes quiet
        </div>
      </div>
      <select
        aria-label="Goal update reminder frequency"
        value={value}
        onChange={(event) => onChange(event.target.value as "off" | "daily" | "weekly")}
        className="h-8 shrink-0 rounded-lg border border-[var(--color-border)] bg-white px-2 text-xs font-medium text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
      >
        <option value="off">Off</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
      </select>
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
