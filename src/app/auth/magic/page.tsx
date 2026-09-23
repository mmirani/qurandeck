"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function MagicSignInPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("This sign-in link is missing or invalid.");
      return;
    }

    let cancelled = false;
    void signIn("magic-link", { token, callbackUrl: "/read", redirect: false }).then((result) => {
      if (cancelled) return;
      if (result?.ok) {
        window.location.href = "/read";
        return;
      }
      setError("This link expired or was already used. Request a new one.");
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 py-12">
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
