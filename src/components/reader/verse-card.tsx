"use client";

import { useRef, useState } from "react";
import { Copy, Eraser, Highlighter, NotebookPen, Play, Share2, Star } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { CornerFrame } from "@/components/art/ornaments";
import { HighlightPopover, MarkedText } from "@/components/reader/marked-text";
import { VerseTafsir } from "@/components/reader/tafsir-panel";
import {
  ayahHighlight,
  overlappingTextMarks,
  swatchById,
  verseHighlights,
  wordHighlight,
} from "@/lib/highlights";
import type { HighlightLayer, Verse } from "@/lib/quran/types";
import { groupForId, isRtlLanguage } from "@/lib/quran/languages";
import { PRODUCT_NAME } from "@/lib/brand";
import { shareOrCopy, verseShareText } from "@/lib/reading";

export function VerseCard({
  verse,
  showSurahLabel,
  tourAnchor,
}: {
  verse: Verse;
  showSurahLabel?: boolean;
  tourAnchor?: boolean;
}) {
  const {
    preferences,
    selectedVerseKey,
    selectedWord,
    playingVerseKey,
    playingWordLocation,
    bookmarks,
    notes,
    highlights,
    swatches,
    translations,
    highlighting,
    selectVerse,
    selectWord,
    playWord,
    playVerse,
    playFrom,
    mode,
    cueVerse,
    toggleBookmarkVerse,
    toggleWordHighlight,
    highlightWords,
    highlightText,
    highlightAyah,
    deleteHighlight,
    deleteHighlights,
    clearVerseHighlights,
    chapters,
  } = useMushaf();

  const active = selectedVerseKey === verse.verseKey;
  const reciting = playingVerseKey === verse.verseKey;
  const favorited = bookmarks.some((item) => item.type === "verse" && item.verseKey === verse.verseKey);
  const note = notes.find((item) => item.verseKey === verse.verseKey);
  const marks = verseHighlights(highlights, verse.verseKey);
  const wash = ayahHighlight(marks, verse.verseKey);
  const washColor = wash ? swatchById(swatches, wash.swatchId).color : null;
  const chapterName = chapters.find((item) => item.id === verse.chapterId)?.nameSimple;
  const { showArabic, showTranslation, showTransliteration } = preferences;
  const translationCols = showTranslation
    ? preferences.translationIds
        .map((id) => (verse.translations ?? []).find((item) => item.id === id) ?? (verse.translation && id === preferences.translationId ? { id, text: verse.translation } : null))
        .filter((item): item is { id: number; text: string } => Boolean(item?.text))
    : [];
  const layers =
    Number(showArabic) + Number(Boolean(showTransliteration && verse.transliteration)) + translationCols.length;
  const triple = layers >= 3;
  const [picker, setPicker] = useState<{
    x: number;
    y: number;
    layer: Exclude<HighlightLayer, "arabic" | "ayah">;
    start: number;
    end: number;
    text: string;
  } | null>(null);
  const paint = useRef<{ start: number; last: number } | null>(null);

  const onAyahClick = () => {
    selectVerse(verse.verseKey);
    if (preferences.autoPlayOnAyahClick) void playFrom(verse.verseKey);
    else void cueVerse(verse.verseKey);
  };

  return (
    <article
      id={`ayah-${verse.verseNumber}`}
      data-verse-key={verse.verseKey}
      className={`scroll-mt-28 cursor-pointer ${active || reciting ? "is-live rounded-3xl" : ""}`}
      onClick={onAyahClick}
    >
      {showSurahLabel ? (
        <p className="kufic-label mb-3 px-2 text-gold-deep">
          {chapterName} · {verse.verseKey}
        </p>
      ) : null}
      <CornerFrame
        className={`verse-frame rounded-3xl border bg-surface p-5 ${
          active ? "ring-2 ring-gold/40" : reciting ? "ring-1 ring-accent/40" : ""
        } ${wash ? "border-transparent" : "border-line"}`}
        style={
          washColor
            ? {
                background: `color-mix(in srgb, ${washColor} 28%, var(--surface))`,
                boxShadow: `inset 0 0 0 2px ${washColor}`,
              }
            : undefined
        }
      >
        <div className="verse-head flex items-start justify-between gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onAyahClick();
              }}
              className="ayah-num flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-full bg-accent-soft font-display text-lg font-semibold text-gold-deep"
              aria-label={`Select verse ${verse.verseKey}`}
            >
              {verse.verseNumber}
            </button>
            {note ? (
              <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-gold ring-2 ring-surface" title="Has a note" />
            ) : null}
            {favorited ? (
              <Star className="absolute -bottom-1 -left-1 h-3.5 w-3.5 fill-gold text-gold" />
            ) : null}
          </div>
          <div className="verse-actions flex flex-wrap justify-end gap-1" data-tour={tourAnchor ? "ayah" : undefined}>
            <IconAction label="Play this ayah only, then stop" onClick={() => playVerse(verse.verseKey)}>
              <Play className="h-4 w-4" />
              <span className="pr-1 text-[10px] font-medium">Ayah</span>
            </IconAction>
            <IconAction
              label={mode === "juz" ? "Play from here through the rest of this juz" : "Play from here through the rest of this surah"}
              onClick={() => playFrom(verse.verseKey)}
            >
              <Play className="h-4 w-4" />
              <span className="pr-1 text-[10px] font-medium">{mode === "juz" ? "Rest of Juz" : "Rest of Surah"}</span>
            </IconAction>
            <IconAction
              label="Write a note on this ayah"
              onClick={() => {
                selectVerse(verse.verseKey);
                document.getElementById("verse-note")?.focus();
              }}
            >
              <NotebookPen className={`h-4 w-4 ${note ? "text-gold" : ""}`} />
              <span className="pr-1 text-[10px] font-medium">Note</span>
            </IconAction>
            <IconAction
              label={favorited ? "Remove favorite" : "Favorite this ayah"}
              onClick={() => toggleBookmarkVerse(verse)}
            >
              <Star className={`h-4 w-4 ${favorited ? "fill-gold text-gold" : ""}`} />
            </IconAction>
            <IconAction
              label={wash ? "Remove ayah highlight" : "Highlight this whole ayah"}
              onClick={() => highlightAyah(verse)}
            >
              <Highlighter className={`h-4 w-4 ${wash ? "text-gold" : ""}`} />
            </IconAction>
            {marks.length > 0 ? (
              <IconAction
                label="Clear all highlights on this ayah"
                onClick={() => clearVerseHighlights(verse.verseKey)}
              >
                <Eraser className="h-4 w-4" />
              </IconAction>
            ) : null}
            <IconAction
              label="Copy this ayah"
              onClick={() => void navigator.clipboard.writeText(verseShareText(verse))}
            >
              <Copy className="h-4 w-4" />
            </IconAction>
            <IconAction
              label="Share this ayah"
              onClick={() => void shareOrCopy(`${PRODUCT_NAME} · ${verse.verseKey}`, verseShareText(verse))}
            >
              <Share2 className="h-4 w-4" />
            </IconAction>
          </div>
        </div>

        <div
          className={
            layers <= 1
              ? "mt-4 w-full"
              : triple
                ? "mt-4 flex flex-col gap-4 @min-[42rem]:grid @min-[42rem]:grid-cols-2 @min-[42rem]:items-start @min-[42rem]:gap-8 @min-[58rem]:grid-cols-3"
                : "mt-4 flex flex-col gap-4 @min-[42rem]:grid @min-[42rem]:grid-cols-2 @min-[42rem]:items-start @min-[42rem]:gap-10"
          }
        >
          {translationCols.map((column) => {
            const group = groupForId(translations, column.id);
            const rtl = group ? isRtlLanguage(group.key) : false;
            const primary = column.id === preferences.translationId;
            return (
              <div key={column.id} dir={rtl ? "rtl" : "ltr"} lang={group?.key}>
                {translationCols.length > 1 || group ? (
                  <p className="kufic-label mb-2 text-[10px] text-gold-deep">
                    {group?.label ?? "Translation"}
                    {group && group.editions.length > 1
                      ? ` · ${group.editions.find((item) => item.id === column.id)?.name ?? ""}`
                      : ""}
                  </p>
                ) : null}
                <MarkedText
                  text={column.text}
                  marks={primary ? marks.filter((item) => item.layer === "translation") : []}
                  swatches={swatches}
                  className="reading-text text-ink"
                  onSelect={(start, end, text, x, y) => {
                    if (!primary) return;
                    setPicker({ x, y, layer: "translation", start, end, text });
                  }}
                  onRemove={primary ? (id) => deleteHighlight(id) : undefined}
                />
              </div>
            );
          })}

          {showArabic ? (
            <div dir="rtl" lang="ar" className={`arabic-text text-right ${highlighting ? "select-none" : ""}`}>
              {verse.words.length > 0
                ? verse.words.map((word) => {
                    if (word.charType !== "word") {
                      return (
                        <span key={`${word.location}-end`} className="mx-1 inline-block text-gold-deep">
                          {word.textUthmani}
                        </span>
                      );
                    }
                    const on = selectedWord?.location === word.location || playingWordLocation === word.location;
                    const marked = wordHighlight(marks, verse.verseKey, word.position);
                    const pen = marked ? swatchById(swatches, marked.swatchId) : null;
                    return (
                      <button
                        key={word.location || `${verse.verseKey}-${word.position}`}
                        type="button"
                        onClick={(event) => event.stopPropagation()}
                        onPointerDown={(event) => {
                          if (!highlighting) return;
                          event.preventDefault();
                          paint.current = { start: word.position, last: word.position };
                        }}
                        onPointerEnter={() => {
                          if (paint.current) paint.current.last = word.position;
                        }}
                        onPointerUp={(event) => {
                          event.stopPropagation();
                          selectVerse(verse.verseKey);
                          selectWord(word);
                          if (highlighting && paint.current) {
                            const range = paint.current;
                            paint.current = null;
                            if (range.start !== range.last) highlightWords(verse, range.start, range.last);
                            else toggleWordHighlight(verse, word);
                            return;
                          }
                          if (!highlighting) void playWord(word);
                        }}
                        className={`mx-[2px] inline cursor-pointer rounded-md px-1 leading-[2.1] ${
                          on ? "bg-gold/25" : "hover:bg-gold/10"
                        }`}
                        style={
                          pen
                            ? { background: `color-mix(in srgb, ${pen.color} 62%, transparent)` }
                            : undefined
                        }
                      >
                        {word.textUthmani}
                      </button>
                    );
                  })
                : verse.textUthmani}
            </div>
          ) : null}

          {showTransliteration && verse.transliteration ? (
            <MarkedText
              text={verse.transliteration}
              marks={marks.filter((item) => item.layer === "transliteration")}
              swatches={swatches}
              className={`translit-text ${
                triple
                  ? "@min-[42rem]:col-start-1 @min-[42rem]:row-start-2 @min-[58rem]:col-start-auto @min-[58rem]:row-start-auto"
                  : ""
              }`}
              onSelect={(start, end, text, x, y) =>
                setPicker({ x, y, layer: "transliteration", start, end, text })
              }
              onRemove={(id) => deleteHighlight(id)}
            />
          ) : null}
        </div>

        {preferences.showTafsir ? <VerseTafsir verseKey={verse.verseKey} /> : null}

        {note ? (
          <div
            className={`mt-4 rounded-2xl border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-ink ${
              active ? "" : "line-clamp-2"
            }`}
          >
            <p className="kufic-label mb-1 text-[10px] text-gold-deep">Note</p>
            <p className="whitespace-pre-wrap">{note.body}</p>
          </div>
        ) : null}
      </CornerFrame>

      {picker ? (
        <HighlightPopover
          x={picker.x}
          y={picker.y}
          swatches={swatches}
          activeId={preferences.activeSwatchId}
          onPick={(swatchId) => {
            highlightText(verse, picker.layer, picker.start, picker.end, picker.text, swatchId);
            window.getSelection()?.removeAllRanges();
            setPicker(null);
          }}
          onAyah={() => {
            highlightAyah(verse, preferences.activeSwatchId);
            setPicker(null);
          }}
          onErase={(() => {
            const hits = overlappingTextMarks(
              marks.filter((item) => item.layer === picker.layer),
              picker.start,
              picker.end,
            );
            if (hits.length === 0) return undefined;
            return () => {
              deleteHighlights(hits.map((item) => item.id));
              window.getSelection()?.removeAllRanges();
              setPicker(null);
            };
          })()}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </article>
  );
}

function IconAction({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="group/action relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-full border border-gold/30 px-1.5 text-ink-soft hover:bg-accent-soft hover:text-accent"
    >
      {children}
      <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-30 w-max max-w-[14rem] -translate-x-1/2 rounded-lg bg-panel px-2.5 py-1.5 text-left text-[11px] font-medium leading-snug text-panel-ink opacity-0 shadow-[0_8px_24px_rgba(15,23,42,0.28)] transition duration-150 group-hover/action:opacity-100 group-focus-visible/action:opacity-100">
        {label}
      </span>
    </button>
  );
}
