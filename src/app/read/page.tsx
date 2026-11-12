import { AppShell } from "@/components/shell/app-shell";
import { loadSurahSeed, type SurahSeed } from "@/lib/quran/surah-seed";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Read",
  description: "Read The Noble Quran on QuranDeck, with Arabic, translation, search, recitation, and notes.",
  path: "/read",
});

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
