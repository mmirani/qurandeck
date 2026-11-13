"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { GuestSession } from "@/components/analytics/guest-session";
import { PageView } from "@/components/analytics/page-view";
import { UsageSession } from "@/components/analytics/usage-session";
import { MushafProvider } from "@/components/providers/mushaf-provider";
import { ToastHost } from "@/components/ui/toast-host";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus>
      <MushafProvider>
        {children}
        <ToastHost />
        <GuestSession />
        <UsageSession />
        <PageView />
      </MushafProvider>
    </SessionProvider>
  );
}
