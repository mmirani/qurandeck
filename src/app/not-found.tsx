import type { Metadata } from "next";
import Link from "next/link";
import { MihrabMark } from "@/components/art/ornaments";
import { BrandWordmark } from "@/components/brand/brand-wordmark";

export const metadata: Metadata = {
  title: "Page not found",
  description: "That page is not part of QuranDeck.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="border-b border-line/70">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <MihrabMark className="h-7 w-7" />
            <BrandWordmark className="text-2xl leading-none" />
          </Link>
        </div>
      </header>
      <main id="main-content" className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <p className="kufic-label text-gold-deep">404</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">This page is not in the mushaf.</h1>
        <p className="mt-3 text-base leading-7 text-ink-soft">
          The address may be mistyped, or the surah number is outside 1 to 114. The reading room is still open.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-full bg-gold px-6 text-sm font-semibold text-on-gold"
          >
            Back home
          </Link>
          <Link
            href="/read"
            className="inline-flex h-12 items-center justify-center rounded-full border border-gold/40 px-6 text-sm font-medium text-gold-deep"
          >
            Open the mushaf
          </Link>
        </div>
      </main>
    </div>
  );
}
