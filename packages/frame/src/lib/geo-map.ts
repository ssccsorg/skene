// The ground a map is drawn on, shared by the member's own location and the map read as a whole.
//
// The tiles are OpenStreetMap raster because the style needs no key and no service: a deployment that has never been
// configured still draws the ground. The frame is dark, so the canvas is inverted rather than the frame given a bright
// hole; a mark drawn inside that canvas has to choose its colour for the filter, which is why the routes are black here
// and read as white once the canvas is inverted.
//
// The worker is Vite's own asset URL rather than the path MapLibre resolves at run time. A bundled build would otherwise
// point at a worker file the build never emitted, and the map would draw tiles while every GeoJSON source stayed unloaded.

import type { StyleSpecification } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

/** The picture the light tiles are drawn as: dark ground, light roads, and the water and parks kept their own hue. */
export const DARK_MAP = 'invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92)';

/** The raster style every map in the frame is read through. */
export const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    ground: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'ground', type: 'raster', source: 'ground' }],
};

/** The worker the map's own sources are read in, as the build emitted it. */
export const MAP_WORKER = workerUrl;

/** A source with nothing in it, which is what a place with no route has to hand MapLibre rather than null. */
export const NOTHING = { type: 'FeatureCollection', features: [] } as const;

/** The route as a GeoJSON line, or an empty collection when a unit has not moved. */
export function pathOf(points: { lng: number; lat: number }[]) {
  if (points.length < 2) return NOTHING;
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: points.map((point) => [point.lng, point.lat]) },
  } as never;
}

