"use client";

import { useEffect, useRef } from "react";
import { ANON_STORAGE_KEY, canonicalAnonId, GUEST_MERGED_KEY } from "@/lib/anon-id";
import { mergeLibraries, normalizeLibrary, type LibrarySnapshot } from "@/lib/library";
import {
  libraryChangeKind,
  pushDelayMs,
  shouldPullLibrary,
  strongerChange,
  type LibraryChange,
} from "@/lib/library-sync-plan";
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

async function recordGuestMerge() {
  try {
    if (localStorage.getItem(GUEST_MERGED_KEY) === "1") return;
    const stored = localStorage.getItem(ANON_STORAGE_KEY);
    const anonId = stored ? canonicalAnonId(stored) : null;
    if (!anonId) return;
    const response = await fetch("/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "guest_merge", anonId }),
      keepalive: true,
    });
    if (response.ok) localStorage.setItem(GUEST_MERGED_KEY, "1");
  } catch {
    // The next library save on this browser can retry.
  }
}

async function pushLibrary(library: LibrarySnapshot) {
  const response = await fetch("/api/library", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ library }),
    keepalive: true,
  });
  if (response.ok) await recordGuestMerge();
  return response.ok;
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
  const snapshotRef = useRef(snapshot);
  const lastSent = useRef<LibrarySnapshot | null>(null);
  const pending = useRef<LibraryChange>("none");
  const timer = useRef(0);
  const dueAt = useRef(0);
  const lastPushAt = useRef(0);
  const lastPullAt = useRef(0);
  const emailRef = useRef(email);

  useEffect(() => {
    onApplyRef.current = onApply;
  }, [onApply]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    emailRef.current = email;
  }, [email]);

  useEffect(() => {
    const normalized = email?.trim().toLowerCase();
    if (!hydrated || !normalized) {
      readyEmail.current = null;
      lastSent.current = null;
      pending.current = "none";
      return;
    }

    let cancelled = false;
    readyEmail.current = null;
    lastPullAt.current = Date.now();

    void (async () => {
      const remote = await pullLibrary();
      if (cancelled || remote === undefined) return;
      const local = localLibrary(normalized);
      const merged = remote ? mergeLibraries(local, remote) : local;
      if (!cancelled) onApplyRef.current(merged);
      const pushed = await pushLibrary(remote ? merged : local);
      if (cancelled) return;
      if (pushed) {
        lastSent.current = remote ? merged : local;
        lastPushAt.current = Date.now();
        pending.current = "none";
      }
      readyEmail.current = normalized;
    })();

    return () => {
      cancelled = true;
    };
  }, [email, hydrated]);

  useEffect(() => {
    const normalized = email?.trim().toLowerCase();
    if (!hydrated || !normalized || readyEmail.current !== normalized) return;
    const kind = libraryChangeKind(lastSent.current, snapshot);
    if (kind === "none") return;
    pending.current = strongerChange(pending.current, kind);
    if (document.visibilityState === "hidden") return;

    const delay = pushDelayMs(pending.current === "meter" ? "meter" : "durable", Date.now() - lastPushAt.current);
    const nextDue = Date.now() + delay;
    if (timer.current && dueAt.current > 0 && dueAt.current <= nextDue) return;
    window.clearTimeout(timer.current);
    dueAt.current = nextDue;
    timer.current = window.setTimeout(() => {
      timer.current = 0;
      dueAt.current = 0;
      const current = snapshotRef.current;
      if (readyEmail.current !== normalized) return;
      if (document.visibilityState === "hidden") return;
      void pushLibrary(current).then((ok) => {
        if (!ok || readyEmail.current !== normalized) return;
        lastSent.current = current;
        lastPushAt.current = Date.now();
        pending.current = "none";
      });
    }, delay);
  }, [email, hydrated, snapshot]);

  useEffect(() => {
    const normalized = () => emailRef.current?.trim().toLowerCase() ?? "";

    const flush = () => {
      if (!hydrated || readyEmail.current !== normalized()) return;
      window.clearTimeout(timer.current);
      timer.current = 0;
      dueAt.current = 0;
      const current = snapshotRef.current;
      if (libraryChangeKind(lastSent.current, current) === "none") return;
      void pushLibrary(current).then((ok) => {
        if (!ok) return;
        lastSent.current = current;
        lastPushAt.current = Date.now();
        pending.current = "none";
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flush();
        return;
      }
      if (!hydrated || readyEmail.current !== normalized()) return;
      if (!shouldPullLibrary(Date.now(), lastPullAt.current)) return;
      lastPullAt.current = Date.now();
      void (async () => {
        const remote = await pullLibrary();
        if (!remote || readyEmail.current !== normalized()) return;
        const merged = mergeLibraries(localLibrary(normalized()), remote);
        onApplyRef.current(merged);
      })();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [hydrated]);

  return null;
}
