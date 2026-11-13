"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Check, ChevronDown, Plus, RotateCcw, X } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import {
  editionForGroup,
  groupLanguages,
  MAX_TRANSLATIONS,
  readingDefaults,
  readingLayerCount,
  selectedGroups,
  setLanguageEdition,
  toggleLanguage,
  type LanguageGroup,
} from "@/lib/quran/languages";
import type { Preferences, TranslationResource } from "@/lib/quran/types";
import { TafsirChip } from "@/components/reader/tafsir-panel";

const LAST_LAYER_TIP = "At least one language stays on";

export type LanguagePickerPrefs = Pick<
  Preferences,
  "showArabic" | "showTranslation" | "showTransliteration" | "translationIds" | "traditionalPage" | "focusMode"
>;

export function LanguagePicker() {
  const { preferences, updatePreferences, translations, verses } = useMushaf();
  const transliterationAvailable =
    preferences.showTransliteration || verses.some((item) => item.transliteration?.trim());

  return (
    <LanguagePickerView
      preferences={preferences}
      translations={translations}
      transliterationAvailable={transliterationAvailable}
      onChange={updatePreferences}
      tafsir={<TafsirChip />}
    />
  );
}

export function LanguagePickerView({
  preferences,
  translations,
  transliterationAvailable,
  onChange,
  tafsir = null,
}: {
  preferences: LanguagePickerPrefs;
  translations: TranslationResource[];
  transliterationAvailable: boolean;
  onChange: (partial: Partial<Preferences>) => void;
  tafsir?: React.ReactNode;
}) {
  const groups = useMemo(() => groupLanguages(translations), [translations]);
  const selected = useMemo(
    () => (preferences.showTranslation ? selectedGroups(translations, preferences.translationIds) : []),
    [preferences.showTranslation, preferences.translationIds, translations],
  );
  const atCap = preferences.translationIds.length >= MAX_TRANSLATIONS;
  const layers = readingLayerCount(preferences);
  const removable = layers > 1;
  const arabicOnly = layers === 1 && preferences.showArabic;
  const traditionalOn = arabicOnly && (preferences.traditionalPage || preferences.focusMode);
  const [announcement, setAnnouncement] = useState("");

  function toggleGroup(group: LanguageGroup) {
    const on = group.editions.some((item) => preferences.translationIds.includes(item.id));
    if (on && !removable) return;
    if (!on && preferences.translationIds.length >= MAX_TRANSLATIONS) return;
    onChange({ translationIds: toggleLanguage(preferences.translationIds, group) });
    setAnnouncement(`${group.label} ${on ? "removed" : "added"}`);
  }

  function removeArabic() {
    if (!preferences.showArabic || !removable) return;
    onChange({ showArabic: false });
    setAnnouncement("Arabic removed");
  }

  function removeTransliteration() {
    if (!preferences.showTransliteration || !removable) return;
    onChange({ showTransliteration: false });
    setAnnouncement("Transliteration removed");
  }

  const addable = [
    preferences.showArabic
      ? null
      : {
          key: "arabic",
          label: "Arabic",
          onAdd: () => {
            onChange({ showArabic: true });
            setAnnouncement("Arabic added");
          },
        },
    transliterationAvailable && !preferences.showTransliteration
      ? {
          key: "transliteration",
          label: "Transliteration",
          onAdd: () => {
            onChange({ showTransliteration: true });
            setAnnouncement("Transliteration added");
          },
        }
      : null,
  ].filter((item): item is { key: string; label: string; onAdd: () => void } => Boolean(item));

  return (
    <div className="flex max-w-full flex-wrap items-center gap-2" data-tour="languages">
      {preferences.showArabic ? (
        <LayerChrome label="Arabic" locked={!removable} onRemove={removeArabic} />
      ) : null}
      {selected.map((group) => (
        <LanguageChip
          key={group.key}
          group={group}
          ids={preferences.translationIds}
          locked={!removable}
          onRemove={() => toggleGroup(group)}
          onEdition={(id) => onChange({ translationIds: setLanguageEdition(preferences.translationIds, group, id) })}
        />
      ))}
      {preferences.showTransliteration ? (
        <LayerChrome label="Transliteration" locked={!removable} onRemove={removeTransliteration} />
      ) : null}
      {tafsir}
      <AddLanguages
        groups={groups}
        ids={preferences.translationIds}
        atCap={atCap}
        removable={removable}
        addable={addable}
        onToggle={toggleGroup}
      />
      <button
        type="button"
        aria-label="Reset to Arabic and English"
        title="Reset to Arabic and English"
        onClick={() => onChange(readingDefaults())}
        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-gold/40 bg-surface text-gold-deep hover:bg-highlight"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      {arabicOnly ? (
        <Chip
          active={traditionalOn}
          tone="accent"
          onClick={() => onChange({ traditionalPage: !traditionalOn })}
        >
          <BookOpen className="h-4 w-4" />
          Mushaf View
        </Chip>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

function LayerChrome({
  label,
  locked,
  onRemove,
  children,
}: {
  label: string;
  locked: boolean;
  onRemove: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex h-11 max-w-full shrink-0 items-stretch rounded-full bg-gold text-on-gold">
      {children ?? (
        <span className="inline-flex h-11 items-center whitespace-nowrap rounded-l-full px-4 text-sm">{label}</span>
      )}
      <RemoveControl label={label} locked={locked} onRemove={onRemove} />
    </div>
  );
}

function LanguageChip({
  group,
  ids,
  locked,
  onRemove,
  onEdition,
}: {
  group: LanguageGroup;
  ids: number[];
  locked: boolean;
  onRemove: () => void;
  onEdition: (id: number) => void;
}) {
  const edition = editionForGroup(group, ids);
  const many = group.editions.length > 1;

  return (
    <LayerChrome label={group.label} locked={locked} onRemove={onRemove}>
      {many ? (
        <EditionMenu group={group} selectedId={edition.id} onPick={onEdition} editionName={edition.name} />
      ) : (
        <span className="inline-flex h-11 items-center whitespace-nowrap rounded-l-full px-4 text-sm">{group.label}</span>
      )}
    </LayerChrome>
  );
}

function RemoveControl({
  label,
  locked,
  onRemove,
}: {
  label: string;
  locked: boolean;
  onRemove: () => void;
}) {
  const tipId = useId();
  const tip = locked ? LAST_LAYER_TIP : `Remove ${label}`;
  return (
    <button
      type="button"
      aria-label={`Remove ${label}`}
      aria-disabled={locked || undefined}
      aria-describedby={locked ? tipId : undefined}
      title={tip}
      onClick={() => {
        if (locked) return;
        onRemove();
      }}
      className={`group/remove relative inline-flex h-11 w-10 min-h-6 min-w-6 shrink-0 items-center justify-center rounded-r-full border-l border-on-gold/40 ${
        locked ? "cursor-not-allowed" : "cursor-pointer hover:bg-gold-deep"
      }`}
    >
      <X className={`h-4 w-4 ${locked ? "opacity-45" : ""}`} aria-hidden="true" />
      <span
        id={tipId}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-30 w-max max-w-[14rem] -translate-x-1/2 rounded-lg bg-panel px-2.5 py-1.5 text-left text-xs font-medium leading-snug text-panel-ink opacity-0 shadow-[0_8px_24px_rgba(15,23,42,0.28)] transition duration-150 group-hover/remove:opacity-100 group-focus-visible/remove:opacity-100"
      >
        {tip}
      </span>
    </button>
  );
}

function AddLanguages({
  groups,
  ids,
  atCap,
  removable,
  addable,
  onToggle,
}: {
  groups: LanguageGroup[];
  ids: number[];
  atCap: boolean;
  removable: boolean;
  addable: { key: string; label: string; onAdd: () => void }[];
  onToggle: (group: LanguageGroup) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const needle = query.trim().toLowerCase();
  const visibleExtras = addable.filter((item) => item.label.toLowerCase().includes(needle));
  const visible = groups.filter((group) => group.label.toLowerCase().includes(needle));

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
                  Tap a language to add it beside the others. The × on a chip removes it.
                  {atCap ? ` Up to ${MAX_TRANSLATIONS} translations at once.` : ""}
                </p>
              </div>
              <div className="max-h-72 overflow-y-auto p-3">
                <div className="flex flex-wrap gap-2">
                  {visibleExtras.map((item) => (
                    <Chip key={item.key} active={false} onClick={item.onAdd}>
                      {item.label}
                    </Chip>
                  ))}
                  {visible.map((group) => {
                    const on = group.editions.some((item) => ids.includes(item.id));
                    const lastLocked = on && !removable;
                    const blocked = (atCap && !on) || lastLocked;
                    return (
                      <Chip
                        key={group.key}
                        active={on}
                        disabled={blocked}
                        title={lastLocked ? LAST_LAYER_TIP : undefined}
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
  editionName,
}: {
  group: LanguageGroup;
  selectedId: number;
  onPick: (id: number) => void;
  editionName: string;
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
        aria-haspopup="listbox"
        aria-expanded={open}
        title={editionName}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="inline-flex h-11 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-l-full px-4 text-sm hover:bg-gold-deep"
      >
        <span>{group.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
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
  tone = "gold",
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  tone?: "gold" | "accent";
  title?: string;
}) {
  const filled = tone === "accent" ? "bg-chip-alt text-on-chip-alt" : "bg-gold text-on-gold";
  const idle =
    tone === "accent"
      ? "border-2 border-chip-ink bg-chip-alt/20 text-chip-ink"
      : "border border-gold/35 bg-accent-soft/40 text-ink-soft";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm ${
        active ? filled : idle
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
