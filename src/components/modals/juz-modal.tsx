"use client";

import { useMushaf } from "@/components/providers/mushaf-provider";
import { Modal } from "@/components/ui/modal";

function mappingLabel(
  mapping: Record<string, string>,
  chapters: { id: number; nameSimple: string }[],
) {
  const ids = Object.keys(mapping).map(Number).sort((a, b) => a - b);
  if (ids.length === 0) return "";
  const first = ids[0];
  const last = ids[ids.length - 1];
  const firstSpan = mapping[String(first)].split("-");
  const lastSpan = mapping[String(last)].split("-");
  const firstName = chapters.find((item) => item.id === first)?.nameSimple ?? `Surah ${first}`;
  const lastName = chapters.find((item) => item.id === last)?.nameSimple ?? `Surah ${last}`;
  return `${firstName} ${first}:${firstSpan[0]} – ${lastName} ${last}:${lastSpan[1] ?? lastSpan[0]}`;
}

export function JuzModal() {
  const { modal, closeModal, juzs, chapters, openJuz, currentJuz } = useMushaf();
  if (modal !== "juz") return null;

  return (
    <Modal eyebrow="Thirty parts" title="All 30 Juz" onClose={closeModal} wide>
      <p className="mb-5 text-sm text-ink-soft">
        The Quran is traditionally divided into 30 juz for paced reading. Open a card to read that entire section, with surah headings as the text crosses chapters.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {juzs.map((juz) => {
          const active = currentJuz === juz.juzNumber;
          return (
            <button
              key={juz.juzNumber}
              type="button"
              onClick={() => {
                closeModal();
                openJuz(juz.juzNumber);
              }}
              className={`cursor-pointer rounded-3xl border p-4 text-left ${
                active ? "border-gold bg-highlight" : "border-line hover:border-gold"
              }`}
            >
              <p className="font-display text-3xl text-ink">{juz.juzNumber}</p>
              <p className="mt-2 text-sm text-ink-soft">{mappingLabel(juz.verseMapping, chapters)}</p>
              <p className="mt-1 text-xs text-muted">{juz.versesCount} ayahs</p>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
