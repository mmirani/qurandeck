"use client";

import { useEffect } from "react";
import { coarseAuthReason } from "@/lib/usage-catalog";
import { takeAuthMethod, trackUsage } from "@/lib/usage-client";

let reportedError: string | null = null;

export function AuthFailureBeacon({ error }: { error?: string }) {
  useEffect(() => {
    if (!error || reportedError === error) return;
    const reason = coarseAuthReason(error);
    if (!reason) return;
    reportedError = error;
    const method = takeAuthMethod();
    trackUsage(method ? { name: "auth_failed", method, reason } : { name: "auth_failed", method: null, reason });
  }, [error]);

  return null;
}
