"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function BetaInvitePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6 py-12">
      <div>
        <p className="kufic-label text-gold-deep">QuranDeck beta</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">Enter invite code</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Paste the private link code you received. This device will be cleared for beta sign-in for 90 days.
        </p>
      </div>
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);
          setError(null);
          try {
            const response = await fetch("/api/beta/unlock", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code }),
            });
            const data = (await response.json()) as { ok?: boolean; error?: string };
            if (!response.ok || !data.ok) {
              setError(data.error ?? "Could not verify code.");
              return;
            }
            router.push("/?auth=1");
            router.refresh();
          } catch {
            setError("Network error. Try again.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <label className="block text-sm">
          Invite code
          <input
            className="mt-1 h-11 w-full rounded-2xl border border-line bg-surface px-3"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="off"
            required
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full cursor-pointer rounded-full bg-gold text-sm font-semibold text-on-gold disabled:opacity-50"
        >
          {loading ? "Checking…" : "Unlock beta on this device"}
        </button>
      </form>
      <Link href="/" className="text-center text-sm text-gold-deep hover:underline">
        Back to home
      </Link>
    </main>
  );
}
