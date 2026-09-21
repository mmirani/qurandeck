"use client";

import { Maximize2, Minimize2, Palette, Share2 } from "lucide-react";
import { APPEARANCE_THEMES, FONT_SIZE_MAX, FONT_SIZE_MIN } from "@/lib/appearance";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { SearchBar } from "@/components/search/search-bar";
import { UserMenu } from "@/components/user/user-menu";
import { LanguagePicker } from "@/components/reader/language-picker";
import { ArabesqueDivider } from "@/components/art/ornaments";
import { PRODUCT_NAME } from "@/lib/brand";
import { shareOrCopy } from "@/lib/reading";

export function ReaderToolbar() {
  const { preferences, updatePreferences, openModal, chapter, verses, currentJuz, mode } = useMushaf();
  const first = verses[0];
  const juzNumber = currentJuz ?? first?.juzNumber;
  const themeName = APPEARANCE_THEMES.find((item) => item.id === preferences.theme)?.name ?? preferences.theme;

  return (
    <div className="shrink-0 space-y-4 border-b border-line/40 bg-canvas/95 px-4 py-4 md:px-8">
      <div className="flex items-center gap-3">
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
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
            {mode === "juz"
              ? `Juz ${currentJuz}`
              : `${chapter?.nameSimple ?? "Al-Fatihah"} · ${chapter?.translatedName ?? "The Opening"}`}
          </h2>
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
            onClick={() => updatePreferences({ focusMode: !preferences.focusMode })}
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
          <div className="flex items-center rounded-full border border-line bg-surface p-1">
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
  );
}
