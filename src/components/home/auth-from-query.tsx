"use client";

import { useEffect } from "react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { authEntryMode } from "@/lib/auth-entry";

/** Opens the account sheet when a link lands on /?auth=1&mode=signup|signin. */
export function AuthFromQuery() {
  const { openAuth } = useMushaf();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") !== "1") return;
    openAuth(authEntryMode(params.get("mode")));
    params.delete("auth");
    params.delete("mode");
    const search = params.toString();
    const next = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", next);
  }, [openAuth]);

  return null;
}
