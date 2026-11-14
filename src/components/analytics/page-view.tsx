"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { postUsage } from "@/lib/usage-client";

const seenPaths = new Set<string>();

/** Counts that a page opened. The path is not sent, and a hidden tab does not count. */
export function PageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const send = () => {
      if (document.visibilityState === "hidden" || seenPaths.has(pathname)) return;
      seenPaths.add(pathname);
      void postUsage([{ name: "page_view" }]);
    };
    send();
    document.addEventListener("visibilitychange", send);
    return () => document.removeEventListener("visibilitychange", send);
  }, [pathname]);

  return null;
}
