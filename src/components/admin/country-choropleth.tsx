import { GEO_EMPTY, countryNumericId, geoFill, geoScaleBands } from "@/lib/geo";
import { countryShapes, mapViewBox } from "@/lib/geo-map";

export type ChoroplethRow = {
  country: string;
  name: string;
  value: number;
};

export function CountryChoropleth({
  rows,
  max,
  summaryId,
  summaryText,
  valueNoun,
  emptyTitle = `No ${valueNoun}`,
}: {
  rows: ChoroplethRow[];
  max: number;
  summaryId: string;
  summaryText: string;
  valueNoun: string;
  emptyTitle?: string;
}) {
  const shapes = countryShapes();
  const values = new Map<string, ChoroplethRow>();
  for (const row of rows) {
    const id = countryNumericId(row.country);
    if (!id || row.value <= 0) continue;
    values.set(id, row);
  }
  const bands = geoScaleBands(max);

  return (
    <figure>
      <figcaption id={summaryId} className="text-sm leading-6 text-ink">
        {summaryText}
      </figcaption>
      <svg viewBox={mapViewBox()} role="img" aria-labelledby={summaryId} className="mt-3 h-auto w-full">
        {shapes.map((shape) => {
          const row = values.get(shape.id);
          const value = row?.value ?? 0;
          const title = row ? `${row.name}: ${row.value.toLocaleString("en-US")} ${valueNoun}` : emptyTitle;
          return (
            <path key={shape.id} d={shape.d} fill={geoFill(value, max)} stroke="var(--surface)" strokeWidth={0.6}>
              <title>{title}</title>
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
            {band.from === band.to
              ? band.from.toLocaleString("en-US")
              : `${band.from.toLocaleString("en-US")}–${band.to.toLocaleString("en-US")}`}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs leading-5 text-ink-soft">
        Darker means more {valueNoun}. Colour is not the only cue: the table has the counts.
      </p>
    </figure>
  );
}
