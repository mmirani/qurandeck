"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus, RotateCcw } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import {
  editionForGroup,
  groupLanguages,
  MAX_TRANSLATIONS,
  readingDefaults,
  selectedGroups,
  setLanguageEdition,
  toggleLanguage,
  type LanguageGroup,
} from "@/lib/quran/languages";
import { TafsirChip } from "@/components/reader/tafsir-panel";

export function LanguagePicker() {
  const { preferences, updatePreferences, translations, verses } = useMushaf();
  const groups = useMemo(() => groupLanguages(translations), [translations]);
  const selected = useMemo(
    () => selectedGroups(translations, preferences.translationIds),
    [preferences.translationIds, translations],
  );
  const hasTranslit = preferences.showTransliteration || verses.some((item) => item.transliteration);
  const atCap = preferences.translationIds.length >= MAX_TRANSLATIONS;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip
        active={preferences.showArabic}
        onClick={() => updatePreferences({ showArabic: !preferences.showArabic })}
      >
        Arabic
      </Chip>
      {selected.map((group) => (
        <LanguageChip
          key={group.key}
          group={group}
          ids={preferences.translationIds}
          onToggle={() => updatePreferences({ translationIds: toggleLanguage(preferences.translationIds, group) })}
          onEdition={(id) => updatePreferences({ translationIds: setLanguageEdition(preferences.translationIds, group, id) })}
        />
      ))}
      {hasTranslit ? (
        <Chip
          active={preferences.showTransliteration}
          onClick={() => updatePreferences({ showTransliteration: !preferences.showTransliteration })}
        >
          Transliteration
        </Chip>
      ) : null}
      <TafsirChip />
      <AddLanguages
        groups={groups}
        ids={preferences.translationIds}
        atCap={atCap}
        onToggle={(group) => updatePreferences({ translationIds: toggleLanguage(preferences.translationIds, group) })}
      />
      <button
        type="button"
        aria-label="Reset to Arabic and English"
        title="Reset to Arabic and English"
        onClick={() => updatePreferences(readingDefaults())}
        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-gold/40 bg-surface text-gold-deep hover:bg-highlight"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
    </div>
  );
}

function LanguageChip({
  group,
  ids,
  onToggle,
  onEdition,
}: {
  group: LanguageGroup;
  ids: number[];
  onToggle: () => void;
  onEdition: (id: number) => void;
}) {
  const edition = editionForGroup(group, ids);
  const many = group.editions.length > 1;

  return (
    <div className="inline-flex h-11 overflow-hidden rounded-full bg-gold text-on-gold">
      <button type="button" onClick={onToggle} className="h-11 cursor-pointer px-4 text-sm">
        {group.label}
      </button>
      {many ? (
        <EditionMenu
          group={group}
          selectedId={edition.id}
          onPick={onEdition}
          label={edition.name}
        />
      ) : null}
    </div>
  );
}

function AddLanguages({
  groups,
  ids,
  atCap,
  onToggle,
}: {
  groups: LanguageGroup[];
  ids: number[];
  atCap: boolean;
  onToggle: (group: LanguageGroup) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const visible = groups.filter((group) => group.label.toLowerCase().includes(query.trim().toLowerCase()));

  useDismiss(open, () => setOpen(false), trigger, panel);
  useAnchor(open, trigger, setBox, 360);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 cursor-pointer items-center gap-1 rounded-full border border-gold/40 bg-surface px-4 text-sm text-ink hover:bg-highlight"
      >
        <Plus className="h-4 w-4 text-gold-deep" />
        Languages
      </button>
      {open && box
        ? createPortal(
            <div
              ref={panel}
              role="dialog"
              aria-label="Choose languages"
              style={{ top: box.top, left: box.left, width: box.width }}
              className="fixed z-[80] max-h-[min(70vh,28rem)] overflow-hidden rounded-2xl border border-gold/35 bg-surface shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
            >
              <div className="border-b border-line/50 p-3">
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find a language"
                  className="h-11 w-full rounded-2xl border border-line bg-canvas px-3 text-sm"
                />
                <p className="mt-2 text-xs text-ink-soft">
                  Tap a language to add it beside the others. {atCap ? `Up to ${MAX_TRANSLATIONS} at once.` : "English stays unless you turn it off."}
                </p>
              </div>
              <div className="max-h-72 overflow-y-auto p-3">
                <div className="flex flex-wrap gap-2">
                  {visible.map((group) => {
                    const on = group.editions.some((item) => ids.includes(item.id));
                    const blocked = atCap && !on;
                    return (
                      <Chip
                        key={group.key}
                        active={on}
                        disabled={blocked}
                        onClick={() => {
                          if (blocked) return;
                          onToggle(group);
                        }}
                      >
                        {group.label}
                        {group.editions.length > 1 ? ` · ${group.editions.length}` : ""}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function EditionMenu({
  group,
  selectedId,
  onPick,
  label,
}: {
  group: LanguageGroup;
  selectedId: number;
  onPick: (id: number) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), trigger, panel);
  useAnchor(open, trigger, setBox, 280);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={`Choose ${group.label} translation`}
        aria-expanded={open}
        title={label}
        onClick={(event) => {
          event.stopPropagation();
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
              role="listbox"
              aria-label={`${group.label} translations`}
              style={{ top: box.top, left: box.left, width: box.width }}
              className="fixed z-[90] max-h-72 overflow-y-auto rounded-2xl border border-gold/35 bg-surface p-1 shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
            >
              {group.editions.map((item) => {
                const on = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => {
                      onPick(item.id);
                      setOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-start gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                      on ? "bg-highlight text-gold-deep" : "hover:bg-highlight/70"
                    }`}
                  >
                    {on ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <span className="mt-0.5 h-4 w-4 shrink-0" />}
                    <span>
                      <span className="block font-medium">{item.name}</span>
                      {item.authorName ? <span className="block text-xs text-ink-soft">{item.authorName}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function Chip({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-11 cursor-pointer rounded-full px-4 text-sm ${
        active
          ? "bg-gold text-on-gold"
          : "border border-gold/35 bg-accent-soft/40 text-ink-soft"
      } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
    >
      {children}
    </button>
  );
}

function useDismiss(
  open: boolean,
  onClose: () => void,
  trigger: React.RefObject<HTMLElement | null>,
  panel: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (trigger.current?.contains(target) || panel.current?.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, open, panel, trigger]);
}

function useAnchor(
  open: boolean,
  trigger: React.RefObject<HTMLElement | null>,
  setBox: (box: { top: number; left: number; width: number } | null) => void,
  width: number,
) {
  useLayoutEffect(() => {
    if (!open || !trigger.current) {
      setBox(null);
      return;
    }
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const size = Math.min(width, window.innerWidth - 16);
      let left = rect.left;
      if (left + size > window.innerWidth - 8) left = window.innerWidth - size - 8;
      if (left < 8) left = 8;
      const below = rect.bottom + 8;
      const top = below + 320 > window.innerHeight ? Math.max(8, rect.top - 328) : below;
      setBox({ top, left, width: size });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, setBox, trigger, width]);
}
