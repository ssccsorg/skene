// The space as a disc: the shell the pilot stands inside, seen from outside it, with the frame's own region
// painted on it.
//
// The board is the space from the seat and this is the space from outside the seat, so the two are the same
// sphere read twice. A point on the shell at an azimuth and an elevation sits at `(cos e sin a, -sin e)` on
// the disc, and that is the pilot's own projection with the depth dropped: the map cannot disagree with the
// board about where anything stands, because both are read off the one turned point.
//
// The disc is turned to the pilot's own bearing, so the direction they face is the middle of the map and the
// frame's region stands there. A place behind them is on the far side of the globe and is not drawn: a solid
// sphere seen from outside shows one half of itself, and a far place folded onto the front is the picture a
// sphere seen from the seat would give, with the back of the shell showing through the front.

import { bearingOf, frameAt, placed, type View } from './board';

type Point = [number, number, number];

/** The pilot's own bearing, which the disc is turned to. */
export type Turn = [number, number];

/** The disc's own box, which is what a point of it is drawn across. The map draws it at this size. */
export const DISC = 2.02;

/** The azimuth a place is drawn at its most oblique, just inside the rim a side-on sphere would give. */
const EDGE = Math.PI / 2 - 0.001;

/** The shortest signed angle from one bearing to another, so a place behind the seat is one turn away and not two. */
function gap(there: number, here: number): number {
  const turn = Math.PI * 2;
  return ((((there - here + Math.PI) % turn) + turn) % turn) - Math.PI;
}

/**
 * Whether a bearing is on the half of the shell the disc shows.
 *
 * The disc is a sphere seen from outside, so half of it faces the pilot and half of it does not. A place on the far
 * side is left out rather than clamped to the rim: a rim full of places the pilot is not looking at would say the
 * shell's edge is crowded, and the map is read for what is in front.
 */
export function visible([azimuth]: [number, number], turn: Turn = [0, 0]): boolean {
  return Math.abs(gap(azimuth, turn[0])) <= Math.PI / 2;
}

/** A bearing relative to the pilot, as the disc's own coordinates. */
function project(azimuth: number, elevation: number): [number, number] {
  return [Math.cos(elevation) * Math.sin(azimuth), -Math.sin(elevation)];
}

/**
 * How far a pixel of the disc is worth, which is what a drag on the map turns the view by. The disc is fitted inside its
 * box on the box's shorter side and then scaled by the map's own zoom, so one pixel is `DISC` over that side of a turn.
 * A drag that uses it keeps the surface under the pointer, which is the same grip a drag on the board has on the space the
 * board draws: one view, read twice, and a turn neither reading disagrees about.
 */
export function discPerPixel(width: number, height: number, scale = 1): number {
  const side = Math.min(width, height) * scale;
  if (side <= 0) return 0;
  return DISC / side;
}

/**
 * A drag on the map, as the turn it is: the two deltas as they came, and what a pixel of the disc is worth.
 *
 * The map is the sphere seen from outside it, and the pilot's bearing is the marker at the middle of the disc. A hand that
 * pushes the surface right turns the space the other way, because the marker is the pilot and the surface moves under it;
 * the surface hands its drag in with that sign (`hooks/useMapDrag`). The board is the other half and reads the pointer the
 * other way round, because what it draws is the space from the seat rather than the pilot on the space.
 *
 * The rate is the disc's own, read from the box it is drawn in and the map's zoom, and it is absent for a box with no
 * pixels in it: a drag on a disc that is not drawn is not a turn, and a rate of nought would be the same answer as a
 * turn of nothing.
 */
export function dragTurn(
  dx: number,
  dy: number,
  box?: { width: number; height: number } | null,
  scale = 1,
): { dx: number; dy: number; per: number | undefined } {
  return { dx, dy, per: box ? discPerPixel(box.width, box.height, scale) : undefined };
}

/**
 * Where a bearing on the shell falls on the disc, in radians and in SVG's own coordinates: y grows down
 * the page, so a bearing above the seat is a negative y.
 *
 * The disc is the sphere seen from outside it: a direction's own sine gives its place on the globe, so the left and right
 * are the shell's own and the top and bottom are its elevation. The turn is the pilot's bearing, which the disc is centred
 * on, so the place a pilot faces is the middle of the map.
 */
export function onDisc(azimuth: number, elevation: number, turn: Turn = [0, 0]): [number, number] {
  return project(azimuth - turn[0], elevation - turn[1]);
}

/** A place coordinate as a point of the disc, in the patch its own project takes. */
export function onMap(
  point: Point,
  aspect: number,
  sector: [number, number] = [0, 0],
  turn: Turn = [0, 0],
): [number, number] {
  return onDisc(...bearingOf(placed(point, aspect, sector)), turn);
}

/**
 * A point of the shell as a point of the disc, held to the front of it.
 *
 * The disc keeps no depth, so a point behind the seat folds onto the front of it: what is held is the azimuth, just short
 * of a right angle, which draws a place behind the pilot against the map's own edge rather than across the map. It is the
 * rule a region's edge and a place's own name are placed by, so a name stands over the ground it names and not where the
 * ground would be if the disc had a depth.
 */
export function onEdge(point: Point, turn: Turn = [0, 0]): [number, number] {
  const [azimuth, elevation] = bearingOf(point);
  return project(Math.min(Math.max(gap(azimuth, turn[0]), -EDGE), EDGE), elevation - turn[1]);
}

/**
 * A region of the shell as one closed path on the disc, from its own edge points.
 */
export function outlineOfPoints(points: Point[], turn: Turn = [0, 0]): string {
  let path = '';
  points.forEach((point, index) => {
    const [x, y] = onEdge(point, turn);
    path += `${index ? 'L' : 'M'}${x.toFixed(4)} ${y.toFixed(4)}`;
  });
  return `${path}Z`;
}

/**
 * A region of the ground as one closed path on the disc. Its corners are joined along its own edges
 * rather than by four straight chords, because a chord across eighty degrees of azimuth cuts inside the
 * boundary it stands for and reads as a slanted box drawn over the sphere.
 */
export function outlineOf(
  corners: Point[],
  aspect: number,
  sector: [number, number] = [0, 0],
  steps = 16,
  turn: Turn = [0, 0],
): string {
  const parts: string[] = [];
  for (let index = 0; index < corners.length; index += 1) {
    const from = corners[index];
    const to = corners[(index + 1) % corners.length];
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const [x, y] = onMap(
        [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, 0],
        aspect,
        sector,
        turn,
      );
      parts.push(`${parts.length ? 'L' : 'M'}${x.toFixed(4)} ${y.toFixed(4)}`);
    }
  }
  return `${parts.join('')}Z`;
}

/**
 * The edge of what the frame holds, as points of the disc, sampled along the frame's own edges.
 *
 * Four corners joined by chords would cut inside the surface the frame holds: a frame pointed up or down is a patch of
 * the sphere, and its top and bottom edges bow with the sphere rather than running straight between two corners. The
 * samples are what makes the painted region the region the camera holds, and `steps` of one gives the four corners for a
 * caller that only wants those.
 *
 * The turn is the pilot's bearing, so the region stands at the middle of the disc and the space turns under it. A
 * direction behind the pilot is held at the rim rather than folded onto the front, which is what "looking past the
 * space" is.
 *
 * The frame is read from the seat, and the shell is concave around the seat: its straight edge meets the surface on the
 * far side of the chord between two corners, not on the near side. Each edge is therefore reflected across its own chord,
 * which is the same arc read from the other side of the surface. Drawn the other way, the viewport is a barrel, which is
 * what the frame looks like from outside the sphere and not what the pilot is standing in.
 */
export function viewRegion(view: View, aspect: number, steps = 8, turn: Turn = [view.yaw, view.pitch]): [number, number][] {
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const out: [number, number][] = [];
  for (let edge = 0; edge < corners.length; edge += 1) {
    const from = corners[edge];
    const to = corners[(edge + 1) % corners.length];
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      const direction = frameAt(view, aspect, from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t);
      const [azimuth, elevation] = bearingOf(direction);
      out.push(project(Math.min(Math.max(gap(azimuth, turn[0]), -EDGE), EDGE), elevation - turn[1]));
    }
  }
  // The top and the bottom are the edges a pilot reads the field of view by; the sides are the frame's own width, which
  // stays where the corners put it. The bow is capped, because a field this wide would otherwise fold the edge past the
  // middle of the map.
  for (const edge of [0, 2]) {
    const from = out[edge * steps];
    const to = out[((edge + 1) % corners.length) * steps];
    for (let step = 0; step < steps; step += 1) {
      const index = edge * steps + step;
      out[index] = into(from, to, out[index]);
    }
  }
  return out;
}

/** How far an edge of the frame bows into the shell, in disc radii. */
const SAG = 0.12;

/**
 * A point of the frame's edge as the same edge read from the seat: the bow mirrored across the chord, and no deeper than
 * `SAG`. The corners lie on the chord and do not move, which is what keeps the frame's extent the camera's.
 */
function into(from: [number, number], to: [number, number], point: [number, number]): [number, number] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const bow = (point[0] - from[0]) * nx + (point[1] - from[1]) * ny;
  const target = bow === 0 ? 0 : -Math.sign(bow) * Math.min(Math.abs(bow), SAG);
  return [point[0] + (target - bow) * nx, point[1] + (target - bow) * ny];
}

/** Whether a point of the disc is inside a closed polygon of the disc, which is what the view's own frame is. */
export function insideDisc(point: [number, number], polygon: [number, number][]): boolean {
  let within = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const [x, y] = polygon[index];
    const [px, py] = polygon[previous];
    if (y > point[1] !== py > point[1] && point[0] < ((px - x) * (point[1] - y)) / (py - y) + x) {
      within = !within;
    }
  }
  return within;
}
