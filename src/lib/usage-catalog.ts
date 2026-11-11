import { APPEARANCE_THEMES, FONT_SIZE_MAX, FONT_SIZE_MIN, MUSHAF_INKS } from "@/lib/appearance";
import type { Preferences } from "@/lib/quran/types";

/**
 * Product events. Names and properties are a fixed list.
 * Free text, ayah keys, notes, and queries are not values here.
 */

export const SIGN_IN_METHODS = ["email_code", "passkey", "google", "apple"] as const;
export type SignInMethod = (typeof SIGN_IN_METHODS)[number];

export const FEATURES = [
  "audio_play",
  "note_added",
  "bookmark_added",
  "highlight_added",
  "tafsir_opened",
  "search_performed",
  "share",
  "translation_toggle",
  "word_by_word",
  "focus_mode",
  "export",
  "reading_mode",
] as const;
export type FeatureId = (typeof FEATURES)[number];

export const SANA_COMMANDS = [
  "start_tour",
  "lesson",
  "guide",
  "go_verse",
  "go_surah",
  "go_juz",
  "next",
  "previous",
  "reading_mode",
  "play_surah",
  "play_ayah",
  "play_word",
  "play_from",
  "pause",
  "resume",
  "reciter",
  "note",
  "find_notes",
  "bookmark",
  "bookmarks",
  "highlight",
  "clear_highlight",
  "highlights",
  "search",
  "translation",
  "tafsir",
  "bigger_text",
  "smaller_text",
  "font_size",
  "theme",
  "account",
  "progress",
  "export",
  "sign_in",
  "study",
  "focus",
  "rest",
] as const;
export type SanaCommand = (typeof SANA_COMMANDS)[number];

export const DEVICES = [
  "phone_browser",
  "phone_installed",
  "tablet_browser",
  "tablet_installed",
  "desktop_browser",
  "desktop_installed",
] as const;
export type DeviceBucket = (typeof DEVICES)[number];

export const AUTH_REASONS = [
  "access_denied",
  "redirect_uri_mismatch",
  "invalid_client",
  "invalid_request",
  "invalid_grant",
  "unauthorized_client",
  "unsupported_response_type",
  "server_error",
  "temporarily_unavailable",
  "configuration",
  "verification_failed",
  "oauth_signin",
  "oauth_callback",
  "oauth_create_account",
  "callback",
  "account_not_linked",
  "session_required",
  "send_failed",
  "rate_limited",
  "not_allowed",
  "unavailable",
  "expired",
  "mismatch",
  "locked",
  "cancelled",
  "session",
  "unknown",
] as const;
export type AuthReason = (typeof AUTH_REASONS)[number];

const TEXT_SIZES = Array.from({ length: FONT_SIZE_MAX - FONT_SIZE_MIN + 1 }, (_, index) => FONT_SIZE_MIN + index);

export const SETTING_VALUES = [
  ...APPEARANCE_THEMES.map((theme) => `theme:${theme.id}`),
  ...TEXT_SIZES.map((size) => `text_size:${size}`),
  ...MUSHAF_INKS.map((ink) => `ink:${ink.id}`),
  "arabic:on",
  "arabic:off",
  "translation:on",
  "translation:off",
  "transliteration:on",
  "transliteration:off",
  "word_by_word:on",
  "word_by_word:off",
  "focus:on",
  "focus:off",
  "highlights:on",
  "highlights:off",
  "labels:on",
  "labels:off",
  "intro:on",
  "intro:off",
  "follow:on",
  "follow:off",
  "autoplay:on",
  "autoplay:off",
  "tafsir:on",
  "tafsir:off",
  "page:mushaf",
  "page:stream",
  "reading:scroll",
  "reading:ayah",
  "script:both",
  "script:arabic",
  "script:english",
  "rate:0.75",
  "rate:1",
  "rate:1.25",
  "rate:1.5",
] as const;
export type SettingValue = (typeof SETTING_VALUES)[number];

const FEATURE_SET = new Set<string>(FEATURES);
const COMMAND_SET = new Set<string>(SANA_COMMANDS);
const DEVICE_SET = new Set<string>(DEVICES);
const REASON_SET = new Set<string>(AUTH_REASONS);
const SETTING_SET = new Set<string>(SETTING_VALUES);
const METHOD_SET = new Set<string>(SIGN_IN_METHODS);

export function isSignInMethod(value: string): value is SignInMethod {
  return METHOD_SET.has(value);
}

export function isFeatureId(value: string): value is FeatureId {
  return FEATURE_SET.has(value);
}

export function isSanaCommand(value: string): value is SanaCommand {
  return COMMAND_SET.has(value);
}

export function isDeviceBucket(value: string): value is DeviceBucket {
  return DEVICE_SET.has(value);
}

export function isAuthReason(value: string): value is AuthReason {
  return REASON_SET.has(value);
}

export function isSettingValue(value: string): value is SettingValue {
  return SETTING_SET.has(value);
}

export function isThemeSetting(value: string) {
  return value.startsWith("theme:") && isSettingValue(value);
}

const SANA_ACTIONS: Record<string, SanaCommand> = {
  tour: "start_tour",
  lesson: "lesson",
  guide: "guide",
  "go-verse": "go_verse",
  "go-surah": "go_surah",
  "go-juz": "go_juz",
  next: "next",
  previous: "previous",
  "reading-mode": "reading_mode",
  "play-surah": "play_surah",
  "play-ayah": "play_ayah",
  "play-word": "play_word",
  "play-from": "play_from",
  pause: "pause",
  resume: "resume",
  reciter: "reciter",
  note: "note",
  "find-notes": "find_notes",
  bookmark: "bookmark",
  bookmarks: "bookmarks",
  highlight: "highlight",
  "clear-highlight": "clear_highlight",
  highlights: "highlights",
  search: "search",
  translation: "translation",
  tafsir: "tafsir",
  bigger: "bigger_text",
  smaller: "smaller_text",
  "font-size": "font_size",
  theme: "theme",
  account: "account",
  progress: "progress",
  export: "export",
  "sign-in": "sign_in",
  study: "study",
  focus: "focus",
  rest: "rest",
};

/** Maps a Sana action id to a command name. Typed text is not a command. */
export function sanaCommandName(action: string): SanaCommand | null {
  return SANA_ACTIONS[action] ?? null;
}

export type ClientUsageEvent =
  | { name: "feature"; feature: FeatureId }
  | { name: "sana_opened" }
  | { name: "sana_command"; command: SanaCommand }
  | { name: "sana_unknown" }
  | { name: "tour_started" }
  | { name: "tour_completed" }
  | { name: "sana_refusal" }
  | { name: "setting"; setting: SettingValue }
  | { name: "session_open"; device: DeviceBucket }
  | { name: "auth_requested"; method: SignInMethod }
  | { name: "auth_failed"; method: SignInMethod | null; reason: AuthReason };

const CLIENT_KEYS: Record<ClientUsageEvent["name"], readonly string[]> = {
  feature: ["name", "feature"],
  sana_opened: ["name"],
  sana_command: ["name", "command"],
  sana_unknown: ["name"],
  tour_started: ["name"],
  tour_completed: ["name"],
  sana_refusal: ["name"],
  setting: ["name", "setting"],
  session_open: ["name", "device"],
  auth_requested: ["name", "method"],
  auth_failed: ["name", "reason", "method"],
};

function plainRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return null;
  return value as Record<string, unknown>;
}

function onlyKeys(record: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(record).every((key) => allowed.includes(key));
}

export function parseClientEvent(value: unknown): ClientUsageEvent | null {
  const record = plainRecord(value);
  if (!record || typeof record.name !== "string") return null;
  const name = record.name;
  if (!(name in CLIENT_KEYS)) return null;
  const allowed = CLIENT_KEYS[name as ClientUsageEvent["name"]];
  if (!onlyKeys(record, allowed)) return null;

  switch (name) {
    case "feature":
      return typeof record.feature === "string" && isFeatureId(record.feature)
        ? { name, feature: record.feature }
        : null;
    case "sana_command":
      return typeof record.command === "string" && isSanaCommand(record.command)
        ? { name, command: record.command }
        : null;
    case "setting":
      return typeof record.setting === "string" && isSettingValue(record.setting)
        ? { name, setting: record.setting }
        : null;
    case "session_open":
      return typeof record.device === "string" && isDeviceBucket(record.device)
        ? { name, device: record.device }
        : null;
    case "auth_requested":
      return typeof record.method === "string" && isSignInMethod(record.method)
        ? { name, method: record.method }
        : null;
    case "auth_failed": {
      if (typeof record.reason !== "string" || !isAuthReason(record.reason)) return null;
      if (record.method == null) return { name, method: null, reason: record.reason };
      if (typeof record.method !== "string" || !isSignInMethod(record.method)) return null;
      return { name, method: record.method, reason: record.reason };
    }
    case "sana_opened":
    case "sana_unknown":
    case "tour_started":
    case "tour_completed":
    case "sana_refusal":
      return { name };
    default:
      return null;
  }
}

export const CLIENT_BATCH_KEYS = ["events", "anonId"] as const;

export function preferenceUsageEvents(prev: Preferences, next: Preferences): ClientUsageEvent[] {
  const events: ClientUsageEvent[] = [];
  const setting = (value: string) => {
    if (isSettingValue(value)) events.push({ name: "setting", setting: value });
  };
  const feature = (id: FeatureId) => events.push({ name: "feature", feature: id });
  const flag = (on: boolean) => (on ? "on" : "off");

  if (prev.theme !== next.theme) setting(`theme:${next.theme}`);
  if (prev.fontSize !== next.fontSize) setting(`text_size:${next.fontSize}`);
  if (prev.mushafInk !== next.mushafInk) setting(`ink:${next.mushafInk}`);
  if (prev.showArabic !== next.showArabic) setting(`arabic:${flag(next.showArabic)}`);
  if (prev.showTranslation !== next.showTranslation) setting(`translation:${flag(next.showTranslation)}`);
  if (prev.showTransliteration !== next.showTransliteration) setting(`transliteration:${flag(next.showTransliteration)}`);
  if (prev.showWordByWord !== next.showWordByWord) {
    setting(`word_by_word:${flag(next.showWordByWord)}`);
    if (next.showWordByWord) feature("word_by_word");
  }
  if (prev.focusMode !== next.focusMode) {
    setting(`focus:${flag(next.focusMode)}`);
    if (next.focusMode) feature("focus_mode");
  }
  if (prev.showHighlights !== next.showHighlights) setting(`highlights:${flag(next.showHighlights)}`);
  if (prev.showHighlightLabels !== next.showHighlightLabels) setting(`labels:${flag(next.showHighlightLabels)}`);
  if (prev.showIntroduction !== next.showIntroduction) setting(`intro:${flag(next.showIntroduction)}`);
  if (prev.autoFollow !== next.autoFollow) setting(`follow:${flag(next.autoFollow)}`);
  if (prev.autoPlayOnAyahClick !== next.autoPlayOnAyahClick) setting(`autoplay:${flag(next.autoPlayOnAyahClick)}`);
  if (prev.showTafsir !== next.showTafsir) {
    setting(`tafsir:${flag(next.showTafsir)}`);
    if (next.showTafsir) feature("tafsir_opened");
  }
  if (prev.traditionalPage !== next.traditionalPage) setting(next.traditionalPage ? "page:mushaf" : "page:stream");
  if (prev.mobileReadingMode !== next.mobileReadingMode) {
    setting(`reading:${next.mobileReadingMode}`);
    feature("reading_mode");
  }
  if (prev.mobileAyahScript !== next.mobileAyahScript) setting(`script:${next.mobileAyahScript}`);
  if (prev.playbackRate !== next.playbackRate) setting(`rate:${next.playbackRate}`);
  if (prev.translationIds.join(",") !== next.translationIds.join(",") || prev.showTranslation !== next.showTranslation) {
    feature("translation_toggle");
  }
  return events;
}

export function deviceBucketFrom(width: number, standalone: boolean): DeviceBucket {
  const form = width < 768 ? "phone" : width < 1024 ? "tablet" : "desktop";
  return `${form}_${standalone ? "installed" : "browser"}`;
}

export function currentDeviceBucket(): DeviceBucket {
  if (typeof window === "undefined") return "desktop_browser";
  try {
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    return deviceBucketFrom(window.innerWidth, standalone);
  } catch {
    return "desktop_browser";
  }
}

const AUTH_REASON_ALIASES: Record<string, AuthReason> = {
  accessdenied: "access_denied",
  access_denied: "access_denied",
  redirect_uri_mismatch: "redirect_uri_mismatch",
  redirecturimismatch: "redirect_uri_mismatch",
  invalid_client: "invalid_client",
  invalidclient: "invalid_client",
  invalid_request: "invalid_request",
  invalidrequest: "invalid_request",
  invalid_grant: "invalid_grant",
  invalidgrant: "invalid_grant",
  unauthorized_client: "unauthorized_client",
  unauthorizedclient: "unauthorized_client",
  unsupported_response_type: "unsupported_response_type",
  unsupportedresponsetype: "unsupported_response_type",
  server_error: "server_error",
  servererror: "server_error",
  temporarily_unavailable: "temporarily_unavailable",
  temporarilyunavailable: "temporarily_unavailable",
  configuration: "configuration",
  verification: "verification_failed",
  verification_failed: "verification_failed",
  oauthsignin: "oauth_signin",
  oauthcallback: "oauth_callback",
  oauthcallbackerror: "oauth_callback",
  oauthcreateaccount: "oauth_create_account",
  callback: "callback",
  oauthaccountnotlinked: "account_not_linked",
  account_not_linked: "account_not_linked",
  sessionrequired: "session_required",
  session_required: "session_required",
  send_failed: "send_failed",
  rate_limited: "rate_limited",
  not_allowed: "not_allowed",
  unavailable: "unavailable",
  expired: "expired",
  mismatch: "mismatch",
  locked: "locked",
  cancelled: "cancelled",
  canceled: "cancelled",
  session: "session",
  unknown: "unknown",
};

/** Collapses a provider error code to a fixed reason. Anything else becomes "unknown". */
export function coarseAuthReason(value: string | null | undefined): AuthReason | null {
  if (!value) return null;
  const key = value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (!key) return null;
  return AUTH_REASON_ALIASES[key] ?? "unknown";
}

export function coarseClientAuthFailure(error: unknown): AuthReason {
  if (error && typeof error === "object" && "name" in error) {
    const name = String((error as { name?: unknown }).name);
    if (name === "NotAllowedError" || name === "AbortError") return "cancelled";
    if (name === "SecurityError" || name === "InvalidStateError") return "verification_failed";
  }
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("expired")) return "expired";
  if (message.includes("too many")) return "rate_limited";
  if (message.includes("unavailable")) return "unavailable";
  if (message.includes("session")) return "session";
  if (message.includes("verify") || message.includes("verification")) return "verification_failed";
  return "unknown";
}

export const FEATURE_LABELS: Record<FeatureId, string> = {
  audio_play: "Audio play started",
  note_added: "Note added",
  bookmark_added: "Bookmark added",
  highlight_added: "Highlight added",
  tafsir_opened: "Tafsir opened",
  search_performed: "Search performed",
  share: "Share",
  translation_toggle: "Translation toggle",
  word_by_word: "Word by word",
  focus_mode: "Focus mode",
  export: "Export",
  reading_mode: "Reading layout",
};

export const DEVICE_LABELS: Record<DeviceBucket, string> = {
  phone_browser: "Phone · browser",
  phone_installed: "Phone · installed",
  tablet_browser: "Tablet · browser",
  tablet_installed: "Tablet · installed",
  desktop_browser: "Desktop · browser",
  desktop_installed: "Desktop · installed",
};

export const AUTH_REASON_LABELS: Record<AuthReason, string> = {
  access_denied: "Access denied",
  redirect_uri_mismatch: "Redirect URI mismatch",
  invalid_client: "Invalid client",
  invalid_request: "Invalid request",
  invalid_grant: "Invalid grant",
  unauthorized_client: "Unauthorized client",
  unsupported_response_type: "Unsupported response",
  server_error: "Server error",
  temporarily_unavailable: "Temporarily unavailable",
  configuration: "Configuration",
  verification_failed: "Verification failed",
  oauth_signin: "OAuth sign-in",
  oauth_callback: "OAuth callback",
  oauth_create_account: "OAuth account",
  callback: "Callback",
  account_not_linked: "Account not linked",
  session_required: "Session required",
  send_failed: "Email send failed",
  rate_limited: "Rate limited",
  not_allowed: "Not allowed",
  unavailable: "Unavailable",
  expired: "Expired",
  mismatch: "Code not accepted",
  locked: "Too many attempts",
  cancelled: "Cancelled",
  session: "Session was not created",
  unknown: "Unknown",
};

export const METHOD_LABELS: Record<SignInMethod, string> = {
  email_code: "Email code",
  passkey: "Passkey",
  google: "Google",
  apple: "Apple",
};

export function themeName(id: string) {
  return APPEARANCE_THEMES.find((theme) => theme.id === id)?.name ?? id;
}

export function themeIdFromSetting(detail: string) {
  if (!detail.startsWith("theme:")) return null;
  const id = detail.slice("theme:".length);
  return APPEARANCE_THEMES.some((theme) => theme.id === id) ? id : null;
}

export function commandLabel(command: string) {
  return command.replaceAll("_", " ");
}

export function settingLabel(value: string) {
  if (value.startsWith("theme:")) return `Theme · ${themeName(value.slice("theme:".length))}`;
  if (value.startsWith("text_size:")) return `Text size · ${value.slice("text_size:".length)}px`;
  if (value.startsWith("ink:")) {
    const ink = MUSHAF_INKS.find((item) => item.id === value.slice("ink:".length));
    return `Ink · ${ink?.name ?? value.slice("ink:".length)}`;
  }
  if (value.startsWith("rate:")) return `Playback · ${value.slice("rate:".length)}×`;
  const [key, raw] = value.split(":");
  const name: Record<string, string> = {
    arabic: "Arabic",
    translation: "Translation",
    transliteration: "Transliteration",
    word_by_word: "Word by word",
    focus: "Focus",
    highlights: "Highlights",
    labels: "Highlight labels",
    intro: "Introduction",
    follow: "Follow audio",
    autoplay: "Play on ayah tap",
    tafsir: "Tafsir",
    page: "Page",
    reading: "Reading layout",
    script: "Ayah script",
  };
  const choice = raw === "on" ? "On" : raw === "off" ? "Off" : raw;
  return `${name[key] ?? key} · ${choice}`;
}
