"use client";

import Link from "next/link";
import { Menu, Palette } from "lucide-react";
import { HeaderAccount } from "@/components/auth/header-account";
import { MihrabMark } from "@/components/art/ornaments";
import { APPEARANCE_THEMES } from "@/lib/appearance";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { useDisplayedReading } from "@/components/reader/reading-seed";
import { SearchBar } from "@/components/search/search-bar";
import { useReaderChrome } from "@/components/shell/reader-chrome";
import { useMediaQuery } from "@/lib/use-media-query";

export function MobileReaderBar() {
  const { openNav } = useReaderChrome();
  const { preferences, updatePreferences, openModal, mode, currentJuz } = useMushaf();
  const { chapter } = useDisplayedReading();
  const tafsirOn = preferences.showTafsir;
  const ayahMode = preferences.mobileReadingMode === "ayah";
  const title =
    mode === "juz" ? `Juz ${currentJuz ?? "—"}` : (chapter?.nameSimple ?? "Surah");
  const themeName = APPEARANCE_THEMES.find((item) => item.id === preferences.theme)?.name ?? preferences.theme;
  const desktopSearch = useMediaQuery("(min-width: 1024px)");

  return (
    <div className="sticky top-0 z-30 shrink-0 border-b border-line/60 bg-canvas/95 backdrop-blur-md lg:hidden">
      <div className="qd-gutter grid min-h-14 grid-cols-[6.5rem_minmax(0,1fr)_6.5rem] items-center py-[var(--space-2)]">
        <div className="flex items-center justify-start gap-[var(--space-2)]">
          <Link
            href="/"
            className="inline-flex h-11 min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-highlight"
            aria-label="QuranDeck home"
          >
            <MihrabMark className="h-6 w-6" />
          </Link>
          <button
            type="button"
            onClick={openNav}
            data-tour="search-mobile"
            className="inline-flex h-11 min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-highlight"
            aria-label="Open surah and juz menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <h1 className="min-w-0 truncate text-center font-display text-base font-semibold tracking-tight text-ink">
          <button type="button" onClick={openNav} className="block w-full cursor-pointer truncate">
            {title}
            {mode === "surah" && chapter?.nameArabic ? (
              <span className="sr-only" lang="ar" dir="rtl">
                {" "}
                {chapter.nameArabic}
              </span>
            ) : null}
          </button>
        </h1>
        <div className="flex items-center justify-end">
          <HeaderAccount />
        </div>
      </div>
      {desktopSearch ? null : (
        <div className="qd-gutter pb-[var(--space-2)]">
          <SearchBar />
        </div>
      )}
      <div className="qd-gutter flex flex-nowrap items-center gap-[var(--space-2)] border-t border-line/50 py-[var(--space-2)]" role="group" aria-label="Reading controls">
        <LayoutChip
          active={!ayahMode}
          onClick={() => updatePreferences({ mobileReadingMode: "scroll" })}
        >
          Scroll
        </LayoutChip>
        <LayoutChip
          active={ayahMode}
          onClick={() =>
            updatePreferences({
              mobileReadingMode: "ayah",
              traditionalPage: false,
            })
          }
        >
          Ayah
        </LayoutChip>
        {tafsirOn ? (
          <button
            type="button"
            onClick={() => updatePreferences({ showTafsir: false })}
            className="inline-flex h-11 min-h-11 shrink-0 cursor-pointer items-center rounded-full bg-gold px-3 text-xs font-semibold text-on-gold"
            aria-label="Turn off tafsir"
          >
            Tafsir on
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => openModal("themes")}
          className="inline-flex h-11 min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-gold-deep"
          aria-label={`Themes. ${themeName}`}
          data-tour="size-mobile"
        >
          <Palette className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function LayoutChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-full px-3 text-sm font-medium ${
        active ? "bg-gold text-on-gold" : "border border-line bg-surface text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}
