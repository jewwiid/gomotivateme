"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AtSign, Check, Loader2, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import {
  MAX_HANDLE_LENGTH,
  suggestHandle,
  validateHandleClient,
} from "@/lib/handle";
import { RequireAuth } from "@/components/RequireAuth";
import { useCurrentUser } from "@/lib/useCurrentUser";

/**
 * One-time handle-setup gate for authenticated users who don't yet have a
 * handle — primarily Google OAuth sign-ins, which land authenticated with
 * a name + email but no handle. Handles are locked after creation, so this
 * makes the choice explicit rather than auto-assigning a guess.
 *
 * Wrapped in RequireAuth (must be signed in) but NOT RequireHandle, to
 * avoid a redirect loop. Prefills a suggestion derived from their name.
 */
export default function SetupHandlePage() {
  return (
    <RequireAuth>
      <SetupHandleForm />
    </RequireAuth>
  );
}

function SetupHandleForm() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const setHandle = useMutation(api.users.setHandle);

  const [handle, setHandleInput] = useState("");
  const [handleErr, setHandleErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const handleDirtyRef = useRef(false);

  // Prefill a suggestion from their Google account name. Frozen once they
  // edit the field so we don't clobber their choice.
  useEffect(() => {
    if (!handleDirtyRef.current && user?.name) {
      const suggested = suggestHandle(user.name);
      if (suggested) {
        setHandleInput(suggested);
        setHandleErr(validateHandleClient(suggested));
      }
    }
  }, [user?.name]);

  const onHandleChange = (v: string) => {
    handleDirtyRef.current = true;
    const lower = v.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    setHandleInput(lower.slice(0, MAX_HANDLE_LENGTH));
    setHandleErr(validateHandleClient(lower));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHandleErr(null);

    const trimmed = handle.trim();
    const clientErr = validateHandleClient(trimmed);
    if (clientErr) {
      setHandleErr(clientErr);
      return;
    }

    setBusy(true);
    try {
      await setHandle({ handle: trimmed });
      router.replace("/dashboard");
    } catch (he) {
      // "That handle is taken" and friends belong on the field.
      setHandleErr(he instanceof Error ? he.message : "Couldn't set handle");
    } finally {
      setBusy(false);
    }
  };

  const handleValid = handle.trim().length > 0 && !handleErr;
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="flex min-h-screen flex-col bg-[#fffdf8] text-[#292929]">
      <main className="flex flex-1 items-center justify-center px-5 py-16 sm:px-8 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Greeting with their Google identity for context */}
          <div className="mb-8 flex items-center gap-3">
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-primary)] text-base font-semibold text-white">
                {(firstName ?? "?")[0]}
              </div>
            )}
            <div>
              <p className="brand-kicker">Almost there</p>
              <p className="text-sm text-[#686963]">
                Welcome{firstName ? `, ${firstName}` : ""}.
              </p>
            </div>
          </div>

          <h1 className="font-display text-4xl font-bold tracking-[-0.05em] sm:text-5xl">
            Claim your handle
          </h1>
          <p className="mb-8 mt-3 text-base leading-7 text-[#686963]">
            This is your identity on gomotivateme. It&apos;s how people find and tag
            you. You can change it once after this, then it&apos;s locked.
          </p>

          <form onSubmit={onSubmit} className="space-y-3" noValidate>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#3b3b37]">
                Handle
              </label>
              <div
                className={`flex items-center rounded-xl border bg-white pr-3 transition ${
                  handleErr
                    ? "border-[var(--color-danger)]/50"
                    : handleValid
                    ? "border-emerald-500/40"
                    : "border-[#c9c8c0] focus-within:border-[var(--color-primary)]"
                }`}
              >
                <span className="ml-3 select-none text-sm text-[var(--color-text-dim)]">
                  <AtSign size={14} className="inline -translate-y-px" />
                </span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => onHandleChange(e.target.value)}
                  autoComplete="username"
                  spellCheck={false}
                  className="w-full bg-transparent px-2 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none"
                  placeholder="your-handle"
                />
                {handleValid && <Check size={14} className="text-emerald-400" />}
                {handleErr && <X size={14} className="text-[var(--color-danger)]" />}
              </div>
              <div className="mt-1 text-[10px] text-[var(--color-text-dim)]">
                {handleErr ?? (
                  <>
                    Your profile lives at{" "}
                    <span className="font-mono text-[var(--color-text-muted)]">
                      gomotivateme.com/@{handle.trim() || "your-handle"}
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={busy || !handleValid}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Claiming...
                </>
              ) : (
                "Claim handle"
              )}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
