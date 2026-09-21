"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";

export function SearchBar() {
  const {
    searchQuery,
    setSearchQuery,
    runSearch,
    searchResults,
    searchOpen,
    setSearchOpen,
    searching,
    jumpToHit,
    openModal,
    openSurah,
    chapters,
  } = useMushaf();
  const [local, setLocal] = useState(searchQuery);

  useEffect(() => setLocal(searchQuery), [searchQuery]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("quran-search")?.focus();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  const nameHits = useMemo(() => {
    const q = local.trim().toLowerCase();
    if (q.length < 2) return [];
    return chapters
      .filter(
        (chapter) =>
          chapter.nameSimple.toLowerCase().includes(q) ||
          chapter.translatedName.toLowerCase().includes(q) ||
          String(chapter.id) === q,
      )
      .slice(0, 6);
  }, [chapters, local]);

  return (
    <div className="relative">
      <label className="sr-only" htmlFor="quran-search">
        Search the Quran by word, theme, surah name, or verse such as 2:255
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-deep" aria-hidden="true" />
      <input
        id="quran-search"
        value={local}
        onChange={(event) => {
          setLocal(event.target.value);
          setSearchQuery(event.target.value);
          setSearchOpen(true);
        }}
        onFocus={() => setSearchOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter") void runSearch(local);
        }}
        placeholder="Search by word, theme, or verse (e.g. 2:255)"
        className="h-12 w-full rounded-full border border-line bg-surface/90 pl-11 pr-36 text-sm text-ink shadow-sm outline-none placeholder:text-muted"
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        <kbd className="hidden rounded-full border border-line px-2 py-1 text-[10px] text-muted sm:inline">⌘ K</kbd>
        <button
          type="button"
          onClick={() => openModal("filters")}
          className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-full bg-gold px-3 text-xs text-on-gold hover:bg-gold-deep"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Filters
        </button>
      </div>
      {searchOpen && (local || searchResults.length > 0) ? (
        <div className="ornament-border absolute z-30 mt-2 w-full overflow-hidden rounded-3xl bg-surface">
          <div className="max-h-80 overflow-y-auto p-2">
            {nameHits.length > 0 ? <p className="kufic-label px-3 py-2 text-gold-deep">Surahs</p> : null}
            {nameHits.map((chapter) => (
              <button
                key={chapter.id}
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  openSurah(chapter.id);
                }}
                className="flex w-full cursor-pointer items-center justify-between rounded-2xl px-3 py-2 text-left hover:bg-highlight"
              >
                <span>
                  {chapter.id}. {chapter.nameSimple}
                </span>
                <span className="text-xs text-muted">{chapter.translatedName}</span>
              </button>
            ))}
            {searching ? <p className="px-3 py-4 text-sm text-muted">Searching the Quran…</p> : null}
            {!searching && searchResults.length === 0 && local.length > 1 ? (
              <p className="px-3 py-4 text-sm text-muted">
                Press Enter to search the full Quran text, or open Filters to browse themes such as Mercy or Prayer.
              </p>
            ) : null}
            {searchResults.map((hit) => (
              <button
                key={`${hit.source}-${hit.verseKey}`}
                type="button"
                onClick={() => jumpToHit(hit)}
                className="block w-full cursor-pointer rounded-2xl px-3 py-2 text-left hover:bg-highlight"
              >
                <p className="text-xs text-gold-deep">{hit.verseKey}</p>
                <p className="line-clamp-2 text-sm text-ink">{hit.textTranslation || hit.textArabic || "Open verse"}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
