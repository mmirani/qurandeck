"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Maximize2, Menu, Minimize2, Palette, Pause, Play, Share2 } from "lucide-react";
import { APPEARANCE_THEMES, FONT_SIZE_MAX, FONT_SIZE_MIN } from "@/lib/appearance";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { SearchBar } from "@/components/search/search-bar";
import { HeaderAccount } from "@/components/auth/header-account";
import { LanguagePicker } from "@/components/reader/language-picker";
import { MobileReaderBar } from "@/components/reader/mobile-reader-bar";
import { ArabesqueDivider, MihrabMark } from "@/components/art/ornaments";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { PRODUCT_NAME } from "@/lib/brand";
import { shareOrCopy } from "@/lib/reading";
import { useReaderChrome } from "@/components/shell/reader-chrome";
import { useMediaQuery } from "@/lib/use-media-query";
import { useDisplayedReading } from "@/components/reader/reading-seed";
import { surahArtSrc } from "@/lib/surah-art";

export function ReaderToolbar() {
  const {
    preferences,
    updatePreferences,
    openModal,
    verses,
    currentJuz,
    mode,
    playFrom,
    playMode,
    isPlaying,
    togglePlay,
    modal,
  } = useMushaf();
  const { openNav } = useReaderChrome();
  const displayed = useDisplayedReading();
  const chapter = displayed.chapter ?? null;
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
    mode === "juz" ? `Juz ${currentJuz}` : (chapter?.nameSimple ?? "Surah");
  const desktopSearch = useMediaQuery("(min-width: 1024px)");
  const phone = useMediaQuery("(max-width: 767px)");

  useEffect(() => {
    if (!phone || !preferences.focusMode) return;
    updatePreferences({ focusMode: false, mobileReadingMode: "scroll" });
  }, [phone, preferences.focusMode, updatePreferences]);

  useEffect(() => {
    if (!preferences.focusMode || phone) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (modal) return;
      if (document.querySelector("[aria-modal='true']")) return;
      updatePreferences({ focusMode: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, phone, preferences.focusMode, updatePreferences]);

  if (preferences.focusMode) {
    return (
      <div className="qd-gutter relative shrink-0 overflow-x-hidden border-b border-line/30 bg-canvas/90 py-3" data-focus-bar>
        <div className="flex min-w-0 max-w-full items-center gap-2">
          <Link
            href="/"
            aria-label="QuranDeck home"
            className="hidden h-11 min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-highlight md:inline-flex"
          >
            <MihrabMark className="h-6 w-6" />
          </Link>
          <h1 className="flex min-w-0 flex-1 items-baseline gap-2 text-ink">
            <span className="truncate font-display text-base font-semibold tracking-tight md:text-lg">
              {title}
            </span>
            {mode === "surah" && chapter?.nameArabic ? (
              <span dir="rtl" lang="ar" className="hidden truncate font-arabic text-lg text-ink-soft sm:inline">
                {chapter.nameArabic}
              </span>
            ) : null}
          </h1>
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <div className="flex items-center rounded-full border border-line bg-surface px-1" data-tour="size">
              <span className="hidden px-2 text-xs text-muted sm:inline">Size</span>
              <button
                type="button"
                aria-label="Smaller text"
                className="h-11 w-11 cursor-pointer rounded-full text-base hover:bg-highlight"
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
                className="h-11 w-11 cursor-pointer rounded-full text-base hover:bg-highlight"
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
              aria-label={`Themes, ${themeName}`}
              className="inline-flex h-11 min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-highlight px-3 text-sm capitalize text-gold-deep"
            >
              <Palette className="h-3.5 w-3.5" />
              {themeName}
            </button>
          </div>
          <button
            type="button"
            onClick={() => updatePreferences({ focusMode: false })}
            className="inline-flex h-11 min-h-11 min-w-11 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-gold px-4 text-sm font-semibold text-on-gold"
          >
            <Minimize2 className="h-4 w-4" />
            Exit focus
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <MobileReaderBar />
      <div
        className="qd-gutter relative hidden shrink-0 border-b border-line/40 bg-canvas/95 py-4 lg:block"
      >
      {art ? (
        <div className="surah-art hidden overflow-hidden xl:block" aria-hidden="true">
          <Image src={art} alt="" fill sizes="80vw" className="surah-art-photo" />
          <span className="surah-art-wash" />
        </div>
      ) : null}
      <div className="relative space-y-3">
        <div className="flex items-center gap-[var(--space-3)]">
          <button
            type="button"
            onClick={openNav}
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface xl:hidden"
            aria-label="Open surah and juz menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link
            href="/"
            className="inline-flex h-11 min-h-11 min-w-11 shrink-0 cursor-pointer items-center gap-[var(--space-2)] rounded-full px-1 hover:bg-highlight"
            aria-label="QuranDeck home"
          >
            <MihrabMark className="h-7 w-7" />
            <BrandWordmark className="hidden text-xl leading-none xl:inline" />
          </Link>
          <div className="min-w-0 flex-1">
            {desktopSearch ? <SearchBar /> : null}
          </div>
          <div className="shrink-0 2xl:hidden">
            <HeaderAccount />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-ink-soft">
              {chapter?.revelationPlace === "madinah" ? "Madaniyyah" : "Makkiyyah"}
              {chapter ? ` · ${chapter.versesCount} ayahs` : ""}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="flex min-w-0 flex-wrap items-baseline gap-x-3 font-display text-2xl font-semibold tracking-tight text-ink xl:text-3xl">
                <span>
                  {mode === "juz"
                    ? `Juz ${currentJuz}`
                    : chapter
                      ? `${chapter.nameSimple} · ${chapter.translatedName}`
                      : "Surah"}
                </span>
                {mode === "surah" && chapter?.nameArabic ? (
                  <span dir="rtl" lang="ar" className="font-arabic text-xl font-normal text-ink-soft">
                    {chapter.nameArabic}
                  </span>
                ) : null}
              </h1>
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
                <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-30 w-max max-w-[16rem] -translate-x-1/2 rounded-lg bg-panel px-2.5 py-1.5 text-left text-xs font-medium leading-snug text-panel-ink opacity-0 shadow-[0_8px_24px_rgba(15,23,42,0.28)] transition duration-150 group-hover/action:opacity-100 group-focus-visible/action:opacity-100">
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
                aria-label="Smaller text"
                className="h-11 w-11 min-h-11 min-w-11 cursor-pointer rounded-full text-lg hover:bg-highlight"
                onClick={() =>
                  updatePreferences({ fontSize: Math.max(FONT_SIZE_MIN, preferences.fontSize - 2) })
                }
              >
                −
              </button>
              <span className="min-w-12 text-center text-base">{preferences.fontSize}</span>
              <button
                type="button"
                aria-label="Larger text"
                className="h-11 w-11 min-h-11 min-w-11 cursor-pointer rounded-full text-lg hover:bg-highlight"
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
              aria-label={`Themes, ${themeName}`}
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
    </>
  );
}
