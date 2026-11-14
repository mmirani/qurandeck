"use client";

import { useRef, useState } from "react";
import { Copy, Eraser, Highlighter, MoreHorizontal, NotebookPen, Play, Share2, Star } from "lucide-react";
import { VerseActionSheet } from "@/components/reader/verse-action-sheet";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { CornerFrame } from "@/components/art/ornaments";
import { MarkedText } from "@/components/reader/marked-text";
import { anchorBox, HighlightPopover } from "@/components/reader/swatch-row";
import { VerseTafsir } from "@/components/reader/tafsir-panel";
import {
  ayahHighlight,
  overlappingTextMarks,
  swatchById,
  verseHighlights,
  wordHighlight,
} from "@/lib/highlights";
import type { Highlight, HighlightLayer, HighlightSwatch, Preferences, Verse, Word } from "@/lib/quran/types";
import { groupForId, htmlLang, isRtlLanguage, scriptClass } from "@/lib/quran/languages";
import { PRODUCT_NAME } from "@/lib/brand";
import { focusOpenNote } from "@/lib/note-composer";
import { wordTapShouldPlay } from "@/lib/word-tap";
import { shareOrCopy, verseShareText } from "@/lib/reading";
import { useAyahFitScale } from "@/lib/use-ayah-fit-scale";

export function VerseCard({
  verse,
  showSurahLabel,
  tourAnchor,
  ayahFocus,
}: {
  verse: Verse;
  showSurahLabel?: boolean;
  tourAnchor?: boolean;
  /** One-ayah mobile screen: larger type, minimal chrome */
  ayahFocus?: boolean;
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
    applyAyahColor,
    recolorHighlight,
    setActiveSwatch,
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
  const ayahShowArabic = ayahFocus ? true : showArabic;
  const ayahShowTranslation = ayahFocus ? true : showTranslation;
  const translationCols = ayahShowTranslation
    ? preferences.translationIds
        .map((id) => (verse.translations ?? []).find((item) => item.id === id) ?? (verse.translation && id === preferences.translationId ? { id, text: verse.translation } : null))
        .filter((item): item is { id: number; text: string } => Boolean(item?.text))
    : [];
  const layers =
    Number(ayahShowArabic) +
    Number(Boolean(!ayahFocus && showTransliteration && verse.transliteration)) +
    translationCols.length;
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [colorMenu, setColorMenu] = useState<null | {
    kind: "mark" | "recolor";
    anchor: ReturnType<typeof anchorBox>;
    trigger: HTMLElement;
    highlightId?: string;
    activeId: string;
  }>(null);

  const openRecolor = (highlight: Highlight, el: HTMLElement) => {
    setPicker(null);
    setColorMenu({
      kind: "recolor",
      anchor: anchorBox(el),
      trigger: el,
      highlightId: highlight.id,
      activeId: highlight.swatchId,
    });
  };

  const onAyahClick = () => {
    selectVerse(verse.verseKey);
    if (preferences.autoPlayOnAyahClick) void playFrom(verse.verseKey);
    else void cueVerse(verse.verseKey);
  };

  return (
    <article
      id={`ayah-${verse.verseNumber}`}
      data-verse-key={verse.verseKey}
      data-tour={ayahFocus && tourAnchor ? "ayah-mobile audio-mobile study-mobile" : undefined}
      translate="no"
      className={`scroll-mt-4 scroll-mb-28 ${ayahFocus ? "reader-ayah-card" : "cursor-pointer"} ${active || reciting ? "is-live rounded-3xl" : ""}`}
      onClick={ayahFocus ? undefined : onAyahClick}
    >
      {showSurahLabel ? (
        <p className="kufic-label mb-3 px-2 text-gold-deep">
          {chapterName} · {verse.verseKey}
        </p>
      ) : null}
      <CornerFrame
        className={`verse-frame rounded-3xl border bg-surface ${
          ayahFocus ? "verse-frame-flush border-0 bg-transparent shadow-none" : ""
        } ${
          active ? "ring-2 ring-gold/40" : reciting ? "ring-1 ring-accent/40" : ""
        } ${wash && !ayahFocus ? "border-transparent" : ayahFocus ? "" : "border-line"}`}
        onClick={(event) => {
          if (!wash || event.target !== event.currentTarget) return;
          event.stopPropagation();
          openRecolor(wash, event.currentTarget);
        }}
        style={
          washColor
            ? {
                background: `color-mix(in srgb, ${washColor} 28%, var(--surface))`,
                boxShadow: `inset 0 0 0 2px ${washColor}`,
              }
            : undefined
        }
      >
        {!ayahFocus ? (
        <div className="verse-head flex items-start justify-between gap-3">
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onAyahClick();
              }}
              className="ayah-num flex h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-accent-soft px-2.5 font-display text-lg font-semibold text-gold-deep"
            >
              <span className="sr-only">Select verse {verse.verseKey}. </span>
              <span className="tabular-nums">{verse.verseNumber}</span>
            </button>
            {note ? (
              <span className="sr-only">Has a note</span>
            ) : null}
            {wash ? <WashChip wash={wash} swatches={swatches} onOpen={(el) => openRecolor(wash, el)} /> : null}
          </div>
          <div className="flex shrink-0 items-center gap-1 md:hidden" data-tour={tourAnchor ? "ayah-mobile" : undefined}>
            <button
              type="button"
              aria-label={favorited ? "Bookmarked" : "Bookmark ayah"}
              onClick={(event) => {
                event.stopPropagation();
                toggleBookmarkVerse(verse);
              }}
              className="inline-flex h-11 min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-gold/30 text-ink-soft"
            >
              <Star className={`h-4 w-4 ${favorited ? "fill-gold text-gold" : ""}`} />
            </button>
            <button
              type="button"
              data-tour={tourAnchor ? "audio-mobile study-mobile" : undefined}
              aria-label="Ayah actions"
              onClick={(event) => {
                event.stopPropagation();
                selectVerse(verse.verseKey);
                setSheetOpen(true);
              }}
              className="inline-flex h-11 min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-gold/30 text-ink-soft"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
          <div className="verse-actions hidden flex-wrap justify-end gap-1 md:flex" data-tour={tourAnchor ? "ayah" : undefined}>
            <IconAction label="Play this ayah only, then stop" tour={tourAnchor ? "audio" : undefined} onClick={() => playVerse(verse.verseKey)}>
              <Play className="h-4 w-4" />
              <span className="pr-1 text-xs font-medium">Ayah</span>
            </IconAction>
            <IconAction
              label={mode === "juz" ? "Play from here through the rest of this juz" : "Play from here through the rest of this surah"}
              onClick={() => playFrom(verse.verseKey)}
            >
              <Play className="h-4 w-4" />
              <span className="pr-1 text-xs font-medium">{mode === "juz" ? "Rest of Juz" : "Rest of Surah"}</span>
            </IconAction>
            <IconAction
              label="Write a note on this ayah"
              tour={tourAnchor ? "study-mobile" : undefined}
              onClick={() => {
                selectVerse(verse.verseKey);
                focusOpenNote(verse.verseKey);
              }}
            >
              <NotebookPen className={`h-4 w-4 ${note ? "text-gold" : ""}`} />
              <span className="pr-1 text-xs font-medium">Note</span>
            </IconAction>
            <IconAction
              label={favorited ? "Remove favorite" : "Favorite this ayah"}
              onClick={() => toggleBookmarkVerse(verse)}
            >
              <Star className={`h-4 w-4 ${favorited ? "fill-gold text-gold" : ""}`} />
              <span className="pr-1 text-xs font-medium">Star</span>
            </IconAction>
            <IconAction
              label="Choose a highlight colour"
              menuTrigger
              expanded={colorMenu?.kind === "mark"}
              controls="highlight-color-menu"
              onClick={(event) => {
                const el = event.currentTarget;
                setPicker(null);
                setColorMenu((current) =>
                  current?.kind === "mark"
                    ? null
                    : {
                        kind: "mark",
                        anchor: anchorBox(el),
                        trigger: el,
                        activeId: preferences.activeSwatchId,
                      },
                );
              }}
            >
              <Highlighter className={`h-4 w-4 ${wash ? "text-gold" : ""}`} />
              <span className="pr-1 text-xs font-medium">Mark</span>
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
              <span className="pr-1 text-xs font-medium">Copy</span>
            </IconAction>
            <IconAction
              label="Share this ayah"
              onClick={() => void shareOrCopy(`${PRODUCT_NAME} · ${verse.verseKey}`, verseShareText(verse))}
            >
              <Share2 className="h-4 w-4" />
              <span className="pr-1 text-xs font-medium">Share</span>
            </IconAction>
          </div>
        </div>
        ) : null}

        {ayahFocus && wash ? (
          <div className="flex justify-end">
            <WashChip wash={wash} swatches={swatches} onOpen={(el) => openRecolor(wash, el)} />
          </div>
        ) : null}

        {ayahFocus ? (
          <AyahFocusBody
            verse={verse}
            showArabic={ayahShowArabic}
            showTranslation={ayahShowTranslation}
            translationCols={translationCols}
            preferences={preferences}
            marks={marks}
            swatches={swatches}
            highlighting={highlighting}
            selectedWord={selectedWord}
            playingWordLocation={playingWordLocation}
            selectVerse={selectVerse}
            selectWord={selectWord}
            playWord={playWord}
            highlightWords={highlightWords}
            toggleWordHighlight={toggleWordHighlight}
            onRecolor={openRecolor}
            setPicker={setPicker}
            paint={paint}
          />
        ) : (
          <>
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
                const lang = group ? htmlLang(group.key) : undefined;
                const primary = column.id === preferences.translationId;
                return (
                  <div key={column.id} dir={rtl ? "rtl" : "ltr"} lang={lang} className="order-2 @min-[42rem]:order-none">
                    {translationCols.length > 1 || group ? (
                      <p className="kufic-label mb-2 text-gold-deep">
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
                      className={`reading-text mt-3 text-sm leading-relaxed text-ink md:mt-0 md:text-base ${group ? scriptClass(group.key) : ""}`}
                      onSelect={(start, end, text, x, y) => {
                        if (!primary) return;
                        setPicker({ x, y, layer: "translation", start, end, text });
                      }}
                      onRecolor={primary ? openRecolor : undefined}
                    />
                  </div>
                );
              })}

              {showArabic ? (
                <div className="order-1 @min-[42rem]:order-none">
                <ArabicBlock
                  verse={verse}
                  marks={marks}
                  swatches={swatches}
                  highlighting={highlighting}
                  selectedWord={selectedWord}
                  playingWordLocation={playingWordLocation}
                  selectVerse={selectVerse}
                  selectWord={selectWord}
                  playWord={playWord}
                  highlightWords={highlightWords}
                  toggleWordHighlight={toggleWordHighlight}
                  onRecolor={openRecolor}
                  paint={paint}
                />
                </div>
              ) : null}

              {showTransliteration && verse.transliteration ? (
                <MarkedText
                  text={verse.transliteration}
                  marks={marks.filter((item) => item.layer === "transliteration")}
                  swatches={swatches}
                  className={`translit-text order-3 @min-[42rem]:order-none ${
                    triple
                      ? "@min-[42rem]:col-start-1 @min-[42rem]:row-start-2 @min-[58rem]:col-start-auto @min-[58rem]:row-start-auto"
                      : ""
                  }`}
                  onSelect={(start, end, text, x, y) =>
                    setPicker({ x, y, layer: "transliteration", start, end, text })
                  }
                  onRecolor={openRecolor}
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
                <p className="kufic-label mb-1 text-gold-deep">Note</p>
                <p className="whitespace-pre-wrap">{note.body}</p>
              </div>
            ) : null}
          </>
        )}
      </CornerFrame>

      <VerseActionSheet verse={verse} open={sheetOpen} onClose={() => setSheetOpen(false)} />

      {picker ? (
        <HighlightPopover
          anchor={{ left: picker.x, top: picker.y, width: 0, height: 0 }}
          swatches={swatches}
          activeId={preferences.activeSwatchId}
          preserveSelection
          showClose
          onPick={(swatchId) => {
            setActiveSwatch(swatchId);
            highlightText(verse, picker.layer, picker.start, picker.end, picker.text, swatchId);
            window.getSelection()?.removeAllRanges();
            setPicker(null);
          }}
          onMark={() => {
            highlightText(verse, picker.layer, picker.start, picker.end, picker.text, preferences.activeSwatchId);
            window.getSelection()?.removeAllRanges();
            setPicker(null);
          }}
          onAyah={() => {
            applyAyahColor(verse, preferences.activeSwatchId);
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
      {colorMenu ? (
        <HighlightPopover
          key={colorMenu.highlightId ?? "mark"}
          menuId="highlight-color-menu"
          anchor={colorMenu.anchor}
          returnFocus={colorMenu.trigger}
          swatches={swatches}
          activeId={colorMenu.activeId}
          eraseLabel={colorMenu.kind === "mark" ? "Erase" : "Remove"}
          onPick={(swatchId) => {
            if (colorMenu.kind === "mark") applyAyahColor(verse, swatchId);
            else if (colorMenu.highlightId) recolorHighlight(colorMenu.highlightId, swatchId);
            setColorMenu(null);
          }}
          onErase={
            colorMenu.kind === "mark"
              ? wash
                ? () => {
                    deleteHighlight(wash.id);
                    setColorMenu(null);
                  }
                : undefined
              : () => {
                  if (colorMenu.highlightId) deleteHighlight(colorMenu.highlightId);
                  setColorMenu(null);
                }
          }
          onClose={() => setColorMenu(null)}
        />
      ) : null}
    </article>
  );
}

function AyahFocusBody({
  verse,
  showArabic,
  showTranslation,
  translationCols,
  preferences,
  marks,
  swatches,
  highlighting,
  selectedWord,
  playingWordLocation,
  selectVerse,
  selectWord,
  playWord,
  highlightWords,
  toggleWordHighlight,
  onRecolor,
  setPicker,
  paint,
}: {
  verse: Verse;
  showArabic: boolean;
  showTranslation: boolean;
  translationCols: { id: number; text: string }[];
  preferences: Preferences;
  marks: Highlight[];
  swatches: HighlightSwatch[];
  highlighting: boolean;
  selectedWord: Word | null;
  playingWordLocation: string | null;
  selectVerse: (key: string) => void;
  selectWord: (word: Word) => void;
  playWord: (word: Word) => void;
  highlightWords: (verse: Verse, start: number, end: number) => void;
  toggleWordHighlight: (verse: Verse, word: Word) => void;
  onRecolor: (highlight: Highlight, anchor: HTMLElement) => void;
  setPicker: (value: {
    x: number;
    y: number;
    layer: Exclude<HighlightLayer, "arabic" | "ayah">;
    start: number;
    end: number;
    text: string;
  } | null) => void;
  paint: React.MutableRefObject<{ start: number; last: number } | null>;
}) {
  const primary =
    translationCols.find((column) => column.id === preferences.translationId) ?? translationCols[0];
  const { viewportRef, contentRef, scrollable } = useAyahFitScale(verse.verseKey);

  return (
    <div
      ref={viewportRef}
      className={`reader-ayah-viewport mt-0 h-full min-h-0 ${scrollable ? "is-scrollable" : ""}`}
      style={{ ["--ayah-fit" as string]: "1" }}
    >
      <div ref={contentRef} className="reader-ayah-fit-content">
        {showArabic ? (
          <div className="ayah-block-arabic">
            <ArabicBlock
              verse={verse}
              marks={marks}
              swatches={swatches}
              highlighting={highlighting}
              selectedWord={selectedWord}
              playingWordLocation={playingWordLocation}
              selectVerse={selectVerse}
              selectWord={selectWord}
              playWord={playWord}
              highlightWords={highlightWords}
              toggleWordHighlight={toggleWordHighlight}
              onRecolor={onRecolor}
              paint={paint}
              tapMode="armed"
            />
          </div>
        ) : null}
        {showTranslation && primary ? (
          <div className="ayah-block-translation">
            <MarkedText
              text={primary.text}
              marks={marks.filter((item) => item.layer === "translation")}
              swatches={swatches}
              className="reading-text text-ink"
              onSelect={(start, end, text, x, y) =>
                setPicker({ x, y, layer: "translation", start, end, text })
              }
              onRecolor={onRecolor}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ArabicBlock({
  verse,
  marks,
  swatches,
  highlighting,
  selectedWord,
  playingWordLocation,
  selectVerse,
  selectWord,
  playWord,
  highlightWords,
  toggleWordHighlight,
  onRecolor,
  paint,
  tapMode = "immediate",
}: {
  verse: Verse;
  marks: Highlight[];
  swatches: HighlightSwatch[];
  highlighting: boolean;
  selectedWord: Word | null;
  playingWordLocation: string | null;
  selectVerse: (key: string) => void;
  selectWord: (word: Word) => void;
  playWord: (word: Word) => void;
  highlightWords: (verse: Verse, start: number, end: number) => void;
  toggleWordHighlight: (verse: Verse, word: Word) => void;
  onRecolor?: (highlight: Highlight, anchor: HTMLElement) => void;
  paint: React.MutableRefObject<{ start: number; last: number } | null>;
  tapMode?: "immediate" | "armed";
}) {
  return (
    <div
      dir="rtl"
      lang="ar"
      translate="no"
      className={`arabic-text mushaf-arabic-mobile text-right ${highlighting ? "select-none" : ""}`}
    >
      {verse.words.length > 0
        ? verse.words.map((word) => {
            if (word.charType === "end") {
              return (
                <span
                  key={`${word.location}-end`}
                  className="verse-ayah-mark"
                  aria-label={`Ayah ${verse.verseKey}`}
                >
                  {word.textUthmani || verse.verseNumber}
                </span>
              );
            }
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
                  const alreadySelected = selectedWord?.location === word.location;
                  selectVerse(verse.verseKey);
                  selectWord(word);
                  if (highlighting && paint.current) {
                    const range = paint.current;
                    paint.current = null;
                    if (range.start !== range.last) highlightWords(verse, range.start, range.last);
                    else toggleWordHighlight(verse, word);
                    return;
                  }
                  if (!highlighting && marked && onRecolor) {
                    onRecolor(marked, event.currentTarget);
                    return;
                  }
                  if (!highlighting && wordTapShouldPlay(tapMode, alreadySelected)) void playWord(word);
                }}
                data-highlight-trigger={marked ? "" : undefined}
                className={`mx-[2px] inline cursor-pointer rounded-md px-1 leading-[2.25] ${
                  on ? "bg-gold/25" : "hover:bg-gold/10"
                }`}
                style={pen ? { background: `color-mix(in srgb, ${pen.color} 40%, transparent)` } : undefined}
              >
                {word.textUthmani}
                {marked ? <span className="sr-only">. Change colour</span> : null}
              </button>
            );
          })
        : (
            <>
              {verse.textUthmani}{" "}
              <span className="verse-ayah-mark" aria-label={`Ayah ${verse.verseKey}`}>
                {verse.verseNumber}
              </span>
            </>
          )}
    </div>
  );
}

function WashChip({
  wash,
  swatches,
  onOpen,
}: {
  wash: Highlight;
  swatches: HighlightSwatch[];
  onOpen: (el: HTMLElement) => void;
}) {
  const pen = swatchById(swatches, wash.swatchId);
  return (
    <button
      type="button"
      data-highlight-trigger=""
      aria-label={`Change ${pen.name} highlight`}
      onClick={(event) => {
        event.stopPropagation();
        onOpen(event.currentTarget);
      }}
      className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full"
    >
      <span aria-hidden="true" className="h-4 w-4 rounded-full border border-line" style={{ background: pen.color }} />
    </button>
  );
}

function IconAction({
  children,
  label,
  onClick,
  tour,
  menuTrigger,
  expanded,
  controls,
}: {
  children: React.ReactNode;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  tour?: string;
  menuTrigger?: boolean;
  expanded?: boolean;
  controls?: string;
}) {
  return (
    <button
      type="button"
      data-tour={tour}
      data-highlight-trigger={menuTrigger ? "" : undefined}
      aria-label={label}
      aria-haspopup={menuTrigger ? "dialog" : undefined}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      className="group/action relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-full border border-gold/30 px-1.5 text-ink-soft hover:bg-accent-soft hover:text-gold-deep"
    >
      {children}
      <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-30 w-max max-w-[14rem] -translate-x-1/2 rounded-lg bg-panel px-2.5 py-1.5 text-left text-xs font-medium leading-snug text-panel-ink opacity-0 shadow-[0_8px_24px_rgba(15,23,42,0.28)] transition duration-150 group-hover/action:opacity-100 group-focus-visible/action:opacity-100">
        {label}
      </span>
    </button>
  );
}
