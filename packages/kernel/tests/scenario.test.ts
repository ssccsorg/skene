// A fact that reports a measurement, which is not the size of anything.
//
// A record's `bytes` is the size of the payload it holds. A market volume or a security status is neither, and a screen
// that read `23321824662 bytes` for the first would be stating the wrong thing with the right number. `measured` is the
// verb that keeps the two apart, so a reader can say what the number counts.

import { expect, test } from 'vitest';

import { parseScenario } from '../src/scenario';

test('a measured fact carries the number and what it counts, and no payload size', () => {
  const { records, unknown } = parseScenario('measured spike-volume 23321824662 units jita-4-4/market\n');
  expect(unknown).toEqual([]);
  const [entry] = records;
  expect(entry.kind).toBe('fact');
  expect(entry.label).toBe('spike-volume');
  expect(entry.origin).toBe('jita-4-4/market');
  expect(entry.measure).toEqual({ value: 23321824662, unit: 'units' });
  expect(entry.bytes, 'a measurement is not a payload').toBeUndefined();
});

test('a measured fact is one fact, so a count over it derives', () => {
  const { checks } = parseScenario('measured first 4.24 isk a/market\nmeasured second 3.54 isk a/market\ncount 2\n');
  expect(checks.map((check) => check.derived)).toEqual([2]);
});
