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
 * Signed-in fore-edge of the reader's own mushaf.
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
      className="qd-card scroll-mt-24 rounded-3xl border border-line bg-surface"
    >
      <p className="kufic-label text-gold-deep">Marked pages</p>
      <h2 id={headingId} className="font-display text-3xl font-semibold tracking-tight text-ink">
        Your Mushaf
      </h2>
      <p className="max-w-2xl text-sm leading-6 text-ink-soft lg:hidden" data-testid="mushaf-edge-hint">
        See your marked-up Mushaf on desktop.
      </p>
      <p className="hidden max-w-2xl text-sm leading-6 text-ink-soft lg:block">
        The closed edge of your copy, from Al-Fatihah to An-Nas. Colour is a highlight in a colour you named, a flag is
        a note, a ribbon is a bookmark, and a soft shade is where you have already read.
      </p>
      <div className="hidden min-h-[22rem] lg:block">
        {desktop && near ? <MushafEdgeBook /> : <div className="min-h-[22rem]" aria-hidden="true" />}
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
      }),
    [bookmarks, highlights, names, notes, progress.versesRead, swatches, width],
  );

  useEffect(() => {
    const node = pagesRef.current;
    if (!node) return;
    const measure = () => {
      const next = node.clientWidth;
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
      <div data-testid="mushaf-edge-book" className="relative">
        <div
          className="rounded-l-md rounded-r-lg border border-line shadow-[var(--shadow)]"
          style={{ background: "color-mix(in srgb, var(--gold) 16%, var(--surface))" }}
        >
          <div className="flex items-stretch p-2 pl-0">
            <div aria-hidden="true" className="relative w-9 shrink-0 rounded-l-md bg-gold">
              <span className="absolute inset-x-2 top-3 h-1 rounded-full bg-on-gold/45" />
              <span className="absolute inset-x-2 top-5 h-1 rounded-full bg-on-gold/25" />
            </div>
            <div className="relative min-w-0 flex-1 px-2 py-2">
              <div className="pb-16 pt-14">
                <div ref={pagesRef} className="relative h-40">
                  <div
                    className="flex h-full overflow-hidden rounded-r-sm"
                    style={{
                      background: "var(--mushaf-paper)",
                      boxShadow: "inset -16px 0 18px color-mix(in srgb, var(--mushaf-script) 16%, transparent)",
                    }}
                  >
                    {edge.bands.map((band) => (
                      <span
                        key={band.chapterId}
                        aria-hidden="true"
                        className="relative h-full min-w-0"
                        style={{ flex: `${band.ayahCount} 1 0%` }}
                      >
                        {!edge.empty && band.readRatio > 0 ? (
                          <span
                            className="absolute inset-x-0 bottom-0"
                            style={{
                              height: `${Math.max(2, Math.round(band.readRatio * 100))}%`,
                              background: "color-mix(in srgb, var(--mushaf-script) 18%, transparent)",
                            }}
                          />
                        ) : null}
                        {band.colors.length > 0 ? (
                          <span className="absolute inset-x-0 bottom-[18%] top-[14%] flex flex-col overflow-hidden">
                            {band.colors.map((color) => (
                              <span key={color.id} style={{ flexGrow: color.count, backgroundColor: color.color }} />
                            ))}
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                  <div className="mushaf-edge-lines pointer-events-none absolute inset-0" aria-hidden="true" />
                  <div className="absolute inset-0 flex" role="group" aria-label="Page edge, Al-Fatihah to An-Nas">
                    {edge.buckets.map((bucket) => {
                      const id = `pages-${bucket.id}`;
                      const open = menu?.id === id;
                      return (
                        <button
                          key={bucket.id}
                          type="button"
                          data-testid="mushaf-edge-slice"
                          className="h-full min-h-11 min-w-0 cursor-pointer rounded-sm hover:bg-[color-mix(in_srgb,var(--gold)_16%,transparent)]"
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
                    return (
                      <span
                        key={flag.id}
                        className="absolute bottom-[calc(100%+6px)] z-20 -translate-x-1/2"
                        style={{ left: edgeLeft(flag.position) }}
                      >
                        <span className="mushaf-flag-rise block" style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
                          <button
                            type="button"
                            data-testid="mushaf-edge-flag"
                            className="mushaf-edge-lift relative flex h-11 min-w-8 cursor-pointer items-center justify-center whitespace-nowrap rounded-t-md rounded-b-sm border border-[#c4b48a] bg-[#fff8e7] px-1.5 text-xs font-semibold text-[#1c140c] shadow-[var(--shadow)]"
                            aria-label={controlName("Note", flag.tooltip.title, flag.tooltip.lines[0] ?? "", flag.label)}
                            aria-describedby={tip?.id === id ? tipId : undefined}
                            aria-expanded={flag.choices.length > 0 ? open : undefined}
                            aria-haspopup={flag.choices.length > 0 ? "dialog" : undefined}
                            aria-controls={open ? menuId : undefined}
                            {...handlers(id, flag.tooltip, flag.direct, flag.choices)}
                          >
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute right-0 top-0 h-2.5 w-2.5 bg-[#e4d3a8]"
                              style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
                            />
                            <span aria-hidden="true">{flag.label}</span>
                          </button>
                        </span>
                      </span>
                    );
                  })}
                  {edge.ribbons.map((ribbon, index) => {
                    const id = `mark-${ribbon.id}`;
                    const open = menu?.id === id;
                    return (
                      <span
                        key={ribbon.id}
                        className="absolute top-full z-20 -translate-x-1/2"
                        style={{ left: edgeLeft(ribbon.position) }}
                      >
                        <span
                          className="mushaf-flag-rise block"
                          style={{ animationDelay: `${160 + Math.min(index, 8) * 40}ms` }}
                        >
                          <button
                            type="button"
                            data-testid="mushaf-edge-ribbon"
                            className="mushaf-edge-lift flex h-14 w-8 cursor-pointer items-start justify-center pt-0.5"
                            aria-label={controlName("Bookmark", ribbon.tooltip.title, ribbon.tooltip.lines[0] ?? "", ribbon.label)}
                            aria-describedby={tip?.id === id ? tipId : undefined}
                            aria-expanded={ribbon.choices.length > 0 ? open : undefined}
                            aria-haspopup={ribbon.choices.length > 0 ? "dialog" : undefined}
                            aria-controls={open ? menuId : undefined}
                            {...handlers(id, ribbon.tooltip, ribbon.direct, ribbon.choices)}
                          >
                            <span
                              aria-hidden="true"
                              className="relative block h-11 w-3.5"
                              style={{
                                background: "color-mix(in srgb, var(--gold-deep) 72%, var(--ink))",
                                clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)",
                              }}
                            />
                            {ribbon.label ? (
                              <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-[var(--mushaf-paper)] px-1 text-[10px] font-semibold leading-4 text-[var(--mushaf-script)] ring-1 ring-line">
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
            </div>
          </div>
        </div>
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
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink" aria-label="Marks on this edge">
          {edge.legend.map((color) => (
            <li key={color.id} className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-3 w-3 rounded-full ring-1 ring-line" style={{ backgroundColor: color.color }} />
              <span>
                {color.name} {color.count}
              </span>
            </li>
          ))}
          {edge.totals.read > 0 ? <li>Shade · read</li> : null}
          {edge.totals.notes > 0 ? <li>Flag · note</li> : null}
          {edge.totals.bookmarks > 0 ? <li>Ribbon · bookmark</li> : null}
        </ul>
      )}
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

function edgeLeft(position: number) {
  const safe = Math.min(1, Math.max(0, position));
  return `clamp(1.25rem, ${safe * 100}%, calc(100% - 1.25rem))`;
}
