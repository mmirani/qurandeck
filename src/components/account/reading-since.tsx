"use client";

import { useEffect, useState } from "react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { earliestLibraryIso, readingSinceSource, resolveFirstSeen } from "@/lib/reading-since";
import { formatReadingSince } from "@/lib/stats-range";
import { loadFirstSeen, saveFirstSeen } from "@/lib/storage";

export function RememberFirstSeen() {
  const { hydrated, notes, bookmarks, highlights } = useMushaf();
  const artifact = earliestLibraryIso(notes, bookmarks, highlights);

  useEffect(() => {
    if (!hydrated) return;
    const next = resolveFirstSeen(loadFirstSeen(), artifact);
    if (next.changed) saveFirstSeen(next.iso);
  }, [artifact, hydrated]);

  return null;
}

export function ReadingSince() {
  const { user, hydrated, notes, bookmarks, highlights } = useMushaf();
  const artifact = earliestLibraryIso(notes, bookmarks, highlights);
  const firstSeen = hydrated ? resolveFirstSeen(loadFirstSeen(), artifact).iso : null;
  const email = user?.email && user.provider !== "local" ? user.email : null;
  const [accountCreatedAt, setAccountCreatedAt] = useState<string | null>(null);
  const [fetchedFor, setFetchedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    const next = resolveFirstSeen(loadFirstSeen(), artifact);
    if (next.changed) saveFirstSeen(next.iso);
  }, [artifact, hydrated]);

  useEffect(() => {
    if (!email) return;
    let cancel = false;
    void fetch("/api/account", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = (await response.json()) as { createdAt?: unknown };
        return typeof body.createdAt === "string" ? body.createdAt : null;
      })
      .then((value) => {
        if (cancel) return;
        setAccountCreatedAt(value);
        setFetchedFor(email);
      })
      .catch(() => {
        if (cancel) return;
        setAccountCreatedAt(null);
        setFetchedFor(email);
      });
    return () => {
      cancel = true;
    };
  }, [email]);

  const accountDate = email && fetchedFor === email ? accountCreatedAt : null;
  const source = readingSinceSource(accountDate, firstSeen);
  if (!hydrated || !source) return null;
  const label = formatReadingSince(source);
  if (!label) return null;

  return (
    <p className="text-sm text-muted" data-reading-since={source}>
      {label}
    </p>
  );
}
