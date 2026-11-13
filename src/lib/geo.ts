import { createHmac } from "node:crypto";
import { isIsoCountry, isoNumeric } from "@/lib/geo-codes";

export const GEO_RANGES = ["7", "28", "90", "all"] as const;
export type GeoRange = (typeof GEO_RANGES)[number];

export const GEO_SORTS = ["country", "visitors", "share"] as const;
export type GeoSort = (typeof GEO_SORTS)[number];
export type GeoDir = "asc" | "desc";
export type GeoKind = "visit" | "page_view";

export type GeoEvent = {
  day: string;
  country: string;
  visitorHash: string;
  kind: GeoKind;
};

export type GeoDailyRow = {
  day: string;
  country: string;
  visits: number;
  pageViews: number;
};

export type GeoVisitorRow = {
  day: string;
  country: string;
  visitorHash: string;
  visitCounted: boolean;
};

export type GeoState = {
  daily: GeoDailyRow[];
  visitors: GeoVisitorRow[];
};

export type GeoSnapshot = {
  daily: GeoDailyRow[];
  uniques: { day: string; country: string; visitors: number }[];
};

export type GeoCountryRow = {
  country: string;
  name: string;
  flag: string;
  visitors: number;
  share: number;
};

export type GeoTrendPoint = {
  day: string;
  visitors: number;
  visits: number;
  pageViews: number;
};

export type GeoSummary = {
  range: GeoRange;
  rangeLabel: string;
  sort: GeoSort;
  dir: GeoDir;
  uniqueVisitors: number;
  visits: number;
  pageViews: number;
  countries: GeoCountryRow[];
  trend: GeoTrendPoint[];
  maxVisitors: number;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HASH = /^[0-9a-f]{64}$/;
const GEO_KEYS = ["day", "country", "visitorHash", "kind"] as const;

/** Single-hue lightness ramp using the theme gold, so the map is not red/green. */
export const GEO_SCALE = [
  "color-mix(in srgb, var(--gold) 18%, var(--surface))",
  "color-mix(in srgb, var(--gold) 36%, var(--surface))",
  "color-mix(in srgb, var(--gold) 54%, var(--surface))",
  "color-mix(in srgb, var(--gold) 76%, var(--surface))",
  "var(--gold-deep)",
] as const;

export const GEO_EMPTY = "color-mix(in srgb, var(--line) 72%, var(--surface))";

const REGION_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

export function countryFromHeader(value: string | null | undefined): string {
  const code = value?.trim().toUpperCase() ?? "";
  return isIsoCountry(code) ? code : "ZZ";
}

export function countryName(code: string): string {
  if (code === "ZZ") return "Unknown";
  try {
    const name = REGION_NAMES.of(code);
    return name && name !== code ? name : code;
  } catch {
    return code;
  }
}

export function flagEmoji(code: string): string {
  if (!isIsoCountry(code)) return "";
  return String.fromCodePoint(...[...code].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
}

/** Daily salt is derived, not stored. The same reader hashes differently tomorrow. */
export function geoVisitorHash(anonId: string, day: string, secret = process.env.AUTH_SECRET) {
  if (!secret || secret.length < 16) throw new Error("AUTH_SECRET is not set");
  if (!DAY.test(day)) throw new Error("Geo day is not a UTC date");
  const salt = createHmac("sha256", secret).update(`qurandeck-geo-salt-v1:${day}`).digest();
  return createHmac("sha256", salt).update(anonId).digest("hex");
}

export function assertGeoEvent(event: GeoEvent) {
  const keys = Object.keys(event);
  if (keys.length !== GEO_KEYS.length || keys.some((key) => !(GEO_KEYS as readonly string[]).includes(key))) {
    throw new Error("Geo event has an extra field");
  }
  if (!DAY.test(event.day)) throw new Error("Geo day is not a UTC date");
  if (event.country !== "ZZ" && !isIsoCountry(event.country)) throw new Error("Geo country is not allowed");
  if (!HASH.test(event.visitorHash)) throw new Error("Geo visitor is not a hash");
  if (event.kind !== "visit" && event.kind !== "page_view") throw new Error("Geo kind is not allowed");
}

export function emptyGeoState(): GeoState {
  return { daily: [], visitors: [] };
}

function bump(daily: GeoDailyRow[], day: string, country: string, visits: number, pageViews: number) {
  const row = daily.find((item) => item.day === day && item.country === country);
  if (row) {
    row.visits += visits;
    row.pageViews += pageViews;
    return;
  }
  daily.push({ day, country, visits, pageViews });
}

/** Fold one visit or page view into daily totals. The hash is not linked across days. */
export function applyGeoEvent(state: GeoState, event: GeoEvent): GeoState {
  assertGeoEvent(event);
  const visitors = state.visitors.map((row) => ({ ...row }));
  const daily = state.daily.map((row) => ({ ...row }));
  let visitor = visitors.find((row) => row.day === event.day && row.visitorHash === event.visitorHash);
  if (!visitor) {
    visitor = {
      day: event.day,
      country: event.country,
      visitorHash: event.visitorHash,
      visitCounted: false,
    };
    visitors.push(visitor);
  }
  if (event.kind === "visit" && !visitor.visitCounted) {
    visitor.visitCounted = true;
    bump(daily, event.day, visitor.country, 1, 0);
  }
  if (event.kind === "page_view") bump(daily, event.day, visitor.country, 0, 1);
  return { daily, visitors };
}

export function snapshotFromState(state: GeoState): GeoSnapshot {
  const uniques = new Map<string, { day: string; country: string; visitors: number }>();
  for (const visitor of state.visitors) {
    const key = `${visitor.day}:${visitor.country}`;
    const row = uniques.get(key) ?? { day: visitor.day, country: visitor.country, visitors: 0 };
    row.visitors += 1;
    uniques.set(key, row);
  }
  return {
    daily: state.daily.map((row) => ({ ...row })),
    uniques: [...uniques.values()],
  };
}

function firstQuery(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseGeoRange(value: string | string[] | undefined): GeoRange {
  const raw = firstQuery(value);
  return raw === "7" || raw === "28" || raw === "90" || raw === "all" ? raw : "28";
}

export function parseGeoSort(value: string | string[] | undefined): GeoSort {
  const raw = firstQuery(value);
  return raw === "country" || raw === "visitors" || raw === "share" ? raw : "visitors";
}

export function parseGeoDir(value: string | string[] | undefined): GeoDir {
  return firstQuery(value) === "asc" ? "asc" : "desc";
}

export function geoRangeLabel(range: GeoRange) {
  if (range === "all") return "all time";
  return `the last ${range} days`;
}

function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return utcDay(date);
}

export function geoRangeStart(range: GeoRange, now: Date) {
  if (range === "all") return null;
  return addDays(utcDay(now), -(Number(range) - 1));
}

function inRange(day: string, start: string | null, end: string) {
  return day <= end && (start === null || day >= start);
}

export function geoStatsHref(next: { range: GeoRange; sort: GeoSort; dir: GeoDir }) {
  const params = new URLSearchParams();
  if (next.range !== "28") params.set("range", next.range);
  if (next.sort !== "visitors") params.set("sort", next.sort);
  if (next.dir !== "desc") params.set("dir", next.dir);
  const query = params.toString();
  return query ? `/admin/stats?${query}` : "/admin/stats";
}

export function geoStep(value: number, max: number) {
  if (value <= 0 || max <= 0) return -1;
  const ratio = value / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  if (ratio > 0.1) return 1;
  return 0;
}

function scaleColor(step: number): string {
  if (step === 0 || step === 1 || step === 2 || step === 3 || step === 4) return GEO_SCALE[step];
  return GEO_EMPTY;
}

export function geoFill(value: number, max: number) {
  return scaleColor(geoStep(value, max));
}

export type GeoBand = { from: number; to: number; step: number; fill: string };

export function geoScaleBands(max: number): GeoBand[] {
  if (max <= 0) return [];
  const upper = [0.1, 0.25, 0.5, 0.75, 1];
  const bands: GeoBand[] = [];
  let previous = 0;
  for (let index = 0; index < upper.length; index += 1) {
    const ratio = upper[index] ?? 1;
    const to = index === upper.length - 1 ? max : Math.min(max, Math.max(previous + 1, Math.floor(ratio * max)));
    const from = previous + 1;
    if (from > max) break;
    const step = geoStep(from, max);
    bands.push({ from, to, step, fill: scaleColor(step) });
    previous = to;
    if (previous >= max) break;
  }
  return bands;
}

function compareCountries(sort: GeoSort, dir: GeoDir) {
  const sign = dir === "asc" ? 1 : -1;
  return (a: GeoCountryRow, b: GeoCountryRow) => {
    const primary =
      sort === "country" ? a.name.localeCompare(b.name) : sort === "share" ? a.share - b.share : a.visitors - b.visitors;
    if (primary !== 0) return primary * sign;
    return a.name.localeCompare(b.name);
  };
}

export function summarizeGeo(
  snapshot: GeoSnapshot,
  range: GeoRange,
  sort: GeoSort = "visitors",
  dir: GeoDir = "desc",
  now = new Date(),
): GeoSummary {
  const end = utcDay(now);
  const start = geoRangeStart(range, now);
  const visitorsByCountry = new Map<string, number>();
  const visitorsByDay = new Map<string, number>();
  const visitsByDay = new Map<string, number>();
  const viewsByDay = new Map<string, number>();
  let uniqueVisitors = 0;
  let visits = 0;
  let pageViews = 0;

  for (const row of snapshot.uniques) {
    if (!inRange(row.day, start, end) || row.visitors <= 0) continue;
    uniqueVisitors += row.visitors;
    visitorsByCountry.set(row.country, (visitorsByCountry.get(row.country) ?? 0) + row.visitors);
    visitorsByDay.set(row.day, (visitorsByDay.get(row.day) ?? 0) + row.visitors);
  }
  for (const row of snapshot.daily) {
    if (!inRange(row.day, start, end)) continue;
    visits += row.visits;
    pageViews += row.pageViews;
    visitsByDay.set(row.day, (visitsByDay.get(row.day) ?? 0) + row.visits);
    viewsByDay.set(row.day, (viewsByDay.get(row.day) ?? 0) + row.pageViews);
  }

  const countries = [...visitorsByCountry.entries()]
    .map(([country, count]) => ({
      country,
      name: countryName(country),
      flag: flagEmoji(country),
      visitors: count,
      share: uniqueVisitors > 0 ? count / uniqueVisitors : 0,
    }))
    .sort(compareCountries(sort, dir));

  const earliest = range === "all" ? [...visitorsByDay.keys(), ...visitsByDay.keys()].sort()[0] : start;
  const trendStart = earliest && earliest < end ? earliest : end;
  const trend: GeoTrendPoint[] = [];
  for (let day = trendStart; day <= end; day = addDays(day, 1)) {
    trend.push({
      day,
      visitors: visitorsByDay.get(day) ?? 0,
      visits: visitsByDay.get(day) ?? 0,
      pageViews: viewsByDay.get(day) ?? 0,
    });
  }

  return {
    range,
    rangeLabel: geoRangeLabel(range),
    sort,
    dir,
    uniqueVisitors,
    visits,
    pageViews,
    countries,
    trend,
    maxVisitors: countries.reduce((max, row) => Math.max(max, row.visitors), 0),
  };
}

export function geoSummaryText(summary: GeoSummary) {
  if (summary.uniqueVisitors === 0) return `No unique visitors in ${summary.rangeLabel}.`;
  const known = summary.countries.filter((row) => row.country !== "ZZ");
  const unknown = summary.countries.find((row) => row.country === "ZZ");
  const top = [...known].sort((a, b) => b.visitors - a.visitors || a.name.localeCompare(b.name))[0];
  const places = known.length === 1 ? "1 country" : `${known.length} countries`;
  let text = `${summary.uniqueVisitors.toLocaleString("en-US")} unique visitors in ${summary.rangeLabel}, across ${places}.`;
  if (top && top.country !== "ZZ") {
    text += ` The most are in ${top.name}: ${top.visitors.toLocaleString("en-US")} (${formatShare(top.share)}).`;
  }
  if (unknown && unknown.visitors > 0) {
    const noun = unknown.visitors === 1 ? "visitor has" : "visitors have";
    text += ` ${unknown.visitors.toLocaleString("en-US")} ${noun} no country.`;
  }
  return text;
}

export function formatShare(share: number) {
  return `${(share * 100).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function geoSchemaStatements() {
  return [
    `CREATE TABLE IF NOT EXISTS usage_geo_daily (
      day date NOT NULL,
      country text NOT NULL,
      visits integer NOT NULL DEFAULT 0,
      page_views integer NOT NULL DEFAULT 0,
      PRIMARY KEY (day, country),
      CONSTRAINT usage_geo_daily_country_chk CHECK (country ~ '^[A-Z]{2}$'),
      CONSTRAINT usage_geo_daily_counts_chk CHECK (visits >= 0 AND page_views >= 0)
    )`,
    `CREATE TABLE IF NOT EXISTS usage_geo_visitors (
      day date NOT NULL,
      country text NOT NULL,
      visitor_hash text NOT NULL,
      visit_counted boolean NOT NULL DEFAULT false,
      PRIMARY KEY (day, visitor_hash),
      CONSTRAINT usage_geo_visitors_country_chk CHECK (country ~ '^[A-Z]{2}$'),
      CONSTRAINT usage_geo_visitors_hash_chk CHECK (visitor_hash ~ '^[0-9a-f]{64}$')
    )`,
    "CREATE INDEX IF NOT EXISTS usage_geo_visitors_day_country_idx ON usage_geo_visitors (day, country)",
    "INSERT INTO schema_migrations (id, status) VALUES ('usage-geo-v1', 'done') ON CONFLICT (id) DO NOTHING",
  ];
}

export function countryNumericId(code: string) {
  return isoNumeric(code);
}

/** Seeded counts for screenshots. Not read by the live admin page. */
export function buildDemoGeo(now = new Date("2026-11-13T12:00:00Z")): GeoSnapshot {
  const weights: [string, number][] = [
    ["US", 48],
    ["SA", 36],
    ["GB", 22],
    ["PK", 18],
    ["ID", 16],
    ["EG", 14],
    ["TR", 11],
    ["NG", 9],
    ["FR", 8],
    ["MY", 7],
    ["CA", 6],
    ["DE", 5],
    ["BD", 5],
    ["AE", 4],
    ["IN", 4],
    ["MA", 3],
    ["ZZ", 2],
  ];
  let state = emptyGeoState();
  let serial = 1;
  const end = utcDay(now);
  weights.forEach(([country, count], countryIndex) => {
    for (let index = 0; index < count; index += 1) {
      const day = addDays(end, -((index * 3 + countryIndex) % 28));
      const visitorHash = serial.toString(16).padStart(64, "a");
      serial += 1;
      const event = { day, country, visitorHash };
      state = applyGeoEvent(state, { ...event, kind: "visit" });
      const views = 1 + ((index + countryIndex) % 3);
      for (let view = 0; view < views; view += 1) {
        state = applyGeoEvent(state, { ...event, kind: "page_view" });
      }
    }
  });
  return snapshotFromState(state);
}
