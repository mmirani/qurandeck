import { isIsoCountry } from "@/lib/geo-codes";
import { getSql } from "@/lib/db";
import { prepareUsageStore } from "@/lib/usage-store";
import {
  SIGNUP_COUNTRY_UNKNOWN,
  recordSignupCountrySafely,
  type SignupCountryRow,
} from "@/lib/signup-country";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

function count(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export async function incrementSignupCountry(sql: Sql, row: { day: string; country: string }) {
  if (!DAY.test(row.day)) throw new Error("Signup day is not a UTC date");
  if (row.country !== SIGNUP_COUNTRY_UNKNOWN && !isIsoCountry(row.country)) {
    throw new Error("Signup country is not allowed");
  }
  await sql`
    INSERT INTO signup_country_daily (day, country_code, count)
    VALUES (${row.day}::date, ${row.country}, 1)
    ON CONFLICT (day, country_code) DO UPDATE
      SET count = signup_country_daily.count + EXCLUDED.count
  `;
}

/** Aggregate only. A failure is logged without the country, email, IP, or user agent. */
export async function recordSignupCountry(countryHeader: string | null | undefined, now = new Date()) {
  await recordSignupCountrySafely(countryHeader, async (row) => {
    await prepareUsageStore();
    await incrementSignupCountry(getSql() as unknown as Sql, row);
  }, now);
}

export async function loadSignupCountries(): Promise<SignupCountryRow[]> {
  await prepareUsageStore();
  const sql = getSql();
  const rows = (await sql`
    SELECT to_char(day, 'YYYY-MM-DD') AS day,
           country_code,
           count
    FROM signup_country_daily
  `) as Record<string, unknown>[];
  return rows.map((row) => ({
    day: String(row.day ?? ""),
    country: String(row.country_code ?? ""),
    count: count(row.count),
  }));
}
