"use client";

import Link from "next/link";
import { ChevronLeft, Menu, Settings2 } from "lucide-react";
import { APPEARANCE_THEMES, FONT_SIZE_MAX, FONT_SIZE_MIN } from "@/lib/appearance";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { useReaderChrome } from "@/components/shell/reader-chrome";

export function MobileReaderBar() {
  const { openNav } = useReaderChrome();
  const { preferences, updatePreferences, openModal, chapter, mode, currentJuz } = useMushaf();
  const title =
    mode === "juz" ? `Juz ${currentJuz ?? "—"}` : (chapter?.nameSimple ?? "Al-Fatihah");
  const themeName = APPEARANCE_THEMES.find((item) => item.id === preferences.theme)?.name ?? preferences.theme;

  return (
    <div className="sticky top-0 z-30 shrink-0 border-b border-line/60 bg-canvas/95 backdrop-blur-md md:hidden">
      <div className="flex h-[3.25rem] min-h-[3.25rem] items-center gap-2 px-3">
        <Link
          href="/"
          className="inline-flex h-11 min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-highlight"
          aria-label="Back to home"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <button
          type="button"
          onClick={openNav}
          className="inline-flex h-11 min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-highlight"
          aria-label="Open surah and juz menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={openNav}
          className="min-w-0 flex-1 cursor-pointer truncate text-center font-display text-base font-semibold tracking-tight text-ink"
        >
          {title}
        </button>
        <button
          type="button"
          onClick={() => openModal("themes")}
          className="inline-flex h-11 min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-line bg-surface px-3 text-xs font-medium text-gold-deep"
          aria-label={`Reading settings. Theme ${themeName}`}
        >
          <Settings2 className="h-4 w-4 shrink-0" />
          <span className="max-w-[4.5rem] truncate">Aa</span>
        </button>
        <button
          type="button"
          aria-label="Smaller text"
          className="inline-flex h-11 min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full text-lg hover:bg-highlight"
          onClick={() => updatePreferences({ fontSize: Math.max(FONT_SIZE_MIN, preferences.fontSize - 2) })}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Larger text"
          className="inline-flex h-11 min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full text-lg hover:bg-highlight"
          onClick={() => updatePreferences({ fontSize: Math.min(FONT_SIZE_MAX, preferences.fontSize + 2) })}
        >
          +
        </button>
      </div>
    </div>
  );
}
