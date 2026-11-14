import type { GeoDir, GeoSort } from "@/lib/geo";

/** Same choices as the reader stats range: 7 days, 30 days, this year, all time, custom. */
export const ADMIN_RANGES = ["7d", "30d", "year", "all", "custom"] as const;
export type AdminRangeId = (typeof ADMIN_RANGES)[number];

export type AdminRange = {
  id: AdminRangeId | "28" | "90";
  start: string | null;
  end: string;
  label: string;
  from: string | null;
  to: string | null;
  /** UTC today, for the custom date inputs. */
  today: string;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const LABELS: Record<AdminRange["id"], string> = {
  "7d": "7 days",
  "30d": "30 days",
  "28": "28 days",
  "90": "90 days",
  year: "This year",
  all: "All time",
  custom: "Custom",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function boundedDay(value: string | undefined, today: string) {
  if (!value || !DAY.test(value)) return null;
  return value > today ? today : value;
}

export function adminRangeLabel(id: AdminRange["id"]) {
  return LABELS[id];
}

export function parseAdminRange(
  query: { range?: string | string[]; from?: string | string[]; to?: string | string[] },
  now = new Date(),
): AdminRange {
  const raw = first(query.range);
  const today = utcDay(now);
  const span = (id: AdminRange["id"], days: number): AdminRange => ({
    id,
    start: addDays(today, -(days - 1)),
    end: today,
    label: `the last ${days} days`,
    from: null,
    to: null,
    today,
  });

  if (raw === "7" || raw === "7d") return span("7d", 7);
  if (raw === "28") return span("28", 28);
  if (raw === "90") return span("90", 90);
  if (raw === "year") {
    return { id: "year", start: `${now.getUTCFullYear()}-01-01`, end: today, label: "this year", from: null, to: null, today };
  }
  if (raw === "all") return { id: "all", start: null, end: today, label: "all time", from: null, to: null, today };
  if (raw === "custom") {
    let from = boundedDay(first(query.from), today);
    let to = boundedDay(first(query.to), today);
    if (from && to && from > to) {
      const swap = from;
      from = to;
      to = swap;
    }
    if (from && to) {
      const label = from === to ? `${from} UTC` : `${from} – ${to} UTC`;
      return { id: "custom", start: from, end: to, label, from, to, today };
    }
    return { id: "custom", start: addDays(today, 1), end: today, label: "this custom range", from, to, today };
  }
  return span("30d", 30);
}

export function adminStatsHref(range: AdminRange, sort: GeoSort, dir: GeoDir, nextRange: AdminRange["id"] = range.id) {
  const params = new URLSearchParams();
  if (nextRange !== "30d") params.set("range", nextRange);
  if (nextRange === "custom") {
    const from = range.from;
    const to = range.to;
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  }
  if (sort !== "visitors") params.set("sort", sort);
  if (dir !== "desc") params.set("dir", dir);
  const query = params.toString();
  return query ? `/admin/stats?${query}` : "/admin/stats";
}

export function countWindow(range: AdminRange) {
  return { start: range.start, end: range.end, label: range.label };
}
