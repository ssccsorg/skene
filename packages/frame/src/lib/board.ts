// The board's own glue: the world's coordinates into the scene's, and the page's tokens into values
// three.js can hold. Both are here rather than in the component because they are the two places the
// three-dimensional view touches something outside itself.
//
// This is also where the pilot stands. The space is on a shell around the pilot, and the pilot is at its
// centre: what is in front is what the pilot is looking at, and everything else is behind, beside, above
// or below and is reached by turning. The seam is this one function, which is why the plan, the graph and
// the derivations behind them did not change.
//
// The place's own centre is the store, so the pilot looks straight ahead at the composition until they
// turn, and the space is laid out around them from there. The place's own width is a whole turn and its
// height is a wide arc up and down, so a space is a space the pilot is standing inside rather than a band
// drawn across the front of a frame.

import type { NodeKind, ProjectStatus } from './types';
import { readableColour } from './colour';
import { GLYPHS } from './world';

/**
 * What the one place in the space that is not a participant is called. A place may name its own label
 * and this is the fallback, kept in one file so the board, the plan and the graph cannot drift apart.
 */
export const STORE = 'Blackboard';

/**
 * The shell the space is drawn on, and the eye's own seat at its centre.
 */
export const SHELL = 1.25;

/**
 * How much of the shell one place takes, across and up: the arc its own whole width and the arc its own
 * whole height. They are in degrees, and they are the patch the place's own rectangle is stretched over,
 * so a unit at the place's own edge sits at a quarter of the arc to the pilot's right or left.
 *
 * They are fixed rather than fitted to the frame: the space is the same space whatever shape the window is,
 * which is what lets the pilot learn where things are in it. They are held close to each other on purpose,
 * because the place is a patch of a sphere and not a band across one: two arcs of the same order are a
 * space the pilot is standing in and can look up and down in.
 *
 * The patch is a patch and not the whole shell, because the shell holds every project: five of them sit
 * round it at their own bearings, and each is this much of the surface.
 */
export const ARC = 60;
export const ELEVATION = 52;

/** Where a place sits on the shell, as the bearing of the patch's own middle. Degrees, and zero is
 *  straight ahead, so a place that names no bearing stands where the pilot opens their eyes. */
export const AHEAD: [number, number] = [0, 0];

/** The shell's own bearing of a place, in radians, from what the place declares. */
export function sectorOf(place: { sector?: [number, number] } | undefined): [number, number] {
  const [azimuth, elevation] = place?.sector ?? AHEAD;
  return [(azimuth * Math.PI) / 180, (elevation * Math.PI) / 180];
}

/** How far a record rises over the unit that wrote it, per unit of the record's own order. */
const RISE_PER_HEIGHT = 0.16;

/**
 * How much further from the pilot a unit stands at the far edge of the place than at the near one. The
 * place is a floor and the pilot stands in it: the far side of the floor is further away as well as
 * higher in the frame, which is the one thing a shell of one radius cannot say. It is a fraction of the
 * shell, so a unit at the place's own middle stands exactly where the shell is.
 *
 * It changes no unit's direction from the pilot and therefore no unit's projected place on the frame:
 * the pilot's own arithmetic gives a direction, and a mark drawn over it is drawn at the same point
 * whatever its distance. What changes is what the canvas draws and how large: the far marks are smaller
 * and the near ones larger, which is what depth is.
 */
const RECEDE = 0.7;

/**
 * The pilot's own view: which way they are facing, how far up or down, and how much of the space the frame
 * takes in. Zeroes are looking at the composition, which is where the space's own centre is.
 */
export interface View {
  yaw: number;
  pitch: number;
  /** The frame's own field, in degrees: the whole angle across the frame's short side. */
  fov: number;
}

/** How narrow and how wide the pilot's own field may be. */
export const FOV_MIN = 20;
export const FOV_MAX = 140;

/**
 * Where the pilot opens their eyes: facing the composition, with a field that holds the drive's space.
 * The board computes the fit as soon as it has a space, so this is only what a frame before that shows.
 */
export const LEVEL: View = { yaw: 0, pitch: 0, fov: 52 };

/**
 * Where a thing stands on the shell, as the direction the pilot would have to face to be looking at it: an
 * azimuth and an elevation, in radians. It is the one way this code names a place, and it is the same pair
 * `forwardOf` builds a direction from, so a bearing can be written into a point and read out of one without
 * anything in between to keep in step.
 */
export type Bearing = [number, number];

/**
 * Where a point of the frame is on the place's own floor: the inverse of the board's own projection.
 *
 * A unit stands at a direction from the pilot rather than at a distance, so which way the pilot would have to look to
 * face it is the whole of what is needed to say where it is, and `bearingAt` already answers that. What is left is the
 * place's own two numbers, which are the two angles read back out of `scene`: a place's x is an angle around the pilot
 * and its y is an angle up and down. The height a record rises to is not part of it, because where a thing stands is on
 * the floor under it rather than at the record above it.
 *
 * It is what a drag of a member means, and it is here rather than at the board because it is the same claim about the
 * space that `project` makes read the other way: the round trip through both is exact, and it is held by a test.
 *
 * It is exact for a board that has settled. A place that is still unfolding is drawn between its group's own middle and
 * its own, which is a distance and not a direction, so a drag taken during the turn is read a little off until it lands.
 */
export function boardAt(
  screen: [number, number],
  size: [number, number],
  view: View,
  aspect: number,
  sector: [number, number] = AHEAD,
): [number, number, number] {
  const [x, y, z] = unplaced(shellAt(bearingAt(screen, size, view), 1), sector);
  const elevation = Math.asin(Math.min(Math.max(y, -1), 1));
  const azimuth = Math.atan2(x, -z);
  return [((azimuth * 360) / (ARC * Math.PI)) * aspect, (-elevation * 360) / (ELEVATION * Math.PI), 0];
}

/**
 * A point of the scene as the place's own, which is the turn `placed` makes undone.
 *
 * The turn is written as a pitch about the pilot's own right and then a yaw about the world's up, so it is undone the
 * other way round: the two rotations are not one angle and cannot be subtracted in either order.
 */
function unplaced(point: [number, number, number], sector: Bearing): [number, number, number] {
  const [yaw, pitch] = sector;
  const [x, y, z] = point;
  const yw = Math.cos(yaw);
  const yw2 = Math.sin(yaw);
  const across = x * yw + z * yw2;
  const pitched = -x * yw2 + z * yw;
  const p = Math.cos(pitch);
  const s = Math.sin(pitch);
  return [across, y * p + pitched * s, -y * s + pitched * p];
}

/**
 * The point of the shell at a bearing. A place on the shell is what it is here: nothing stands at a distance,
 * only in a direction, and `radius` is the seat the direction is read from.
 */
export function shellAt(bearing: Bearing, radius = SHELL): [number, number, number] {
  const [azimuth, elevation] = bearing;
  const flat = Math.cos(elevation);
  return [radius * flat * Math.sin(azimuth), radius * Math.sin(elevation), -radius * flat * Math.cos(azimuth)];
}

/**
 * Which way a point of the frame looks, as a bearing: the inverse of `project` read out at the shell's own
 * radius. It is what a drag across the frame means for something standing on the shell, so dragging a thing on
 * the surface moves it by the angle the pointer travelled rather than by a count of pixels, and a drag that
 * comes back over the same pixels lands on the same bearing.
 */
export function bearingAt(screen: [number, number], size: [number, number], view: View): Bearing {
  const forward = normalise(forwardOf(view));
  const right = normalise(cross(forward, WORLD_UP));
  const up = cross(right, forward);
  const tanUp = Math.tan((view.fov * Math.PI) / 360);
  const tanAcross = tanUp * aspectOf(size[0], size[1]);
  const across = ((screen[0] - size[0] / 2) / (size[0] / 2)) * tanAcross;
  const higher = ((size[1] / 2 - screen[1]) / (size[1] / 2)) * tanUp;
  return bearingOf([
    forward[0] + right[0] * across + up[0] * higher,
    forward[1] + right[1] * across + up[1] * higher,
    forward[2] + right[2] * across + up[2] * higher,
  ]);
}

/**
 * Straight ahead when the view is level, written along negative z because that is the direction three.js's
 * own camera looks, so the scene's x is the place's x and the pilot's right is the place's right rather
 * than its mirror.
 */
export const LOOK: [number, number, number] = [0, 0, -1];

/** The frame's aspect, as the projection reads it. */
function aspectOf(width: number, height: number): number {
  return width / Math.max(height, 1);
}

function normalise(v: [number, number, number]): [number, number, number] {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

const dot = (a: [number, number, number], b: [number, number, number]) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const WORLD_UP: [number, number, number] = [0, 1, 0];

/** Which way the pilot is facing, as a direction in the scene. */
export function forwardOf(view: Pick<View, 'yaw' | 'pitch'>): [number, number, number] {
  const flat = Math.cos(view.pitch);
  return [Math.sin(view.yaw) * flat, Math.sin(view.pitch), -Math.cos(view.yaw) * flat];
}

/**
 * The view that faces a point of the space, which is the inverse of `forwardOf` and the one thing the
 * board needs to answer "what would the pilot have to do to look at that". The frame's own field is the
 * caller's: facing something and framing it are different questions.
 */
export function aimAt(point: [number, number, number]): Pick<View, 'yaw' | 'pitch'> {
  return {
    yaw: Math.atan2(point[0], -point[2]),
    pitch: Math.atan2(point[1], Math.hypot(point[0], point[2])),
  };
}

/**
 * The pilot's own view as a projection: where a point of the space falls on a frame of a given size, with
 * its distance. This is the camera three.js is given, written out, so the names can be drawn as plain DOM
 * over the canvas instead of as a portal per unit. A point whose depth is not positive is behind the
 * pilot, which is a name the frame must not draw: turning is what reaches it.
 */
export function project(
  point: [number, number, number],
  width: number,
  height: number,
  view: View = LEVEL,
): [number, number, number] {
  const forward = normalise(forwardOf(view));
  // The camera's own basis, in the order three.js builds it in `lookAt`: across is forward crossed with
  // the world's up, and up is across crossed with forward. Written the other way round the board is a
  // mirror of the plan, which is a defect a test of this function alone cannot see. The pilot's pitch is
  // held short of vertical for the same reason: at the poles the two crosses have no across to take.
  const right = normalise(cross(forward, WORLD_UP));
  const up = cross(right, forward);
  const depth = dot(point, forward);
  const tanUp = Math.tan((view.fov * Math.PI) / 360);
  const tanAcross = tanUp * aspectOf(width, height);
  return [
    width / 2 + (dot(point, right) / (depth * tanAcross)) * (width / 2),
    height / 2 - (dot(point, up) / (depth * tanUp)) * (height / 2),
    depth,
  ];
}

/**
 * The shell's own graticule step, in radians. It is one number for two readings: the cage the pilot reads the
 * room by, and the size a window is drawn at, because a window is a patch of the shell's surface and the grid
 * is what says how large a patch is.
 */
export const GRATICULE = Math.PI / 18;

/**
 * How much of a frame one cell of the shell's graticule takes, in pixels.
 *
 * A cell is an angle, so what it is worth on screen is read from the frame the pilot is looking through, and
 * the height is what it is read from: the projection spends the frame's whole field on its own height at the
 * middle, so one cell is its own angle over that field. It does not depend on the frame's width, because the
 * frame holds the same angle on the same pixels across as it does up. A window sized by this therefore zooms
 * with the space rather than with the page, which is what makes it a thing on the shell.
 */
export function cellAcross(fov: number, height: number): number {
  return (Math.tan(GRATICULE) / Math.tan((fov * Math.PI) / 360)) * (height / 2);
}

/** The side of the frame a control has been held on, which is the side its own direction went. */
export type Edge = 'left' | 'right' | 'top' | 'bottom';

/**
 * Where a control whose place has gone past the frame's own edge is held, and which way it went.
 *
 * A place on a sphere has no edge, so a thing past the frame is not gone: it is behind the pilot or beside them, and
 * what says which way to turn is a control held on the edge it went past. The point is held inside the frame's own
 * rectangle along the direction it came from, and `turned` is the angle of that direction, which is what a chevron on
 * a pin is drawn at. `edge` is the side it was held on, reported rather than left to be read back out of the point,
 * because the one thing the side is for is putting several of them somewhere: controls held on one edge are laid out
 * along it, and which edge that is, is this.
 *
 * A point behind the pilot is one the projection mirrors, because a direction past ninety degrees is divided by a
 * depth that has changed sign: the direction is mirrored back here, since what the control has to say is which way to
 * turn and the mirror says the opposite. A point behind the pilot is off the frame whatever its mirror lands on, which
 * is why `behind` alone is enough to hold it: a thing behind the eye is not a thing in front of it, and a control that
 * said otherwise would be a control standing on the frame with nothing to say.
 *
 * The inset is how far the control's own box is held clear of the edge, so the whole of it is read rather than half of
 * it. It is the frame's own rule and not a window's, which is why it is here: a unit's mark held on the edge and a
 * window's pin held on it are the same question asked about two different things, and a control that answered it
 * differently from another would be one of the two sitting half outside the frame.
 */
export function edgeAt(
  point: [number, number],
  behind: boolean,
  size: [number, number],
  inset: [number, number],
): { at: [number, number]; turned: number; out: boolean; edge: Edge } {
  const centre: [number, number] = [size[0] / 2, size[1] / 2];
  const dx = (point[0] - centre[0]) * (behind ? -1 : 1);
  const dy = (point[1] - centre[1]) * (behind ? -1 : 1);
  const room: [number, number] = [Math.max(centre[0] - inset[0], 1), Math.max(centre[1] - inset[1], 1)];
  const out = behind || Math.abs(dx) > room[0] || Math.abs(dy) > room[1];
  if (!out) return { at: [point[0], point[1]], turned: 0, out: false, edge: 'bottom' };
  const across = Math.abs(dx) / room[0] >= Math.abs(dy) / room[1];
  const edge: Edge = across ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'top' : 'bottom';
  const reach = across ? Math.abs(dx) / room[0] : Math.abs(dy) / room[1];
  // A point exactly behind the pilot has no direction to give: its own mirror lands on the middle of the frame, and
  // there is nothing in that to say which way round. It is held at the foot of the frame, which is where a pilot who has
  // nothing else to go on turns, rather than at a point the arithmetic cannot reach.
  if (!(reach > 0)) return { at: [centre[0], centre[1] + room[1]], turned: Math.PI / 2, out: true, edge: 'bottom' };
  const scale = 1 / reach;
  return {
    at: [centre[0] + dx * scale, centre[1] + dy * scale],
    turned: Math.atan2(dy, dx),
    out: true,
    edge,
  };
}

/**
 * Where several controls held on the frame's edge stand when they would otherwise be drawn on top of one another: the
 * same places, spread along the edge each was held on.
 *
 * A mark past the frame is held on the edge in the direction it is past, and a space that has been turned away leaves
 * every mark past the same edge at once: held where their directions say, a dozen of them are one control drawn a dozen
 * times. What the edge has room for is the order along it, which is the reading the spread keeps: each control stands
 * where its own direction put it unless that is on top of one already there, and a run too long for the frame is brought
 * back whole rather than piled at one end.
 *
 * `span` is how much room one control takes along its own edge, and `inset` is the same inset the controls were held by,
 * so a spread control is inside the frame exactly as much as a lone one is.
 */
export function spreadOnEdge(
  held: { at: [number, number]; edge: Edge }[],
  size: [number, number],
  span: number,
  inset: number,
): [number, number][] {
  const out = held.map((control) => [control.at[0], control.at[1]] as [number, number]);
  for (const edge of ['left', 'right', 'top', 'bottom'] as Edge[]) {
    const on = held.flatMap((control, index) => (control.edge === edge ? [index] : []));
    if (on.length < 2) continue;
    const along = edge === 'left' || edge === 'right' ? 1 : 0;
    const far = (along === 1 ? size[1] : size[0]) - inset;
    const spread = spreadOnce(
      on.map((index) => out[index][along]),
      span,
      far,
    );
    on.forEach((index, position) => {
      out[index][along] = spread[position];
    });
  }
  return out;
}

/**
 * One edge's own spread: the values in the order their own places put them, each moved just far enough to clear the one
 * before it, and the whole run brought back when it has gone past the far end.
 */
function spreadOnce(values: number[], span: number, far: number): number[] {
  const order = values.map((_, index) => index).sort((left, right) => values[left] - values[right] || left - right);
  const out = new Array<number>(values.length);
  let previous = Number.NEGATIVE_INFINITY;
  for (const index of order) {
    previous = Math.max(values[index], previous + span);
    out[index] = previous;
  }
  const over = out[order[order.length - 1]] - far;
  if (over <= 0) return out;
  let next = Number.POSITIVE_INFINITY;
  for (let step = order.length - 1; step >= 0; step -= 1) {
    const index = order[step];
    next = Math.min(out[index] - over, next - span);
    out[index] = next;
  }
  return out;
}

/**
 * A point of the pilot's own space, turned to a bearing on the shell. The place draws its own patch
 * straight ahead and this is what puts it round the sphere: the projects the board holds are one shell with
 * a patch each, and the pilot turns from one to the next rather than the space being rebuilt to hold one.
 *
 * It is the rotation that takes straight ahead to the bearing, so a patch's own middle lands on the bearing
 * exactly and everything in the patch goes round with it. Composed rather than added to the angles: two
 * rotations in a row are not the sum of their angles, and a place at a bearing above and to the side is
 * where the addition says it is only if the patch is small.
 */
export function placed(
  point: [number, number, number],
  aspect: number,
  sector: [number, number] = [0, 0],
): [number, number, number] {
  const [x, y, z] = scene(point, aspect);
  // The pitch first, about the pilot's own right, and then the turn about the world's up, which is the
  // order `forwardOf` builds a bearing in.
  const [yaw, pitch] = sector;
  const p = Math.cos(pitch);
  const py = y * p - z * Math.sin(pitch);
  const pz = y * Math.sin(pitch) + z * p;
  const yw = Math.cos(yaw);
  const yw2 = Math.sin(yaw);
  return [x * yw - pz * yw2, py, x * yw2 + pz * yw];
}

/** How far above the shell an orbital unit is drawn, in shell radii, when the place gives it no altitude. */
export const ORBIT_LIFT = 0.28;

/**
 * The band an altitude is drawn across, in shell radii: a low orbit stands just above the shell and a geostationary one
 * stands at `ORBIT_MOST`.
 *
 * The shell's radius is a direction and not a distance, so a real altitude is read on this band rather than at the earth's
 * own scale. The band is logarithmic because orbits cluster near the ground: a linear scale would put every low orbit on
 * one radius and a geostationary one off the board.
 */
const ORBIT_NEAR = 0.18;
const ORBIT_MOST = 0.72;

/** The altitudes the band spans, in metres: a low orbit's floor and a geostationary orbit. */
const ORBIT_FLOOR = 200_000;
const ORBIT_CEILING = 36_000_000;

/** Where an altitude falls in the band, from nought at the floor to one at the ceiling. */
function bandOf(altitude: number): number {
  return Math.min(
    1,
    Math.max(0, Math.log(Math.max(altitude, ORBIT_FLOOR) / ORBIT_FLOOR) / Math.log(ORBIT_CEILING / ORBIT_FLOOR)),
  );
}

/**
 * How far above the shell a unit holding `altitude` metres stands, in shell radii.
 *
 * An orbital unit that declares no altitude keeps `ORBIT_LIFT`, which is the near orbit the board drew before a height
 * was a declaration; a declared nought is the band's own floor rather than the ground.
 */
export function orbitLift(altitude?: number | null): number {
  if (altitude == null || !Number.isFinite(altitude)) return ORBIT_LIFT;
  return ORBIT_NEAR + bandOf(altitude) * (ORBIT_MOST - ORBIT_NEAR);
}

/**
 * The radius of the ring drawn around an orbital mark, in shell radii.
 *
 * A lift along the radius is depth from the seat, and depth is what a frame pointed at the mark cannot show: the ring is
 * the height read in the picture instead, and a higher orbit draws a wider one.
 */
export function orbitRing(altitude?: number | null): number {
  if (altitude == null || !Number.isFinite(altitude)) return 0.035;
  return 0.035 + bandOf(altitude) * 0.03;
}

/**
 * How far above the shell a unit stands, in shell radii, and nought for a unit on the ground.
 *
 * A sub-point makes a unit orbital and a height makes it stand above what it stands on, so either is a lift. A unit that
 * declares neither is on the ground, which is the shell itself.
 */
export function liftOf(unit: { orbital: boolean; altitude: number | null }): number {
  if (unit.orbital) return orbitLift(unit.altitude);
  return unit.altitude != null && unit.altitude > 0 ? orbitLift(unit.altitude) : 0;
}

/** The radius of the ring a unit wears, or nought for a unit on the ground. */
export function ringOf(unit: { orbital: boolean; altitude: number | null }): number {
  return liftOf(unit) > 0 ? orbitRing(unit.altitude) : 0;
}

/**
 * How far above the globe a space entity is drawn on the map, as a fraction of the radius the surface point reads from the
 * globe's middle.
 *
 * The map is a body seen from outside, so an altitude is a radial distance and the mark moves outward along the line from
 * the globe's middle through its sub-point. It is drawn on the same compressed band as the shell: at the earth's own scale
 * a geostationary orbit would stand several globe radii away, off the map.
 */
export function spaceLift(altitude?: number | null): number {
  if (altitude == null || !Number.isFinite(altitude)) return 0.16;
  return 0.08 + bandOf(altitude) * 0.35;
}

/** An altitude as a label reads it: whole metres under a kilometre, and whole kilometres above it. */
export function altitudeOf(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  const kilometres = String(Math.round(metres / 1000)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${kilometres} km`;
}

/**
 * A point of the shell lifted along its own radius.
 *
 * An orbital unit stands where the interface puts it and is drawn above that point rather than on it. Lifting along the
 * radius keeps the bearing the place gave it, so the mark does not move sideways however high it stands; the height is
 * read by `orbitRing` and by the altitude beside the name.
 */
export function orbitalAt(point: [number, number, number], by = ORBIT_LIFT): [number, number, number] {
  const length = Math.hypot(point[0], point[1], point[2]);
  if (length < 1e-6) return point;
  const scale = (length + by) / length;
  return [point[0] * scale, point[1] * scale, point[2] * scale];
}

/**
 * How far past its own members a field's zone reaches, in radians. A zone drawn exactly at the outermost
 * member puts that member on the rim, and a mark on the edge of its own ground reads as a mark about to leave
 * it; this is the room that keeps the ground visibly the field's.
 */
export const BAND = (3 * Math.PI) / 180;

/**
 * The bearing of a point of the scene's own space: which way the pilot would have to turn to face it. It is
 * the inverse of `forwardOf`, and it is here rather than with the map because a bearing is a reading of the
 * space and the map is one of the two places that reads it.
 */
export function bearingOf(point: [number, number, number]): Bearing {
  const length = Math.hypot(point[0], point[1], point[2]) || 1;
  return [Math.atan2(point[0], -point[2]), Math.asin(Math.min(Math.max(point[1] / length, -1), 1))];
}

/** How far one direction is from another, in radians. Two directions from the seat are a matter of angle. */
export function angleBetween(
  one: [number, number, number],
  other: [number, number, number],
): number {
  const [a, b] = [normalise(one), normalise(other)];
  return Math.acos(Math.min(Math.max(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1), 1));
}

/** How far one bearing is from another, in radians. Two bearings are two directions from the one seat. */
export function bearingGap(one: Bearing, other: Bearing): number {
  return angleBetween(shellAt(one, 1), shellAt(other, 1));
}

/**
 * How wide a field's own ground is: the angle from the place's bearing to the member standing furthest from
 * it. It is read from the members rather than declared, because a zone is the field's own extent and the
 * place already says where everything in it stands. The zone is then the smallest cap that holds them, which
 * is what keeps one field's ground off its neighbour's.
 */
export function spanOf(points: [number, number, number][], sector: [number, number]): number {
  const bearing = forwardOf({ yaw: sector[0], pitch: sector[1] });
  let widest = 0;
  for (const point of points) widest = Math.max(widest, angleBetween(point, bearing));
  return widest;
}

/**
 * How many sides a field's own ground has. Six, because that is the cell a honeycomb is built from: six-sided
 * cells tile so that every neighbour is the same distance away and no cell claims the ground beside it, which
 * is what lets the fields stand as close as they can without running into each other. A circle has no
 * neighbours to tile with, so five circles round one sphere are either apart with waste between them or
 * overlapping, and there is no third answer to pick from.
 */
export const CELL = 6;

/**
 * A cap of the shell: every direction within `radius` of `centre`, as the grid of points the triangles that
 * fill it are built from. One row per ring from the middle out, one point per spoke round it, and the last
 * spoke repeats the first so the surface closes on itself.
 *
 * It is a cell and not a rectangle because the region is on a sphere, and not a circle because a circle cannot
 * tile: a field's ground is however far its own members reach in every direction, and a box drawn round them
 * would claim corners the field does not hold.
 */
export function capGrid(
  centre: [number, number, number],
  radius: number,
  rings = 6,
  spokes = CELL,
): { points: [number, number, number][]; across: number; up: number } {
  const pole = normalise(centre);
  // A cap at the pole has no east to take, so the ring is measured from wherever the seat's own up crosses
  // it, and from the seat's forward when the two are parallel.
  const across =
    Math.hypot(...cross(pole, WORLD_UP)) > 1e-6
      ? normalise(cross(pole, WORLD_UP))
      : normalise(cross(pole, LOOK));
  const up = cross(pole, across);
  const points: [number, number, number][] = [];
  for (let ring = 0; ring <= rings; ring += 1) {
    const out = Math.sin((ring / rings) * radius);
    const along = Math.cos((ring / rings) * radius);
    for (let spoke = 0; spoke <= spokes; spoke += 1) {
      const turn = (spoke / spokes) * Math.PI * 2;
      points.push(
        normalise([
          pole[0] * along + (across[0] * Math.cos(turn) + up[0] * Math.sin(turn)) * out,
          pole[1] * along + (across[1] * Math.cos(turn) + up[1] * Math.sin(turn)) * out,
          pole[2] * along + (across[2] * Math.cos(turn) + up[2] * Math.sin(turn)) * out,
        ]).map((each) => each * SHELL) as [number, number, number],
      );
    }
  }
  return { points, across: spokes, up: rings };
}

/**
 * The rim of a cap of the shell: the directions exactly `radius` from `centre`, as one closed run of `spokes`
 * points. It is what the zone of a field is drawn by, on the board and on the map, so neither can draw a
 * different edge, and the count of points is the count of the cell's own sides.
 */
export function capRim(
  centre: [number, number, number],
  radius: number,
  spokes = CELL,
): [number, number, number][] {
  const grid = capGrid(centre, radius, 1, spokes);
  return grid.points.slice(spokes + 1, -1);
}

/** How many quads a picture's own patch is cut into for every cell of it: fine enough that its own curve reads. */
export const QUADS_PER_CELL = 10;

/**
 * How many quads the line round a picture, and the box it is read in, are walked for every cell of it.
 *
 * It is coarser than the picture's own cut and it is the same run of points for both, because a box and a line that
 * were walked apart would be a box beside the picture it is meant to hold: the line drawn round a patch and the box
 * its own pin and grip are laid on are one reading of where the patch ends.
 */
export const RIM_PER_CELL = 2;

/**
 * A window's own patch of the shell: the bearing its middle stands at, the angles its cells are worth, and how finely it
 * is cut.
 *
 * The patch is a rectangle of the room's own coordinates: two meridians and two parallels, which are the lines the
 * graticule is drawn with. That is what makes a window a piece of the surface rather than a card held in front of it: its
 * edges lie along the room's own lines, so the bottom of a picture is read as the parallel it stands on, and the picture
 * bends with the room under it. A patch measured in a plane tangent at its middle keeps the picture's own lines straight
 * instead, and its edges are then great circles, which cross every parallel the room draws and answer to none of them.
 * The two readings differ by nothing at the horizon and by a visible margin at the ends of an edge away from it.
 *
 * Every point of a patch is at the shell's own radius, so the picture lies on the surface it is drawn over at every size.
 * Every kind of window is drawn by this one mapping, a video and a map alike, because they differ in where their pixels
 * come from and in nothing about where they stand. A test anchors the rule: see `a window is a quad of the room own
 * lines` in `tests/views.test.ts` before changing anything here.
 */
export interface Patch {
  /** The bearing of the patch's own middle, which is where its own rows and columns are measured from. */
  bearing: Bearing;
  /** The angle the patch takes across and up, in radians: what its own cells are worth. */
  span: Bearing;
  /**
   * The elevation the patch's bottom row stands on, in radians.
   *
   * It is the patch's own low edge, and it is kept rather than computed from the bearing because a window large
   * enough to reach a pole is cut at it: the room has two poles and no parallel past them, and a patch that went
   * over one would come back down the far side of the room drawn upside down. Every row is still a parallel of the
   * room; what changes at the cut is how far apart they stand.
   */
  low: number;
  /** How many quads the patch is cut into across and up. */
  quads: [number, number];
}

/**
 * The patch a window of a given size stands on. Its across is the room's own azimuth and its up is the room's own
 * elevation, so a cell of the picture is the cell the graticule draws: a window is as wide as the lines under it say it
 * is, at whatever elevation it stands.
 *
 * A patch that would take a row past a pole stops at it, which is what lets a window be sized to the board: the rows
 * above the cut crowd against the pole rather than folding over and drawing the picture upside down.
 */
export function patchOf(place: Bearing, cells: Bearing, perCell = QUADS_PER_CELL): Patch {
  const asked = cells[1] * GRATICULE;
  const low = Math.max(place[1] - asked / 2, -Math.PI / 2);
  const high = Math.min(place[1] + asked / 2, Math.PI / 2);
  return {
    bearing: place,
    span: [cells[0] * GRATICULE, Math.max(high - low, 1e-6)],
    low,
    quads: [
      Math.max(1, Math.round(cells[0] * perCell)),
      Math.max(1, Math.round(cells[1] * perCell)),
    ],
  };
}

/**
 * The shape a patch has on the shell: its width over its height, measured where it stands.
 *
 * The patch is a quad of the room's own coordinates, so its width in angles is its own cells and its width on the surface
 * is that much shorter by the cosine of its elevation: the meridians a picture's sides are drawn on stand closer together
 * the higher it stands. Its height is its cells as they are. A decal drawn from the ratio of the cells alone is stretched
 * across by exactly that difference, which is under half a percent at the fifth parallel and six at the twentieth.
 */
export function patchAspect(cells: Bearing, elevation: number): number {
  return cells[1] > 1e-6 ? (cells[0] / cells[1]) * Math.cos(elevation) : 1;
}

/**
 * The span a medium fills inside a window, when the medium keeps its own shape.
 *
 * A window's frame is the pilot's shape and a medium is its own, so filling the frame would crop the
 * picture rather than resize it. This is the cell span inside the frame whose aspect is the medium's:
 * the picture is scaled to the window and the frame stays where it is.
 */
export function framedCells(cells: Bearing, elevation: number, medium: number | undefined): Bearing {
  const [across, up] = cells;
  const frame = patchAspect(cells, elevation);
  const want = medium !== undefined && medium > 0 ? medium : frame;
  if (!(frame > 0) || !(want > 0)) return cells;
  // The cosine is the foreshortening the patch already carries; clamped so a window at the pole does not
  // ask for an unbounded span.
  const cos = Math.max(Math.cos(elevation), 0.05);
  if (want >= frame) {
    return [across, Math.min(up, (across * cos) / want)];
  }
  return [Math.min(across, (up * want) / cos), up];
}

/**
 * The part of a medium a patch of another shape shows, as a texture's own repeat and offset.
 *
 * A decal keeps the medium's shape and shows what fits of it, which is the rule the panel and the surface already
 * follow: a picture stretched to the shape of a window is a picture of something else. The overflow is cropped evenly,
 * so the middle of the medium is the middle of the window.
 */
export function coverUv(
  patch: number,
  medium: number,
): { repeat: [number, number]; offset: [number, number] } {
  if (!(patch > 0) || !(medium > 0)) return { repeat: [1, 1], offset: [0, 0] };
  if (medium > patch) {
    const across = patch / medium;
    return { repeat: [across, 1], offset: [(1 - across) / 2, 0] };
  }
  const up = medium / patch;
  return { repeat: [1, up], offset: [0, (1 - up) / 2] };
}

/**
 * Where a patch's own vertex stands, from its column and row: nought across and nought up is its own top left, and the
 * patch runs from there to the right and down, which is the order a picture's own coordinates are read in.
 *
 * A column is a meridian of the room and a row is a parallel of it, so the picture's four edges are four lines of the
 * graticule and its bottom edge stands on the parallel it is drawn at. A column is a great circle through the room's own
 * poles and reaches the pilot as a straight line; a row is a circle of latitude and bends with every other one the room
 * draws.
 *
 * This is the one mapping a window on the shell is drawn by, and it is not to be changed. A picture whose rows are not
 * the room's parallels is not a window on this room: its edges leave the lines the graticule draws, which the pilot
 * reads as a card hovering over a curved surface. Any window that disagrees with `patchAt` here is the defect, whichever
 * side of it was changed.
 */
export function patchAt(patch: Patch, column: number, row: number): [number, number, number] {
  const [across, up] = patch.quads;
  const azimuth = patch.bearing[0] + (column / across - 0.5) * patch.span[0];
  // The rows run from the patch's own low edge to its high one, which is the bearing's own span unless it was cut at
  // a pole (`patchOf`). A row is still one parallel of the room, whichever of the two it is read from.
  const elevation = patch.low + (1 - row / up) * patch.span[1];
  return shellAt([azimuth, elevation]);
}

/** A patch's grid of points, across first and then up, which is the run of points a surface is built from. */
export function patchGrid(patch: Patch): [number, number, number][] {
  const [across, up] = patch.quads;
  const out: [number, number, number][] = [];
  for (let row = 0; row <= up; row += 1) {
    for (let column = 0; column <= across; column += 1) out.push(patchAt(patch, column, row));
  }
  return out;
}

/**
 * A patch's own rim, in order round it from its top left: the line drawn round the picture, and the run of points its
 * own box on the frame is read from.
 */
export function patchRim(patch: Patch): [number, number, number][] {
  const [across, up] = patch.quads;
  const out: [number, number, number][] = [];
  for (let column = 0; column <= across; column += 1) out.push(patchAt(patch, column, 0));
  for (let row = 1; row <= up; row += 1) out.push(patchAt(patch, across, row));
  for (let column = across - 1; column >= 0; column -= 1) out.push(patchAt(patch, column, up));
  for (let row = up - 1; row > 0; row -= 1) out.push(patchAt(patch, 0, row));
  return out;
}

/**
 * A field's own ground as a zone: the bearing of its place and how far its members reach from it. One rule for
 * both the field the pilot is inside and the ones they are not, so a field's ground is the same size in both
 * readings and opening one does not resize it.
 */
export function zoneOf(
  points: [number, number, number][],
  sector: [number, number],
): { centre: [number, number, number]; radius: number } {
  return {
    centre: forwardOf({ yaw: sector[0], pitch: sector[1] }),
    radius: Math.min(spanOf(points, sector) + BAND, 1.2),
  };
}

/**
 * The view that holds every point: facing the composition, with the narrowest field that still contains
 * the space. It is the pilot's own opening frame, and it is computed rather than chosen, because the space
 * is a different size in each project and the frame is a different shape in each window.
 *
 * The bearing is the patch's own bearing and not the pilot's axis, because a place round the sphere is
 * held by facing it: the fit is what a pilot sees after turning to a project, and the turn is what a
 * selection does.
 */
export function fitView(
  points: [number, number, number][],
  width: number,
  height: number,
  margin = 1.18,
  sector: [number, number] = [0, 0],
): View {
  const forward = normalise(forwardOf({ yaw: sector[0], pitch: sector[1] }));
  const right = normalise(cross(forward, WORLD_UP));
  const up = cross(right, forward);
  const aspect = aspectOf(width, height);
  let tanUp = 0;
  for (const point of points) {
    const depth = dot(point, forward);
    if (depth <= 0.01) {
      tanUp = Math.tan((FOV_MAX * Math.PI) / 360);
      break;
    }
    tanUp = Math.max(tanUp, Math.abs(dot(point, up)) / depth, Math.abs(dot(point, right)) / (depth * aspect));
  }
  const wanted = tanUp * margin || Math.tan((LEVEL.fov * Math.PI) / 360);
  const limit = (degrees: number) => Math.tan((degrees * Math.PI) / 360);
  const clamped = Math.min(Math.max(wanted, limit(FOV_MIN)), limit(FOV_MAX));
  return { yaw: sector[0], pitch: sector[1], fov: (Math.atan(clamped) * 360) / Math.PI };
}

/** The page's own token for a kind, or a fallback when there is no document yet. */
export function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * What a unit that has written nothing is drawn in, where the space draws it. Dim rather than black, because such a
 * unit is still in the space: it has a store like every other unit and simply has nothing in it yet.
 *
 * It is the space's own ink and not a unit's, which is why `tintOf` does not answer with it. A point on the board is
 * a place, and a near-black point reads as a place with nothing in it; the glyph on the frame's edge is a control
 * inside a card, and the same ink there is a control nobody can find, press, or read the name of. So the derivation
 * answers what a unit has to say and each surface decides what nothing looks like where it draws.
 */
export const DIM = '#2f353d';

/**
 * A unit's colour: the kind of the last record it wrote, or the claim colour when it took the work,
 * because a claim writes no record of its own and is carried by the taker. It is one function so the
 * mark on the board and the name beside it cannot disagree about what colour the unit is.
 *
 * A unit with neither has nothing to say, and nothing is not a colour: the answer is null rather than an ink, so
 * that no surface is handed one it would have to draw a control in.
 */
export function tintOf(
  kind: NodeKind | null,
  ringed: boolean,
  ink: Record<NodeKind, string>,
): string | null {
  if (ringed) return ink.claim;
  return kind ? ink[kind] : null;
}

export function kindInk(): Record<NodeKind, string> {
  const ink = (name: string, fallback: string) => readableColour(cssVar(name, fallback), fallback);
  return {
    fact: ink('--fact', '#7ba3d0'),
    intent: ink('--intent', '#9a8bd0'),
    hint: ink('--hint', '#d3a75f'),
    claim: ink('--claim', '#7fbfa2'),
  };
}

/**
 * The ink the composition itself is drawn in: the one colour that belongs to the record rather than to what a
 * record says. It is the blackboard's own ink and not a fifth record kind, because the middle is what every
 * kind is read from and is not a kind of its own.
 */
export function blackboardInk(): string {
  return readableColour(cssVar('--ktema', '#93aac9'), '#93aac9');
}

/**
 * What a group is doing, as the one reading the space spends its chroma on: a project that is running is
 * the bright green, one between records the bright amber, and one that is not writing the bright cold blue.
 * A group carries its own state and not its members' derived one, because a project that is not open is a
 * place rather than a run and has no record to read a member's state from.
 */
export function stateInk(): Record<ProjectStatus, string> {
  const ink = (name: string, fallback: string) => readableColour(cssVar(name, fallback), fallback);
  return {
    running: ink('--working', '#4ade80'),
    idle: ink('--idle', '#fbbf24'),
    offline: ink('--offline', '#60a5fa'),
  };
}

/**
 * Where a point of a container stands while the container opens: on the group's own centre while the group is
 * shut, at its own place once it is open, and between the two while it comes out. A container is either one
 * mark or its members, and its members come out of the mark they were summarised as.
 *
 * It is one lerp and it is the same lerp at every level: a container inside a container unfolds out of its
 * own group the same way, which is the whole of what recursive containment needs from the board.
 */
export function unfold(
  point: [number, number, number],
  centre: [number, number, number],
  grow: number,
): [number, number, number] {
  return [
    centre[0] + (point[0] - centre[0]) * grow,
    centre[1] + (point[1] - centre[1]) * grow,
    centre[2] + (point[2] - centre[2]) * grow,
  ];
}

/**
 * The ray through a point of the frame, from the pilot's seat, where `across` and `down` are the frame's own
 * coordinates in [-1, 1].
 *
 * It is the one reading the frame's corners and its edges share: a corner is both coordinates at an end, and an edge is
 * one of them held there while the other runs. The minimap samples the edges through this rather than joining the corners
 * with chords, because a chord cuts inside the surface the frame actually holds.
 */
export function frameAt(view: View, aspect: number, across: number, down: number): [number, number, number] {
  const forward = normalise(forwardOf(view));
  const right = normalise(cross(forward, WORLD_UP));
  const up = cross(right, forward);
  const tanUp = Math.tan((view.fov * Math.PI) / 360);
  const tanAcross = tanUp * Math.max(aspect, 1e-6);
  return normalise([
    forward[0] + right[0] * tanAcross * across + up[0] * tanUp * down,
    forward[1] + right[1] * tanAcross * across + up[1] * tanUp * down,
    forward[2] + right[2] * tanAcross * across + up[2] * tanUp * down,
  ]);
}

/**
 * The four rays at the frame's own corners, from the pilot's seat. The minimap shades the space with
 * these, so the region it paints is the region the frame actually holds rather than a rectangle drawn
 * beside it.
 */
export function cornersOf(view: View, aspect: number): [number, number, number][] {
  // The order is the frame's own: bottom left, bottom right, top right, top left, so the four
  // directions join into one quad rather than into a bow tie.
  return [
    frameAt(view, aspect, -1, -1),
    frameAt(view, aspect, 1, -1),
    frameAt(view, aspect, 1, 1),
    frameAt(view, aspect, -1, 1),
  ];
}

/**
 * A place's own coordinate on the shell around the pilot: x is read around them and y up and down, and a
 * record's height lifts it above the unit that wrote it. The place still decides who stands where; this
 * only reads its floor as angles, so nothing here invents a position.
 *
 * The aspect handed in is the place's own, and it is what turns a world coordinate back into the place's
 * own fraction of its own width. That is deliberate: the space must be the same space whatever shape the
 * window is, and a mapping that read the frame's aspect instead would move a unit every time the window
 * was resized.
 */
export function scene(point: [number, number, number], aspect = 2): [number, number, number] {
  const across = point[0] / Math.max(aspect, 1e-6);
  const azimuth = (across * ARC * Math.PI) / 360;
  const up = point[1];
  const elevation = -(up * ELEVATION * Math.PI) / 360 + point[2] * RISE_PER_HEIGHT;
  // The floor recedes from the pilot, so the far side of the place is further away as well as higher.
  const radius = SHELL * (1 - RECEDE * up);
  const flat = radius * Math.cos(elevation);
  // The negative z is the pilot's forward, so the place's x stays the pilot's right.
  return [flat * Math.sin(azimuth), radius * Math.sin(elevation), -flat * Math.cos(azimuth)];
}

/**
 * How strongly a mark at this distance is drawn: full strength at the near edge of the place and faded by
 * the far edge. It is the other half of the floor receding, and the half that a reader can see: two marks
 * of the same size and the same colour are told apart by which of them the frame draws lighter, which is
 * what distance looks like.
 */
export function depthFade(point: [number, number, number]): number {
  const near = SHELL * (1 - RECEDE / 2);
  const far = SHELL * (1 + RECEDE / 2);
  const distance = Math.hypot(point[0], point[1], point[2]);
  const t = (distance - near) / Math.max(far - near, 1e-6);
  return 1 - 0.45 * Math.min(Math.max(t, 0), 1);
}

/** A unit's glyph as one SVG path, so the board's label uses the same set the rail draws. */
export function glyphPath(icon: string | null, role: string | null): string {
  const shapes = GLYPHS[icon ?? ''] ?? GLYPHS[role === 'acts' ? 'arm' : 'sensor'];
  return shapes
    .map(([tag, attributes]) => {
      const cx = Number(attributes.cx);
      const cy = Number(attributes.cy);
      if (tag === 'circle') {
        const r = Number(attributes.r);
        return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
      }
      if (tag === 'ellipse') {
        const rx = Number(attributes.rx);
        const ry = Number(attributes.ry);
        return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0`;
      }
      if (tag === 'rect') {
        return `M${attributes.x} ${attributes.y}h${attributes.width}v${attributes.height}h${-Number(attributes.width)}z`;
      }
      return String(attributes.d ?? '');
    })
    .join(' ');
}
