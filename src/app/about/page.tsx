import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { COMPANION_NAME, PRODUCT_NAME, PROMISE_LINE, WORK_TITLE } from "@/lib/brand";
import { QF_ATTRIBUTION } from "@/components/site/quran-credit";

export const metadata: Metadata = {
  title: "About",
  description: "QuranDeck is a free, private, personal mushaf for The Noble Quran.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <LegalPage title="About QuranDeck" updated="November 10, 2026">
      <LegalSection title="A personal mushaf">
        <p>
          {PRODUCT_NAME} is a reading room for {WORK_TITLE}. Search, recitation, notes, highlights, and a place that
          stays with you. {PROMISE_LINE}.
        </p>
        <p>
          Arabic stays on the page. Translations sit beside it in the language you choose. Tafsir opens when you ask
          for it, in a size you can actually read.
        </p>
      </LegalSection>
      <LegalSection title="Quran text">
        <p translate="no">{QF_ATTRIBUTION}</p>
        <p>
          Arabic, translations, tafsir, and recitation come from Quran Foundation when server credentials are set, and
          from the public Quran.com API until then. Extra search lines may come from AlQuran Cloud. The edition name
          on a translation, the tafsir you open, and the reciter in the player are the credits for that text and audio.
          QuranDeck is an independent reading room, not an official Quran Foundation product.
        </p>
      </LegalSection>
      <LegalSection title={COMPANION_NAME}>
        <p>
          {COMPANION_NAME} is the small companion in the reader. Ask in plain words — play this surah, make the type
          larger, show me search — and she answers. A full tour is there if you want it. She does not follow you around
          the text, and she stays still when reduced motion is on.
        </p>
      </LegalSection>
      <LegalSection title="Private by default">
        <p>
          You can read as a guest. Notes and progress then stay in this browser. An account seals that library so it
          can meet you on another device. The details are in the{" "}
          <Link href="/privacy" className="text-gold-deep underline-offset-4 hover:underline">
            privacy policy
          </Link>
          .
        </p>
        <p>
          Questions and ideas belong on the{" "}
          <Link href="/contact" className="text-gold-deep underline-offset-4 hover:underline">
            contact page
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
