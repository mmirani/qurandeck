"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { ArabesqueDivider, MihrabMark } from "@/components/art/ornaments";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { PRODUCT_DISPLAY } from "@/lib/brand";
import { POPULAR_SURAH_IDS } from "@/lib/reading";
import type { Chapter, Juz } from "@/lib/quran/types";
import { useReaderChrome } from "@/components/shell/reader-chrome";
import { RailToggle } from "@/components/shell/rail-toggle";
import { ContinueCard } from "@/components/account/account-dashboard";
import { QuranCredit } from "@/components/site/quran-credit";

export function SurahSidebar({ homeLink = true }: { homeLink?: boolean }) {
  const { chapters, chapter, currentJuz, juzs, mode, openModal } = useMushaf();
  const { closeNav } = useReaderChrome();
  const [query, setQuery] = useState("");
  const [browse, setBrowse] = useState<"surah" | "popular" | "juz">(mode === "juz" ? "juz" : "surah");
  if (mode === "juz" && browse !== "juz") setBrowse("juz");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter(
      (item) =>
        item.nameSimple.toLowerCase().includes(q) ||
        item.translatedName.toLowerCase().includes(q) ||
        item.nameArabic.includes(query) ||
        String(item.id) === q,
    );
  }, [chapters, query]);

  const popular = useMemo(
    () => POPULAR_SURAH_IDS.map((id) => chapters.find((item) => item.id === id)).filter((item): item is Chapter => Boolean(item)),
    [chapters],
  );

  const parts: Juz[] =
    juzs.length > 0
      ? juzs
      : Array.from({ length: 30 }, (_, index) => ({
          juzNumber: index + 1,
          versesCount: 0,
          verseMapping: {},
          firstVerseId: 0,
          lastVerseId: 0,
        }));

  return (
    <aside className="mushaf-rail flex h-full min-h-0 flex-col overflow-hidden">
      <div className="qd-pad shrink-0">
        <div className="flex items-start justify-between gap-2">
          {homeLink ? (
            <Link
              href="/"
              className="flex min-w-0 cursor-pointer items-center gap-3 text-ink hover:text-gold-deep"
              aria-label={`${PRODUCT_DISPLAY} home`}
            >
              <MihrabMark className="h-11 w-11 shrink-0" />
              <BrandWordmark className="shrink-0 text-xl leading-none xl:text-2xl" />
            </Link>
          ) : null}
          <div className="hidden lg:block">
            <RailToggle side="nav" />
          </div>
        </div>
        <ArabesqueDivider className="mt-4 text-gold/80" />
        <button
          type="button"
          onClick={() => {
            openModal("saved");
            closeNav();
          }}
          className="mt-3 flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-2xl px-3 text-left hover:bg-highlight"
        >
          <Bookmark className="h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-base font-medium text-ink">Saved</span>
            <span className="block truncate text-sm text-ink-soft">Bookmarks, notes, and highlights</span>
          </span>
        </button>
        <div className="mt-4 grid grid-cols-3 gap-1.5">
          <BrowseTab active={browse === "surah"} onClick={() => setBrowse("surah")}>
            Surahs
          </BrowseTab>
          <BrowseTab active={browse === "popular"} onClick={() => setBrowse("popular")}>
            Popular
          </BrowseTab>
          <BrowseTab active={browse === "juz"} onClick={() => setBrowse("juz")}>
            Juz
          </BrowseTab>
        </div>
        {browse === "juz" ? (
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Thirty equal parts for daily reading. Tap a Juz to open it.
          </p>
        ) : browse === "popular" ? (
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            The chapters people open most. A short list to start with.
          </p>
        ) : (
          <label className="mt-4 block text-sm text-gold">
            Find a surah
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or number, e.g. 2 or Baqarah"
              className="mt-2 h-12 w-full rounded-full border border-line bg-canvas px-4 text-base text-ink placeholder:text-muted"
            />
          </label>
        )}
      </div>
      {browse === "juz" ? (
        <nav className="mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2 xl:pb-28" aria-label="Juz">
          {parts.map((juz) => {
            const active = currentJuz === juz.juzNumber;
            return (
              <Link
                key={juz.juzNumber}
                href={`/juz/${juz.juzNumber}`}
                prefetch={false}
                onClick={() => closeNav()}
                className={`qd-pad-sm mb-2 flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-2xl text-left ${
                  active ? "bg-highlight ring-1 ring-gold/30" : "hover:bg-canvas"
                }`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-lg font-semibold text-gold-deep">
                  {juz.juzNumber}
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-medium">Juz {juz.juzNumber}</span>
                  <span className="block truncate text-sm text-ink-soft">
                    {juz.versesCount ? `${juz.versesCount} ayahs` : "Open this part"}
                    {Object.keys(juz.verseMapping).length > 0
                      ? ` · ${juzRange(juz.verseMapping, chapters)}`
                      : ""}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
      ) : (
        <nav
          className="mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2 xl:pb-28"
          aria-label={browse === "popular" ? "Popular surahs" : "Surahs"}
        >
          {(browse === "popular" ? popular : visible).map((item) => {
            const active = chapter?.id === item.id && currentJuz === null;
            return (
              <Link
                key={item.id}
                href={`/surah/${item.id}`}
                prefetch={false}
                onClick={() => closeNav()}
                aria-current={active ? "page" : undefined}
                className={`qd-pad-sm mb-2 flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl text-left ${
                  active ? "bg-highlight ring-1 ring-gold/25" : "hover:bg-canvas"
                }`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canvas text-sm font-semibold text-ink-soft">
                  {item.id}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-medium">{item.nameSimple}</span>
                  <span className="block truncate text-sm text-ink-soft">
                    {item.translatedName} · {item.versesCount} ayahs
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
      )}
      <div className="qd-pad-sm shrink-0 border-t-2 border-gold/40 bg-highlight/40">
        <ContinueCard compact />
        <QuranCredit compact className="mt-3" />
        <nav aria-label="Site" className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
          <Link href="/about" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline">
            About
          </Link>
          <Link href="/contact" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline">
            Contact
          </Link>
          <Link href="/privacy" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline">
            Privacy
          </Link>
        </nav>
      </div>
    </aside>
  );
}

function BrowseTab({
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
      className={`h-12 cursor-pointer rounded-full px-1 text-sm font-semibold sm:text-base ${
        active ? "bg-gold text-on-gold" : "border border-line bg-canvas text-ink-soft hover:bg-highlight"
      }`}
    >
      {children}
    </button>
  );
}

function juzRange(mapping: Record<string, string>, chapters: { id: number; nameSimple: string }[]) {
  const ids = Object.keys(mapping).map(Number).sort((a, b) => a - b);
  if (ids.length === 0) return "";
  const first = chapters.find((item) => item.id === ids[0])?.nameSimple ?? `Surah ${ids[0]}`;
  const last = chapters.find((item) => item.id === ids[ids.length - 1])?.nameSimple ?? `Surah ${ids[ids.length - 1]}`;
  return first === last ? first : `${first} – ${last}`;
}
