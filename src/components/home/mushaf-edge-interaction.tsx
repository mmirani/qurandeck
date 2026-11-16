"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { dialogFocusables, initialDialogIndex, trapTabIndex } from "@/lib/dialog-focus";
import { EDGE_HOVER_DELAY_MS, EDGE_HOVER_GRACE_MS, placeFloating, type EdgeChoice, type FloatingBox, type TooltipCopy } from "@/lib/mushaf-edge";
import type { SearchHit } from "@/lib/quran/types";
import type { MarkHandlers } from "@/components/home/mushaf-book";

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

export function useMushafEdgeInteraction(jumpToHit: (hit: SearchHit) => void, layoutKey = "", portalRoot?: RefObject<HTMLElement | null>) {
  const tipId = useId();
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuState = useRef<MenuState | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const showTimer = useRef(0);
  const hideTimer = useRef(0);
  const [tip, setTip] = useState<TipState | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [tipBox, setTipBox] = useState<FloatingBox | null>(null);
  const [menuBox, setMenuBox] = useState<FloatingBox | null>(null);
  const tipNode = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      window.clearTimeout(showTimer.current);
      window.clearTimeout(hideTimer.current);
    },
    [],
  );

  const dismiss = useCallback(() => {
    window.clearTimeout(showTimer.current);
    window.clearTimeout(hideTimer.current);
    menuState.current = null;
    setTip(null);
    setMenu(null);
    returnFocus.current = null;
  }, []);

  const showTip = useCallback((next: TipState, immediate: boolean) => {
    if (menuState.current) return;
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(showTimer.current);
    if (immediate) {
      setTip(next);
      return;
    }
    showTimer.current = window.setTimeout(() => {
      if (menuState.current) return;
      setTip(next);
    }, EDGE_HOVER_DELAY_MS);
  }, []);

  const hideTip = useCallback((id: string) => {
    window.clearTimeout(showTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setTip((current) => (current?.id === id ? null : current));
    }, EDGE_HOVER_GRACE_MS);
  }, []);

  const closeMenu = useCallback(() => {
    menuState.current = null;
    setMenu(null);
    const opener = returnFocus.current;
    returnFocus.current = null;
    opener?.focus();
  }, []);

  const openPlace = useCallback(
    (choice: EdgeChoice) => {
      menuState.current = null;
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
      if (menuState.current?.id === id) {
        closeMenu();
        return;
      }
      returnFocus.current = element;
      const next = { id, title, choices, element };
      menuState.current = next;
      setMenu(next);
    },
    [closeMenu, openPlace],
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
      setTipBox(
        placeFloating(element.getBoundingClientRect(), node.getBoundingClientRect(), {
          width: window.innerWidth,
          height: window.innerHeight,
        }),
      );
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const observer = new ResizeObserver(place);
    observer.observe(element);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [layoutKey, tip]);

  useLayoutEffect(() => {
    const element = menu?.element;
    const node = menuRef.current;
    if (!menu || !element || !node) return;
    const place = () => {
      if (!element.isConnected) {
        menuState.current = null;
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

  const handlers = useCallback(
    (id: string, copy: TooltipCopy, direct: EdgeChoice | null, choices: EdgeChoice[]): MarkHandlers => ({
      onPointerEnter: (event) => showTip({ id, copy, element: event.currentTarget }, false),
      onPointerLeave: () => hideTip(id),
      onFocus: (event) => showTip({ id, copy, element: event.currentTarget }, true),
      onBlur: () => hideTip(id),
      onClick: (event) => activate(id, copy.title, direct, choices, event.currentTarget),
    }),
    [activate, hideTip, showTip],
  );

  const popovers: ReactNode = (
    <>
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
            portalRoot?.current ?? document.body,
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
            portalRoot?.current ?? document.body,
          )
        : null}
    </>
  );

  return {
    tipId,
    menuId,
    activeTipId: tip?.id ?? null,
    activeMenuId: menu?.id ?? null,
    menuOpen: Boolean(menu),
    handlers,
    dismiss,
    popovers,
  };
}
