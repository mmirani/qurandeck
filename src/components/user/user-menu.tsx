"use client";

import { useMushaf } from "@/components/providers/mushaf-provider";
import { PROMISE_LINE } from "@/lib/brand";

export function UserMenu({ fill = false }: { fill?: boolean }) {
  const { user, openModal } = useMushaf();

  return (
    <button
      type="button"
      data-tour="account"
      onClick={() => openModal(user ? "account" : "auth")}
      className={`flex cursor-pointer items-center gap-3 rounded-full border border-gold/40 bg-surface text-left hover:bg-highlight ${
        fill ? "h-14 w-full px-4" : "h-12 max-w-[13rem] shrink-0 px-3"
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
        <span className={`block truncate text-ink-soft ${fill ? "text-sm" : "text-xs"}`}>{PROMISE_LINE}</span>
      </span>
    </button>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
