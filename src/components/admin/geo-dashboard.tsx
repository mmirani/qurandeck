import {
  GEO_EMPTY,
  GEO_RANGES,
  countryNumericId,
  formatShare,
  geoFill,
  geoScaleBands,
  geoStatsHref,
  geoSummaryText,
  type GeoDir,
  type GeoRange,
  type GeoSort,
  type GeoSummary,
} from "@/lib/geo";
import { countryShapes, mapViewBox } from "@/lib/geo-map";

const RANGE_LABELS: Record<GeoRange, string> = {
  "7": "7 days",
  "28": "28 days",
  "90": "90 days",
  all: "All time",
};

const SORT_LABELS: Record<GeoSort, string> = {
  country: "Country",
  visitors: "Visitors",
  share: "Share",
};

export function GeoDashboard({ summary }: { summary: GeoSummary | null }) {
  return (
    <section id="countries" className="qd-pad rounded-3xl border border-line bg-surface" aria-labelledby="geo-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="geo-heading" className="font-display text-xl font-semibold text-ink">
            Countries
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
            Unique visitors by country. Each day is counted on its own, so a reader who returns tomorrow counts again.
            The country comes from the connection and is not stored with an IP address, city, or page address.
          </p>
        </div>
      </div>
      {summary ? <GeoBody summary={summary} /> : <p className="mt-4 text-sm text-ink-soft">Country counts are unavailable right now.</p>}
    </section>
  );
}

function GeoBody({ summary }: { summary: GeoSummary }) {
  const summaryText = geoSummaryText(summary);
  return (
    <div className="mt-5 flex flex-col gap-5">
      <nav aria-label="Date range" className="flex flex-wrap gap-2">
        {GEO_RANGES.map((range) => {
          const current = range === summary.range;
          return (
            <a
              key={range}
              href={geoStatsHref({ range, sort: summary.sort, dir: summary.dir })}
              aria-current={current ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium ${
                current ? "bg-gold text-on-gold" : "border border-line text-ink"
              }`}
            >
              {RANGE_LABELS[range]}
            </a>
          );
        })}
      </nav>

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
        <Kpi label="Unique visitors" value={summary.uniqueVisitors} hint="Counted once per day" />
        <Kpi label="Visits" value={summary.visits} hint="A day the reader opened the app" />
        <Kpi label="Page views" value={summary.pageViews} hint="Pages opened, without the address" />
      </div>

      <WorldMap summary={summary} summaryText={summaryText} />
      <CountryTable summary={summary} />
      <Trend summary={summary} />
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border border-line/70 px-3 py-3 sm:px-4">
      <p className="text-sm font-medium leading-5 text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums leading-none text-ink sm:text-4xl">
        {value.toLocaleString("en-US")}
      </p>
      <p className="mt-2 text-xs leading-5 text-ink-soft">{hint}</p>
    </div>
  );
}

function WorldMap({ summary, summaryText }: { summary: GeoSummary; summaryText: string }) {
  const shapes = countryShapes();
  const visitors = new Map<string, { name: string; visitors: number }>();
  for (const row of summary.countries) {
    const id = countryNumericId(row.country);
    if (!id || row.country === "ZZ") continue;
    visitors.set(id, { name: row.name, visitors: row.visitors });
  }
  const bands = geoScaleBands(summary.maxVisitors);

  return (
    <figure>
      <figcaption id="geo-map-summary" className="text-sm leading-6 text-ink">
        {summaryText} The table under the map lists every country.
      </figcaption>
      <svg
        viewBox={mapViewBox()}
        role="img"
        aria-labelledby="geo-map-summary"
        className="mt-3 h-auto w-full"
      >
        {shapes.map((shape) => {
          const row = visitors.get(shape.id);
          const value = row?.visitors ?? 0;
          return (
            <path
              key={shape.id}
              d={shape.d}
              fill={geoFill(value, summary.maxVisitors)}
              stroke="var(--surface)"
              strokeWidth={0.6}
            >
              <title>{row ? `${row.name}: ${row.visitors.toLocaleString("en-US")} unique visitors` : "No visitors"}</title>
            </path>
          );
        })}
      </svg>
      <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-soft" aria-label="Map legend">
        <li className="flex items-center gap-2">
          <span className="h-3 w-6 rounded-sm border border-line" style={{ background: GEO_EMPTY }} aria-hidden="true" />
          None
        </li>
        {bands.map((band) => (
          <li key={band.step} className="flex items-center gap-2">
            <span className="h-3 w-6 rounded-sm border border-line" style={{ background: band.fill }} aria-hidden="true" />
            {band.from === band.to ? band.from.toLocaleString("en-US") : `${band.from.toLocaleString("en-US")}–${band.to.toLocaleString("en-US")}`}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs leading-5 text-ink-soft">Darker means more unique visitors. Colour is not the only cue: the table has the counts.</p>
    </figure>
  );
}

function CountryTable({ summary }: { summary: GeoSummary }) {
  const columns: GeoSort[] = ["country", "visitors", "share"];
  return (
    <div>
      {summary.countries.length === 0 ? (
        <p className="text-sm text-ink-soft">No visitors in this range.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Unique visitors by country for {summary.rangeLabel}. This table is the text version of the map.
            </caption>
            <thead>
              <tr className="text-ink-soft">
                {columns.map((column) => {
                  const active = summary.sort === column;
                  const nextDir: GeoDir = active && summary.dir === "asc" ? "desc" : active ? "asc" : column === "country" ? "asc" : "desc";
                  return (
                    <th
                      key={column}
                      scope="col"
                      aria-sort={active ? (summary.dir === "asc" ? "ascending" : "descending") : "none"}
                      className={column === "country" ? "pb-2 font-medium" : "pb-2 text-right font-medium"}
                    >
                      <a
                        href={geoStatsHref({ range: summary.range, sort: column, dir: nextDir })}
                        className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                      >
                        {SORT_LABELS[column]}
                        <span className="sr-only">{active ? `, sorted ${summary.dir === "asc" ? "ascending" : "descending"}` : ", sort"}</span>
                      </a>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {summary.countries.map((row) => (
                <tr key={row.country} className="border-t border-line/70">
                  <th scope="row" className="py-2.5 pr-3 font-medium text-ink">
                    {row.flag ? (
                      <span className="mr-2" aria-hidden="true">
                        {row.flag}
                      </span>
                    ) : null}
                    {row.name}
                  </th>
                  <td className="py-2.5 text-right tabular-nums text-ink">{row.visitors.toLocaleString("en-US")}</td>
                  <td className="py-2.5 text-right tabular-nums text-ink">{formatShare(row.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Trend({ summary }: { summary: GeoSummary }) {
  const width = 640;
  const height = 120;
  const pad = 10;
  const max = Math.max(1, ...summary.trend.map((day) => day.visitors));
  const points = summary.trend.map((day, index) => {
    const x = summary.trend.length <= 1 ? width / 2 : pad + (index / (summary.trend.length - 1)) * (width - pad * 2);
    const y = height - pad - (day.visitors / max) * (height - pad * 2);
    return { ...day, x, y };
  });
  const line = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const peak = summary.trend.reduce((best, day) => (day.visitors > best.visitors ? day : best), summary.trend[0]);
  const first = summary.trend[0];
  const last = summary.trend[summary.trend.length - 1];

  return (
    <div>
      <h3 className="font-display text-lg font-semibold text-ink">Daily unique visitors</h3>
      <p className="mt-1 text-sm text-ink-soft">
        {first && last ? `${formatDay(first.day)} – ${formatDay(last.day)} UTC.` : "No days in this range."}{" "}
        {peak && peak.visitors > 0 ? `The busiest day was ${formatDay(peak.day)} with ${peak.visitors.toLocaleString("en-US")}.` : "No visitors in this range."}
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-28 w-full" aria-hidden="true">
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--line)" strokeWidth={1} />
        {points.length > 1 ? (
          <polyline fill="none" stroke="var(--gold-deep)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={line} />
        ) : null}
        {points.map((point) => (
          <circle key={point.day} cx={point.x} cy={point.y} r={points.length > 40 ? 0 : 2.5} fill="var(--gold-deep)" />
        ))}
      </svg>
      <table className="sr-only">
        <caption>Unique visitors, visits, and page views per UTC day for {summary.rangeLabel}</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Unique visitors</th>
            <th>Visits</th>
            <th>Page views</th>
          </tr>
        </thead>
        <tbody>
          {summary.trend.map((day) => (
            <tr key={day.day}>
              <th scope="row">{formatDay(day.day)}</th>
              <td>{day.visitors}</td>
              <td>{day.visits}</td>
              <td>{day.pageViews}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
