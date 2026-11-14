import { isIsoCountry } from "@/lib/geo-codes";
import {
  countryName,
  flagEmoji,
  formatShare,
  geoRangeLabel,
  geoRangeStart,
  type CountWindow,
  type GeoRange,
} from "@/lib/geo";

/** Stored when `x-vercel-ip-country` is missing or not an ISO country. Not a country code. */
export const SIGNUP_COUNTRY_UNKNOWN = "unknown";

/** First day this counter exists. Earlier accounts were created with no country total. */
export const SIGNUP_COUNTING_STARTED = "November 14, 2026";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export type SignupCountryRow = {
  day: string;
  country: string;
  count: number;
};

export type SignupCountryRank = {
  country: string;
  name: string;
  flag: string;
  count: number;
  share: number;
};

export type SignupCountrySummary = {
  range: GeoRange;
  rangeLabel: string;
  total: number;
  countries: SignupCountryRank[];
  max: number;
  countingNote: string;
};

export function signupCountingNote() {
  return `Counting started ${SIGNUP_COUNTING_STARTED}; earlier sign-ups have no country.`;
}

/** ISO code, or `unknown`. Never an IP, city, or region. */
export function signupCountryFromHeader(value: string | null | undefined): string {
  const code = value?.trim().toUpperCase() ?? "";
  return isIsoCountry(code) ? code : SIGNUP_COUNTRY_UNKNOWN;
}

export function signupCountryWrite(header: string | null | undefined, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  if (!DAY.test(day)) throw new Error("Signup day is not a UTC date");
  const country = signupCountryFromHeader(header);
  return { day, country };
}

/**
 * Adapter `createUser` runs only when Auth.js has a database adapter, and it does not run for
 * credentials (email code, passkey). Those still pass the jwt callback. Count there when the
 * one-time sign-up row is new. Skip that path when the adapter already counted this sign-up.
 */
export function shouldCountSignupCountry(input: {
  source: "createUser" | "jwt";
  isNewUser?: boolean;
  trigger?: "signIn" | "signUp" | "update";
  signUp?: "inserted" | "duplicate" | null;
}): boolean {
  if (input.source === "createUser") return true;
  if (input.isNewUser === true || input.trigger === "signUp") return false;
  return input.signUp === "inserted";
}

/** In-memory upsert used by tests. The database statement does the same with ON CONFLICT. */
export function applySignupCount(rows: readonly SignupCountryRow[], next: { day: string; country: string }): SignupCountryRow[] {
  const copy = rows.map((row) => ({ ...row }));
  const existing = copy.find((row) => row.day === next.day && row.country === next.country);
  if (existing) {
    existing.count += 1;
    return copy;
  }
  copy.push({ day: next.day, country: next.country, count: 1 });
  return copy;
}

export async function recordSignupCountrySafely(
  countryHeader: string | null | undefined,
  write: (row: { day: string; country: string }) => Promise<void>,
  now = new Date(),
  log: (message: string) => void = (message) => {
    console.error(message);
  },
) {
  try {
    await write(signupCountryWrite(countryHeader, now));
  } catch {
    log("Signup country counter failed");
  }
}

function inRange(day: string, start: string | null, end: string) {
  return day <= end && (start === null || day >= start);
}

export function summarizeSignups(
  rows: readonly SignupCountryRow[],
  range: GeoRange,
  now = new Date(),
  window?: CountWindow,
): SignupCountrySummary {
  const end = window?.end ?? now.toISOString().slice(0, 10);
  const start = window ? window.start : geoRangeStart(range, now);
  const totals = new Map<string, number>();
  let total = 0;

  for (const row of rows) {
    if (!DAY.test(row.day) || !Number.isFinite(row.count) || row.count <= 0) continue;
    if (!inRange(row.day, start, end)) continue;
    const country = row.country === SIGNUP_COUNTRY_UNKNOWN || isIsoCountry(row.country) ? row.country : SIGNUP_COUNTRY_UNKNOWN;
    totals.set(country, (totals.get(country) ?? 0) + row.count);
    total += row.count;
  }

  if (total > 0 && !totals.has(SIGNUP_COUNTRY_UNKNOWN)) totals.set(SIGNUP_COUNTRY_UNKNOWN, 0);

  const countries = [...totals.entries()]
    .map(([country, count]) => ({
      country,
      name: country === SIGNUP_COUNTRY_UNKNOWN ? "Unknown" : countryName(country),
      flag: flagEmoji(country),
      count,
      share: total > 0 ? count / total : 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name) || a.country.localeCompare(b.country));

  return {
    range,
    rangeLabel: window?.label ?? geoRangeLabel(range),
    total,
    countries,
    max: countries.reduce((max, row) => Math.max(max, row.count), 0),
    countingNote: signupCountingNote(),
  };
}

export function signupShare(share: number) {
  return formatShare(share);
}

export function signupCountrySchemaStatements() {
  return [
    `CREATE TABLE IF NOT EXISTS signup_country_daily (
      day date NOT NULL,
      country_code text NOT NULL,
      count integer NOT NULL DEFAULT 0,
      PRIMARY KEY (day, country_code),
      CONSTRAINT signup_country_daily_code_chk CHECK (country_code = 'unknown' OR country_code ~ '^[A-Z]{2}$'),
      CONSTRAINT signup_country_daily_count_chk CHECK (count >= 0)
    )`,
    "INSERT INTO schema_migrations (id, status) VALUES ('signup-country-v1', 'done') ON CONFLICT (id) DO NOTHING",
  ];
}

/** Seeded counts for screenshots. Not read by the live admin page. */
export function buildDemoSignups(now = new Date("2026-11-14T12:00:00Z")): SignupCountryRow[] {
  const weights: [string, number][] = [
    ["US", 18],
    ["SA", 11],
    ["GB", 7],
    ["PK", 6],
    ["ID", 5],
    ["EG", 4],
    ["TR", 3],
    ["NG", 3],
    ["FR", 2],
    ["CA", 2],
    ["MY", 2],
    ["DE", 1],
    [SIGNUP_COUNTRY_UNKNOWN, 4],
  ];
  const end = now.toISOString().slice(0, 10);
  let rows: SignupCountryRow[] = [];
  weights.forEach(([country, count], countryIndex) => {
    for (let index = 0; index < count; index += 1) {
      const date = new Date(`${end}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() - ((index * 3 + countryIndex) % 28));
      const day = date.toISOString().slice(0, 10);
      rows = applySignupCount(rows, { day, country });
    }
  });
  return rows;
}
