"use client";

import { useMushaf } from "@/components/providers/mushaf-provider";
import {
  COMPLETION_PIECES,
  pieceAyahRange,
  quranPieceMap,
  TOTAL_AYAHS,
} from "@/lib/reading";

/** Theme tokens that cycle by surah so neighbouring chapters can read apart. */
const SURAH_TONES = ["var(--gold)", "var(--chip-alt)", "var(--accent)"] as const;

function pieceFill(chapterId: number, value: number) {
  if (value <= 0) return "var(--canvas)";
  const tone = SURAH_TONES[(chapterId - 1) % SURAH_TONES.length];
  const strength = Math.round(28 + value * 72);
  return `color-mix(in srgb, ${tone} ${strength}%, var(--canvas))`;
}

export function CompletionMap() {
  const { progress, chapters, jumpToHit, closeModal } = useMushaf();
  const map = quranPieceMap(progress.versesRead);
  const read = progress.versesRead.length;
  const name = (id: number) => chapters.find((item) => item.id === id)?.nameSimple ?? `Surah ${id}`;

  const openPiece = (piece: number) => {
    const range = pieceAyahRange(piece);
    const start = range.start;
    if (!start) return;
    closeModal();
    jumpToHit({
      verseKey: `${start.chapterId}:${start.verseNumber}`,
      chapterId: start.chapterId,
      verseNumber: start.verseNumber,
      textArabic: "",
      textTranslation: "Quran completion",
      source: "jump",
    });
  };

  return (
    <section className="rounded-3xl border border-line bg-surface p-6 sm:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-deep">Quran completion</p>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft">
        This is a mushaf map, like a torrent bar. The Quran is laid left to right from Al-Fatihah to An-Nas. Each
        sliver is a slice of ayahs. Colour follows the surah on a short theme cycle so neighbouring chapters can read
        apart. Brighter means more of that slice is lit. Empty slivers are still unread.
      </p>
      <div
        className="mt-6 grid h-14 gap-px overflow-hidden rounded-2xl bg-line/80 p-1"
        style={{ gridTemplateColumns: `repeat(${COMPLETION_PIECES}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`Quran completion map, ${read} of ${TOTAL_AYAHS} ayahs, ${map.percent} percent`}
      >
        {map.coverage.map((value, piece) => {
          const range = pieceAyahRange(piece);
          const chapterId = range.start?.chapterId ?? 1;
          const from = range.start ? `${name(chapterId)} ${chapterId}:${range.start.verseNumber}` : "";
          const to = range.end ? `${range.end.chapterId}:${range.end.verseNumber}` : "";
          return (
            <button
              key={piece}
              type="button"
              title={`${from} – ${to}${value > 0 ? ` · ${Math.round(value * 100)}% of this slice` : " · unread"}`}
              aria-label={`${from} to ${to}, ${value > 0 ? "read" : "unread"}`}
              onClick={() => openPiece(piece)}
              className="h-full min-w-0 cursor-pointer rounded-[2px]"
              style={{ background: pieceFill(chapterId, value) }}
            />
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-soft">
        <p>
          {read} of {TOTAL_AYAHS} ayahs · {map.percent}% of the mushaf
        </p>
        <p>
          {map.scattered
            ? `${map.uniqueSurahs} surahs in pieces — every speck still counts`
            : map.filled
              ? `${map.filled} of ${map.pieceCount} slices have light`
              : "Stay on an ayah for a few seconds to light the first slice"}
        </p>
      </div>
    </section>
  );
}
