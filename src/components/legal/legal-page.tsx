import type { ReactNode } from "react";
import Link from "next/link";
import { MihrabMark } from "@/components/art/ornaments";
import { BrandWordmark } from "@/components/brand/brand-wordmark";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="border-b border-line/70">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <MihrabMark className="h-7 w-7" />
            <BrandWordmark className="text-2xl leading-none" />
          </Link>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="kufic-label text-gold-deep">QuranDeck</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-soft">Last updated {updated}</p>
        <div className="mt-8 space-y-8">{children}</div>
        <nav aria-label="Legal" className="mt-12 flex flex-wrap gap-4 border-t border-line/70 pt-6 text-sm text-ink-soft">
          <Link href="/privacy" className="underline-offset-4 hover:text-ink hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="underline-offset-4 hover:text-ink hover:underline">
            Terms
          </Link>
          <Link href="/" className="underline-offset-4 hover:text-ink hover:underline">
            Home
          </Link>
        </nav>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 text-base leading-7 text-ink-soft">
      <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}
