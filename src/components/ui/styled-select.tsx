"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
  group?: string;
};

type MenuBox = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
};

export function StyledSelect({
  value,
  onChange,
  options,
  tone = "surface",
  placeholder = "Select",
  className = "",
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  tone?: "surface" | "panel";
  placeholder?: string;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<MenuBox | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);
  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, SelectOption[]>();
    for (const option of options) {
      const key = option.group ?? "";
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)?.push(option);
    }
    return order.map((key) => ({ name: key, items: map.get(key) ?? [] }));
  }, [options]);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (root.current?.contains(target) || listRef.current?.contains(target)) return;
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
  }, []);

  useLayoutEffect(() => {
    if (!open || !root.current) {
      setMenu(null);
      return;
    }

    const place = () => {
      const trigger = root.current?.getBoundingClientRect();
      if (!trigger) return;
      const gap = 8;
      const pad = 8;
      const desired = 256;
      const minWidth = compact ? trigger.width : Math.max(trigger.width, 192);
      const width = Math.min(Math.max(minWidth, trigger.width), window.innerWidth - pad * 2);
      const spaceBelow = window.innerHeight - trigger.bottom - gap - pad;
      const spaceAbove = trigger.top - gap - pad;
      const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(desired, openUp ? spaceAbove : spaceBelow));
      let left = trigger.left;
      if (left + width > window.innerWidth - pad) left = window.innerWidth - pad - width;
      if (left < pad) left = pad;
      const top = openUp ? trigger.top - gap - maxHeight : trigger.bottom + gap;
      setMenu({ top, left, width, maxHeight, openUp });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [compact, open]);

  const panel =
    tone === "panel"
      ? "border-gold/35 bg-panel-2 text-panel-ink"
      : "border-line bg-surface text-ink";
  const trigger =
    tone === "panel"
      ? "border-gold/30 bg-black/20 text-panel-ink hover:border-gold/60"
      : "border-line bg-canvas/70 text-ink hover:border-gold";

  const list = open && menu && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          style={{
            top: menu.top,
            left: menu.left,
            width: menu.width,
            maxHeight: menu.maxHeight,
          }}
          className={`fixed z-[80] overflow-hidden rounded-2xl border shadow-[0_18px_40px_rgba(0,0,0,0.28)] ${panel}`}
        >
          <div className="h-full overflow-y-auto overscroll-contain p-1.5" style={{ maxHeight: menu.maxHeight }}>
            {groups.map((group) => (
              <div key={group.name || "default"}>
                {group.name ? (
                  <p className="kufic-label px-3 pb-1 pt-2 text-gold">{group.name}</p>
                ) : null}
                {group.items.map((option) => {
                  const active = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                        active ? "bg-gold/15 text-gold" : "hover:bg-gold/10"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{option.label}</span>
                        {option.hint ? (
                          <span className="block truncate text-xs opacity-60">{option.hint}</span>
                        ) : null}
                      </span>
                      {active ? <Check className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" /> : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-full border px-3 transition ${
          compact ? "h-10 text-xs" : "h-11 text-sm"
        } ${trigger} ${open ? "ring-1 ring-gold/50" : ""}`}
      >
        <span className="min-w-0 truncate text-left">
          {selected ? (
            <>
              {selected.label}
              {selected.hint ? <span className="opacity-60"> · {selected.hint}</span> : null}
            </>
          ) : (
            <span className="opacity-60">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gold transition ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {list}
    </div>
  );
}
