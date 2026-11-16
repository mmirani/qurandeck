"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ZoomIn } from "lucide-react";
import { MushafBook } from "@/components/home/mushaf-book";
import { useMushafEdgeInteraction } from "@/components/home/mushaf-edge-interaction";
import { MushafExploreDialog } from "@/components/home/mushaf-explore-dialog";
import { useMushafOwnerTitle } from "@/components/home/use-mushaf-owner-title";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { buildMushafEdge, minShareForWidth, type MushafEdgeInput } from "@/lib/mushaf-edge";

const DESKTOP_QUERY = "(min-width: 64rem)";

function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function desktopNow() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function desktopOnServer() {
  return false;
}

/**
 * Signed-in closed mushaf. The pages are vertical sheets hinged at the spine:
 * Al-Fatihah sits behind the front cover, An-Nas in front of the back cover.
 * Mark text stays in this component: nothing here is sent or logged.
 */
export function HomeMushafEdge() {
  const headingId = useId();
  const title = useMushafOwnerTitle();
  const rootRef = useRef<HTMLElement>(null);
  const desktop = useSyncExternalStore(subscribeDesktop, desktopNow, desktopOnServer);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || !desktop) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: "200px 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [desktop]);

  return (
    <section
      ref={rootRef}
      id="your-mushaf"
      data-testid="mushaf-edge"
      aria-labelledby={headingId}
      className="qd-card scroll-mt-24 rounded-3xl border border-line bg-surface pb-10"
    >
      <p className="kufic-label text-gold-deep">Marked pages</p>
      <h2 id={headingId} className="min-w-0 truncate font-display text-3xl font-semibold tracking-tight text-ink" title={title}>
        {title}
      </h2>
      <p className="max-w-2xl text-sm leading-6 text-ink-soft lg:hidden" data-testid="mushaf-edge-hint">
        See your marked-up Mushaf on desktop.
      </p>
      <p className="hidden text-sm leading-6 text-ink-soft lg:block">Front cover to back: Al-Fatihah to An-Nas.</p>
      <div className="hidden lg:block">
        {desktop && near ? <MushafEdgeBook /> : <div className="min-h-[28rem]" aria-hidden="true" />}
      </div>
    </section>
  );
}

function MushafEdgeBook() {
  const { highlights, notes, bookmarks, swatches, progress, chapters, jumpToHit } = useMushaf();
  const pagesRef = useRef<HTMLDivElement>(null);
  const exploreRef = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState(0);
  const [open, setOpen] = useState(false);
  const interaction = useMushafEdgeInteraction(jumpToHit);

  const names = useMemo(
    () => chapters.map((chapter) => ({ id: chapter.id, name: chapter.nameSimple })),
    [chapters],
  );
  const source = useMemo<MushafEdgeInput>(
    () => ({
      highlights,
      notes,
      bookmarks,
      swatches,
      versesRead: progress.versesRead,
      names,
    }),
    [bookmarks, highlights, names, notes, progress.versesRead, swatches],
  );
  const edge = useMemo(
    () =>
      buildMushafEdge({
        ...source,
        minShare: minShareForWidth(width),
        minFlagGap: width > 0 ? Math.max(0.04, 6 / width) : undefined,
      }),
    [source, width],
  );

  useEffect(() => {
    const node = pagesRef.current;
    if (!node) return;
    const measure = () => {
      const next = Math.round(node.getBoundingClientRect().width);
      setWidth((current) => (current === next ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const openExplore = () => {
    interaction.dismiss();
    setOpen(true);
  };

  return (
    <div data-empty={edge.empty ? "true" : "false"}>
      <MushafBook
        edge={edge}
        pagesRef={pagesRef}
        variant="card"
        tipId={interaction.tipId}
        menuId={interaction.menuId}
        activeTipId={interaction.activeTipId}
        activeMenuId={interaction.activeMenuId}
        handlers={interaction.handlers}
        onExplore={openExplore}
      />
      <div className="flex justify-center">
        <button
          ref={exploreRef}
          type="button"
          data-testid="mushaf-edge-explore"
          className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-gold px-5 text-sm font-semibold text-on-gold"
          onClick={openExplore}
        >
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
          Explore
        </button>
      </div>
      {edge.empty ? (
        <div className="flex flex-col items-start gap-3" data-testid="mushaf-edge-empty">
          <p className="max-w-xl text-sm leading-6 text-ink-soft">
            These pages are still clear. Highlight an ayah while you read, and it will show along this edge.
          </p>
          <Link
            href="/read"
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-gold px-5 text-sm font-semibold text-on-gold"
          >
            Start highlighting
          </Link>
        </div>
      ) : edge.legend.length > 0 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-soft" aria-label="Highlight colours">
          {edge.legend.map((color) => (
            <li key={color.id} className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-3 w-3 rounded-full ring-1 ring-line" style={{ backgroundColor: color.color }} />
              <span>
                {color.name} {color.count}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink" aria-label="How to read this book">
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-gold" />
          Highlights
        </li>
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3.5 rounded-t-sm border border-[#c4b48a] bg-[#fff8e7]" />
          Notes
        </li>
        <li className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-3.5 w-2"
            style={{
              background: "color-mix(in srgb, var(--gold-deep) 72%, var(--ink))",
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 72%, 0 100%)",
            }}
          />
          Bookmarks
        </li>
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-[color-mix(in_srgb,var(--mushaf-script)_28%,var(--mushaf-paper))] ring-1 ring-line" />
          Read
        </li>
      </ul>
      {interaction.popovers}
      {open ? (
        <MushafExploreDialog input={source} jumpToHit={jumpToHit} returnFocus={exploreRef} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}
