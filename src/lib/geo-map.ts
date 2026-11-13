import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";

type CountryProps = { name?: string };
type WorldAtlas = Topology<{ countries: GeometryCollection<CountryProps> }>;

export type CountryShape = {
  id: string;
  d: string;
};

const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 420;

let shapes: CountryShape[] | null = null;

export function mapViewBox() {
  return `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`;
}

/** Local Natural Earth shapes. No tile server. */
export function countryShapes(): CountryShape[] {
  if (shapes) return shapes;
  const topology = world as unknown as WorldAtlas;
  const collection = feature(topology, topology.objects.countries) as FeatureCollection<Geometry, CountryProps>;
  const land: FeatureCollection<Geometry, CountryProps> = {
    type: "FeatureCollection",
    features: collection.features.filter((item): item is Feature<Geometry, CountryProps> => {
      const id = String(item.id ?? "");
      return id !== "" && id !== "010";
    }),
  };
  const projection = geoEqualEarth().fitExtent(
    [
      [8, 16],
      [VIEW_WIDTH - 8, VIEW_HEIGHT - 12],
    ],
    land,
  );
  const outline = geoPath(projection);
  shapes = land.features.flatMap((item) => {
    const d = outline(item);
    if (!d) return [];
    return [{ id: String(item.id), d }];
  });
  return shapes;
}
