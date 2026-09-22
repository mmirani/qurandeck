"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import type { Verse, Word } from "@/lib/quran/types";

const WAQF: Record<string, string> = {
  "\u06D6": "Prefer to continue",
  "\u06D7": "Prefer to stop",
  "\u06D8": "Must stop",
  "\u06D9": "Do not stop",
  "\u06DA": "Pause allowed",
  "\u06DB": "Pause at one of the two marks",
  "\u06DC": "Brief pause",
  "\u06E9": "Prostration",
};

const WAQF_RE = /([\u06D6-\u06DC\u06E9])/g;

export function MushafStream({ verses, mode }: { verses: Verse[]; mode: string }) {
  const { chapters, selectedVerseKey, selectVerse, preferences } = useMushaf();
  const streamRef = useRef<HTMLDivElement>(null);
  const [rules, setRules] = useState<number[]>([]);

  const measureRules = useCallback(() => {
    const el = streamRef.current;
    if (!el) return;
    setRules(lineRuleOffsets(el));
  }, []);

  useLayoutEffect(() => {
    measureRules();
    const el = streamRef.current;
    if (!el) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measureRules);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    void document.fonts.ready.then(measureRules);
    document.fonts.addEventListener("loadingdone", measureRules);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", measureRules);
    };
  }, [measureRules, verses, preferences.fontSize]);

  return (
    <div ref={streamRef} dir="rtl" lang="ar" className="arabic-text mushaf-stream">
      {rules.length > 0 ? (
        <span className="mushaf-rules" aria-hidden="true">
          {rules.map((top, index) => (
            <span key={`${index}-${top}`} style={{ top }} />
          ))}
        </span>
      ) : null}
      {verses.map((verse, index) => {
        const prev = verses[index - 1];
        const newSurah = mode === "juz" && prev?.chapterId !== verse.chapterId;
        const chapterName = chapters.find((item) => item.id === verse.chapterId)?.nameSimple;
        const active = selectedVerseKey === verse.verseKey;
        return (
          <span key={verse.verseKey}>
            {newSurah ? (
              <span className="mushaf-sura-break">
                {chapterName} · {verse.verseKey}
              </span>
            ) : null}
            <span
              id={`ayah-${verse.verseNumber}`}
              data-verse-key={verse.verseKey}
              className={`mushaf-ayah ${active ? "is-live" : ""}`}
              onClick={() => selectVerse(verse.verseKey)}
            >
              {(verse.words.length > 0 ? verse.words : fallbackWords(verse)).map((word) => (
                <MushafWord key={word.location || `${verse.verseKey}-${word.position}`} verse={verse} word={word} />
              ))}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function lineRuleOffsets(el: HTMLElement) {
  const host = el.getBoundingClientRect();
  const lh = parseFloat(getComputedStyle(el).lineHeight) || 48;
  const threshold = Math.max(12, lh * 0.4);
  const range = document.createRange();
  const rows: { top: number; bottom: number }[] = [];
  for (const ayah of el.querySelectorAll(".mushaf-ayah")) {
    range.selectNodeContents(ayah);
    for (const rect of range.getClientRects()) {
      if (rect.width < 2 || rect.height < 2) continue;
      const top = rect.top - host.top;
      const bottom = rect.bottom - host.top;
      const current = rows[rows.length - 1];
      if (current && Math.abs(current.top - top) < threshold) {
        current.top = Math.min(current.top, top);
        current.bottom = Math.max(current.bottom, bottom);
      } else {
        rows.push({ top, bottom });
      }
    }
  }
  return rows.map((row) => Math.round(row.bottom));
}

function fallbackWords(verse: Verse): Word[] {
  return [
    {
      id: verse.id,
      position: 1,
      location: `${verse.verseKey}:1`,
      charType: "word",
      textUthmani: verse.textUthmani,
      translation: "",
      transliteration: "",
      audioUrl: null,
    },
    {
      id: verse.id,
      position: 2,
      location: `${verse.verseKey}:end`,
      charType: "end",
      textUthmani: String(verse.verseNumber),
      translation: "",
      transliteration: "",
      audioUrl: null,
    },
  ];
}

function MushafWord({ verse, word }: { verse: Verse; word: Word }) {
  if (word.charType === "end") {
    return (
      <span className="mushaf-ayah-mark" aria-label={`Ayah ${verse.verseKey}`}>
        {word.textUthmani || verse.verseNumber}
      </span>
    );
  }

  if (word.charType !== "word") {
    return (
      <span className="mushaf-pause" title="Recitation mark">
        {word.textUthmani}
      </span>
    );
  }

  return (
    <span className="mushaf-word">
      <WaqfText text={word.textUthmani} />{" "}
    </span>
  );
}

function WaqfText({ text }: { text: string }) {
  const parts = text.split(WAQF_RE);
  return (
    <>
      {parts.map((part, index) =>
        WAQF[part] ? (
          <span key={`${part}-${index}`} className="mushaf-waqf" title={WAQF[part]}>
            {part}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}
