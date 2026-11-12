"use client";

import { ProfileAvatar } from "@/components/account/profile-avatar";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { PROMISE_LINE } from "@/lib/brand";

export function UserMenu({ fill = false, compact = false }: { fill?: boolean; compact?: boolean }) {
  const { user, openModal } = useMushaf();
  const label = user?.displayName ?? "Sign in";

  return (
    <button
      type="button"
      data-tour="account"
      onClick={() => openModal(user ? "account" : "auth")}
      className={`flex cursor-pointer items-center rounded-full border border-gold/40 bg-surface text-left hover:bg-highlight ${
        fill
          ? "h-14 w-full gap-3 px-4"
          : compact
            ? "h-11 w-11 shrink-0 justify-center px-0 sm:h-12 sm:w-auto sm:max-w-[16rem] sm:justify-start sm:gap-2 sm:px-3"
            : "h-12 max-w-[13rem] shrink-0 gap-3 px-3"
      }`}
    >
      <ProfileAvatar
        name={user?.displayName}
        avatar={user?.avatar}
        className={fill ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs"}
      />
      <span className={`min-w-0 flex-1 ${compact ? "qd-nav-account-copy" : ""}`}>
        <span className={`block truncate font-medium text-ink ${fill ? "text-lg" : "text-sm"}`}>
          {label}
        </span>
        <span className={`block truncate text-ink-soft ${fill ? "text-sm" : "text-xs"}`}>{PROMISE_LINE}</span>
      </span>
    </button>
  );
}
