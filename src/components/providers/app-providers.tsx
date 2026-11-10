"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { MushafProvider } from "@/components/providers/mushaf-provider";
import { ToastHost } from "@/components/ui/toast-host";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus>
      <MushafProvider>
        {children}
        <ToastHost />
      </MushafProvider>
    </SessionProvider>
  );
}
