import Link from "next/link";
import { AuthFailureBeacon } from "@/components/analytics/auth-failure";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const betaBlocked = error === "AccessDenied";

  return (
    <main className="qd-gutter mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 py-12">
      <AuthFailureBeacon error={typeof error === "string" ? error : undefined} />
      <h1 className="font-display text-2xl font-semibold text-ink">
        {betaBlocked ? "Beta invite required" : "Sign-in issue"}
      </h1>
      <p className="text-sm leading-relaxed text-ink-soft">
        {betaBlocked
          ? "QuranDeck beta is invite-only right now. Enter your invite code, then try signing in again."
          : "Something went wrong while signing you in. Please try again."}
      </p>
      <div className="flex flex-col gap-3">
        {betaBlocked ? (
          <Link href="/beta" className="inline-flex h-11 items-center justify-center rounded-full bg-gold text-sm font-semibold text-on-gold">
            Enter beta invite
          </Link>
        ) : null}
        <Link href="/" className="inline-flex h-11 items-center justify-center rounded-full border border-line text-sm font-medium text-ink">
          Back home
        </Link>
      </div>
    </main>
  );
}
