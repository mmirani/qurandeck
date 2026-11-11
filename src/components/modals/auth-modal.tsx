"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { addPasskey, signInWithPasskey } from "@/components/account/passkey-actions";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { Modal } from "@/components/ui/modal";
import { PROMISE_LINE, PROMISE_STORY } from "@/lib/brand";
import { rememberAuthMethod, trackUsage } from "@/lib/usage-client";

type AuthConfig = {
  google: boolean;
  apple: boolean;
  github: boolean;
  email: boolean;
  passkey?: boolean;
  emailDelivery?: "resend" | "dev-link" | "unavailable";
  publicSignup: boolean;
  hasSecret: boolean;
};

export function AuthModal() {
  const { modal, closeModal, signOut, updateDisplayName, user } = useMushaf();
  const [open, setOpen] = useState(modal === "auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [oneTimeCode, setOneTimeCode] = useState("");
  const [displayName, setDisplayName] = useState("");
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
    setError(null);
    setInfo(null);
    setDevCode(null);
    setCodeSent(false);
    setOneTimeCode("");
    setDisplayName(user?.displayName ?? "");
  } else if (modal !== "auth" && open) {
    setOpen(false);
  }

  if (modal !== "auth") return null;

  const title = user ? "Your account" : "Sign in";

  const providerLabel = (() => {
    if (user?.provider === "google") return "Google";
    if (user?.provider === "apple") return "Apple";
    if (user?.provider === "passkey") return "Passkey";
    if (user?.provider === "github") return "GitHub";
    if (user?.provider === "email") return "Email code";
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
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              const message = updateDisplayName(displayName);
              setError(message);
              setInfo(message ? null : "Display name saved.");
            }}
          >
            <label className="block text-sm">
              Display name
              <input
                className="mt-1 h-11 w-full rounded-2xl border border-line bg-surface px-3"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setError(null);
                  setInfo(null);
                }}
                maxLength={40}
                autoComplete="nickname"
              />
            </label>
            <p className="text-xs text-ink-soft">Shown on your reading screens. It does not have to be unique.</p>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {info ? <p className="text-sm text-gold-deep">{info}</p> : null}
            <button type="submit" className="h-11 cursor-pointer rounded-full bg-gold px-5 text-sm font-semibold text-on-gold">
              Save name
            </button>
          </form>
          {config?.passkey ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setError(null);
                setInfo(null);
                void addPasskey()
                  .then(() => setInfo("Passkey saved on this device."))
                  .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not add a passkey."))
                  .finally(() => setBusy(false));
              }}
              className="h-11 cursor-pointer rounded-full border border-line px-5 text-sm disabled:opacity-50"
            >
              {busy ? "Waiting for the passkey…" : "Add a passkey"}
            </button>
          ) : null}
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
          <p className="text-sm text-ink-soft">
            You can read, bookmark, and take notes without an account. Sign in when you want to sync your notes across
            devices.
          </p>

          {!config?.hasSecret ? (
            <p className="rounded-2xl border border-danger/30 bg-surface px-3 py-2 text-xs text-danger">
              Auth is not configured on this deployment yet (missing AUTH_SECRET).
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

          <div className="space-y-2">
            {config?.google ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  rememberAuthMethod("google");
                  trackUsage({ name: "auth_requested", method: "google" });
                  void signIn("google", { callbackUrl: "/read" });
                }}
                className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-sm font-medium text-ink disabled:opacity-50"
              >
                Continue with Google
              </button>
            ) : null}
            {config?.apple ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  rememberAuthMethod("apple");
                  trackUsage({ name: "auth_requested", method: "apple" });
                  void signIn("apple", { callbackUrl: "/read" });
                }}
                className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-sm font-medium text-ink disabled:opacity-50"
              >
                Sign in with Apple
              </button>
            ) : null}
            {config?.passkey ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError(null);
                  void signInWithPasskey()
                    .catch((reason: unknown) => {
                      setError(reason instanceof Error ? reason.message : "Could not use a passkey.");
                      setBusy(false);
                    });
                }}
                className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-sm font-medium text-ink disabled:opacity-50"
              >
                Sign in with a passkey
              </button>
            ) : null}
          </div>

          {config?.email ? (
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                setError(null);
                setInfo(null);
                try {
                  if (!codeSent) {
                    const response = await fetch("/api/auth/email-code", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: email.trim() }),
                    });
                    const data = (await response.json()) as { ok?: boolean; error?: string; emailed?: boolean; devCode?: string };
                    if (!response.ok || !data.ok) {
                      setError(data.error ?? "Could not send a sign-in code.");
                      return;
                    }
                    setCodeSent(true);
                    if (config.emailDelivery === "dev-link" && data.devCode) {
                      setDevCode(data.devCode);
                      setInfo("Local development only: mail is not configured, so the code is shown here.");
                      return;
                    }
                    setInfo("Check your email for a 6-digit code. It expires in 10 minutes and works once.");
                    return;
                  }
                  const response = await fetch("/api/auth/email-code/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: email.trim(), code: oneTimeCode.trim() }),
                  });
                  const data = (await response.json()) as { ok?: boolean; error?: string; token?: string };
                  if (!response.ok || !data.ok || !data.token) {
                    setError(data.error ?? "That code is incorrect or expired.");
                    return;
                  }
                  const result = await signIn("magic-link", { token: data.token, callbackUrl: "/read", redirect: false });
                  if (result?.ok && !result.error) {
                    window.location.assign(`${window.location.origin}/read`);
                    return;
                  }
                  setError("Could not start the session.");
                } catch {
                  setError("Network error. Try again.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {config.emailDelivery === "unavailable" ? (
                <p className="text-sm text-danger">Email sign-in is unavailable until outgoing mail is configured.</p>
              ) : (
                <p className="text-xs text-ink-soft">
                  Or email a 6-digit code. It expires in 10 minutes and works once.
                  {config.emailDelivery === "dev-link" ? " This local machine shows the code because mail is not configured." : null}
                </p>
              )}
              <label className="block text-sm">
                Email
                <input
                  type="email"
                  className="mt-1 h-11 w-full rounded-2xl border border-line bg-surface px-3"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setCodeSent(false);
                    setDevCode(null);
                  }}
                  autoComplete="email"
                  required
                />
              </label>
              {codeSent ? (
                <label className="block text-sm">
                  Code
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    className="mt-1 h-11 w-full rounded-2xl border border-line bg-surface px-3 tracking-[0.3em]"
                    value={oneTimeCode}
                    onChange={(event) => setOneTimeCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                  />
                </label>
              ) : null}
              {devCode && config.emailDelivery === "dev-link" ? (
                <p className="rounded-2xl border border-gold/40 bg-accent-soft px-3 py-2 text-center font-mono text-lg tracking-[0.3em] text-gold-deep">
                  {devCode}
                </p>
              ) : null}
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              {info ? <p className="text-sm text-gold-deep">{info}</p> : null}
              <button
                type="submit"
                disabled={busy || config.emailDelivery === "unavailable"}
                className="h-14 w-full cursor-pointer rounded-full bg-gold text-lg text-on-gold disabled:opacity-50"
              >
                {busy ? "Working…" : codeSent ? "Sign in" : "Email me a code"}
              </button>
            </form>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
