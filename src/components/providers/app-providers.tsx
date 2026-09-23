"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { MushafProvider } from "@/components/providers/mushaf-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus>
      <MushafProvider>{children}</MushafProvider>
    </SessionProvider>
  );
}
