"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { currentDeviceBucket, isSettingValue, type ClientUsageEvent } from "@/lib/usage-catalog";
import { postUsage } from "@/lib/usage-client";
import { loadPreferences } from "@/lib/storage";

const SESSION_DAY_KEY = "al-mushaf-session-day";

export function UsageSession() {
  const { status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;

    const record = () => {
      if (cancelled || document.visibilityState === "hidden") return;
      let day = "";
      try {
        day = new Date().toISOString().slice(0, 10);
        if (localStorage.getItem(SESSION_DAY_KEY) === day) return;
      } catch {
        return;
      }

      const events: ClientUsageEvent[] = [{ name: "session_open", device: currentDeviceBucket() }];
      try {
        const theme = `theme:${loadPreferences().theme}`;
        if (isSettingValue(theme)) events.push({ name: "setting", setting: theme });
      } catch {
        // The open still counts without a theme.
      }

      void postUsage(events).then((ok) => {
        if (cancelled || !ok) return;
        try {
          localStorage.setItem(SESSION_DAY_KEY, day);
        } catch {
          // The server still dedupes this UTC day.
        }
      });
    };

    record();
    document.addEventListener("visibilitychange", record);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", record);
    };
  }, [status]);

  return null;
}
