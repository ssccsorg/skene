// The layers a map draws over its ground, held as data rather than as a drawing.
//
// A mission HUD and a pointing layer are the scenario's, so the map is handed geometry and draws it. What is asserted
// here is the conversion from the place's own numbers to the earth, which is the one thing a layer author has to get
// right, and that the register is empty until a module declares something.

import { expect, test } from 'vitest';
import { collectionOf, overlaysOf, pointOf, polygonOf, registerOverlays } from '@/lib/map-overlays';
import type { Place } from '@ssccsorg/skene-kernel';

const PLACE: Place = {
  view: [0, 0, 100, 50],
  geo: { bounds: [10, 60, 20, 70] },
};

test('a rectangle of the place becomes a closed polygon on the earth', () => {
  const feature = polygonOf(PLACE, { x: 0, y: 0, w: 100, h: 50 }, { label: 'the yard' });
  expect(feature).not.toBeNull();
  expect(feature?.properties.label).toBe('the yard');
  expect(feature?.geometry.coordinates[0]).toEqual([
    [10, 70],
    [20, 70],
    [20, 60],
    [10, 60],
    [10, 70],
  ]);
});

test('a point of the place lands where the same affine map puts it', () => {
  const feature = pointOf(PLACE, 50, 25);
  expect(feature?.geometry.coordinates).toEqual([15, 65]);
});

test('a place with no geography has no earth geometry to hand a map', () => {
  expect(polygonOf({ view: [0, 0, 100, 50] }, { x: 0, y: 0, w: 10, h: 10 })).toBeNull();
  expect(pointOf({ view: [0, 0, 100, 50] }, 5, 5)).toBeNull();
});

test('the register is empty until a module declares a layer, and then it answers for a place', () => {
  const before = overlaysOf(PLACE).length;
  registerOverlays('mission-hud', () => [
    { id: 'objective', kind: 'hud', data: collectionOf([pointOf(PLACE, 50, 25, { label: 'the fire' })]) },
  ]);
  const after = overlaysOf(PLACE);
  expect(after.length).toBe(before + 1);
  expect(after.at(-1)?.id).toBe('objective');
  expect(after.at(-1)?.kind).toBe('hud');
});
