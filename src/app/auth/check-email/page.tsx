import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 py-12">
      <h1 className="font-display text-2xl font-semibold text-ink">Check your email</h1>
      <p className="text-sm leading-relaxed text-ink-soft">
        We sent you a secure sign-in link. Open it on this device to continue into QuranDeck beta.
      </p>
      <Link href="/read" className="inline-flex h-11 items-center justify-center rounded-full bg-gold text-sm font-semibold text-on-gold">
        Continue reading
      </Link>
    </main>
  );
}
