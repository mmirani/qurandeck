import type { ReactNode } from "react";
import Link from "next/link";
import { HeaderAccount } from "@/components/auth/header-account";
import { MihrabMark } from "@/components/art/ornaments";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { QuranCredit } from "@/components/site/quran-credit";

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
        <div className="qd-gutter mx-auto flex h-16 max-w-3xl items-center gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="QuranDeck home">
            <MihrabMark className="h-7 w-7 shrink-0" />
            <BrandWordmark className="truncate text-2xl leading-none" />
          </Link>
          <div className="ml-auto">
            <HeaderAccount />
          </div>
        </div>
      </header>
      <main id="main-content" className="qd-gutter qd-section mx-auto flex max-w-3xl flex-col gap-8">
        <div className="qd-stack">
          <p className="kufic-label text-gold-deep">QuranDeck</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="text-sm leading-6 text-ink-soft">Last updated {updated}</p>
        </div>
        <div className="flex flex-col gap-8">{children}</div>
        <QuranCredit className="mt-12" />
        <nav aria-label="Site" className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line/70 pt-6 text-sm text-ink-soft">
          <Link href="/about" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline">
            About
          </Link>
          <Link href="/contact" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline">
            Contact
          </Link>
          <Link href="/privacy" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline">
            Terms
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline">
            Home
          </Link>
        </nav>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="qd-stack max-w-[68ch] text-base leading-7 text-ink-soft">
      <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}
