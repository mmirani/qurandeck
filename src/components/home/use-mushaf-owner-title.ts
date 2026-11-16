"use client";

import { useSession } from "next-auth/react";
import { mushafOwnerTitle } from "@/lib/mushaf-title";

/** First-name possessive title from the Auth.js session, or "Your Mushaf". */
export function useMushafOwnerTitle() {
  const name = useSession().data?.user?.name;
  return mushafOwnerTitle(name);
}
