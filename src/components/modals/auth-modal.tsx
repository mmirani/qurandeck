"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { Modal } from "@/components/ui/modal";
import { PROMISE_LINE, PROMISE_STORY } from "@/lib/brand";

type AuthTab = "social" | "email";

let pendingTab: AuthTab = "social";

export function requestAuthTab(tab: AuthTab) {
  pendingTab = tab;
}

type AuthConfig = {
  google: boolean;
  github: boolean;
  email: boolean;
  publicSignup: boolean;
  hasSecret: boolean;
};

export function AuthModal() {
  const { modal, closeModal, signOut, user } = useMushaf();
  const [mode, setMode] = useState<AuthTab>(pendingTab);
  const [open, setOpen] = useState(modal === "auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState<AuthConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/config")
      .then((response) => response.json())
      .then((data: AuthConfig) => {
        if (!cancelled) setConfig(data);
      })
      .catch(() => {
        if (!cancelled) setConfig(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (modal === "auth" && !open) {
    setOpen(true);
    setMode(pendingTab);
    setError(null);
    setInfo(null);
  } else if (modal !== "auth" && open) {
    setOpen(false);
    pendingTab = "social";
  }

  if (modal !== "auth") return null;

  const title = user ? "Your account" : "Sign in";
  const anyProvider = Boolean(config?.google || config?.github || config?.email);

  const providerLabel = (() => {
    if (user?.provider === "google") return "Google";
    if (user?.provider === "github") return "GitHub";
    if (user?.provider === "email") return "Email link";
    if (user?.provider === "local") return "Legacy local profile";
    return "Account";
  })();

  return (
    <Modal eyebrow={PROMISE_LINE} title={title} onClose={closeModal}>
      {user ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            Signed in as <strong>{user.displayName}</strong>
            {user.email ? ` · ${user.email}` : user.username ? ` · ${user.username}` : null}.
          </p>
          <p className="text-sm text-ink-soft">{PROMISE_STORY}</p>
          <p className="text-xs text-gold-deep">
            {providerLabel} · {PROMISE_LINE}
          </p>
          <button
            type="button"
            onClick={signOut}
            className="h-11 cursor-pointer rounded-full border border-line px-5 text-sm"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="kufic-label text-gold-deep">{PROMISE_LINE}</p>
          <p className="text-sm text-ink-soft">{PROMISE_STORY}</p>

          {!config?.hasSecret ? (
            <p className="rounded-2xl border border-danger/30 bg-surface px-3 py-2 text-xs text-danger">
              Auth is not configured on this deployment yet (missing AUTH_SECRET).
            </p>
          ) : null}

          {!anyProvider && config?.hasSecret ? (
            <p className="rounded-2xl border border-line bg-surface px-3 py-2 text-xs text-ink-soft">
              Add Google, GitHub, or Resend email keys in Vercel to enable sign-in.
            </p>
          ) : null}

          {config && !config.publicSignup ? (
            <p className="text-xs text-ink-soft">
              Beta is invite-only.{" "}
              <Link href="/beta" className="font-medium text-gold-deep underline">
                Enter your invite code
              </Link>{" "}
              on this device first.
            </p>
          ) : null}

          {config?.email ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("social")}
                className={`h-10 cursor-pointer rounded-full px-4 text-sm ${mode === "social" ? "bg-gold text-on-gold" : "border border-line"}`}
              >
                Social
              </button>
              <button
                type="button"
                onClick={() => setMode("email")}
                className={`h-10 cursor-pointer rounded-full px-4 text-sm ${mode === "email" ? "bg-gold text-on-gold" : "border border-line"}`}
              >
                Email link
              </button>
            </div>
          ) : null}

          {mode === "email" && config?.email ? (
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                setError(null);
                setInfo(null);
                const result = await signIn("resend", { email: email.trim(), redirect: false, callbackUrl: "/read" });
                setBusy(false);
                if (result?.error) {
                  setError("Could not send sign-in link. Check your invite access and email.");
                  return;
                }
                setInfo("Check your inbox for a secure sign-in link.");
              }}
            >
              <p className="text-xs text-ink-soft">No password — we email you a one-time link.</p>
              <label className="block text-sm">
                Email
                <input
                  type="email"
                  className="mt-1 h-11 w-full rounded-2xl border border-line bg-surface px-3"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              {info ? <p className="text-sm text-gold-deep">{info}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="h-14 w-full cursor-pointer rounded-full bg-gold text-lg text-on-gold disabled:opacity-50"
              >
                {busy ? "Sending…" : "Email me a sign-in link"}
              </button>
            </form>
          ) : (
            <div className="space-y-2">
              {config?.google ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void signIn("google", { callbackUrl: "/read" });
                  }}
                  className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-sm font-medium text-ink disabled:opacity-50"
                >
                  Continue with Google
                </button>
              ) : null}
              {config?.github ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void signIn("github", { callbackUrl: "/read" });
                  }}
                  className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-sm font-medium text-ink disabled:opacity-50"
                >
                  Continue with GitHub
                </button>
              ) : null}
              {config?.email ? (
                <button
                  type="button"
                  onClick={() => setMode("email")}
                  className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-gold text-sm font-semibold text-on-gold"
                >
                  Continue with email link
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
