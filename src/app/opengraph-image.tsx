import { ogSize, renderHomeShareImage } from "@/lib/og/share-image";

export const alt = "QuranDeck, a personal mushaf for The Noble Quran";
export const size = ogSize;
export const contentType = "image/png";
export const runtime = "nodejs";

export default function Image() {
  return renderHomeShareImage();
}
