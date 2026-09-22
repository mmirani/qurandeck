"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, LayoutDashboard, LogIn, LogOut, NotebookPen, Settings, Star } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { PROMISE_LINE, PROMISE_STORY } from "@/lib/brand";

type MenuBox = { top: number; left: number; width: number };

export function UserMenu({ fill = false }: { fill?: boolean }) {
  const { user, openModal, signOut } = useMushaf();
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<MenuBox | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
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
    if (!open || !triggerRef.current) {
      setBox(null);
      return;
    }
    const place = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const width = fill
        ? Math.min(trigger.width, window.innerWidth - 16)
        : Math.min(288, window.innerWidth - 16);
      let left = trigger.right - width;
      if (left < 8) left = 8;
      setBox({ top: trigger.bottom + 8, left, width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [fill, open]);

  return (
    <div className={fill ? "relative w-full" : "relative shrink-0"}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        data-tour="account"
        onClick={() => setOpen((value) => !value)}
        className={`flex cursor-pointer items-center gap-3 rounded-full border text-left ${
          fill ? "h-14 w-full px-4" : "h-12 max-w-[13rem] px-3"
        } ${
          open
            ? "border-gold/55 bg-highlight ring-1 ring-gold/35"
            : "border-gold/40 bg-surface hover:bg-highlight"
        }`}
      >
        <span
          aria-hidden="true"
          className={`flex shrink-0 items-center justify-center rounded-full bg-gold font-semibold text-on-gold ${
            fill ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs"
          }`}
        >
          {user ? initials(user.displayName) : "?"}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium text-ink ${fill ? "text-lg" : "text-sm"}`}>
            {user?.displayName ?? "Sign in"}
          </span>
          <span className={`block truncate text-ink-soft ${fill ? "text-sm" : "text-xs"}`}>
            {PROMISE_LINE}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gold-deep transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && box && mounted
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: box.top, left: box.left, width: box.width }}
              className="fixed z-[80] overflow-hidden rounded-2xl border border-gold/35 bg-surface shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
            >
              {user ? (
                <>
                  <p className="px-4 pb-1 pt-3 text-sm text-ink-soft">
                    {user.email ?? user.username} · {PROMISE_LINE}
                  </p>
                  <MenuItem
                    icon={LayoutDashboard}
                    label="Account"
                    onClick={() => {
                      setOpen(false);
                      openModal("account");
                    }}
                  />
                  <MenuItem
                    icon={Settings}
                    label="Settings"
                    onClick={() => {
                      setOpen(false);
                      openModal("settings");
                    }}
                  />
                  <MenuItem
                    icon={Star}
                    label="Favorites"
                    onClick={() => {
                      setOpen(false);
                      openModal("bookmarks");
                    }}
                  />
                  <MenuItem
                    icon={NotebookPen}
                    label="Notes"
                    onClick={() => {
                      setOpen(false);
                      openModal("notes");
                    }}
                  />
                  <div className="mx-3 my-1 h-px bg-line" />
                  <MenuItem
                    icon={LogOut}
                    label="Sign out"
                    onClick={() => {
                      setOpen(false);
                      signOut();
                    }}
                  />
                </>
              ) : (
                <>
                  <p className="px-4 pb-2 pt-3 text-sm leading-relaxed text-ink">{PROMISE_STORY}</p>
                  <MenuItem
                    icon={LayoutDashboard}
                    label="Account"
                    onClick={() => {
                      setOpen(false);
                      openModal("account");
                    }}
                  />
                  <MenuItem
                    icon={Settings}
                    label="Settings"
                    onClick={() => {
                      setOpen(false);
                      openModal("settings");
                    }}
                  />
                  <MenuItem
                    icon={LogIn}
                    label="Continue with Google"
                    onClick={() => {
                      setOpen(false);
                      openModal("auth");
                    }}
                  />
                  <MenuItem
                    icon={LogIn}
                    label="Sign in / Sign up"
                    onClick={() => {
                      setOpen(false);
                      openModal("auth");
                    }}
                  />
                </>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Settings;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex h-12 w-full cursor-pointer items-center gap-2 px-4 text-left text-sm text-ink transition hover:bg-highlight hover:text-gold-deep"
    >
      <Icon className="h-4 w-4 text-gold-deep" />
      {label}
    </button>
  );
}
