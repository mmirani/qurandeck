"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function MagicSignInPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    void signIn("magic-link", { token, callbackUrl: "/read", redirect: false }).then((result) => {
      if (result?.ok && !result.error) {
        window.location.assign(`${window.location.origin}/read`);
        return;
      }
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const error = !token
    ? "This sign-in link is missing or invalid."
    : failed
      ? "This link expired or was already used. Request a new one."
      : null;

  return (
    <main className="qd-gutter mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 py-12">
      <h1 className="font-display text-2xl font-semibold text-ink">Signing you in…</h1>
      {error ? (
        <>
          <p className="text-sm text-danger">{error}</p>
          <Link href="/" className="inline-flex h-11 items-center justify-center rounded-full bg-gold text-sm font-semibold text-on-gold">
            Back home
          </Link>
        </>
      ) : (
        <p className="text-sm text-ink-soft">One moment while we open your reading session.</p>
      )}
    </main>
  );
}
