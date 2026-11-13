"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { postUsage } from "@/lib/usage-client";

/** Counts that a page opened. The path is not sent. */
export function PageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    void postUsage([{ name: "page_view" }]);
  }, [pathname]);

  return null;
}
