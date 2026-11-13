import { getSql } from "@/lib/db";
import { assertGeoEvent, type GeoEvent, type GeoSnapshot } from "@/lib/geo";
import { prepareUsageStore } from "@/lib/usage-store";

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

function count(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/**
 * One statement. A visit increments only the first time that daily hash is seen.
 * Page views use the first country of the day and never store the anon id.
 */
export async function recordGeo(event: GeoEvent) {
  assertGeoEvent(event);
  await prepareUsageStore();
  const sql = getSql() as unknown as Sql;
  if (event.kind === "visit") {
    await sql`
      WITH upsert AS (
        INSERT INTO usage_geo_visitors (day, country, visitor_hash, visit_counted)
        VALUES (${event.day}::date, ${event.country}, ${event.visitorHash}, true)
        ON CONFLICT (day, visitor_hash) DO UPDATE
          SET visit_counted = true
          WHERE NOT usage_geo_visitors.visit_counted
        RETURNING country
      )
      INSERT INTO usage_geo_daily (day, country, visits, page_views)
      SELECT ${event.day}::date, country, 1, 0 FROM upsert
      ON CONFLICT (day, country) DO UPDATE
        SET visits = usage_geo_daily.visits + EXCLUDED.visits
    `;
    return;
  }
  await sql`
    WITH inserted AS (
      INSERT INTO usage_geo_visitors (day, country, visitor_hash, visit_counted)
      VALUES (${event.day}::date, ${event.country}, ${event.visitorHash}, false)
      ON CONFLICT (day, visitor_hash) DO NOTHING
      RETURNING country
    ),
    chosen AS (
      SELECT country FROM inserted
      UNION ALL
      SELECT visitors.country
      FROM usage_geo_visitors visitors
      WHERE visitors.day = ${event.day}::date
        AND visitors.visitor_hash = ${event.visitorHash}
        AND NOT EXISTS (SELECT 1 FROM inserted)
    )
    INSERT INTO usage_geo_daily (day, country, visits, page_views)
    SELECT ${event.day}::date, country, 0, 1 FROM chosen
    ON CONFLICT (day, country) DO UPDATE
      SET page_views = usage_geo_daily.page_views + EXCLUDED.page_views
  `;
}

export async function loadGeoSnapshot(): Promise<GeoSnapshot> {
  await prepareUsageStore();
  const sql = getSql();
  const [daily, uniques] = await Promise.all([
    sql`
      SELECT to_char(day, 'YYYY-MM-DD') AS day,
             country,
             visits,
             page_views
      FROM usage_geo_daily
    ` as Promise<Record<string, unknown>[]>,
    sql`
      SELECT to_char(day, 'YYYY-MM-DD') AS day,
             country,
             count(*)::int AS visitors
      FROM usage_geo_visitors
      GROUP BY day, country
    ` as Promise<Record<string, unknown>[]>,
  ]);
  return {
    daily: daily.map((row) => ({
      day: String(row.day ?? ""),
      country: String(row.country ?? ""),
      visits: count(row.visits),
      pageViews: count(row.page_views),
    })),
    uniques: uniques.map((row) => ({
      day: String(row.day ?? ""),
      country: String(row.country ?? ""),
      visitors: count(row.visitors),
    })),
  };
}
