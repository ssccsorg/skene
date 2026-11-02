// How a view stands on the shell, how a drag across the frame moves it, and how it says where it came from.
//
// A view is a patch of the shell, so everything about where it is is a bearing: its own unit's bearing plus
// the offset the pilot gave it, and a size in cells of the graticule rather than in pixels, so a view is the
// same view whatever frame it is drawn in and a frame that changes shape does not restate it. A drag arrives from
// the page as pixels and is read out at the shell's radius by `bearingAt`, the inverse of the projection the whole
// board is drawn with, so a drag moves a view by the angle the pointer travelled rather than by a count of pixels,
// and a drag that comes back over the same pixels lands on the same place. A resize is the one reading that stays
// in the frame's own pixels, because the size it lands on is the size the patch is drawn at and the drawing is what
// it has to agree with.
//
// Everything about a view that is a place is here rather than in a component, because a place on the shell is what
// several things are: pressing a view is picking the entity whose view it is, so a view is a handle on an entity; a
// line between two views is a link between their entities, so a link is two bearings; and moving the pilot to
// another project is the same move to a bearing a drag already computes.

import { GRATICULE, bearingAt, bearingGap, cellAcross, edgeAt, patchRim, project, shellAt, type Bearing, type Patch, type View } from './board';

/** How far a view's patch reaches from its own middle, across and down, in radians. */
export function patchHalf(cells: Bearing): Bearing {
  return [(GRATICULE * cells[0]) / 2, (GRATICULE * cells[1]) / 2];
}

/** A bearing shifted by an offset, which is where a view stands off its own unit. */
export function shifted(unit: Bearing, offset: Bearing): Bearing {
  return [unit[0] + offset[0], unit[1] + offset[1]];
}

/**
 * How many of the bearings given stand under a patch at `place`.
 *
 * It is asked of directions and not of pixels, so the answer does not change as the pilot zooms, and the patch
 * is read as a disc of its own wider half rather than as a rectangle: what is being asked is whether a mark is
 * under the patch at all, and a rectangle's corners are not a different answer for the mark just inside one.
 */
export function covering(place: Bearing, half: Bearing, marks: Bearing[]): number {
  const reach = Math.max(half[0], half[1]);
  return marks.filter((mark) => bearingGap(place, mark) < reach).length;
}

/**
 * The smallest and largest a patch may be sized to, in cells.
 *
 * A patch under the floor is a picture with a frame. The ceiling is what the pilot can reach, and it is most of the
 * hemisphere the shell shows: a window meant to be read rather than glanced at is dragged out until it is the board,
 * and a ceiling at four cells stopped that drag halfway. A grain cell is ten degrees, so ten cells across is a hundred
 * and the patch still curves with the room at its edges.
 */
export const CELL_FLOOR: Bearing = [0.5, 0.4];
export const CELL_CEILING: Bearing = [10, 6.75];

/**
 * The pin a window is carried by, in the frame's pixels: how large it is drawn, and how far it stands clear of the
 * window it belongs to.
 *
 * It is a size of the page and not an angle of the shell, and it is the pin's own and not the window's: the pin is the
 * one control a window has, so it is read at one size whatever size the window is dragged to, and the name it carries
 * is the one thing that gives way when the name is long. A pin that grew with the window would be a title bar arguing
 * with the picture, and one that shrank to a minimum-sized window would cut its own controls off.
 *
 * It is here rather than in the component that draws it because the place a window's line back to its entity starts
 * from is this box's own middle. Two readings of it would be a line that meets the pin beside it, and the one thing a
 * leader has to do is meet what it is a leader for.
 */
export const HANDLE: [number, number] = [138, 22];
/** How far clear of the window the pin stands, so the two read as one object without touching. */
export const HANDLE_GAP = 4;
/** How far inside the frame a window and its pin are held, so neither is half off the board. */
export const MARGIN = 40;

/**
 * The icon a thing the frame does not hold is read by: how large it is drawn.
 *
 * One size for a unit and for a window, because it is one control: a mark the pilot has turned away from is somewhere in
 * the room, and what says which way to turn is where its icon stands on the edge. A window's own icon is the same object
 * as a unit's, with its own glyph in it, so the edge of the frame reads as one row of things rather than as two kinds of
 * thing that happen to share an edge.
 */
export const MARK = 22;
/**
 * How far inside the frame an icon is held, so the whole of it is read and not half of it.
 *
 * It is more than half the icon and not exactly half: an icon held by its own middle on the frame's own edge is an icon
 * with half of it over the space, and the pilot reads the space by these.
 */
export const MARK_INSET = 14;

/**
 * Which side of a point the frame has the most room on: the side a label of it is written on, since a label beside a
 * control has to be read whole and the frame is what it may not leave.
 *
 * It is asked about the point and not about an edge the control was held on, because a control in the middle of the
 * frame has no edge and still needs a side: one rule answers for a mark held on an edge, where the answer is the side
 * the inside is, and for one standing anywhere else.
 */
export function roomOf(at: [number, number], size: [number, number]): 'left' | 'right' | 'top' | 'bottom' {
  const room: [('left' | 'right' | 'top' | 'bottom'), number][] = [
    ['left', at[0]],
    ['right', size[0] - at[0]],
    ['top', at[1]],
    ['bottom', size[1] - at[1]],
  ];
  return room.reduce((best, each) => (each[1] > best[1] ? each : best))[0];
}

/** A box of the frame, which is what a window and everything laid on it is placed by. */
export interface FrameBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The window's own box on the frame, from its middle and its size. */
export function boxOf(middle: [number, number], size: [number, number]): FrameBox {
  return { left: middle[0] - size[0] / 2, top: middle[1] - size[1] / 2, width: size[0], height: size[1] };
}

/**
 * The box a window's own patch of the surface is read in: the rectangle its press target, its pin and its grip are all
 * laid on.
 *
 * It is the projection of the patch's own rim and not a count of pixels to the cell. A patch curves with the shell and
 * foreshortens as the pilot turns away from it, so its own box on the frame is neither the flat reading nor the same
 * shape from one look to the next, and a box read flat would leave the grip standing inside the picture at the corner
 * the pilot is pulling.
 */
export function patchBox(patch: Patch, size: [number, number], view: View): FrameBox {
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const point of patchRim(patch)) {
    const [x, y] = project(point, size[0], size[1], view);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  return { left, top, width: right - left, height: bottom - top };
}

function inside(box: FrameBox): boolean {
  return box.width > 0 && box.height > 0;
}

/**
 * Where a window's pin stands: across the window, at the end its own entity is on, and clear of its top or its bottom
 * edge by `HANDLE_GAP`.
 *
 * Which edge is the origin entity's own side, on both axes. A pin set on the far side would be a label about the
 * window, and the line back to the entity would have to cross the picture to reach it; a pin set on the entity's side
 * is a handle on the window that faces what the window is looking from, and the line leaves it towards that and away
 * from the picture. Across is the same rule as down is: an entity left of the window's own middle puts the pin at the
 * window's left end, so a pin says which way its window is looking from wherever the entity stands.
 *
 * A pin drawn over the picture at all is a control over the thing the pilot is looking at, which is what this is not.
 * That is why the pin is clear of the window's own edge rather than over its middle: the window's middle is the
 * picture.
 */
export function handleOf(box: FrameBox, originAt: [number, number]): FrameBox {
  const left = originAt[0] < box.left + box.width / 2 ? box.left : box.left + box.width - HANDLE[0];
  const above = originAt[1] < box.top + box.height / 2;
  return {
    left,
    top: above ? box.top - HANDLE_GAP - HANDLE[1] : box.top + box.height + HANDLE_GAP,
    width: HANDLE[0],
    height: HANDLE[1],
  };
}

/** Whether a box stands clear of the frame's own edge, which is what a window and its pin are both asked for. */
export function held(box: FrameBox, size: [number, number], margin: number): boolean {
  return inside(box) && box.left > margin && box.left + box.width < size[0] - margin && box.top > margin && box.top + box.height < size[1] - margin;
}

/**
 * The part of a box that is on the frame, or null when none of it is.
 *
 * It is the window's press target that is cut to this, and it is the frame's own rectangle it is cut to. A window the
 * pilot has moved can stand half over an edge, and what is reached by hand of such a window is the part the frame draws:
 * a target the size of the whole box would reach over whatever the layout put beside the board and take a press meant
 * for a panel, and of a window entirely past the frame there is nothing on the board to press at all.
 *
 * It is not the same question as `held`, which asks whether a window is clear of the edge and is what its own bar is
 * drawn by. This asks only whether the window is drawn on the board at all, because a picture the pilot can see is a
 * picture they can take hold of.
 */
export function clipped(box: FrameBox, size: [number, number]): FrameBox | null {
  // A board measured before its first paint is a size of nothing, and a box projected there is a box of NaNs. Neither is
  // a place to draw, so the window has no target until the next render.
  if (![box.left, box.top, box.width, box.height, size[0], size[1]].every(Number.isFinite)) return null;
  const left = Math.max(box.left, 0);
  const top = Math.max(box.top, 0);
  const right = Math.min(box.left + box.width, size[0]);
  const bottom = Math.min(box.top + box.height, size[1]);
  if (right <= left || bottom <= top) return null;
  return { left, top, width: right - left, height: bottom - top };
}

/**
 * Where a window's grip stands, or null when its corner is not on the frame.
 *
 * The grip is half over the window and half beside it, so a window flush with the rim still carries the control that
 * sizes it: a window's place follows the entity that carries it, and one at the rim is a window the pilot has not
 * moved. The corner is what is measured, so a window carried past an edge has no grip until it is brought back: its
 * rim is the window's own and not a control that may be left off the board.
 */
export function gripOf(box: FrameBox, size: [number, number], grip: number): [number, number] | null {
  const at: [number, number] = [box.left + box.width - grip / 2, box.top + box.height - grip / 2];
  const on = at[0] >= -grip && at[0] <= size[0] + grip && at[1] >= -grip && at[1] <= size[1] + grip;
  return on ? at : null;
}

/** Where the icon of a thing the frame does not hold stands, and which way the thing went. */
export interface Mark {
  /** The point of the frame the icon is centred on. */
  at: [number, number];
  /** The angle the thing went, so the icon's own chevron can point there. */
  turned: number;
  /**
   * Whether the icon was held on an edge of the frame, which is when there is a direction for the chevron to point.
   *
   * It is not the same question as whether the thing was past the edge: a thing behind the pilot is held on the edge they
   * come round to, and a thing whose own control is already inside the frame's room keeps the place it stands at, so a
   * chevron turned on the first reading would name a direction the thing did not go.
   */
  out: boolean;
}

/** How a window is read: the patch its picture is drawn on, the bar that carries it, and the icon it becomes. */
export interface Reading {
  /** The window's own box on the frame, or null while it is folded and there is no picture to have a box. */
  box: FrameBox | null;
  /** Where the window's own bar stands, or null while the picture is drawn nowhere and the icon is all there is. */
  handle: FrameBox | null;
  /** Where the icon stands, or null while any of the window's picture is drawn on the frame. */
  mark: Mark | null;
}

/**
 * What a window is read by.
 *
 * A window the board draws at all is read as a window: the part of its picture the frame holds is what is pressed, and
 * the bar beside it carries its own fold and close. A window the board draws nowhere is read by its icon, which is what a
 * folded window is read by as well, because a folded window has no picture and the board draws nothing of it either. The
 * two are one situation from where the pilot sits, which is a thing in the room they reach by turning to where its icon
 * stands.
 *
 * Any part of the picture being drawn is what makes it a window, so a window the pilot has carried half over an edge is
 * a window and not an icon: what they can see of it is what they take hold of. Its own bar is then held on the edge it is
 * past rather than left off it, because a control drawn past the frame is a control the pilot cannot press. That is the
 * one reading a window takes that a mark in the space does not: a mark is a point and a window is a body, so a point is
 * either on the frame or is not, and a body is read by what is drawn of it.
 *
 * It is here rather than in the layer that draws it because this is the policy and not the drawing: which of the two a
 * window is read by decides whether a press on it picks the entity its camera is carried by or turns the pilot to the
 * window itself, and a reading taken twice would be two answers to that.
 */
export function readingOf({
  folded,
  behind,
  at,
  box,
  originAt,
  size,
}: {
  /** Whether the pilot has put the picture away. */
  folded: boolean;
  /** Whether the window stands behind the pilot, whose picture is not drawn wherever its own mirror lands. */
  behind: boolean;
  /** Where the window's own place falls on the frame. */
  at: [number, number];
  /** The window's own box on the frame. */
  box: FrameBox;
  /** Where the entity that carries the camera falls, which is the side the bar is set on. */
  originAt: [number, number];
  /** The frame's own size. */
  size: [number, number];
}): Reading {
  // A frame measured before its first paint has no place for a window, a bar, or an icon: every one of them would be a
  // style of NaNs until the board reports its size.
  if (![...at, ...size].every(Number.isFinite)) return { box: null, handle: null, mark: null };
  // A window behind the pilot is drawn nowhere whatever its mirror lands on: the projection divides by a depth that is
  // not there, and a press at the mirror would be a press on a window the pilot cannot see.
  const drawn = folded || behind ? null : clipped(box, size);
  if (!drawn) {
    const edge = edgeAt(at, behind, size, [MARK_INSET, MARK_INSET]);
    return {
      box: folded ? null : box,
      handle: null,
      mark: { at: edge.at, turned: edge.turned, out: edge.out },
    };
  }
  const bar = handleOf(box, originAt);
  if (held(bar, size, 0)) return { box, handle: bar, mark: null };
  // The bar is set at the window's own rim, so a rim past the frame's edge is a bar past it: it is held on that edge
  // whole, which is what says a control reaches the pilot wherever the window it belongs to has got to.
  const onEdge = edgeAt([bar.left + bar.width / 2, bar.top + bar.height / 2], behind, size, [
    bar.width / 2,
    bar.height / 2,
  ]);
  return { box, handle: boxOf(onEdge.at, [bar.width, bar.height]), mark: null };
}

/**
 * The path from a view's patch back to the entity whose view it is, along the shell's own runs: across the
 * parallel the patch stands on to the entity's own meridian, and then along that meridian to the entity.
 *
 * It is orthogonal and it is on the shell, and both of those are the point. A straight line from a patch to its
 * entity says a direction and leaves the reader to work out the two runs it is made of, which is the one thing
 * a leader is for; and a line drawn on the shell turns and foreshortens with the space, so it reads as part of
 * the room rather than as a stroke over the picture. The two runs are the shell's own horizontal and vertical:
 * a parallel and a meridian, the same lines the cage is drawn with.
 */
export function leaderPath(from: Bearing, to: Bearing, steps = 20): [number, number, number][] {
  const turn = Math.atan2(Math.sin(to[0] - from[0]), Math.cos(to[0] - from[0]));
  const out: [number, number, number][] = [];
  for (let step = 0; step <= steps; step += 1) {
    out.push(shellAt([from[0] + turn * (step / steps), from[1]]));
  }
  for (let step = 1; step <= steps; step += 1) {
    out.push(shellAt([to[0], from[1] + (to[1] - from[1]) * (step / steps)]));
  }
  return out;
}

/**
 * The size in cells a patch's corner lands on, from where the patch's own middle stands in the frame and where the
 * pointer dragging that corner now is, both in the frame's own pixels.
 *
 * It is read in the frame's own pixels rather than as an angle, which is what makes the corner follow the pointer:
 * a patch is drawn at `cellAcross` pixels to the cell, so this is the same arithmetic the patch is drawn by and the
 * size a drag lands on is the size the drag drew. Read as an angle it would disagree with the drawing wherever the
 * patch stands off the middle of the frame, where a cell of the frame is not a cell of the shell.
 *
 * A pointer pulled back past the patch's own middle takes the size to its floor rather than turning it round, which
 * is what a window does when it is dragged inside out.
 */
export function sized(
  middle: [number, number],
  pointer: [number, number],
  frame: [number, number],
  view: View,
): Bearing {
  const cell = cellAcross(view.fov, frame[1]) || 1;
  const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);
  return [
    clamp((Math.max(pointer[0] - middle[0], 0) * 2) / cell, CELL_FLOOR[0], CELL_CEILING[0]),
    clamp((Math.max(pointer[1] - middle[1], 0) * 2) / cell, CELL_FLOOR[1], CELL_CEILING[1]),
  ];
}

/** The places searched for a clear one: rings of candidates at increasing distance from a unit's own bearing. */
const RINGS = [0.28, 0.44, 0.6, 0.76, 0.92];
const SPOKES = 16;

/**
 * A turn in [0, 1) from a view's own name.
 *
 * Two views whose entities stand together see the same marks and would otherwise look at the same places in the
 * same order, and so take the same place: the only thing that tells one view from another is its own name, so
 * the order the places are looked at in is turned by it. It is a number from a name and not a layout, and the
 * same thing is done for the beat of a unit's own pulse.
 */
function turnOf(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) hash = (hash * 31 + name.charCodeAt(index)) % 997;
  return hash / 997;
}

/**
 * The place a view stands at when the pilot has not moved it: among the places around its own unit, the one that
 * stands over the fewest marks, and the nearest such place when two tie.
 *
 * It is searched rather than declared, because what is under a patch is a reading of where a field's own members
 * stand and a declared offset would be a number that happened to be clear of the members of one fixture. The
 * unit's own bearing is the first candidate, so a view whose unit has room stands on its unit and a view whose
 * unit is crowded stands beside it: both are this one rule, and a field that grows moves its views rather than
 * burying them.
 *
 * The marks are what the place must not stand over: the field's own members, the composition, and the entities
 * of the other views, so that opening the space again is a picture rather than a pile of views on one clear
 * place. `holds` is where a view is allowed to stand at all, and a place it rejects is not a place: the frame
 * holds the field's own crowded band, so the room a patch needs can only be had at the frame's edge, and a view
 * nobody can see is worse than a view over one mark. Clearance is what the search is for and the frame is what
 * it may not leave, and the frame is asked for the patch's whole box, because the frame is what its own bar and
 * its own grip are pressed in.
 */
export function clearOffset(
  unit: Bearing,
  half: Bearing,
  marks: Bearing[],
  name = '',
  holds?: (place: Bearing) => boolean,
): Bearing {
  const search = (may: (place: Bearing) => boolean): Bearing | null => {
    if (may(unit)) {
      if (covering(unit, half, marks) === 0) return [0, 0];
    }
    const turn = turnOf(name) * Math.PI * 2;
    let best: Bearing | null = null;
    let fewest = Number.POSITIVE_INFINITY;
    for (const ring of RINGS) {
      for (let spoke = 0; spoke < SPOKES; spoke += 1) {
        const angle = (spoke / SPOKES) * Math.PI * 2 + turn;
        const offset: Bearing = [ring * Math.cos(angle), ring * Math.sin(angle)];
        const place = shifted(unit, offset);
        if (!may(place)) continue;
        const over = covering(place, half, marks);
        // A ring at a time and a spoke at a time, so a place only replaces what is held when it is strictly
        // clearer: at equal cover the nearer place to the unit is the one that stands.
        if (over < fewest) {
          fewest = over;
          best = offset;
          if (over === 0) return offset;
        }
      }
    }
    return best;
  };

  // The places the view may stand at, and only if none of them exists at all, the places it may not.
  return (holds ? search(holds) : null) ?? search(() => true) ?? [0, 0];
}

/**
 * Where a window stands before the pilot moves it: over the entity that carries it, except a map of the whole place.
 *
 * A map of the place is about the ground and every unit on it, so it stands over the place rather than over the
 * carrier: anchored on a drone it would cover the drone's own footage and show the site from off its middle. The
 * carrier is still what the window belongs to, and still where the line back to it lands.
 */
export function anchorOf(source: { kind: string; scope?: string }, carried: Bearing, centre: Bearing): Bearing {
  return source.kind === 'map' && source.scope === 'place' ? centre : carried;
}

/**
 * Where a view stands: the place the pilot put it at, or, while they have not moved it, the clear place beside
 * its own unit. A view that is not moved is a view that has not been taken, which is why the offset is what says
 * whether it has a place of its own.
 */
export function viewBearing(
  offset: Bearing | null,
  unit: Bearing,
  half: Bearing,
  marks: Bearing[],
  name = '',
  holds?: (place: Bearing) => boolean,
): Bearing {
  return shifted(unit, offset ?? clearOffset(unit, half, marks, name, holds));
}

/**
 * The offset a drag lands on: the pointer's own travel from where the patch stood, read out at the shell's
 * radius and taken as a shift of the unit's own bearing.
 *
 * `from` is where the window's own place falls on the frame and not the middle of its box, and the difference is the
 * whole of whether a drag is exact: the projection is undone by the same arithmetic it is written with, so a window
 * anchored on its own place lands exactly where the hand went, and one anchored anywhere else on the window lands by the
 * travel plus wherever the anchor stood off the place. `ViewPlace.at` is that point.
 */
export function dragged(
  from: [number, number],
  delta: [number, number],
  size: [number, number],
  view: View,
  unit: Bearing,
): Bearing {
  const at = bearingAt([from[0] + delta[0], from[1] + delta[1]], size, view);
  return [at[0] - unit[0], at[1] - unit[1]];
}
