// Windows standing beside one another rather than over one another.
//
// A window that the pilot has not moved is placed by a search: it stands on its own unit when that is clear, and beside
// it when it is not. What the search may not do is put two windows in one place, which is what a take and the still
// published beside it are: they come from one entity, they are the same size, and a search that counted only the marks of
// the place would lay the second exactly on the first.

import { expect, test } from 'vitest';
import { bearingGap, clearOffset, GRATICULE, overlapping, patchHalf, shifted } from '@ssccsorg/skene-board';

const half = patchHalf([1.6, 1]);

test('a window is clear of another window of its own size at half of each one’s reach', () => {
  const reach = Math.max(half[0], half[1]);
  const other = { place: [0, 0] as [number, number], half };

  expect(overlapping([reach, 0], half, [other]), 'its middle inside the other').toBe(1);
  // Two windows of one size clear each other at the sum of their reaches: half of each, and none of the other's body.
  expect(overlapping([reach * 2.1, 0], half, [other]), 'clear of it').toBe(0);
  expect(overlapping([reach * 1.9, 0], half, [other]), 'still over it').toBe(1);
});

test('a take and the still beside it are laid out apart, not on one place', () => {
  const unit: [number, number] = [0.4, 0.2];
  const first = clearOffset(unit, half, [unit], 'take');
  const second = clearOffset(unit, half, [unit], 'still', undefined, [
    { place: shifted(unit, first), half },
  ]);

  expect(bearingGap(shifted(unit, second), shifted(unit, first))).toBeGreaterThan(
    Math.max(half[0], half[1]),
  );
});

test('with nothing to clear, a window still stands on its own unit', () => {
  const unit: [number, number] = [0.3, 0.1];
  expect(clearOffset(unit, half, [], 'take')).toEqual([0, 0]);
});
