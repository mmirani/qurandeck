import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { parseSurahId } from "@/lib/quran/ids";
import { fetchChapter } from "@/lib/quran/server";
import { loadSurahSeed, type SurahSeed } from "@/lib/quran/surah-seed";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: raw } = await params;
  const id = parseSurahId(raw);
  if (!id) return { title: "Surah not found" };
  try {
    const chapter = await fetchChapter(id);
    const title = `${chapter.nameSimple} · ${chapter.translatedName}`;
    const description = `Read ${chapter.nameSimple} (${chapter.nameArabic}) on QuranDeck. ${chapter.versesCount} ayahs.`;
    return {
      title,
      description,
      alternates: { canonical: `/surah/${id}` },
      openGraph: { title, description, url: `/surah/${id}` },
      twitter: { title, description },
    };
  } catch {
    return { title: "Surah" };
  }
}

export default async function SurahPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = parseSurahId(raw);
  if (!id) notFound();
  let initialSurah: SurahSeed | null = null;
  try {
    initialSurah = await loadSurahSeed(id);
  } catch {
    initialSurah = null;
  }
  return <AppShell initialSurah={initialSurah} />;
}
