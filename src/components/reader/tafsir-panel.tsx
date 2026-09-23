"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";
import { getTafsir, getTafsirs } from "@/lib/quran/client";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { DEFAULT_TAFSIR_ID } from "@/lib/quran/sources";
import type { TafsirPassage, TafsirResource } from "@/lib/quran/types";

const catalogWait: { current: Promise<TafsirResource[]> | null } = { current: null };
const passageWait = new Map<string, Promise<TafsirPassage>>();

function loadCatalog() {
  catalogWait.current ??= getTafsirs();
  return catalogWait.current;
}

function loadPassage(verseKey: string, tafsirId: number) {
  const key = `${tafsirId}:${verseKey}`;
  const existing = passageWait.get(key);
  if (existing) return existing;
  const next = getTafsir(verseKey, tafsirId).catch((error) => {
    passageWait.delete(key);
    throw error;
  });
  passageWait.set(key, next);
  return next;
}

export function TafsirChip() {
  const { preferences, updatePreferences } = useMushaf();
  const [catalog, setCatalog] = useState<TafsirResource[]>([]);
  const on = preferences.showTafsir;
  const selected = catalog.find((item) => item.id === preferences.tafsirId) ?? catalog[0];

  useEffect(() => {
    let cancelled = false;
    loadCatalog()
      .then((items) => {
        if (!cancelled) setCatalog(items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!on) {
    return (
      <button
        type="button"
        onClick={() => updatePreferences({ showTafsir: true })}
        className="h-11 cursor-pointer rounded-full border border-gold/35 bg-accent-soft/40 px-4 text-sm text-ink-soft"
      >
        Tafsir / Explanation
      </button>
    );
  }

  return (
    <div className="inline-flex h-11 overflow-hidden rounded-full bg-gold text-on-gold">
      <button
        type="button"
        onClick={() => updatePreferences({ showTafsir: false })}
        className="h-11 cursor-pointer px-4 text-sm"
      >
        Tafsir / Explanation
      </button>
      {catalog.length > 0 ? (
        <TafsirMenu
          catalog={catalog}
          selectedId={selected?.id ?? preferences.tafsirId}
          onPick={(id) => updatePreferences({ tafsirId: id, showTafsir: true })}
          label={selected?.name ?? "Choose tafsir"}
        />
      ) : null}
    </div>
  );
}

export function VerseTafsir({ verseKey }: { verseKey: string }) {
  const { preferences, updatePreferences } = useMushaf();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [catalog, setCatalog] = useState<TafsirResource[]>([]);
  const [passage, setPassage] = useState<TafsirPassage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const work = catalog.find((item) => item.id === preferences.tafsirId);

  useEffect(() => {
    if (!host) return;
    const root = host.closest("#main-reader");
    const mark = (entry?: IntersectionObserverEntry) => {
      if (entry ? entry.isIntersecting : nearScroller(host, root)) setReady(true);
    };
    const observer = new IntersectionObserver(([entry]) => mark(entry), {
      root: root instanceof Element ? root : null,
      rootMargin: "320px 0px",
      threshold: 0,
    });
    observer.observe(host);
    mark();
    return () => observer.disconnect();
  }, [host]);

  useEffect(() => {
    let cancelled = false;
    loadCatalog()
      .then((items) => {
        if (!cancelled) setCatalog(items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setExpanded(false);
    loadPassage(verseKey, preferences.tafsirId)
      .then((next) => {
        if (!cancelled) setPassage(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPassage(null);
          setError(err instanceof Error ? err.message : "Could not load tafsir");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [preferences.tafsirId, ready, verseKey]);

  const body = passage?.text.trim() ?? "";
  const preview = body.slice(0, 420);
  const truncated = body.length > 420;

  return (
    <aside
      ref={setHost}
      className="verse-tafsir mt-5"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="kufic-label min-w-0 text-gold-deep">
          Tafsir
          {work ? ` · ${titleLang(work.languageName)} · ${work.name}` : ""}
        </p>
        <button
          type="button"
          onClick={() => updatePreferences({ showTafsir: false })}
          className="inline-flex h-11 min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-line px-3 text-xs font-medium text-ink-soft hover:bg-highlight"
          aria-label="Hide tafsir for all ayahs"
        >
          <X className="h-3.5 w-3.5" />
          <span className="md:hidden">Hide</span>
        </button>
      </div>
      {!ready || loading ? (
        <p className="mt-2 text-sm text-ink-soft/70">Loading commentary…</p>
      ) : error ? (
        <p className="mt-2 text-sm text-danger">{error}</p>
      ) : body ? (
        <>
          {passage && passage.verseKeys.length > 1 ? (
            <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-gold">
              Covers {passage.verseKeys[0]} – {passage.verseKeys[passage.verseKeys.length - 1]}
            </p>
          ) : null}
          <p dir="auto" className="verse-tafsir-body mt-2 whitespace-pre-wrap">
            {expanded || !truncated ? body : `${preview.trim()}…`}
          </p>
          {truncated ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-2 cursor-pointer text-sm text-gold-deep underline-offset-2 hover:underline"
            >
              {expanded ? "Show less" : "Read full tafsir"}
            </button>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-soft/70">No commentary for this ayah in the selected tafsir.</p>
      )}
    </aside>
  );
}

function TafsirMenu({
  catalog,
  selectedId,
  onPick,
  label,
}: {
  catalog: TafsirResource[];
  selectedId: number;
  onPick: (id: number) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const [lang, setLang] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (trigger.current?.contains(target) || panel.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !trigger.current) {
      setBox(null);
      return;
    }
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(360, window.innerWidth - 16);
      let left = rect.left;
      if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
      if (left < 8) left = 8;
      setBox({ top: rect.bottom + 8, left, width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const groups = groupTafsirs(catalog);
  const current = catalog.find((item) => item.id === selectedId);
  const activeName = titleLang(current?.languageName ?? groups[0]?.name ?? "English");
  const language =
    groups.find((group) => group.name === (lang ?? activeName)) ??
    groups.find((group) => group.name === activeName) ??
    groups[0];

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label="Choose tafsir language and edition"
        aria-expanded={open}
        title={label}
        onClick={(event) => {
          event.stopPropagation();
          setLang(activeName);
          setOpen((value) => !value);
        }}
        className="inline-flex h-11 w-10 cursor-pointer items-center justify-center border-l border-gold/30 hover:bg-gold/15"
      >
        <ChevronDown className={`h-3.5 w-3.5 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && box
        ? createPortal(
            <div
              ref={panel}
              role="dialog"
              aria-label="Tafsir language and edition"
              style={{ top: box.top, left: box.left, width: box.width }}
              className="fixed z-[90] max-h-[min(70vh,28rem)] overflow-hidden rounded-2xl border border-gold/35 bg-surface shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
            >
              <div className="border-b border-line/50 p-3">
                <p className="kufic-label text-gold-deep">Language</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {groups.map((group) => {
                    const on = group.name === language?.name;
                    return (
                      <button
                        key={group.name}
                        type="button"
                        onClick={() => {
                          setLang(group.name);
                          const next = preferredTafsir(group.items, selectedId);
                          if (next && next.id !== selectedId) onPick(next.id);
                        }}
                        className={`h-11 cursor-pointer rounded-full px-4 text-sm ${
                          on
                            ? "bg-gold text-on-gold"
                            : "border border-gold/35 bg-accent-soft/40 text-ink-soft"
                        }`}
                      >
                        {group.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto p-1" role="listbox" aria-label={`${language?.name ?? "Tafsir"} editions`}>
                {(language?.items ?? []).map((item) => {
                  const selected = item.id === selectedId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onPick(item.id);
                        setOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-start gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                        selected ? "bg-highlight text-gold-deep" : "text-ink hover:bg-highlight/70"
                      }`}
                    >
                      {selected ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <span className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      <span>
                        <span className="block font-medium">{item.name}</span>
                        {item.authorName ? (
                          <span className="block text-xs text-ink-soft">{item.authorName}</span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function nearScroller(node: HTMLElement, root: Element | null) {
  const box = node.getBoundingClientRect();
  const view = root?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight };
  return box.bottom >= view.top - 320 && box.top <= view.bottom + 320;
}

function titleLang(name: string) {
  const trimmed = name.trim() || "Other";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function preferredTafsir(items: TafsirResource[], currentId: number) {
  return (
    items.find((item) => item.id === currentId) ??
    items.find((item) => item.id === DEFAULT_TAFSIR_ID) ??
    items[0]
  );
}

function groupTafsirs(catalog: TafsirResource[]) {
  const groups: { name: string; items: TafsirResource[] }[] = [];
  for (const item of catalog) {
    const name = titleLang(item.languageName);
    const found = groups.find((group) => group.name === name);
    if (found) found.items.push(item);
    else groups.push({ name, items: [item] });
  }
  const rank = (name: string) =>
    name === "English" ? 0 : name === "Arabic" ? 1 : name.charCodeAt(0);
  return groups.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
}
