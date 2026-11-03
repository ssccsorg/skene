// The space as a disc, held to the board it is the same sphere as.
//
// The map and the board are one projection read twice: the board keeps the depth and draws what is in
// front, the map drops it and draws the whole of what the pilot can see without turning. What is asserted
// here is that they agree about where a unit stands, and that the region the map paints is the region the
// camera is aimed at rather than a rectangle kept in step with it by hand.

import { expect, test } from 'vitest';

import { fitView, placed, type View } from '@ssccsorg/skene-board';
import { DISC, dragTurn, insideDisc, onDisc, onMap, viewRegion, visible } from '@ssccsorg/skene-board';

const ASPECT = 520 / 176;
/** The place's own extremes, as the world hands them over: a fraction of the place's width and height. */
const CORNERS: [number, number, number][] = [
  [ASPECT / 2, 0.5, 0],
  [-ASPECT / 2, 0.5, 0],
  [ASPECT / 2, -0.5, 0],
  [-ASPECT / 2, -0.5, 0],
];

/** How far a point of the disc is from its middle. */
const radius = ([x, y]: [number, number]) => Math.hypot(x, y);

/** The area a region of the disc encloses, by the shoelace of its own corners. */
function area(corners: [number, number][]): number {
  let total = 0;
  corners.forEach(([x, y], index) => {
    const [nx, ny] = corners[(index + 1) % corners.length];
    total += x * ny - nx * y;
  });
  return Math.abs(total) / 2;
}

test(`a bearing falls on the disc with the page's own way up`, () => {
  const middle = onDisc(0, 0);
  expect(middle[0]).toBeCloseTo(0);
  expect(middle[1]).toBeCloseTo(0);
  const right = onDisc(Math.PI / 2, 0);
  expect(right[0]).toBeGreaterThan(0.99);
  expect(right[1]).toBeCloseTo(0);
  // A bearing above the seat is above the middle of the page, which is a negative y.
  const up = onDisc(0, Math.PI / 4);
  expect(up[0]).toBeCloseTo(0);
  expect(up[1]).toBeCloseTo(-Math.SQRT1_2);
});

test('the map and the board put a unit in the same direction from the seat', () => {
  const places: [number, number, number][] = [[0, 0, 0], ...CORNERS, [ASPECT / 4, -0.25, 0]];
  for (const sector of [[0, 0], [1.26, 0], [-2.5, 0.4]] as [number, number][]) {
    for (const place of places) {
      const [x, y] = onMap(place, ASPECT, sector);
      const board = placed(place, ASPECT, sector);
      const length = Math.hypot(board[0], board[1], board[2]);
      // The board's own point, read from the seat: the same across, and the page's y against the pilot's up.
      expect(x, `the map's x for ${place} at ${sector}`).toBeCloseTo(board[0] / length);
      expect(y, `the map's y for ${place} at ${sector}`).toBeCloseTo(-board[1] / length);
      expect(radius([x, y]), 'and the disc is the front of the shell').toBeLessThanOrEqual(1.0001);
    }
  }
});

/**
 * The page's own way up, held to what the board draws: a point above the seat has to be above the middle
 * of both the map and the frame, or the two disagree about which way up the space is.
 */
test('a unit above the seat is above the middle of the map, as it is on the board', () => {
  const top = onMap([0, -0.5, 0], ASPECT);
  const bottom = onMap([0, 0.5, 0], ASPECT);
  expect(top[1], 'the far side of the place is the upper part of the map').toBeLessThan(0);
  expect(bottom[1]).toBeGreaterThan(0);
});

test('the opening frame holds the whole space, so its region reaches past the place', () => {
  const fitted = fitView(CORNERS.map((corner) => placed(corner, ASPECT)), 700, 360);
  const region = viewRegion(fitted, 700 / 360);
  expect(region.length, 'the edge is sampled, not four corners').toBeGreaterThan(4);
  const place = radius(onMap(CORNERS[0], ASPECT));
  for (const corner of viewRegion(fitted, 700 / 360, 1)) {
    expect(radius(corner), 'no corner of the frame is inside the place it holds').toBeGreaterThan(place);
  }
});

test('the frame edge bows into the shell, which is the side the seat is on', () => {
  const view: View = { yaw: 0.3, pitch: 0.7, fov: 60 };
  const chords = viewRegion(view, ASPECT, 1);
  const sampled = viewRegion(view, ASPECT, 8);
  expect(chords.length).toBe(4);
  // The shell is concave around the seat, so the frame's straight edge meets it outside the chord between two corners.
  // Reflecting the edge is the same arc read from the other side, and the viewport holds less than its four corners.
  expect(area(sampled), 'the sampled edge holds less than its four corners').toBeLessThan(area(chords));
});

test('the map turns with the pilot, and the frame stands at the middle of it', () => {
  const narrow = viewRegion({ yaw: 0, pitch: 0, fov: 30 }, ASPECT);
  const broad = viewRegion({ yaw: 0, pitch: 0, fov: 80 }, ASPECT);
  // A narrower frame paints a smaller region, and a wider one a larger, which is the whole of what it says.
  expect(area(narrow), 'a narrow frame paints less than a wide one').toBeLessThan(area(broad));

  // The disc is centred on the pilot's bearing, so the frame stands at the middle whatever direction they face and the
  // sphere turns under it. A map that moved the frame instead would be a map the pilot has to chase.
  const centre = (points: [number, number][]) =>
    points.reduce(([ax, ay], [x, y]) => [ax + x / points.length, ay + y / points.length], [0, 0] as [number, number]);
  for (const yaw of [0, Math.PI / 4, -Math.PI / 4, Math.PI]) {
    const region = viewRegion({ yaw, pitch: 0, fov: 60 }, ASPECT);
    expect(Math.abs(centre(region)[0]), `a turn of ${yaw} leaves the frame at the middle`).toBeLessThan(0.02);
    expect(Math.abs(centre(region)[1]), `and on the middle line`).toBeLessThan(0.02);
  }
});

test('a place behind the pilot is on the far side and the map leaves it out', () => {
  // The disc is a sphere seen from outside, so a place behind the seat is not on the half it shows. Clamping it to the
  // rim instead would crowd the edge with places the pilot is not looking at.
  expect(visible([0, 0], [0, 0]), 'straight ahead is on the near side').toBe(true);
  expect(visible([0, 0], [Math.PI / 2, 0]), 'the rim is the edge of the half').toBe(true);
  expect(visible([0, 0], [Math.PI, 0]), 'straight behind is not').toBe(false);
  expect(visible([Math.PI / 4, 0], [Math.PI, 0]), 'and neither is a place half behind').toBe(false);
  // A place fixed on the shell moves left when the pilot turns right, because the map is turned to the pilot.
  expect(onMap([0, 0, 0], ASPECT, [0, 0], [0.6, 0])[0]).toBeLessThan(-0.3);
});

test('a press is inside the frame only when it falls within its polygon', () => {
  const square: [number, number][] = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ];
  expect(insideDisc([0, 0], square)).toBe(true);
  expect(insideDisc([0.6, 0], square)).toBe(false);
  expect(insideDisc([0, -0.6], square)).toBe(false);
});

test('a frame turned past the edge of the space paints against the map and not behind it', () => {
  // A direction behind the pilot folds onto the front of the disc, which would put the paint on the wrong
  // side of the map. The azimuth is held short of a right angle instead, so the paint stays on the disc.
  const behind = viewRegion({ yaw: Math.PI, pitch: 0, fov: 90 }, ASPECT);
  for (const corner of behind) expect(radius(corner), 'the paint stays on the disc').toBeLessThanOrEqual(1.0001);
});

// The two differences between a drag on the map and a drag on the board, which are the whole of what the two readings
// of one view can disagree about: which way the thing the hand took moves, and how far one pixel of it is worth.

test('a drag on the map is handed over as it came, because the sphere under the hand is the space', () => {
  const box = { width: 412, height: 300 };
  expect(dragTurn(6, 0, box).dx, 'a hand pushing the sphere right carries it right').toBe(6);
  expect(dragTurn(0, -6, box).dy, 'and a hand pushing it up carries it up').toBe(-6);
});

test('a drag on the map is worth what the disc it is drawn in is worth, and nothing where no disc is drawn', () => {
  // The disc is fitted inside its box on the box's shorter side, so the rate is read from that side and not from the
  // box's area or its longer side.
  expect(dragTurn(6, 0, { width: 412, height: 300 }).per).toBe(DISC / 300);
  expect(dragTurn(6, 0, { width: 300, height: 412 }).per).toBe(DISC / 300);
  expect(dragTurn(6, 0, null).per, 'no disc drawn is not a turn').toBeUndefined();
  expect(dragTurn(6, 0, { width: 0, height: 0 }).per, 'a collapsed box turns by nothing').toBe(0);
});
