import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { AppShell } from "@/components/shell/app-shell";
import { parseSurahId } from "@/lib/quran/ids";
import { fetchChapter } from "@/lib/quran/server";
import { loadSurahSeed, type SurahSeed } from "@/lib/quran/surah-seed";
import { pageMeta, surahBreadcrumb } from "@/lib/seo";

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
    return pageMeta({ title, description, path: `/surah/${id}` });
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
  const name = initialSurah
    ? `${initialSurah.chapter.nameSimple} (${initialSurah.chapter.nameArabic})`
    : `Surah ${id}`;
  return (
    <>
      <JsonLd data={surahBreadcrumb({ id, name })} />
      <AppShell initialSurah={initialSurah} />
    </>
  );
}
