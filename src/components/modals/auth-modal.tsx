"use client";

import { useState } from "react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { Modal } from "@/components/ui/modal";
import { PROMISE_LINE, PROMISE_STORY } from "@/lib/brand";

export function AuthModal() {
  const { modal, closeModal, signIn, signUp, signInWithGoogle, signOut, user } = useMushaf();
  const [mode, setMode] = useState<"google" | "signin" | "signup">("google");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (modal !== "auth") return null;

  return (
    <Modal eyebrow={PROMISE_LINE} title={user ? "Your account" : "Sign in"} onClose={closeModal}>
      {user ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            Signed in as <strong>{user.displayName}</strong>
            {user.email ? ` · ${user.email}` : ` (${user.username})`}.
          </p>
          <p className="text-sm text-ink-soft">{PROMISE_STORY}</p>
          <p className="text-xs text-gold-deep">
            {user.provider === "google" ? "Google profile on this device" : "Local account"} · {PROMISE_LINE}
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("google")}
              className={`h-10 cursor-pointer rounded-full px-4 text-sm ${mode === "google" ? "bg-gold text-on-gold" : "border border-line"}`}
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`h-10 cursor-pointer rounded-full px-4 text-sm ${mode === "signin" ? "bg-gold text-on-gold" : "border border-line"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`h-10 cursor-pointer rounded-full px-4 text-sm ${mode === "signup" ? "bg-gold text-on-gold" : "border border-line"}`}
            >
              Create account
            </button>
          </div>

          {mode === "google" ? (
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                setError(await signInWithGoogle(email));
              }}
            >
              <p className="text-xs text-ink-soft">
                Enter your Gmail to create a profile we can keep iterating on. Real Google OAuth will replace this
                later; the same email can stay your account.
              </p>
              <label className="block text-sm">
                Gmail
                <input
                  type="email"
                  className="mt-1 h-11 w-full rounded-2xl border border-line bg-surface px-3"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@gmail.com"
                  autoComplete="email"
                  required
                />
              </label>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <button type="submit" className="h-14 w-full cursor-pointer rounded-full bg-gold text-lg text-on-gold">
                Continue with Google
              </button>
            </form>
          ) : (
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const message =
                  mode === "signin"
                    ? await signIn(username, password)
                    : await signUp(username, password, displayName);
                setError(message);
              }}
            >
              {mode === "signup" ? (
                <label className="block text-sm">
                  Display name
                  <input
                    className="mt-1 h-11 w-full rounded-2xl border border-line bg-surface px-3"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    autoComplete="name"
                  />
                </label>
              ) : null}
              <label className="block text-sm">
                Username
                <input
                  className="mt-1 h-11 w-full rounded-2xl border border-line bg-surface px-3"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                />
              </label>
              <label className="block text-sm">
                Password
                <input
                  type="password"
                  className="mt-1 h-11 w-full rounded-2xl border border-line bg-surface px-3"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                />
              </label>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <button type="submit" className="h-14 w-full cursor-pointer rounded-full bg-gold text-lg text-on-gold">
                {mode === "signin" ? "Sign in" : "Create free account"}
              </button>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}
