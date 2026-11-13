"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { moveSearchIndex, SEARCH_DEBOUNCE_MS, searchStatusMessage, shouldLiveSearch } from "@/lib/search-status";

function subscribeMounted() {
  return () => {};
}

function blurSearchField() {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.id === "quran-search") active.blur();
}

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
    openSurah,
    chapters,
  } = useMushaf();
  const [local, setLocal] = useState(searchQuery);
  const [seenQuery, setSeenQuery] = useState(searchQuery);
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const anchor = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<number | null>(null);
  const runSearchRef = useRef(runSearch);
  useEffect(() => {
    runSearchRef.current = runSearch;
  }, [runSearch]);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  if (searchQuery !== seenQuery) {
    setSeenQuery(searchQuery);
    setLocal(searchQuery);
  }

  useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    const query = local.trim();
    if (!shouldLiveSearch(query)) {
      void runSearchRef.current(query);
      return;
    }
    searchTimer.current = window.setTimeout(() => {
      setSubmittedQuery(query);
      void runSearchRef.current(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [local]);

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

  useEffect(() => {
    if (!searchOpen) return;
    const place = () => {
      const node = anchor.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      setBox({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    };
    const frame = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [searchOpen, local, searchResults.length]);

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

  const searchStatus = searchStatusMessage({
    query: local,
    submittedQuery,
    searching,
    resultCount: searchResults.length,
    nameHitCount: nameHits.length,
  });

  return (
    <div className="relative" data-tour="search" ref={anchor}>
      <label className="sr-only" htmlFor="quran-search">
        Search the Quran by word, surah name, or verse such as 2:255
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-deep" aria-hidden="true" />
      <input
        id="quran-search"
        value={local}
        onChange={(event) => {
          const next = event.target.value;
          setLocal(next);
          setSearchQuery(next);
          setSearchOpen(true);
          setActiveIndex(-1);
          if (submittedQuery !== null && next.trim() !== submittedQuery) setSubmittedQuery(null);
        }}
        onFocus={() => setSearchOpen(true)}
        role="combobox"
        aria-expanded={searchOpen}
        aria-controls="quran-search-results"
        aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
        aria-autocomplete="list"
        onKeyDown={(event) => {
          const count = nameHits.length + searchResults.length;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setSearchOpen(true);
            setActiveIndex((current) =>
              moveSearchIndex(current, count, event.key === "ArrowDown" ? "next" : "prev"),
            );
            return;
          }
          if (event.key === "Escape") {
            setSearchOpen(false);
            setActiveIndex(-1);
            return;
          }
          if (event.key === "Enter") {
            if (activeIndex >= 0 && activeIndex < nameHits.length) {
              event.preventDefault();
              setSearchOpen(false);
              setActiveIndex(-1);
              blurSearchField();
              openSurah(nameHits[activeIndex].id);
              return;
            }
            if (activeIndex >= nameHits.length) {
              const hit = searchResults[activeIndex - nameHits.length];
              if (hit) {
                event.preventDefault();
                setActiveIndex(-1);
                blurSearchField();
                jumpToHit(hit);
                return;
              }
            }
            if (searchTimer.current) window.clearTimeout(searchTimer.current);
            const next = local.trim();
            setSubmittedQuery(next);
            void runSearch(local);
          }
        }}
        placeholder="Search words, surahs, 2:255"
        className="h-12 w-full rounded-full border border-line bg-surface/90 pl-10 pr-3 text-sm text-ink shadow-sm outline-none placeholder:text-muted sm:pr-16"
      />
      <div className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center sm:flex">
        <kbd className="rounded-full border border-line px-2 py-1 text-xs text-muted">⌘ K</kbd>
      </div>
      {mounted && searchOpen && box && (local || searchResults.length > 0)
        ? createPortal(
            <div
              data-search-panel
              className="ornament-border fixed z-[70] overflow-hidden rounded-3xl bg-surface shadow-[0_16px_40px_rgba(15,23,42,0.16)]"
              style={{ top: box.top, left: box.left, width: box.width }}
            >
              {submittedQuery && !searching ? (
                <p className="px-5 pt-3 text-sm text-ink-soft">
                  {searchResults.length} {searchResults.length === 1 ? "ayah" : "ayahs"}
                </p>
              ) : null}
              <div id="quran-search-results" role="listbox" className="max-h-[min(24rem,50vh)] overflow-y-auto p-2">
                {nameHits.length > 0 ? <p className="kufic-label px-3 py-2 text-gold-deep">Surahs</p> : null}
                {nameHits.map((chapter, index) => (
                  <button
                    key={chapter.id}
                    id={`search-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === index}
                    onClick={() => {
                      setSearchOpen(false);
                      setActiveIndex(-1);
                      blurSearchField();
                      openSurah(chapter.id);
                    }}
                    className={`flex min-h-11 w-full cursor-pointer items-center justify-between rounded-2xl px-3 py-3 text-left hover:bg-highlight ${
                      activeIndex === index ? "bg-highlight" : ""
                    }`}
                  >
                    <span>
                      {chapter.id}. {chapter.nameSimple}
                    </span>
                    <span className="text-xs text-ink-soft">{chapter.translatedName}</span>
                  </button>
                ))}
                {searching ? <p className="px-3 py-4 text-sm text-ink-soft">Searching the Quran…</p> : null}
                {searchStatus ? <p className="px-3 py-4 text-sm text-ink-soft">{searchStatus}</p> : null}
                {searchResults.map((hit, index) => {
                  const optionIndex = nameHits.length + index;
                  const chapter = chapters.find((item) => item.id === hit.chapterId);
                  const name = hit.chapterName || chapter?.nameSimple || `Surah ${hit.chapterId}`;
                  return (
                    <button
                      key={`${hit.source}-${hit.verseKey}`}
                      id={`search-option-${optionIndex}`}
                      type="button"
                      role="option"
                      aria-selected={activeIndex === optionIndex}
                      onClick={() => {
                        setActiveIndex(-1);
                        blurSearchField();
                        jumpToHit(hit);
                      }}
                      translate="no"
                      className={`block min-h-11 w-full cursor-pointer rounded-2xl px-3 py-3 text-left hover:bg-highlight ${
                        activeIndex === optionIndex ? "bg-highlight" : ""
                      }`}
                    >
                      <p className="text-xs font-medium text-gold-deep">
                        {name} · {hit.verseKey}
                      </p>
                      {hit.textArabic ? (
                        <p dir="rtl" lang="ar" className="script-naskh mt-1 line-clamp-2 text-base text-ink">
                          {hit.textArabic}
                        </p>
                      ) : null}
                      {hit.textTranslation ? (
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink">{hit.textTranslation}</p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
