// When a view stands.
//
// A still declared with a scene is footage the run plays, so the boundary is the assertion: a scene owns the second it
// opens at and not the second it closes at, and a view that names no bounds is never closed.

import { expect, test } from 'vitest';
import { standsAt, timed } from '../src/when';

test('a view with no bounds stands for the whole run', () => {
  const whole = {};
  expect(timed(whole), 'and is not what a scene is made of').toBe(false);
  expect(standsAt(whole, 0)).toBe(true);
  expect(standsAt(whole, 12_000)).toBe(true);
});

test('a view stands from the second it opens at, that second included', () => {
  const opens = { from: 300 };
  expect(timed(opens)).toBe(true);
  expect(standsAt(opens, 299)).toBe(false);
  expect(standsAt(opens, 300), 'the second it opens at is its own').toBe(true);
  expect(standsAt(opens, 900)).toBe(true);
});

test('a view does not stand at the second it closes at', () => {
  const closes = { to: 900 };
  expect(standsAt(closes, 0)).toBe(true);
  expect(standsAt(closes, 899), 'the last second before it closes').toBe(true);
  expect(standsAt(closes, 900), 'and that second belongs to what follows').toBe(false);
});

test('a scene is one stretch of the run, and two scenes never stand together', () => {
  const first = { from: 300, to: 900 };
  const second = { from: 900, to: 1200 };
  expect(standsAt(first, 300)).toBe(true);
  expect(standsAt(first, 899)).toBe(true);
  expect(standsAt(first, 900), 'the boundary is the next scene of the same run').toBe(false);
  expect(standsAt(second, 900)).toBe(true);
  expect(standsAt(second, 1200)).toBe(false);
});
