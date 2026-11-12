import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { parseJuzId } from "@/lib/quran/ids";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const juz = parseJuzId(id);
  if (!juz) return { title: "Juz not found" };
  return pageMeta({
    title: `Juz ${juz}`,
    description: `Juz ${juz} of The Noble Quran on QuranDeck. The same ayahs are indexed on their surah pages.`,
    path: `/juz/${juz}`,
    index: false,
  });
}

export default async function JuzPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!parseJuzId(id)) notFound();
  return <AppShell />;
}
