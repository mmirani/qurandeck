"use client";

import { useEffect, useRef } from "react";
import { mergeLibraries, normalizeLibrary, type LibrarySnapshot } from "@/lib/library";
import {
  loadBookmarks,
  loadHighlights,
  loadNotes,
  loadPreferences,
  loadDisplayProfile,
  loadProgress,
  loadSwatches,
} from "@/lib/storage";

function localLibrary(email?: string): LibrarySnapshot {
  const profile = email ? loadDisplayProfile(email) : null;
  return {
    preferences: loadPreferences(),
    bookmarks: loadBookmarks(),
    notes: loadNotes(),
    highlights: loadHighlights(),
    swatches: loadSwatches(),
    progress: loadProgress(),
    displayName: profile?.name,
    displayNameUpdatedAt: profile?.name ? profile.updatedAt : undefined,
    avatar: profile?.avatar,
    avatarUpdatedAt: profile?.avatarUpdatedAt,
  };
}

async function pullLibrary() {
  const response = await fetch("/api/library", { cache: "no-store" });
  if (!response.ok) return undefined;
  const body = (await response.json()) as { library?: unknown };
  if (!body.library) return null;
  return normalizeLibrary(body.library);
}

async function pushLibrary(library: LibrarySnapshot) {
  await fetch("/api/library", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ library }),
  });
}

export function LibrarySync({
  email,
  hydrated,
  snapshot,
  onApply,
}: {
  email?: string;
  hydrated: boolean;
  snapshot: LibrarySnapshot;
  onApply: (library: LibrarySnapshot) => void;
}) {
  const readyEmail = useRef<string | null>(null);
  const onApplyRef = useRef(onApply);
  onApplyRef.current = onApply;

  useEffect(() => {
    const normalized = email?.trim().toLowerCase();
    if (!hydrated || !normalized) {
      readyEmail.current = null;
      return;
    }

    let cancelled = false;
    readyEmail.current = null;

    void (async () => {
      const remote = await pullLibrary();
      if (cancelled || remote === undefined) return;
      if (remote) onApplyRef.current(mergeLibraries(localLibrary(normalized), remote));
      readyEmail.current = normalized;
      if (!remote) void pushLibrary(localLibrary(normalized));
    })();

    return () => {
      cancelled = true;
    };
  }, [email, hydrated]);

  useEffect(() => {
    const normalized = email?.trim().toLowerCase();
    if (!hydrated || !normalized || readyEmail.current !== normalized) return;

    const timer = window.setTimeout(() => {
      void pushLibrary(snapshot);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [email, hydrated, snapshot]);

  return null;
}
