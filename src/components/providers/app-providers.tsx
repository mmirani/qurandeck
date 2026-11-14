"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { GuestSession } from "@/components/analytics/guest-session";
import { PageView } from "@/components/analytics/page-view";
import { UsageSession } from "@/components/analytics/usage-session";
import { RememberFirstSeen } from "@/components/account/reading-since";
import { MushafProvider } from "@/components/providers/mushaf-provider";
import { ToastHost } from "@/components/ui/toast-host";

const SESSION_FOCUS_MS = 60_000;

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false} refetchWhenOffline={false}>
      <SessionFocus />
      <MushafProvider>
        {children}
        <ToastHost />
        <RememberFirstSeen />
        <GuestSession />
        <UsageSession />
        <PageView />
      </MushafProvider>
    </SessionProvider>
  );
}

/** Refetch the session when the tab is shown again, and not on a timer while it is hidden. */
function SessionFocus() {
  const { update } = useSession();
  const last = useRef(0);
  const updateRef = useRef(update);

  useEffect(() => {
    updateRef.current = update;
  }, [update]);

  useEffect(() => {
    last.current = Date.now();
    const onVisible = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - last.current < SESSION_FOCUS_MS) return;
      last.current = now;
      void updateRef.current();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  return null;
}
