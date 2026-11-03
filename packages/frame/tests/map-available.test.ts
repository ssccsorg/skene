// The map is a view mode a place offers, not one the frame offers every place.
//
// A map needs two declarations: a ground with a real span, and at least one member whose kind presents a location. The
// button is disabled where either is missing, so an empty picture is not a mode a pilot can enter. The same predicate is
// what the split layout reads, which is what keeps the button and the pane from disagreeing about a project.

import { expect, test } from 'vitest';
import { mappable } from '@/lib/world';
import type { Place, Properties, Standing, World } from '@ssccsorg/skene-kernel';

const PLACE: Place = {
  view: [0, 0, 100, 50],
  geo: { bounds: [10, 60, 20, 70] },
};

const properties = (shows: boolean): Properties => ({
  reads: true,
  writes: true,
  emits: false,
  shows,
  holds: false,
  person: false,
});

const unit = (shows: boolean): Standing => ({
  id: 'machine-1',
  icon: 'machine',
  model: null,
  role: null,
  title: null,
  properties: properties(shows),
  abilities: [],
  holdsAt: 'machine-1',
  at: [0, 0, 0],
  from: [0, 0, 0],
  orbital: false,
  altitude: null,
  watch: null,
  ground: [50, 25],
  path: [[0, 0, 0]],
  moved: false,
  written: 0,
});

const world = (...units: Standing[]): World => ({ standing: units }) as unknown as World;

test('a ground and one located member are what a map needs', () => {
  expect(mappable(PLACE, world(unit(true)))).toBe(true);
});

test('a place that declares no ground offers no map', () => {
  expect(mappable({ view: [0, 0, 100, 50] }, world(unit(true)))).toBe(false);
});

test('a ground with no span or a view with no width is not a map', () => {
  expect(mappable({ ...PLACE, geo: { bounds: [10, 60, 10, 70] } }, world(unit(true)))).toBe(false);
  expect(mappable({ ...PLACE, geo: { bounds: [10, 60, 20, 60] } }, world(unit(true)))).toBe(false);
  expect(mappable({ view: [0, 0, 0, 50], geo: PLACE.geo }, world(unit(true)))).toBe(false);
  expect(mappable({ ...PLACE, geo: { bounds: [10, 60, 20, Number.NaN] } }, world(unit(true)))).toBe(false);
});

test('a ground with no member that presents a location offers no map', () => {
  expect(mappable(PLACE, world())).toBe(false);
  expect(mappable(PLACE, world(unit(false)))).toBe(false);
  expect(mappable(PLACE, null)).toBe(false);
});
