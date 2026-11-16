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

/** Ask other devices' saves on demand, e.g. when the idle prompt opens. */
export const LIBRARY_PULL_EVENT = "qurandeck:library-pull";

/** Page changes and coming back after a pause ask often; keep at most one check per 10s. */
const FORCED_PULL_GAP_MS = 10_000;

type Pulled = { library: LibrarySnapshot | null; updatedAt: string | null };

async function pullLibrary(): Promise<Pulled | undefined> {
  const response = await fetch("/api/library", { cache: "no-store" });
  if (!response.ok) return undefined;
  const body = (await response.json()) as { library?: unknown; updatedAt?: unknown };
  const updatedAt = typeof body.updatedAt === "string" ? body.updatedAt : null;
  if (!body.library) return { library: null, updatedAt };
  return { library: normalizeLibrary(body.library), updatedAt };
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

type Pushed = { ok: boolean; updatedAt: string | null; library: LibrarySnapshot | null };

/**
 * Sends this device's library with the row stamp it last saw. If another
 * device saved in between, the server merges and returns the result.
 */
async function pushLibrary(library: LibrarySnapshot, baseUpdatedAt: string | null): Promise<Pushed> {
  const response = await fetch("/api/library", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ library, baseUpdatedAt }),
    keepalive: true,
  });
  if (!response.ok) return { ok: false, updatedAt: null, library: null };
  await recordGuestMerge();
  try {
    const body = (await response.json()) as { updatedAt?: unknown; library?: unknown };
    return {
      ok: true,
      updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : null,
      library: body.library ? normalizeLibrary(body.library) : null,
    };
  } catch {
    return { ok: true, updatedAt: null, library: null };
  }
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
  const serverAt = useRef<string | null>(null);
  /** A check for other devices' saves is in flight; pushes wait for it so a stale place is never sent first. */
  const pulling = useRef(false);
  /** One save at a time, so each carries the row stamp the last one got back. */
  const pushing = useRef(false);

  /** Records a successful push and adopts anything the server merged in. */
  const afterPush = useRef((sent: LibrarySnapshot, result: Pushed, normalized: string) => {
    if (!result.ok) return false;
    if (result.updatedAt) serverAt.current = result.updatedAt;
    lastPushAt.current = Date.now();
    pending.current = "none";
    if (result.library) {
      lastSent.current = result.library;
      onApplyRef.current(mergeLibraries(localLibrary(normalized), result.library));
    } else {
      lastSent.current = sent;
    }
    return true;
  });

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
      const pulled = await pullLibrary();
      if (cancelled || pulled === undefined) return;
      serverAt.current = pulled.updatedAt;
      const remote = pulled.library;
      const local = localLibrary(normalized);
      const merged = remote ? mergeLibraries(local, remote) : local;
      if (!cancelled) onApplyRef.current(merged);
      const sent = remote ? merged : local;
      const pushed = await pushLibrary(sent, serverAt.current);
      if (cancelled) return;
      afterPush.current(sent, pushed, normalized);
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
    const run = () => {
      timer.current = 0;
      dueAt.current = 0;
      if (readyEmail.current !== normalized) return;
      if (document.visibilityState === "hidden") return;
      if (pulling.current || pushing.current) {
        // Wait for a check of other devices (or the previous save) so this
        // screen adopts the newer library before it sends its own.
        timer.current = window.setTimeout(run, 300);
        dueAt.current = Date.now() + 300;
        return;
      }
      const current = snapshotRef.current;
      if (libraryChangeKind(lastSent.current, current) === "none") {
        pending.current = "none";
        return;
      }
      pushing.current = true;
      void pushLibrary(current, serverAt.current)
        .catch((): Pushed => ({ ok: false, updatedAt: null, library: null }))
        .then((result) => {
          pushing.current = false;
          if (readyEmail.current !== normalized) return;
          afterPush.current(current, result, normalized);
        });
    };
    timer.current = window.setTimeout(run, delay);
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
      const email = normalized();
      void pushLibrary(current, serverAt.current).then((result) => {
        afterPush.current(current, result, email);
      });
    };

    const pull = (force: boolean) => {
      if (!hydrated || readyEmail.current !== normalized()) return;
      if (!shouldPullLibrary(Date.now(), lastPullAt.current, force ? FORCED_PULL_GAP_MS : undefined)) return;
      lastPullAt.current = Date.now();
      pulling.current = true;
      void (async () => {
        try {
          const pulled = await pullLibrary().catch(() => undefined);
          if (!pulled?.library || readyEmail.current !== normalized()) return;
          serverAt.current = pulled.updatedAt;
          const merged = mergeLibraries(localLibrary(normalized()), pulled.library);
          onApplyRef.current(merged);
        } finally {
          pulling.current = false;
        }
      })();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flush();
        return;
      }
      // Back on this screen: always check other devices before anything is sent.
      pull(true);
    };
    // A desktop tab can stay visible while the reader moves to a phone, so
    // window focus (clicking back into the browser) also checks for news.
    const onFocus = () => pull(false);
    const onPullRequest = () => pull(true);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener(LIBRARY_PULL_EVENT, onPullRequest);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(LIBRARY_PULL_EVENT, onPullRequest);
      window.removeEventListener("pagehide", flush);
    };
  }, [hydrated]);

  return null;
}
