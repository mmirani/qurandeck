import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { loadSurahSeed, type SurahSeed } from "@/lib/quran/surah-seed";

export const metadata: Metadata = {
  title: "Read",
  description: "Read The Noble Quran on QuranDeck, with search, recitation, notes, and a place that stays with you.",
  alternates: { canonical: "/read" },
};

export const revalidate = 86400;

export default async function ReadPage() {
  let initialSurah: SurahSeed | null = null;
  try {
    initialSurah = await loadSurahSeed(1);
  } catch {
    initialSurah = null;
  }
  return <AppShell initialSurah={initialSurah} />;
}
