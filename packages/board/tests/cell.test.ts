// The cell a place holds, held to what it claims: a place's members stand inside it, and its own edge is the
// ground a cell is drawn from.
//
// A cell is the shell's answer to a deployment that stands many places in one space. The old answer was a cap
// around each place's bearing, and caps of one radius overlap as soon as two places are near each other. A
// tiling gives each place the ground it holds, so what is asserted here is the two directions of that claim:
// a member is inside the cell it was laid in, and nothing a cell draws reaches past the cell.

import { expect, test } from 'vitest';

import {
  ARC,
  ELEVATION,
  angleBetween,
  bearingGap,
  bearingOf,
  cellAt,
  cellCentre,
  cellOfPlace,
  cellReach,
  cellRim,
  cellScale,
  onShell,
  outlineOfCell,
  placed,
  shellAt,
} from '@ssccsorg/skene-board';

const ASPECT = 520 / 176;
const SECTOR: [number, number] = [0.4, 0.1];

/** A regular spherical cell of `reach` around a bearing, as the tiling hands one over. */
function cellAt3(reach: number, sector: [number, number] = [0, 0], sides = 6): [number, number][] {
  const centre = shellAt(sector, 1);
  const east = [Math.cos(sector[0]), 0, Math.sin(sector[0])];
  const north = [
    -Math.sin(sector[1]) * Math.sin(sector[0]),
    Math.cos(sector[1]),
    Math.sin(sector[1]) * Math.cos(sector[0]),
  ];
  const cell: [number, number][] = [];
  for (let side = 0; side < sides; side += 1) {
    const turn = (side / sides) * Math.PI * 2;
    const point = [0, 1, 2].map(
      (axis) =>
        centre[axis] * Math.cos(reach) +
        (east[axis] * Math.cos(turn) + north[axis] * Math.sin(turn)) * Math.sin(reach),
    );
    cell.push(bearingOf(point as [number, number, number]));
  }
  return cell;
}

test('a place that declares no cell is drawn exactly where it was before', () => {
  const points: [number, number, number][] = [
    [0, 0, 0],
    [ASPECT / 2, 0.5, 0],
    [-ASPECT / 2, -0.5, 0],
    [0.7, -0.2, 0.3],
  ];
  for (const point of points) {
    expect(onShell(point, { aspect: ASPECT, sector: SECTOR, cell: null })).toEqual(
      placed(point, ASPECT, SECTOR),
    );
  }
});

test('a cell is read from the degrees a place declares', () => {
  const cell = cellOfPlace({ cell: [[0, 0], [10, 0], [10, 10], [0, 10]] });
  expect(cell).toHaveLength(4);
  expect(cell?.[1][0]).toBeCloseTo((10 * Math.PI) / 180, 12);
  expect(cellOfPlace({})).toBeNull();
  expect(cellOfPlace({ cell: [[0, 0], [1, 1]] }), 'two corners are not a cell').toBeNull();
});

test('a cell is a hexagon whose edge is the reach it declares', () => {
  const reach = 0.2;
  const cell = cellAt3(reach, SECTOR);
  // The middle of a regular hexagon is at its centre, and its nearest edge is the apothem of the spherical hexagon.
  expect(bearingGap(cellCentre(cell), SECTOR)).toBeCloseTo(0, 6);
  const apothem = Math.acos(Math.cos(reach) / Math.sqrt(1 - 0.25 * Math.sin(reach) ** 2));
  expect(cellReach(cell)).toBeCloseTo(apothem, 6);
});

test('a place inside a cell lays every corner of its own box inside the cell', () => {
  const cell = cellAt3(0.2, SECTOR);
  const reach = cellReach(cell);
  const corners: [number, number, number][] = [
    [ASPECT / 2, 0.5, 0],
    [-ASPECT / 2, 0.5, 0],
    [ASPECT / 2, -0.5, 0],
    [-ASPECT / 2, -0.5, 0],
  ];
  const middle = shellAt(cellCentre(cell), 1);
  for (const corner of corners) {
    const at = onShell(corner, { aspect: ASPECT, sector: SECTOR, cell });
    const gap = angleBetween(at, middle);
    expect(gap, `a corner at ${corner} stands inside the cell`).toBeLessThan(reach);
  }
});

test('a cell wider than the standard patch keeps the patch rather than growing the place', () => {
  const wide = cellAt3(0.5);
  expect(cellScale(wide)).toBe(1);
  // The largest corner of the standard patch is this far from its middle, and a cell that holds it needs no shrinking.
  const corner = onShell([ASPECT / 2, 0.5, 0], { aspect: ASPECT, sector: SECTOR });
  expect(angleBetween(corner, shellAt(SECTOR, 1))).toBeLessThan(0.5);
  // A cell of the size a ninety-place tiling gives is smaller than the patch, and the place is pressed into it.
  expect(cellScale(cellAt3(0.2))).toBeLessThan(1);
  expect(cellScale(cellAt3(0.2))).toBeGreaterThan(0);
});

test('the edge of a cell is drawn as the ground it bounds', () => {
  const cell = cellAt3(0.2, SECTOR);
  const rim = cellRim(cell, 4);
  expect(rim.length).toBe(cell.length * 4);
  for (const point of rim) {
    expect(Math.hypot(...point)).toBeCloseTo(1.25, 6);
    // The rim is the cell's own boundary: its corners are the circumradius, so nothing on it stands past the cell.
    expect(angleBetween(point, cellAt(cell))).toBeLessThanOrEqual(0.2 + 1e-6);
    expect(angleBetween(point, cellAt(cell))).toBeGreaterThanOrEqual(cellReach(cell) - 1e-6);
  }
});

test('a cell on the disc is cut at the horizon and a cell behind it is not drawn', () => {
  const front = outlineOfCell(cellAt3(0.2, [0, 0]));
  expect(front, 'a cell in front of the pilot is a path').toMatch(/^M/);
  const far = outlineOfCell(cellAt3(0.2, [Math.PI, 0]));
  expect(far, 'a cell behind the pilot has no ground on the disc').toBeNull();
  // A cell that crosses the horizon is cut: no point of its path is off the disc.
  const across = outlineOfCell(cellAt3(0.5, [Math.PI / 2, 0]));
  expect(across).toMatch(/^M/);
  for (const pair of (across ?? '').matchAll(/(-?\d+\.\d+) (-?\d+\.\d+)/g)) {
    expect(Math.hypot(Number(pair[1]), Number(pair[2]))).toBeLessThanOrEqual(1.0001);
  }
});

test('the standard patch is the reach a cell is measured against', () => {
  // The patch's own corner is what `cellScale` measures a cell against: the two angles the place's rectangle covers.
  // The numbers are read here so a change to either arc is a change this test sees.
  const corner = bearingOf(placed([ASPECT / 2, 0.5, 0], ASPECT, [0, 0]));
  const stated = Math.hypot((ARC * Math.PI) / 720, (ELEVATION * Math.PI) / 720);
  expect(Math.hypot(...corner)).toBeCloseTo(stated, 6);
  expect(corner[0]).toBeGreaterThan(0);
  expect(corner[1]).toBeLessThan(0);
});
