// The ground divided into cells, held to the two directions being one conversion.
//
// A cell is named in one direction and drawn in the other, so the two have to agree about every point of the ground:
// a cell read from a point and a middle read back from that cell have to be the same cell, and a cell a point is read
// into has to be the cell whose middle is nearest that point. The rest is the shape of the lattice, which the eye reads
// as hexes only if the geometry is a hex: six corners at one distance, and neighbours at the step a hex has.

import { expect, test } from 'vitest';

import { CELLS_TALL, NEST, apart, between, cellPath, cellSize, cellsOver, cellOf, centreOf, cornersOf, distanceOf, frameReach, ring, ringsByDepth, ringsFor, spiral, spread, type Cell } from '@/lib/hex';
import { levelOf, frameBox } from '@/views/HexView';
import type { Held } from '@/lib/holds';
import { fromPlace, toPlace } from '@/lib/world';
import type { Place } from '@/lib/types';

/** A ground of the size the shipped scenarios declare, which is the shape a map is drawn of. */
const VIEW: [number, number, number, number] = [0, 0, 520, 176];
const SIZE = cellSize(VIEW);
/** The frame's own middle at its own nought, which is the ground a level is laid out on rather than the place's. */
const ZERO_VIEW: [number, number, number, number] = [0, 0, 0, 0];

/** The middle of any frame, which is where the thing the frame is about stands. */
const MIDDLE_CELL: Cell = { q: 0, r: 0 };

/** The six cells around one, which is what a rounding has to choose between. */
const NEIGHBOURS: Cell[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

test('a cell read from a point and a middle read back from it are the same cell', () => {
  for (let x = 5; x < 515; x += 37) {
    for (let y = 3; y < 175; y += 23) {
      const cell = cellOf([x, y], SIZE, VIEW);
      expect(cellOf(centreOf(cell, SIZE, VIEW), SIZE, VIEW), `${x},${y}`).toEqual(cell);
    }
  }
});

test('the cell a point falls in is the one whose middle is nearest it', () => {
  for (let x = 7; x < 515; x += 53) {
    for (let y = 4; y < 175; y += 31) {
      const point: [number, number] = [x, y];
      const found = cellOf(point, SIZE, VIEW);
      const mine = Math.hypot(...centreOf(found, SIZE, VIEW).map((each, index) => each - point[index]));
      for (const around of NEIGHBOURS) {
        const other: Cell = { q: found.q + around.q, r: found.r + around.r };
        const theirs = Math.hypot(...centreOf(other, SIZE, VIEW).map((each, index) => each - point[index]));
        expect(mine, `${x},${y} against ${other.q},${other.r}`).toBeLessThanOrEqual(theirs + 1e-9);
      }
    }
  }
});

test('a cell is a hex: six corners, each one edge from the middle, and the step between rows', () => {
  const cell = { q: 1, r: -1 };
  const [cx, cy] = centreOf(cell, SIZE, VIEW);
  const corners = cornersOf(cell, SIZE, VIEW);
  expect(corners).toHaveLength(6);
  for (const [x, y] of corners) {
    expect(Math.hypot(x - cx, y - cy), 'a corner is one edge from the middle').toBeCloseTo(SIZE, 6);
  }

  // The row below a cell is a whole cell and a half away in the place's own y, and half an edge across: that offset is
  // what makes six-sided cells tile, and a lattice without it is a grid of hexes drawn apart.
  const [nx, ny] = centreOf({ q: 1, r: 0 }, SIZE, VIEW);
  expect(ny - cy).toBeCloseTo(SIZE * 1.5, 6);
  expect(nx - cx).toBeCloseTo((SIZE * Math.sqrt(3)) / 2, 6);

  // A cell drawn is a closed path of six points and six edges.
  const path = cellPath(cell, SIZE, VIEW);
  expect(path.endsWith(' Z')).toBe(true);
  expect([...path.matchAll(/[ML]/g)]).toHaveLength(6);
});

test('the cells a ground declares cover every corner of it', () => {
  const [, , width, height] = VIEW;
  const cells = cellsOver(VIEW, SIZE);
  const drawn = new Set(cells.map((cell) => `${cell.q},${cell.r}`));
  for (const corner of [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ] as [number, number][]) {
    const cell = cellOf(corner, SIZE, VIEW);
    expect(drawn.has(`${cell.q},${cell.r}`), `the cell of ${corner.join(',')}`).toBe(true);
  }
  // A map is a few cells tall, which is what the cell's size is for: a fixed size in the place's own numbers would be
  // one cell on a small ground and hundreds on a large one.
  const rows = new Set(cells.map((cell) => cell.r)).size;
  expect(rows).toBeGreaterThanOrEqual(CELLS_TALL);
  expect(rows).toBeLessThanOrEqual(CELLS_TALL + 3);
});

test('a place own numbers and the world are one conversion, and it round trips', () => {
  const place: Place = { view: VIEW, sector: [0, 0] };
  for (const [x, y] of [
    [0, 0],
    [260, 88],
    [520, 176],
    [131, 42],
  ] as [number, number][]) {
    const world = fromPlace(place, x, y);
    expect(world[2], 'a place own numbers name the ground and not a height above it').toBe(0);
    const back = toPlace(world, place);
    expect(back[0]).toBeCloseTo(x, 6);
    expect(back[1]).toBeCloseTo(y, 6);
  }
});

// The route a wire takes between two cells, held to what a wire on a board has to be: a chain of cells that touch, no
// cell twice in a row, and one answer for one pair. Everything a drawing of wiring rests on is one of these.

/** Whether two cells share an edge, which is what a step of a route is. */
const touch = ([a, b]: Cell[]): boolean =>
  NEIGHBOURS.some((around) => a.q + around.q === b.q && a.r + around.r === b.r);

test('a route is a chain of cells that touch, from one end to the other', () => {
  const cases: [Cell, Cell][] = [
    [{ q: 0, r: 0 }, { q: 3, r: -1 }],
    [{ q: 0, r: 0 }, { q: 0, r: 3 }],
    [{ q: -2, r: 1 }, { q: 2, r: -3 }],
    [{ q: 1, r: 1 }, { q: 1, r: 1 }],
    [{ q: -3, r: -3 }, { q: 4, r: 2 }],
  ];
  for (const [from, to] of cases) {
    const route = between(from, to);
    expect(route[0], `the route from ${from.q},${from.r} starts where it is asked to`).toEqual(from);
    expect(route[route.length - 1], `and ends at ${to.q},${to.r}`).toEqual(to);
    for (let index = 1; index < route.length; index += 1) {
      expect(touch([route[index - 1], route[index]]), `${from.q},${from.r} to ${to.q},${to.r} at step ${index}`).toBe(true);
    }
    // No cell twice in a row, so a drawing takes no step of no length, and no cell twice at all, so a route never doubles
    // back on itself: the lattice's own line is a shortest one.
    const named = route.map((cell) => `${cell.q},${cell.r}`);
    expect(new Set(named).size, 'no cell of a route is named twice').toBe(named.length);
  }
});

test('one pair of cells has one route, whichever end it is read from', () => {
  const from = { q: -1, r: 2 };
  const to = { q: 3, r: -1 };
  // Read the other way round the route is the same chain of cells reversed, which is what makes a trace stay where it was
  // drawn when the pilot picks the other end of it.
  expect(between(from, to).map((cell) => `${cell.q},${cell.r}`)).toEqual(
    between(to, from)
      .map((cell) => `${cell.q},${cell.r}`)
      .reverse(),
  );
});

test('a route is no longer than the lattice makes it, and a route to a cell is that cell', () => {
  const from = { q: 0, r: 0 };
  const to = { q: -2, r: 3 };
  const steps = Math.max(Math.abs(to.q - from.q), Math.abs(to.r - from.r), Math.abs(to.q + to.r - from.q - from.r));
  expect(between(from, to), 'a step a cell, both ends named').toHaveLength(steps + 1);
  expect(between(from, from), 'a route to where it already is').toEqual([from]);
});

// A ring is one remove from the middle, and a level of a tree stands in the ring of its own remove. What is held here is
// that a ring is the cells at one distance in one fixed order, and that a level laid out on them names no cell twice.

// A route as the surface draws it: the part of it that is not under the marks at its own two ends. What is held here is
// that each end stops at the rim it meets, that the corners between the two are kept, and that a route with nothing left
// between its rims is nothing to draw rather than a line of no length. The frame's wiring is read off these three, so a
// trace that hid under a mark would be a picture whose wiring is invisible and a gap where two marks meet.

test('a trace stops at the rims it joins and keeps the corners between them', () => {
  const rim = SIZE * 0.62;
  const from = centreOf({ q: 0, r: 0 }, SIZE, VIEW);
  const to = centreOf({ q: 1, r: 0 }, SIZE, VIEW);
  const [head, tail] = apart([from, to], rim);
  expect(Math.hypot(head[0] - from[0], head[1] - from[1]), 'the first end stops one rim from the mark it starts at').toBeCloseTo(rim, 6);
  expect(Math.hypot(tail[0] - to[0], tail[1] - to[1]), 'and the last one from the mark it ends at').toBeCloseTo(rim, 6);
  expect(Math.hypot(tail[0] - head[0], tail[1] - head[1]), 'what is left is the step between two cells less the two rims').toBeCloseTo(
    SIZE * Math.sqrt(3) - rim * 2,
    6,
  );

  // A corner is kept whole, because a route is the cells it passes through: a corner pulled in would have left the border
  // the route turns at.
  const corners = between({ q: 0, r: 0 }, { q: 0, r: -2 }).map((cell) => centreOf(cell, SIZE, ZERO_VIEW));
  const kept = apart(corners, rim);
  expect(kept, 'the route keeps its corner and gains no point').toHaveLength(corners.length);
  expect(kept[1], 'and the corner stands where the lattice put it').toEqual(corners[1]);
});

test('a route with nothing left between its two rims is no line, which is not a gap', () => {
  const rim = SIZE * 0.62;
  const from = centreOf({ q: 0, r: 0 }, SIZE, VIEW);
  const to = centreOf({ q: 1, r: 0 }, SIZE, VIEW);
  expect(apart([from, to], SIZE), 'two marks whose rims meet are joined by their touching').toEqual([]);
  expect(apart([from], rim), 'a route of one point is that point').toEqual([from]);
  expect(apart([from, to], 0), 'and no rim at all is the route drawn whole').toEqual([from, to]);
  // Every route the frame wires is longer than the two rims it joins, so no wire the ground draws is left undrawn.
  for (const count of [1, 6, 7, 19, 37]) {
    for (const cell of spread(count)) {
      const route = between({ q: 0, r: 0 }, cell).map((each) => centreOf(each, SIZE, ZERO_VIEW));
      expect(apart(route, rim).length, `${cell.q},${cell.r} is wired`).toBeGreaterThan(1);
    }
  }
});

test('a ring is the cells one remove from the middle, each named once, in one order', () => {
  expect(ring(0), 'the middle is the ring of nothing').toEqual([{ q: 0, r: 0 }]);
  for (const radius of [1, 2, 3]) {
    const cells = ring(radius);
    expect(cells, `a ring of ${radius} holds six cells a step`).toHaveLength(6 * radius);
    expect(new Set(cells.map((cell) => `${cell.q},${cell.r}`)).size, `no cell of ring ${radius} twice`).toBe(cells.length);
    for (const cell of cells) expect(distanceOf(cell), `${cell.q},${cell.r} is at one remove`).toBe(radius);
    // Walked in order, so two neighbours on the ring follow one another and the ring closes: the step from each cell to the
    // next is one of the six, which is what makes it a ring rather than six points.
    for (let index = 0; index < cells.length; index += 1) {
      const next = cells[(index + 1) % cells.length] as Cell;
      expect(touch([cells[index] as Cell, next]), `step ${index} of ring ${radius}`).toBe(true);
    }
  }
});

test('a spiral is nearer first, a whole ring at a time, and no cell twice', () => {
  const cells = spiral(19);
  expect(cells[0], 'the middle is the first cell of a spiral').toEqual({ q: 0, r: 0 });
  expect(distanceOf(cells[6] as Cell), 'the seventh cell is at one remove and not two').toBe(1);
  expect(distanceOf(cells[18] as Cell), 'the nineteenth is at two').toBe(2);
  expect(new Set(cells.map((cell) => `${cell.q},${cell.r}`)).size).toBe(cells.length);
  expect(spiral(7), 'a spiral is the rings in order').toEqual([{ q: 0, r: 0 }, ...ring(1)]);
  expect(spiral(0), 'and asking for none is none').toEqual([]);
});

test('a level stands in the ring of its own remove, and a level larger than its ring carries on outward', () => {
  const [first, second] = ringsByDepth([5, 12]);
  expect(first, 'five things at one remove stand in the ring of one').toHaveLength(5);
  for (const cell of first as Cell[]) expect(distanceOf(cell)).toBe(1);
  // Twelve at two removes exactly fill the ring of two, minus nothing: the first level fitted inside its own ring.
  expect(second, 'twelve at two removes').toHaveLength(12);
  for (const cell of second as Cell[]) expect(distanceOf(cell)).toBe(2);

  // A level with more than its ring holds carries on outward rather than doubling up on a cell, and never takes a cell a
  // nearer level stands in.
  const taken = new Set<string>();
  const counts = [6, 20, 3];
  for (const [depth, cells] of ringsByDepth(counts).entries()) {
    expect(cells, `depth ${depth + 1} as asked`).toHaveLength(counts[depth] as number);
    for (const cell of cells) {
      expect(taken.has(`${cell.q},${cell.r}`), `${cell.q},${cell.r} is not taken by a nearer level`).toBe(false);
      taken.add(`${cell.q},${cell.r}`);
      expect(distanceOf(cell), 'and no level stands nearer than its own remove').toBeGreaterThanOrEqual(depth + 1);
    }
  }
});

// A frame: what a thing is about at its middle and what it holds spread around it in the ground's own rings. What is held
// here is that the spread is nearest first, that the middle is kept, and that the hexagon a frame draws holds every cell
// it uses, including the frame drawn inside one of those cells at `NEST`.

test('a frame spreads what it holds over its rings, keeping the middle for what it is about', () => {
  expect(spread(0), 'a frame with nothing in it spreads nothing').toEqual([]);
  expect(spread(6), 'six things stand in the ring of one').toEqual(ring(1));
  for (const cell of spread(6)) expect(distanceOf(cell)).toBe(1);
  expect(distanceOf(spread(7)[6] as Cell), 'the seventh carries on into the ring of two').toBe(2);
  expect(new Set(spread(19).map((cell) => `${cell.q},${cell.r}`)).size, 'no cell twice').toBe(19);
  for (const cell of spread(37)) expect(distanceOf(cell), 'the middle is kept for the thing the frame is about').toBeGreaterThan(0);

  expect(ringsFor(0), 'a frame holding nothing reaches nothing').toBe(0);
  expect(ringsFor(6), 'six fit in one ring').toBe(1);
  expect(ringsFor(7)).toBe(2);
  expect(ringsFor(36), 'three rings hold thirty-six').toBe(3);
  expect(ringsFor(37), 'the thirty-seventh needs a fourth').toBe(4);
});

test('a frame reaches past its outermost ring, and the frame inside a cell is the largest that fits', () => {
  const size = 20;
  for (const count of [1, 6, 7, 19, 20, 37]) {
    const reach = frameReach(ringsFor(count)) * size;
    for (const cell of spread(count)) {
      const [x, y] = centreOf(cell, size, [0, 0, 0, 0]);
      // A cell on the outermost ring is a whole cell wide, so what has to stand inside the frame is the far corner of it.
      expect(Math.hypot(x, y) + size, `${count} at ${cell.q},${cell.r}`).toBeLessThanOrEqual(reach + 1e-9);
    }
  }
  expect(frameReach(1) * NEST, 'the frame inside a cell is one cell across').toBeCloseTo(1, 9);
});

/** One held element, as the reading hands it over. */
// What a member holds drawn as a frame: the reading's own order on the lattice's own cells, with the middle kept for the
// thing the frame is about. It is the one part of the reading that is a claim rather than a drawing, and it is held here
// rather than in a window.
const held = (path: string, depth: number, under: string | null, bounded = false): Held => ({
  path,
  name: path.split('/').pop() ?? path,
  dir: bounded || under === null,
  depth,
  under,
  bounded,
});

test('a level puts what the member holds directly in the first ring, and nothing in the middle', () => {
  const level = levelOf([held('m/a', 1, null), held('m/b', 1, null), held('m/a/joint', 2, 'm/a')], 20);
  expect(level.placed.map((each) => each.element.path)).toEqual(['m/a', 'm/b', 'm/a/joint']);
  const at = (path: string) => level.placed.find((each) => each.element.path === path)?.cell as Cell;
  expect(distanceOf(at('m/a')), 'what the member holds directly is one remove from it').toBe(1);
  expect(distanceOf(at('m/b'))).toBe(1);
  expect(distanceOf(at('m/a/joint')), 'what a part of it holds is two').toBe(2);
  // No two elements in one cell, and none of them where the member stands.
  const named = level.placed.map((each) => `${each.cell.q},${each.cell.r}`);
  expect(new Set(named).size).toBe(named.length);
  for (const each of level.placed) expect(distanceOf(each.cell), 'the middle is kept for the member').toBeGreaterThan(0);
});

test('a level is drawn in a box that holds every cell it uses, with room around them', () => {
  const size = 20;
  const level = levelOf([held('m/a', 1, null), held('m/a/hip', 2, 'm/a'), held('m/b', 1, null)], size);
  const [vx, vy, vw, vh] = level.box;
  expect(level.cells.length, 'the cells the level stands on, and the middle').toBe(level.placed.length + 1);
  for (const cell of level.cells) {
    const [x, y] = centreOf(cell, size, [0, 0, 0, 0]);
    expect(x - size, `${cell.q},${cell.r} is inside the box across`).toBeGreaterThanOrEqual(vx);
    expect(x + size).toBeLessThanOrEqual(vx + vw);
    expect(y - size, `${cell.q},${cell.r} is inside the box up and down`).toBeGreaterThanOrEqual(vy);
    expect(y + size).toBeLessThanOrEqual(vy + vh);
  }
});

test('a frame is drawn in a box that holds its own outline and the name under its middle', () => {
  const size = 20;
  const middle: [number, number] = [0, 0];
  // What else the picture draws: a level's cells, or a ground's own declared view.
  const hold: [number, number, number, number] = [-30, -30, 60, 60];
  for (const rings of [1, 2, 3]) {
    const box = frameBox(middle, rings, size, 'the board', hold);
    const [x, y, width, height] = box;
    // The outline is a hexagon of `frameReach` around the middle, so its own corners are the frame's widest points and they
    // stand in the box: an outline cut off at its own corners is a frame nobody reads as a hexagon.
    for (const [cx, cy] of cornersOf(MIDDLE_CELL, frameReach(rings) * size, ZERO_VIEW)) {
      expect(cx, `a frame of ${rings} holds its own corner across`).toBeGreaterThanOrEqual(x);
      expect(cx).toBeLessThanOrEqual(x + width);
      expect(cy, `and up and down`).toBeGreaterThanOrEqual(y);
      expect(cy).toBeLessThanOrEqual(y + height);
    }
    // What else is drawn is not shrunk by the frame being drawn over it.
    expect(x, `a frame of ${rings} still holds what it is drawn over`).toBeLessThanOrEqual(hold[0]);
    expect(y).toBeLessThanOrEqual(hold[1]);
    expect(x + width).toBeGreaterThanOrEqual(hold[0] + hold[2]);
    expect(y + height).toBeGreaterThanOrEqual(hold[1] + hold[3]);
  }
  // A ground's own declared view is wider than the frame drawn on it, and the two are one box: a frame does not shrink the
  // ground a place declares, which is the claim the cells are addresses under. A frame taller than the ground grows the
  // box rather than being cut, which is the other half of the same rule.
  const ground = frameBox(middle, 1, size, 'the board', [-260, -88, 520, 176]);
  expect(ground[0], 'the ground is held from its own corner').toBeLessThanOrEqual(-260);
  expect(ground[1]).toBeLessThanOrEqual(-88);
  expect(ground[0] + ground[2], 'and holds it whole').toBeGreaterThanOrEqual(260);
  expect(ground[1] + ground[3]).toBeGreaterThanOrEqual(88);
  // A name is drawn under the middle and the box holds it: a name wider than the frame widens the box rather than being cut
  // at the side, which is what a name nobody can read is.
  const wide = 'a name much wider than a one ring frame is';
  expect(frameBox(middle, 1, size, wide, hold)[2], 'a name wider than the frame widens the box').toBeGreaterThan(
    frameBox(middle, 1, size, 'x', hold)[2],
  );
  const held = frameBox(middle, 1, size, wide, hold);
  expect(held[0] + held[2] / 2, 'and it is held about the middle rather than grown to one side').toBeCloseTo(0, 9);
});

test('a level says whether the reading stopped where the room did', () => {
  expect(levelOf([held('m/a', 1, null), held('m/b', 1, null)], 20).bounded).toBe(false);
  // A directory the reading stopped at is the room saying there is more of it than the reader asked for, and a level that
  // said nothing about it would claim the tree was whole.
  expect(levelOf([held('m/a', 1, null, true), held('m/b', 1, null)], 20).bounded).toBe(true);
});
