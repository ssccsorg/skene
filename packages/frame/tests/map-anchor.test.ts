// A place coordinate has one ground, and a mark on that ground stays where the ground put it.
//
// The earth map is a camera over a place, so zooming and panning move the ground under a unit. A unit whose position
// is derived from the camera instead of from the place would slide against the streets when the map is zoomed, which is
// the bug this holds closed: the marker is set by latitude and longitude, and the place's own numbers are converted by
// one affine map that knows nothing about a camera.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { fromPlace, geoOf, toPlace } from '@/lib/world';
import type { Place } from '@/lib/types';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const PLACE: Place = {
  view: [0, 0, 100, 50],
  geo: { bounds: [10, 60, 20, 70] },
};

test('the place own numbers meet the earth by one affine map, whichever way they are read', () => {
  expect(geoOf(PLACE, [0, 0])).toEqual({ lng: 10, lat: 70 });
  expect(geoOf(PLACE, [100, 50])).toEqual({ lng: 20, lat: 60 });
  expect(geoOf(PLACE, [50, 25])).toEqual({ lng: 15, lat: 65 });

  const [x, y] = toPlace(fromPlace(PLACE, 25, 40), PLACE);
  expect(x).toBeCloseTo(25, 9);
  expect(y).toBeCloseTo(40, 9);
});

test('a marker is placed by the map and never by its order in the page', () => {
  // The element is a child of the map's canvas container. In flow it would sit one marker-height below the marker
  // before it, and that offset is pixels: the ground scales under it when the map is zoomed, so the mark slides off
  // its own place exactly as the camera-derived mark this file is about does. The marker class is what places it.
  const text = readFileSync(here('../src/components/GroundMap.tsx'), 'utf8');
  const element = text.slice(text.indexOf('function unitElement'), text.indexOf('function hoverable'));
  expect(element, 'a unit element is not put back into flow').not.toMatch(/position:\s*relative/);
  expect(element, 'and it does not place itself').not.toMatch(/position:\s*absolute/);
});

test('the earth map anchors a unit by latitude and longitude and never by the camera', () => {
  const text = readFileSync(here('../src/components/GroundMap.tsx'), 'utf8');
  expect(text, 'a unit is a map marker').toContain('new maplibregl.Marker');
  expect(text, 'and the marker is placed on the ground').toContain('.setLngLat(');
  // The space layer is the one exception and the reason for it: an orbital unit is above the ground, so its mark is
  // projected from the globe and joined to the sub-point it watches. The ground's own loop must stay a marker.
  const paint = text.slice(text.indexOf('const paint = (current'), text.indexOf('drawRef.current = paint'));
  expect(paint, 'a ground unit is never placed by the camera').not.toMatch(/map\.project\(/);
  expect(text, 'and a unit above the ground is').toContain('spaceLift(');
});

test('the declared areas are data, and no drawing makes them a dashed rectangle', () => {
  for (const path of [
    '../src/components/GroundMap.tsx',
    '../src/components/MapPatch3D.tsx',
    '../src/components/SpaceMap.tsx',
    '../src/components/MoveContext.tsx',
    '../src/properties/ViewContent.tsx',
  ]) {
    expect(readFileSync(here(path), 'utf8'), path).not.toContain('place.areas');
  }
});
