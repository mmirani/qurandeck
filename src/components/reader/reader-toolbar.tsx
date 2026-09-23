"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Maximize2, Minimize2, Palette, Pause, Play, Share2 } from "lucide-react";
import { APPEARANCE_THEMES, FONT_SIZE_MAX, FONT_SIZE_MIN } from "@/lib/appearance";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { SearchBar } from "@/components/search/search-bar";
import { UserMenu } from "@/components/user/user-menu";
import { LanguagePicker } from "@/components/reader/language-picker";
import { ArabesqueDivider, MihrabMark } from "@/components/art/ornaments";
import { PRODUCT_DISPLAY, PRODUCT_NAME } from "@/lib/brand";
import { shareOrCopy } from "@/lib/reading";
import { surahArtSrc } from "@/lib/surah-art";

export function ReaderToolbar() {
  const {
    preferences,
    updatePreferences,
    openModal,
    chapter,
    verses,
    currentJuz,
    mode,
    playFrom,
    playMode,
    isPlaying,
    togglePlay,
    modal,
  } = useMushaf();
  const first = verses[0];
  const juzNumber = currentJuz ?? first?.juzNumber;
  const themeName = APPEARANCE_THEMES.find((item) => item.id === preferences.theme)?.name ?? preferences.theme;
  const playingThrough = isPlaying && playMode === "from-here";
  const unit = mode === "juz" ? "juz" : "surah";
  const art = surahArtSrc(chapter?.id, mode);
  const playStartLabel = playingThrough
    ? `Pause ${unit}`
    : mode === "juz"
      ? "Play this juz from the start"
      : "Play this surah from the start";
  const arabicOnly =
    Number(preferences.showArabic) +
      Number(preferences.showTransliteration) +
      (preferences.showTranslation ? preferences.translationIds.length : 0) ===
      1 && preferences.showArabic;
  const title =
    mode === "juz" ? `Juz ${currentJuz}` : (chapter?.nameSimple ?? "Al-Fatihah");

  useEffect(() => {
    if (!preferences.focusMode) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (modal) return;
      if (document.querySelector("[aria-modal='true']")) return;
      updatePreferences({ focusMode: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, preferences.focusMode, updatePreferences]);

  if (preferences.focusMode) {
    return (
      <div className="relative shrink-0 border-b border-line/30 bg-canvas/90 px-3 py-2 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex min-w-0 items-baseline gap-2 text-ink">
            <span className="truncate font-display text-base font-semibold tracking-tight md:text-lg">
              {title}
            </span>
            {mode === "surah" && chapter?.nameArabic ? (
              <span dir="rtl" lang="ar" className="hidden truncate font-arabic text-lg text-ink-soft sm:inline">
                {chapter.nameArabic}
              </span>
            ) : null}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center rounded-full border border-line bg-surface px-1" data-tour="size">
              <span className="hidden px-2 text-xs text-muted sm:inline">Size</span>
              <button
                type="button"
                aria-label="Smaller text"
                className="h-8 w-8 cursor-pointer rounded-full text-base hover:bg-highlight"
                onClick={() =>
                  updatePreferences({ fontSize: Math.max(FONT_SIZE_MIN, preferences.fontSize - 2) })
                }
              >
                −
              </button>
              <span className="min-w-8 text-center text-sm">{preferences.fontSize}</span>
              <button
                type="button"
                aria-label="Larger text"
                className="h-8 w-8 cursor-pointer rounded-full text-base hover:bg-highlight"
                onClick={() =>
                  updatePreferences({ fontSize: Math.min(FONT_SIZE_MAX, preferences.fontSize + 2) })
                }
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => openModal("themes")}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-highlight px-3 text-sm capitalize text-gold-deep"
            >
              <Palette className="h-3.5 w-3.5" />
              {themeName}
            </button>
            <button
              type="button"
              onClick={() => updatePreferences({ focusMode: false })}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-gold px-4 text-sm font-semibold text-on-gold"
            >
              <Minimize2 className="h-4 w-4" />
              Exit focus
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden border-b border-line/40 px-4 py-4 md:px-8 ${
        art ? "" : "bg-canvas/95"
      }`}
    >
      {art ? (
        <div className="surah-art" aria-hidden="true">
          <Image src={art} alt="" fill sizes="80vw" className="surah-art-photo" />
          <span className="surah-art-wash" />
        </div>
      ) : null}
      <div className="relative space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden h-12 shrink-0 cursor-pointer items-center gap-2 rounded-full px-1 text-gold hover:bg-highlight sm:flex"
            aria-label={`${PRODUCT_DISPLAY} home`}
          >
            <MihrabMark className="h-7 w-7" />
          </Link>
          <div className="min-w-0 flex-1">
            <SearchBar />
          </div>
          <div className={preferences.focusMode ? "shrink-0" : "shrink-0 xl:hidden"}>
            <UserMenu />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-ink-soft">
              {chapter?.revelationPlace === "madinah" ? "Madaniyyah" : "Makkiyyah"}
              {chapter ? ` · ${chapter.versesCount} ayahs` : ""}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
                {mode === "juz"
                  ? `Juz ${currentJuz}`
                  : `${chapter?.nameSimple ?? "Al-Fatihah"} · ${chapter?.translatedName ?? "The Opening"}`}
              </h2>
              <button
                type="button"
                disabled={!first}
                onClick={() => {
                  if (playingThrough) togglePlay();
                  else if (first) void playFrom(first.verseKey);
                }}
                aria-label={playStartLabel}
                data-tour="audio"
                className="group/action relative inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-gold px-4 text-sm font-semibold text-on-gold disabled:cursor-not-allowed disabled:opacity-40"
              >
                {playingThrough ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playingThrough ? "Pause" : mode === "juz" ? "Play juz" : "Play surah"}
                <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-30 w-max max-w-[16rem] -translate-x-1/2 rounded-lg bg-panel px-2.5 py-1.5 text-left text-[11px] font-medium leading-snug text-panel-ink opacity-0 shadow-[0_8px_24px_rgba(15,23,42,0.28)] transition duration-150 group-hover/action:opacity-100 group-focus-visible/action:opacity-100">
                  {playStartLabel}
                </span>
              </button>
            </div>
            {juzNumber ? (
              <button
                type="button"
                onClick={() => openModal("juz")}
                className="mt-2 inline-flex min-h-11 cursor-pointer items-center rounded-full border border-gold/45 bg-highlight px-4 text-base font-medium text-gold-deep hover:bg-gold/20"
              >
                Juz {juzNumber} · tap to read by Juz
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                updatePreferences(
                  preferences.focusMode
                    ? { focusMode: false }
                    : { focusMode: true, ...(arabicOnly ? { traditionalPage: true } : {}) },
                )
              }
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink"
            >
              {preferences.focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {preferences.focusMode ? "Exit focus" : "Focus"}
            </button>
            {chapter ? (
              <button
                type="button"
                onClick={() =>
                  void shareOrCopy(
                    `${PRODUCT_NAME} · ${chapter.nameSimple}`,
                    `${chapter.nameSimple} · ${chapter.translatedName}\n${window.location.origin}/surah/${chapter.id}`,
                  )
                }
                className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
            ) : null}
            <div className="flex items-center rounded-full border border-line bg-surface p-1" data-tour="size">
              <span className="px-3 text-sm text-muted">Size</span>
              <button
                type="button"
                className="h-10 w-10 cursor-pointer rounded-full text-lg hover:bg-highlight"
                onClick={() =>
                  updatePreferences({ fontSize: Math.max(FONT_SIZE_MIN, preferences.fontSize - 2) })
                }
              >
                −
              </button>
              <span className="min-w-12 text-center text-base">{preferences.fontSize}</span>
              <button
                type="button"
                className="h-10 w-10 cursor-pointer rounded-full text-lg hover:bg-highlight"
                onClick={() =>
                  updatePreferences({ fontSize: Math.min(FONT_SIZE_MAX, preferences.fontSize + 2) })
                }
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => openModal("themes")}
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-highlight px-4 text-sm capitalize text-gold-deep"
            >
              <Palette className="h-4 w-4" />
              {themeName}
            </button>
          </div>
        </div>
        <LanguagePicker />
        <ArabesqueDivider />
      </div>
    </div>
  );
}
