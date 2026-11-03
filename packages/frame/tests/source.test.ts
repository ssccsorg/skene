// A run read as a window, held to the arithmetic that replaces reading a file.
//
// This is the one thing the surface changes when it stops holding a run and starts reading one: a reader says which
// range of the run's own addresses it wants, and an answer carries the length of the whole beside the window, because a
// window cannot see how long the run is and a transport has to draw the run rather than what arrived of it.

import { expect, test } from 'vitest';
import { heldSource, windowOf } from '@ssccsorg/skene-kernel';
import type { Entry } from '@ssccsorg/skene-kernel';

const run: Entry[] = [1, 2, 3, 4, 5].map((at) => ({ kind: 'fact', at, origin: 'a/b', bytes: 8, cycle: at }));
const at = (window: { entries: Entry[] }) => window.entries.map((entry) => entry.at);

test('a window is a range of the run, and the length of the run comes with it', () => {
  expect(at(windowOf(run, 0, 3))).toEqual([1, 2, 3]);
  expect(at(windowOf(run, 2, 2))).toEqual([3, 4]);
  expect(windowOf(run, 0, 3).total, 'the window cannot see it, so the run says it').toBe(5);
});

test('a window that runs past the end is short, and the run is still its whole length', () => {
  const last = windowOf(run, 4, 10);
  expect(at(last)).toEqual([5]);
  expect(last.total).toBe(5);
});

test('a window at the end of the run is empty and still says how long the run is', () => {
  // This is the case a cursor resting at the end asks for, and an empty window that reported no length would draw a
  // transport of nothing.
  expect(windowOf(run, 5, 4)).toEqual({ entries: [], total: 5 });
  expect(windowOf(run, 99, 4)).toEqual({ entries: [], total: 5 });
  expect(windowOf(run, 0, 0), 'a window of nothing is nothing').toEqual({ entries: [], total: 5 });
});

test('a window of the whole run is the run, which is what a reader that cannot draw a short one asks for', () => {
  expect(at(windowOf(run, 0, Number.POSITIVE_INFINITY))).toEqual([1, 2, 3, 4, 5]);
});

test('a cursor that is not a number reads from the start rather than failing', () => {
  expect(at(windowOf(run, Number.NaN, 2))).toEqual([1, 2]);
  expect(at(windowOf(run, -3, 2)), 'and one behind the start reads the first records').toEqual([1, 2]);
  expect(at(windowOf(run, 1.7, 2)), 'a place in the run is a record and not a fraction of one').toEqual([2, 3]);
});

test('a project the source holds no run for is refused rather than answered with nothing', async () => {
  const held = heldSource((project) => (project === 'drive' ? run : undefined));
  expect((await held.window('drive', 0, 1)).entries).toHaveLength(1);
  await expect(held.window('nowhere', 0, 1)).rejects.toThrow(/no run is held for nowhere/);
});
