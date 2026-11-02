// The layers a map draws over its ground, kept apart from the ground and from the component that draws it.
//
// A mission HUD, a pointing layer, and a range ring are data. What a strategy view puts on a place belongs to the
// scenario rather than to the map, so the map is handed layers and draws them, and a module contributes one without the
// map knowing what a mission is. The shapes here are GeoJSON and plain values rather than React or MapLibre objects, so
// this surface can move out of the app with the map when it is packaged.
//
// Nothing is registered by default. A place's declared areas are data the scenario still holds, and drawing them as
// dotted rectangles was the map making a claim it was not asked to make; the scenario that wants them says so through
// this register, and the frame draws what it was told to.

import type { Place } from './types';
import { geoOf } from './world';

/** What a layer is for, which is enough for the map to choose an ink and a weight without knowing its subject. */
export type OverlayKind = 'hud' | 'pointing' | 'route';

/** One layer handed to a map: an identifier, its purpose, and GeoJSON. */
export interface Overlay {
  id: string;
  kind: OverlayKind;
  data: unknown;
}

/** A module's answer for one place. It is asked on every draw, so it may depend on the run as well as the place. */
export type OverlaySource = (place: Place) => Overlay[];

const sources = new Map<string, OverlaySource>();

/** Put a layer source in the register under the name its module owns. */
export function registerOverlays(key: string, source: OverlaySource): void {
  sources.set(key, source);
}

/** Every layer the register has for this place, in the order the sources were registered. */
export function overlaysOf(place: Place): Overlay[] {
  return [...sources.values()].flatMap((source) => source(place));
}

/** The ink and weight a layer kind is drawn at. The map's ground is inverted, so black reads as white. */
export const OVERLAY_PAINT: Record<OverlayKind, { color: string; width: number; dash?: number[] }> = {
  hud: { color: '#6fbf9f', width: 1.4 },
  pointing: { color: '#e6ece9', width: 1.4, dash: [4, 4] },
  route: { color: '#000000', width: 2 },
};

/** A GeoJSON polygon of the place's own ground. */
export interface PolygonFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'Polygon'; coordinates: [number, number][][] };
}

/** A GeoJSON point of the place's own ground. */
export interface PointFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'Point'; coordinates: [number, number] };
}

/** A rectangle of the place's own coordinates as a GeoJSON polygon, which is what a HUD or a pointing layer asks for. */
export function polygonOf(
  place: Place,
  box: { x: number; y: number; w: number; h: number },
  properties: Record<string, unknown> = {},
): PolygonFeature | null {
  const ring: [number, number][] = [];
  for (const [x, y] of [
    [box.x, box.y],
    [box.x + box.w, box.y],
    [box.x + box.w, box.y + box.h],
    [box.x, box.y + box.h],
  ]) {
    const point = geoOf(place, [x, y]);
    if (!point) return null;
    ring.push([point.lng, point.lat]);
  }
  ring.push(ring[0]);
  return {
    type: 'Feature',
    properties,
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

/** One point of the place as a GeoJSON point. */
export function pointOf(
  place: Place,
  x: number,
  y: number,
  properties: Record<string, unknown> = {},
): PointFeature | null {
  const point = geoOf(place, [x, y]);
  if (!point) return null;
  return {
    type: 'Feature',
    properties,
    geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
  };
}

/** Several features as one collection, which is what a MapLibre source reads. */
export function collectionOf(features: unknown[]) {
  return { type: 'FeatureCollection', features: features.filter(Boolean) };
}
