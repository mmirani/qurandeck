"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMushaf } from "@/components/providers/mushaf-provider";

export function AuthFromQuery() {
  const searchParams = useSearchParams();
  const { openModal } = useMushaf();
  const auth = searchParams.get("auth");

  useEffect(() => {
    if (auth !== "1") return;
    openModal("auth");
    const url = new URL(window.location.href);
    url.searchParams.delete("auth");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [auth, openModal]);

  return null;
}
