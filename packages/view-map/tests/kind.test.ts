// What ground is, as the package that holds it.
//
// The frame knows a kind has a name, a mark and a reading of a declaration. This is that reading for a map: which
// declarations it draws, what a scope means, and the reading the place is shown on. The register's own behaviour is the
// frame's and is held there.

import { expect, test } from 'vitest';
import { declaredReadings } from '@ssccsorg/skene-frame/lib/readings';
import { kindOf, readView } from '@ssccsorg/skene-frame/lib/windows';
import { viewKindOf, viewKinds } from '@ssccsorg/skene-frame/lib/view-kinds';
import { MAP, MAP_VIEW } from '../src/index';

test('the package is what installs the kind and the reading', () => {
  expect(viewKinds().map((kind) => kind.kind)).toContain('map');
  expect(viewKindOf('map')).toBe(MAP);
  expect(declaredReadings().find((reading) => reading.key === 'map')).toBe(MAP_VIEW);
});

test('a map is read from its declaration, and a scope this build does not know is the carrier', () => {
  expect(readView({ id: 'yard-map', kind: 'map', cells: [1, 1] })).toEqual({
    id: 'yard-map',
    kind: 'map',
    cells: [1, 1],
    status: 'live',
  });
  // A map of the whole place is the N:1 case: one window over every unit, and the scope is part of the view rather
  // than of the window. A scope this build does not know is read as the carrier, which is what every map was before.
  expect(readView({ id: 'array-map', kind: 'map', scope: 'place', cells: [1.2, 0.75] })).toEqual({
    id: 'array-map',
    kind: 'map',
    scope: 'place',
    cells: [1.2, 0.75],
    status: 'live',
  });
  expect(readView({ id: 'other-map', kind: 'map', scope: 'galaxy', cells: [1, 1] })).toEqual({
    id: 'other-map',
    kind: 'map',
    cells: [1, 1],
    status: 'live',
  });
});

test('the reading is a pane of its own, at its own address, and closes the bar', () => {
  const readings = declaredReadings();
  const map = readings.find((reading) => reading.key === 'map');
  expect(map?.path, 'the map is still reachable at its own address').toBe('/map');
  expect(map?.asked, 'and every place is read on it').toBeUndefined();
  expect(map?.seat, 'a map is not the pilot seat').toBeUndefined();
  expect(map?.pane, 'the map declares itself a pane').toBe(true);
  expect(map?.button?.order).toBe(14);
  expect(readings.filter((reading) => reading.button).at(-1)?.key, 'and it closes the reading run').toBe('map');
});

test('the kind stands over the place and draws a member its own ground', () => {
  expect(kindOf('map')).toBe('map');
  expect(MAP.anchor).toBe('place');
  expect(MAP.place, 'a member with no declared map still gets one in its row').toBe(true);
  expect(MAP.Row).toBeTypeOf('function');
  expect(MAP.Paint).toBeTypeOf('function');
  expect(MAP.Page).toBeTypeOf('function');
});
