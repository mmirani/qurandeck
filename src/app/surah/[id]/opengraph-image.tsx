import { ogSize, renderSurahShareImage } from "@/lib/og/share-image";

export const alt = "Read a surah on QuranDeck";
export const size = ogSize;
export const contentType = "image/png";
export const runtime = "nodejs";
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return renderSurahShareImage(id);
}
