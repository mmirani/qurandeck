"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { ANON_STORAGE_KEY, canonicalAnonId, GUEST_RECORDED_KEY } from "@/lib/anon-id";

export function GuestSession() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "unauthenticated") return;
    if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") return;

    let anonId: string;
    try {
      const existing = localStorage.getItem(ANON_STORAGE_KEY);
      const canonical = existing ? canonicalAnonId(existing) : null;
      if (canonical) {
        anonId = canonical;
      } else {
        anonId = crypto.randomUUID();
        localStorage.setItem(ANON_STORAGE_KEY, anonId);
      }
      if (localStorage.getItem(GUEST_RECORDED_KEY) === "1") return;
    } catch {
      return;
    }

    let cancelled = false;
    void fetch("/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "guest_started", anonId }),
      keepalive: true,
    })
      .then((response) => {
        if (cancelled || !response.ok) return;
        localStorage.setItem(GUEST_RECORDED_KEY, "1");
      })
      .catch(() => {
        // The next visit can retry. The id stays on this browser.
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  return null;
}
