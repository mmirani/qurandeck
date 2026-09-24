"use client";

import { ProfileAvatar } from "@/components/account/profile-avatar";
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
      <ProfileAvatar
        name={user?.displayName}
        avatar={user?.avatar}
        className={fill ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs"}
      />
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-medium text-ink ${fill ? "text-lg" : "text-sm"}`}>
          {user?.displayName ?? "Sign in"}
        </span>
        <span className={`block truncate text-ink-soft ${fill ? "text-sm" : "text-xs"}`}>{PROMISE_LINE}</span>
      </span>
    </button>
  );
}
