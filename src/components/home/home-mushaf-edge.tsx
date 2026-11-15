"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { dialogFocusables, initialDialogIndex, trapTabIndex } from "@/lib/dialog-focus";
import {
  buildMushafEdge,
  EDGE_HOVER_DELAY_MS,
  EDGE_HOVER_GRACE_MS,
  minShareForWidth,
  placeFloating,
  type EdgeChoice,
  type FloatingBox,
  type TooltipCopy,
} from "@/lib/mushaf-edge";

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

type TipState = {
  id: string;
  copy: TooltipCopy;
  element: HTMLElement;
};

type MenuState = {
  id: string;
  title: string;
  choices: EdgeChoice[];
  element: HTMLElement;
};

/**
 * Signed-in closed mushaf: cover, spine, and the stained top of the pages.
 * Mark text stays in this component: nothing here is sent or logged.
 */
export function HomeMushafEdge() {
  const headingId = useId();
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
      <h2 id={headingId} className="font-display text-3xl font-semibold tracking-tight text-ink">
        Your Mushaf
      </h2>
      <p className="max-w-2xl text-sm leading-6 text-ink-soft lg:hidden" data-testid="mushaf-edge-hint">
        See your marked-up Mushaf on desktop.
      </p>
      <p className="hidden text-sm leading-6 text-ink-soft lg:block">Each slice is a surah, Al-Fatihah to An-Nas.</p>
      <div className="hidden lg:block">
        {desktop && near ? <MushafEdgeBook /> : <div className="min-h-[28rem]" aria-hidden="true" />}
      </div>
    </section>
  );
}

function MushafEdgeBook() {
  const { highlights, notes, bookmarks, swatches, progress, chapters, jumpToHit } = useMushaf();
  const pagesRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const tipId = useId();
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const showTimer = useRef(0);
  const hideTimer = useRef(0);
  const [tip, setTip] = useState<TipState | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [tipBox, setTipBox] = useState<FloatingBox | null>(null);
  const [menuBox, setMenuBox] = useState<FloatingBox | null>(null);
  const tipNode = useRef<HTMLDivElement>(null);

  const names = useMemo(
    () => chapters.map((chapter) => ({ id: chapter.id, name: chapter.nameSimple })),
    [chapters],
  );
  const edge = useMemo(
    () =>
      buildMushafEdge({
        highlights,
        notes,
        bookmarks,
        swatches,
        versesRead: progress.versesRead,
        names,
        minShare: minShareForWidth(width),
        minFlagGap: width > 0 ? Math.max(0.045, 56 / width) : undefined,
      }),
    [bookmarks, highlights, names, notes, progress.versesRead, swatches, width],
  );

  useEffect(() => {
    const node = pagesRef.current;
    if (!node) return;
    const measure = () => {
      const next = node.clientHeight;
      setWidth((current) => (current === next ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(showTimer.current);
      window.clearTimeout(hideTimer.current);
    },
    [],
  );

  const showTip = useCallback((next: TipState, immediate: boolean) => {
    if (menu) return;
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(showTimer.current);
    if (immediate) {
      setTip(next);
      return;
    }
    showTimer.current = window.setTimeout(() => setTip(next), EDGE_HOVER_DELAY_MS);
  }, [menu]);

  const hideTip = useCallback((id: string) => {
    window.clearTimeout(showTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setTip((current) => (current?.id === id ? null : current));
    }, EDGE_HOVER_GRACE_MS);
  }, []);

  const closeMenu = useCallback(() => {
    setMenu(null);
    const opener = returnFocus.current;
    returnFocus.current = null;
    opener?.focus();
  }, []);

  const openPlace = useCallback(
    (choice: EdgeChoice) => {
      setMenu(null);
      setTip(null);
      jumpToHit({
        verseKey: choice.verseKey,
        chapterId: choice.chapterId,
        verseNumber: choice.verseNumber,
        textArabic: "",
        textTranslation: "",
        source: "jump",
      });
    },
    [jumpToHit],
  );

  const activate = useCallback(
    (id: string, title: string, direct: EdgeChoice | null, choices: EdgeChoice[], element: HTMLElement) => {
      window.clearTimeout(showTimer.current);
      window.clearTimeout(hideTimer.current);
      setTip(null);
      if (direct || choices.length === 0) {
        if (direct) openPlace(direct);
        return;
      }
      if (menu?.id === id) {
        closeMenu();
        return;
      }
      returnFocus.current = element;
      setMenu({ id, title, choices, element });
    },
    [closeMenu, menu?.id, openPlace],
  );

  useLayoutEffect(() => {
    const element = tip?.element;
    const node = tipNode.current;
    if (!tip || !element || !node) return;
    const place = () => {
      if (!element.isConnected) {
        setTip(null);
        return;
      }
      const next = placeFloating(element.getBoundingClientRect(), node.getBoundingClientRect(), {
        width: window.innerWidth,
        height: window.innerHeight,
      });
      setTipBox(next);
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [tip]);

  useLayoutEffect(() => {
    const element = menu?.element;
    const node = menuRef.current;
    if (!menu || !element || !node) return;
    const place = () => {
      if (!element.isConnected) {
        setMenu(null);
        return;
      }
      setMenuBox(
        placeFloating(element.getBoundingClientRect(), node.getBoundingClientRect(), {
          width: window.innerWidth,
          height: window.innerHeight,
        }),
      );
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const node = menuRef.current;
    if (!node) return;
    const list = dialogFocusables(node);
    const closeIndex = list.findIndex((item) => item.dataset.close === "true");
    list[initialDialogIndex(list.length, closeIndex)]?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab" || !menuRef.current) return;
      const items = dialogFocusables(menuRef.current);
      event.preventDefault();
      const current = items.indexOf(document.activeElement as HTMLElement);
      items[trapTabIndex(current, items.length, event.shiftKey)]?.focus();
    };
    const onPointer = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      if (returnFocus.current?.contains(target)) return;
      closeMenu();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [closeMenu, menu]);

  const handlers = (id: string, copy: TooltipCopy, direct: EdgeChoice | null, choices: EdgeChoice[]) => ({
    onPointerEnter: (event: ReactPointerEvent<HTMLButtonElement>) =>
      showTip({ id, copy, element: event.currentTarget }, false),
    onPointerLeave: () => hideTip(id),
    onFocus: (event: FocusEvent<HTMLButtonElement>) => showTip({ id, copy, element: event.currentTarget }, true),
    onBlur: () => hideTip(id),
    onClick: (event: MouseEvent<HTMLButtonElement>) =>
      activate(id, copy.title, direct, choices, event.currentTarget),
  });

  return (
    <div data-empty={edge.empty ? "true" : "false"}>
      <div data-testid="mushaf-edge-book" className="mushaf-scene">
        <div className="mushaf-float">
          <div className="mushaf-book">
            <div className="mushaf-spine" aria-hidden="true">
              <span className="mushaf-headband" />
              <span className="mushaf-headband mushaf-headband-2" />
            </div>
            <div className="mushaf-back" aria-hidden="true" />
            <div className="mushaf-front" aria-hidden="true">
              <div className="mushaf-cover-frame">
                <span className="mushaf-corner" data-corner="tl" />
                <span className="mushaf-corner" data-corner="tr" />
                <span className="mushaf-corner" data-corner="bl" />
                <span className="mushaf-corner" data-corner="br" />
                <span className="mushaf-cover-mark" />
                <p className="mushaf-cover-title">Your Mushaf</p>
              </div>
            </div>
            <div className="mushaf-page-top" aria-hidden="true" />
            <div className="mushaf-right">
              <div className="mushaf-board-edge" aria-hidden="true" />
              <div ref={pagesRef} className="mushaf-fore">
                <div className="flex h-full flex-col overflow-hidden">
                  {edge.bands.map((band) => (
                    <span
                      key={band.chapterId}
                      aria-hidden="true"
                      className="relative min-h-0 w-full"
                      style={{ flex: `${band.ayahCount} 1 0%` }}
                    >
                      {!edge.empty && band.readRatio > 0 ? (
                        <span
                          className="absolute inset-x-0 bottom-0"
                          style={{
                            height: `${Math.max(16, Math.round(band.readRatio * 100))}%`,
                            background: "rgba(28, 20, 12, 0.16)",
                          }}
                        />
                      ) : null}
                      {band.colors.length > 0 ? (
                        <span className="absolute inset-x-0 inset-y-[10%] flex">
                          {band.colors.map((color) => (
                            <span
                              key={color.id}
                              className="h-full min-w-0"
                              style={{ flexGrow: color.count, backgroundColor: color.color }}
                            />
                          ))}
                        </span>
                      ) : null}
                    </span>
                  ))}
                </div>
                <div className="mushaf-edge-lines pointer-events-none absolute inset-0" aria-hidden="true" />
                <div className="absolute inset-0 flex flex-col" role="group" aria-label="Page edge, Al-Fatihah to An-Nas">
                  {edge.buckets.map((bucket) => {
                    const id = `pages-${bucket.id}`;
                    const open = menu?.id === id;
                    return (
                      <button
                        key={bucket.id}
                        type="button"
                        data-testid="mushaf-edge-slice"
                        className="min-h-0 w-full cursor-pointer hover:bg-[color-mix(in_srgb,white_18%,transparent)]"
                        style={{ flex: `${bucket.ayahCount} 1 0%` }}
                        aria-label={`Pages, ${bucket.name}`}
                        aria-describedby={tip?.id === id ? tipId : undefined}
                        aria-expanded={bucket.choices.length > 0 ? open : undefined}
                        aria-haspopup={bucket.choices.length > 0 ? "dialog" : undefined}
                        aria-controls={open ? menuId : undefined}
                        {...handlers(id, bucket.tooltip, bucket.direct, bucket.choices)}
                      />
                    );
                  })}
                </div>
                {edge.noteFlags.map((flag, index) => {
                  const id = `note-${flag.id}`;
                  const open = menu?.id === id;
                  const ink = tabInk(flag.accent);
                  return (
                    <span
                      key={flag.id}
                      className="mushaf-tab-anchor absolute z-20 -translate-y-1/2"
                      style={{ top: edgeAlong(flag.position) }}
                    >
                      <span className="mushaf-flag-rise block" style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
                        <button
                          type="button"
                          data-testid="mushaf-edge-flag"
                          className="mushaf-tab relative flex h-11 min-w-11 cursor-pointer items-stretch bg-transparent p-0"
                          aria-label={controlName("Note", flag.tooltip.title, flag.tooltip.lines[0] ?? "", flag.label)}
                          aria-describedby={tip?.id === id ? tipId : undefined}
                          aria-expanded={flag.choices.length > 0 ? open : undefined}
                          aria-haspopup={flag.choices.length > 0 ? "dialog" : undefined}
                          aria-controls={open ? menuId : undefined}
                          {...handlers(id, flag.tooltip, flag.direct, flag.choices)}
                        >
                          <span
                            className="mushaf-tab-face relative flex h-11 min-w-9 items-center justify-center whitespace-nowrap rounded-r-md rounded-l-sm px-1.5 text-xs font-semibold shadow-[var(--shadow)]"
                            style={{ background: ink.background, color: ink.color, border: `1px solid ${ink.border}` }}
                          >
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute top-0 right-0 h-2.5 w-2.5"
                              style={{ background: ink.color, opacity: 0.28, clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
                            />
                            <span aria-hidden="true">{flag.label}</span>
                          </span>
                        </button>
                      </span>
                    </span>
                  );
                })}
              </div>
              <div className="mushaf-board-edge mushaf-board-edge-back" aria-hidden="true" />
            </div>
            {edge.ribbons.map((ribbon, index) => {
              const id = `mark-${ribbon.id}`;
              const open = menu?.id === id;
              return (
                <span
                  key={ribbon.id}
                  className="mushaf-ribbon-anchor absolute z-20 -translate-x-1/2"
                  style={{ left: edgeAlong(ribbon.position) }}
                >
                  <span className="mushaf-ribbon-drop block" style={{ animationDelay: `${160 + Math.min(index, 8) * 40}ms` }}>
                    <button
                      type="button"
                      data-testid="mushaf-edge-ribbon"
                      className="mushaf-ribbon flex h-14 w-8 cursor-pointer items-start justify-center bg-transparent p-0"
                      aria-label={controlName("Bookmark", ribbon.tooltip.title, ribbon.tooltip.lines[0] ?? "", ribbon.label)}
                      aria-describedby={tip?.id === id ? tipId : undefined}
                      aria-expanded={ribbon.choices.length > 0 ? open : undefined}
                      aria-haspopup={ribbon.choices.length > 0 ? "dialog" : undefined}
                      aria-controls={open ? menuId : undefined}
                      {...handlers(id, ribbon.tooltip, ribbon.direct, ribbon.choices)}
                    >
                      <span aria-hidden="true" className="mushaf-satin" />
                      {ribbon.label ? (
                        <span className="absolute top-1 left-1/2 -translate-x-1/2 rounded-full bg-[#fff8e7] px-1 text-[10px] font-semibold leading-4 text-[#1c140c] ring-1 ring-[#c4b48a]">
                          {ribbon.label}
                        </span>
                      ) : null}
                    </button>
                  </span>
                </span>
              );
            })}
          </div>
        </div>
        <div className="mushaf-ground" aria-hidden="true" />
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
      ) : (
        edge.legend.length > 0 ? (
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
        ) : null
      )}
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
      {tip
        ? createPortal(
            <div
              ref={tipNode}
              id={tipId}
              role="tooltip"
              data-testid="mushaf-edge-tooltip"
              className="pointer-events-none fixed z-[80] w-72 max-w-[calc(100vw-1rem)] rounded-2xl border border-line bg-surface px-3 py-2 text-sm leading-5 text-ink shadow-[var(--shadow)]"
              style={{ top: tipBox?.top ?? 0, left: tipBox?.left ?? 0, visibility: tipBox ? "visible" : "hidden" }}
            >
              <p className="font-semibold">{tip.copy.title}</p>
              {tip.copy.lines.map((line) => (
                <p key={line} className="text-ink-soft">
                  {line}
                </p>
              ))}
              {tip.copy.preview ? <p className="mt-1 text-ink">{tip.copy.preview}</p> : null}
            </div>,
            document.body,
          )
        : null}
      {menu
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="dialog"
              aria-modal="false"
              aria-labelledby={`${menuId}-title`}
              data-testid="mushaf-edge-menu"
              className="fixed z-[80] max-h-[min(22rem,calc(100vh-1rem))] w-[min(20rem,calc(100vw-1rem))] overflow-auto rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow)]"
              style={{ top: menuBox?.top ?? 0, left: menuBox?.left ?? 0, visibility: menuBox ? "visible" : "hidden" }}
            >
              <div className="flex items-start justify-between gap-2 px-2 py-1">
                <div className="min-w-0">
                  <p id={`${menuId}-title`} className="font-display text-lg font-semibold text-ink">
                    {menu.title}
                  </p>
                  <p className="text-sm text-ink-soft">Choose a place</p>
                </div>
                <button
                  type="button"
                  data-close="true"
                  className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-highlight"
                  aria-label="Close"
                  onClick={closeMenu}
                >
                  <span aria-hidden="true" className="text-lg leading-none">
                    ×
                  </span>
                </button>
              </div>
              <ul className="mt-1 flex flex-col gap-1">
                {menu.choices.map((choice) => (
                  <li key={choice.id}>
                    <button
                      type="button"
                      data-choice="true"
                      className="flex min-h-11 w-full cursor-pointer flex-col items-start justify-center rounded-xl px-3 py-2 text-left hover:bg-highlight"
                      onClick={() => openPlace(choice)}
                    >
                      <span className="text-sm font-medium text-ink">{choice.title}</span>
                      {choice.detail ? <span className="text-xs leading-5 text-ink-soft">{choice.detail}</span> : null}
                      {choice.preview ? <span className="line-clamp-2 text-sm leading-5 text-ink-soft">{choice.preview}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function controlName(kind: string, title: string, range: string, extra: string) {
  return [kind, title, range, extra].filter(Boolean).join(", ");
}

function edgeAlong(position: number) {
  const safe = Math.min(1, Math.max(0, position));
  return `clamp(1.4rem, ${safe * 100}%, calc(100% - 1.4rem))`;
}

function tabInk(hex: string | null): { background: string; color: string; border: string } {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    return { background: "#fff8e7", color: "#1c140c", border: "#c4b48a" };
  }
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const luma = (red * 299 + green * 587 + blue * 114) / 1000;
  return {
    background: hex,
    color: luma > 160 ? "#1c140c" : "#fff8e7",
    border: luma > 160 ? "#8a7044" : "#f4efe4",
  };
}
