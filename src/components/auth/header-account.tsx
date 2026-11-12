"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { UserMenu } from "@/components/user/user-menu";
import { authEntryHref, type AuthEntryMode } from "@/lib/auth-entry";

export function AccountEntryLink({
  mode,
  className,
  children,
}: {
  mode: AuthEntryMode;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { openAuth } = useMushaf();

  return (
    <Link
      href={authEntryHref(mode)}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        if (pathname !== "/") return;
        event.preventDefault();
        openAuth(mode);
      }}
    >
      {children}
    </Link>
  );
}

/** Persistent account control. Guests get a 44px Sign in target; a signed-in person keeps the avatar chip. */
export function HeaderAccount() {
  const { user, hydrated } = useMushaf();

  if (!hydrated) {
    return <span className="inline-flex h-11 w-11 shrink-0" aria-hidden="true" />;
  }

  if (user) return <UserMenu compact />;

  return (
    <AccountEntryLink
      mode="signin"
      className="inline-flex h-11 min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-highlight"
    >
      Sign in
    </AccountEntryLink>
  );
}
