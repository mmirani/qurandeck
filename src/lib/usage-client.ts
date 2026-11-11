import { ANON_STORAGE_KEY, canonicalAnonId } from "@/lib/anon-id";
import {
  currentDeviceBucket,
  isSignInMethod,
  type ClientUsageEvent,
  type SignInMethod,
} from "@/lib/usage-catalog";

const AUTH_METHOD_KEY = "al-mushaf-auth-method";
const FLUSH_MS = 1500;
const BATCH = 12;

let queue: ClientUsageEvent[] = [];
let timer = 0;
let listening = false;

function readAnon() {
  if (typeof localStorage === "undefined") return null;
  try {
    const existing = localStorage.getItem(ANON_STORAGE_KEY);
    const canonical = existing ? canonicalAnonId(existing) : null;
    if (canonical) return canonical;
    if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") return null;
    const created = crypto.randomUUID();
    localStorage.setItem(ANON_STORAGE_KEY, created);
    return canonicalAnonId(created);
  } catch {
    return null;
  }
}

function payload(events: ClientUsageEvent[]) {
  const anonId = readAnon();
  return JSON.stringify(anonId ? { anonId, events } : { events });
}

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("pagehide", () => flushUsage());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushUsage();
  });
}

/** Queue a product event. Never throws, and a failed request does not affect the app. */
export function trackUsage(event: ClientUsageEvent) {
  if (typeof window === "undefined") return;
  try {
    listen();
    queue.push(event);
    if (queue.length >= BATCH) flushUsage();
    else if (!timer) timer = window.setTimeout(() => flushUsage(), FLUSH_MS);
  } catch {
    // Counting must not break reading.
  }
}

export function flushUsage() {
  if (typeof window === "undefined" || queue.length === 0) return;
  if (timer) {
    window.clearTimeout(timer);
    timer = 0;
  }
  const events = queue.slice(0, 20);
  queue = queue.slice(20);
  const body = payload(events);
  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/usage", blob)) {
        if (queue.length) timer = window.setTimeout(() => flushUsage(), FLUSH_MS);
        return;
      }
    }
  } catch {
    // Fall through to fetch.
  }
  void fetch("/api/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
  if (queue.length) timer = window.setTimeout(() => flushUsage(), FLUSH_MS);
}

export async function postUsage(events: ClientUsageEvent[]) {
  if (typeof window === "undefined" || events.length === 0) return false;
  try {
    const response = await fetch("/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload(events),
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function rememberAuthMethod(method: SignInMethod) {
  try {
    sessionStorage.setItem(AUTH_METHOD_KEY, method);
  } catch {
    // The error page can still count the failure without a provider.
  }
}

export function takeAuthMethod(): SignInMethod | null {
  try {
    const value = sessionStorage.getItem(AUTH_METHOD_KEY);
    sessionStorage.removeItem(AUTH_METHOD_KEY);
    return value && isSignInMethod(value) ? value : null;
  } catch {
    return null;
  }
}

export { currentDeviceBucket };
