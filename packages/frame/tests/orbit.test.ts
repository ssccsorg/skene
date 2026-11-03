// The altitude a place declares, and what the globe reads it as.
//
// The shell is a direction from the pilot and not a distance, so a unit on it stands at one radius whatever its height.
// An altitude is the one number that says otherwise: it lifts a mark off that radius, and the frame reads the lift as a
// ring around the mark and as the height beside its name. What is held here is the band that lift is drawn on, because
// it is a choice the drawing makes and not a number the place declares.

import { expect, test } from 'vitest';

import { ORBIT_LIFT, altitudeOf, liftOf, orbitLift, orbitRing, orbitalAt, ringOf, spaceLift } from '@ssccsorg/skene-board';

/** The length of a point of the shell, which is the radius a lift is added to. */
const length = ([x, y, z]: [number, number, number]) => Math.hypot(x, y, z);

test('a unit with no declared altitude keeps the near orbit the board drew before a height was a declaration', () => {
  expect(orbitLift(null)).toBe(ORBIT_LIFT);
  expect(orbitLift(undefined)).toBe(ORBIT_LIFT);
  expect(orbitLift(Number.NaN)).toBe(ORBIT_LIFT);
});

test('an altitude stands a mark further from the shell the higher it is, on a band with two ends', () => {
  const floor = orbitLift(200_000);
  const middle = orbitLift(1_200_000);
  const ceiling = orbitLift(36_000_000);
  expect(floor).toBeCloseTo(0.18);
  expect(ceiling).toBeCloseTo(0.72);
  expect(middle).toBeGreaterThan(floor);
  expect(ceiling).toBeGreaterThan(middle);
  // An altitude below the band's floor and one above its ceiling are held to the band rather than drawn off the board.
  expect(orbitLift(50_000)).toBe(floor);
  expect(orbitLift(100_000_000)).toBe(ceiling);
});

test('a mark higher above the ground wears a wider ring, which is how the height is read in the frame', () => {
  const altitudes = [200_000, 550_000, 1_200_000, 20_200_000, 36_000_000];
  for (let index = 1; index < altitudes.length; index += 1) {
    expect(orbitRing(altitudes[index]), `the ring at ${altitudes[index]}`).toBeGreaterThan(
      orbitRing(altitudes[index - 1]),
    );
    expect(orbitLift(altitudes[index]), `the lift at ${altitudes[index]}`).toBeGreaterThan(
      orbitLift(altitudes[index - 1]),
    );
  }
  expect(orbitRing(null), 'a mark with no declared height still has a ring').toBeGreaterThan(0);
});

test('a lift moves the mark away from the seat and leaves the bearing the place gave it', () => {
  const point: [number, number, number] = [0.4, 0.3, 0.5];
  const lift = orbitLift(35_786_000);
  const lifted = orbitalAt(point, lift);
  expect(length(lifted) - length(point), 'the altitude is the lift, in shell radii').toBeCloseTo(lift);
  for (const axis of [0, 1, 2]) {
    expect(lifted[axis] / length(lifted), `axis ${axis} keeps its direction`).toBeCloseTo(
      point[axis] / length(point),
    );
  }
});

test('a lift is a unit above the ground, and a unit that declares neither a sub-point nor a height stays on it', () => {
  expect(liftOf({ orbital: false, altitude: null })).toBe(0);
  expect(liftOf({ orbital: false, altitude: 0 })).toBe(0);
  expect(liftOf({ orbital: true, altitude: null })).toBe(ORBIT_LIFT);
  expect(liftOf({ orbital: false, altitude: 120 })).toBeGreaterThan(0);
  expect(liftOf({ orbital: true, altitude: 35_786_000 })).toBe(orbitLift(35_786_000));
  expect(ringOf({ orbital: false, altitude: null })).toBe(0);
  expect(ringOf({ orbital: true, altitude: null })).toBeGreaterThan(0);
});

test('a space entity stands further above the globe the higher it is', () => {
  const altitudes = [200_000, 550_000, 1_200_000, 20_200_000, 36_000_000];
  for (let index = 1; index < altitudes.length; index += 1) {
    expect(spaceLift(altitudes[index]), `the space lift at ${altitudes[index]}`).toBeGreaterThan(
      spaceLift(altitudes[index - 1]),
    );
  }
  expect(spaceLift(null), 'an orbital unit with no declared height still stands above the ground').toBeGreaterThan(0);
});

test('an altitude reads in metres under a kilometre and in grouped kilometres above it', () => {
  expect(altitudeOf(120)).toBe('120 m');
  expect(altitudeOf(550_000)).toBe('550 km');
  expect(altitudeOf(1_200_000)).toBe('1,200 km');
  expect(altitudeOf(35_786_000)).toBe('35,786 km');
});
