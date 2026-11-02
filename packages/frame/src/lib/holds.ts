import type { Lower } from './channel';
import { nameWidth } from './labels';

// The lower elements of a member, as a reading of the room's answers.
//
// What a member holds arrives as paths and their contents, and a tree is a reading of that and not a shape the room
// stores: a level is drawn because the level above it is open. The same reading feeds the panel that walks it and the
// space that draws it, so the two cannot disagree about what a member holds or about what is open.

/**
 * How deep a tree is read, which is a claim about the data and not a decision about the drawing.
 *
 * A room answers one level at a time and a directory answers another level for every level asked, so the room is free to
 * answer for ever: what bounds the reading is the reader and not the room, and the bound belongs here rather than at a
 * renderer. A view that stopped one level lower would be a view that decided what a member holds, and the space and the
 * list beside it would then be free to stop at two different places.
 */
export const HELD_DEPTH = 4;

/**
 * How many elements of a member's tree are read at once.
 *
 * The depth bound is not enough, because a directory holds as many entries as it likes and every one of them is another
 * directory: a repository read four levels deep is thousands of elements, which is a picture nobody can read and a
 * lay-out that costs a frame to work out. So the reading is spent as well as bounded.
 *
 * It is the reader's bound and not a room's, for the same reason the depth is: a room answers for every level asked, so
 * the tree it can answer for is unbounded and what bounds it is whoever reads it. `FILES_CAP` bounds one level of the
 * room's own answer; this bounds the tree the two surfaces draw, which is the different question.
 *
 * The number is what a board can carry rather than a taste: a name is about 107 px wide on a row 29 px tall, so a board
 * of any size holds a few dozen of them. A tree that fits is a tree a pilot can read; one that does not is a spray. What
 * it does not bind is the ordinary case, which is a path of folders open: a member's own level and the levels of the few
 * folders under it are a few dozen elements, and the budget bites only when a pilot opens the whole tree at once.
 */
export const HELD_ELEMENTS = 32;

/** The name an element is drawn by: the last step of the room's own address for it. */
export function leafOf(address: string): string {
  return address.split('/').filter(Boolean).pop() ?? address;
}

/**
 * The path a level stands at within its member, which is the one thing the room is asked about.
 *
 * A room states a member's elements under the member, so the address a level is keyed by leads with the member and what the
 * room is asked for is the part under it. The member's own level is the empty path, which is the same ask as any other
 * level with nothing under it: one question for the whole tree, and one spelling for an element wherever it is read.
 *
 * A path that does not lead with the member is answered as it stands, so a reader that was handed an address from
 * somewhere else asks about it rather than about a mangled one.
 */
export function withinOf(member: string, path: string): string {
  if (path === member) return '';
  if (!path.startsWith(`${member}/`)) return path;
  return path.slice(member.length + 1);
}

/** One lower element, as the space draws it. */
export interface Held {
  /** The room's own address for it, which is what a level under it is asked about. */
  path: string;
  /** The last step of that address, which is what is drawn. */
  name: string;
  /** Whether it holds lower elements of its own, which is what makes it openable. */
  dir: boolean;
  depth: number;
  /** The address of the element holding it, or null for the member's own level. */
  under: string | null;
  /**
   * Whether the reading stopped here with more to be had.
   *
   * It is the bound being reached and not an absence: an element a room would answer more about is one the reader
   * stopped at, and a drawing that said nothing about it would be a drawing that claimed the tree was whole.
   */
  bounded: boolean;
}

/**
 * What a member holds, in the order the space draws it: its own level, and the levels of the folders that are open.
 *
 * The order is a level at a time, so a level nearer the member is read whole before the level under it is begun and an
 * element is always read after the element that holds it. That is what makes the spend (`budget`) mean what a reader
 * wants: the reading stops at the far end of the tree rather than inside the first folder of it, which is what spending
 * it as the walk descends would do.
 *
 * The depth is read no further than `bound` and the reading is spent at `budget` elements. The element a spent reading
 * stopped before says so, because a level that ran out of budget looks exactly like a level that ended, and a drawing
 * that said nothing about it would be a drawing that claimed the tree was whole. So does a directory standing at the
 * depth bound, which is the other way a reading stops with more to be had.
 */
export function heldUnder(
  root: string,
  rows: Record<string, Lower[]>,
  open: string[],
  bound = HELD_DEPTH,
  budget = HELD_ELEMENTS,
): Held[] {
  const out: Held[] = [];
  let spent = false;
  // One level at a time, and the level under it built while this one is read, which is what makes the order a level at a
  // time rather than a descent into the first folder.
  let level: { path: string; depth: number }[] = [{ path: root, depth: 1 }];
  while (level.length && !spent) {
    const under: { path: string; depth: number }[] = [];
    for (const at of level) {
      for (const each of rows[at.path] ?? []) {
        if (out.length >= budget) {
          spent = true;
          break;
        }
        const deeper = each.dir && at.depth < bound;
        out.push({
          path: each.name,
          name: leafOf(each.name),
          dir: each.dir,
          depth: at.depth,
          under: at.depth > 1 ? at.path : null,
          bounded: each.dir && !deeper,
        });
        if (deeper && open.includes(each.name)) under.push({ path: each.name, depth: at.depth + 1 });
      }
      if (spent) break;
    }
    level = under;
  }
  if (spent && out.length) {
    const last = out.length - 1;
    out[last] = { ...(out[last] as Held), bounded: true };
  }
  return out;
}

/**
 * How wide a level fans out, by how deep it stands: a level at the member opens wide, what is inside it less, so a
 * subtree keeps to its own sector of the member rather than reaching across its siblings.
 */
const SPREAD = [0, 150, 112, 92, 80];

/**
 * How far apart two elements of one level are drawn at the least, in pixels.
 *
 * It is what a name needs to be read rather than a taste: below it two names of one level overlap, and a level drawn
 * with overlapping names is a level that says less than the list beside it.
 */
const MIN_GAP = 46;

/** How far a level reaches at the least, so that a level of one stands clear of the thing holding it. */
const MIN_REACH = 68;

/** How far a level may reach, so that a wide level does not spray across the frame it is drawn in. */
const MAX_REACH = 170;

/** The spread of a level, in degrees, which is what decides how wide its fan opens. */
export function spreadOf(depth: number): number {
  return SPREAD[Math.min(depth, SPREAD.length - 1)] as number;
}

/**
 * How far from what holds it a level is drawn.
 *
 * The reach follows the count rather than the depth: what has to fit is the level's own names, so a level of six
 * stands further out than a level of two and a deeper level with a narrower fan reaches further to keep the same
 * spacing. It is capped because the frame is finite, and a level wider than the cap is one drawn a little tighter.
 */
export function reachOf(count: number, spread: number): number {
  if (count < 2) return MIN_REACH;
  const wanted = (MIN_GAP * (count - 1) * 180) / (spread * Math.PI);
  return Math.min(Math.max(wanted, MIN_REACH), MAX_REACH);
}

/**
 * Where one element of a level is drawn, around the thing that holds it.
 *
 * A level fans out below what holds it rather than around the member, so a leg's joints are drawn at the leg: the
 * drawing says what holds what, and that is what makes the space worth more than the list beside it. The bearing is
 * the middle of the fan, which is straight down, and the screen's own y grows downward. The first element of a level
 * is the one drawn furthest left, so a level reads across the way its own names read down a list.
 */
export function fanAt(centre: [number, number], index: number, count: number, depth: number): [number, number] {
  const spread = spreadOf(depth);
  const reach = reachOf(count, spread);
  const from = count > 1 ? spread / 2 - (spread * index) / (count - 1) : 0;
  const angle = ((90 + from) * Math.PI) / 180;
  return [centre[0] + Math.cos(angle) * reach, centre[1] + Math.sin(angle) * reach];
}

/** One element of the tree as it stands on screen: where it is drawn, and where the thing holding it is drawn. */
export interface Stood extends Held {
  at: [number, number];
  from: [number, number];
}

/**
 * The tree walked once, with each element placed by `place` and everything under it placed against that.
 *
 * The order is the reading's own, a level at a time, so an element's parent is placed before it is reached and one pass
 * is enough. An element whose parent is not on the screen is not on the screen either, and neither is anything under it:
 * a line drawn to a point with nothing at it joins a thing to nothing, which is the shape this refuses to draw.
 */
function walk(elements: Held[], member: [number, number], place: Placed): Stood[] {
  // Siblings are counted once and not once an element: a fan is the level's own, so what decides where one element of it
  // is drawn is how many there are and which of them it is.
  const byUnder = new Map<string | null, Held[]>();
  for (const element of elements) {
    byUnder.set(element.under, [...(byUnder.get(element.under) ?? []), element]);
  }

  const stood = new Map<string, [number, number]>();
  const out: Stood[] = [];
  for (const element of elements) {
    const siblings = byUnder.get(element.under) ?? [];
    const holds = element.under ? stood.get(element.under) : member;
    if (!holds) continue;
    const at = place(element, holds, siblings.indexOf(element), siblings.length);
    if (!at) continue;
    stood.set(element.path, at);
    out.push({ ...element, at, from: holds });
  }
  return out;
}

/** Where one element of a level goes, given what holds it, or null when nothing is drawn there. */
type Placed = (
  element: Held,
  holds: [number, number],
  index: number,
  count: number,
) => [number, number] | null;

/**
 * The tree as it fans out from the member, with nothing else in the space taken into account.
 *
 * It is the seed and not the drawing: the fan is where the tree would stand if the space held nothing else, and its own
 * shape is what the lay-out keeps sideways. A name is placed at its mark's own x and steps only up or down, so the fan is
 * what puts a leg's joints to the left of an arm's and keeps them there; what the lay-out then decides is the row each
 * one is drawn on. What is drawn is `treeAt`, which is this placement corrected by where the lay-out actually put them.
 *
 * `width` is the frame the tree is about to be drawn in, and it is asked for because a fan is geometry and geometry does
 * not know how wide a name is: a level of many names fans wider than any frame, and a name off the side of the frame is a
 * name the pilot has to go looking for. Each element is brought inside the frame by its own width, and the levels under it
 * fan from where it actually stands, so the whole tree stays in the frame it was seeded for.
 */
export function fanTree(elements: Held[], member: [number, number], width = Number.POSITIVE_INFINITY): Stood[] {
  return walk(elements, member, (element, holds, index, count) =>
    inside(fanAt(holds, index, count, element.depth), element.name, width),
  );
}

/** A fanned point brought inside a frame of this width, so that a level of many names does not fan off the side. */
function inside(at: [number, number], name: string, width: number): [number, number] {
  // A name is drawn centred on the point, so what has to be inside is half of it. A name wider than the frame has nowhere
  // to stand that is wholly inside it, and half the frame is as near as it gets to being readable.
  const half = Math.min(nameWidth(name) / 2, width / 2);
  return [Math.min(Math.max(at[0], half), width - half), at[1]];
}

/**
 * The tree as it stands: every element placed, each one joined to the element that holds it.
 *
 * `place` is asked where every element of the tree stands, and it is the one thing this cannot know: a space lays its
 * names out against each other so that no two are drawn over one another, and that lay-out moves the tree. Asking is what
 * keeps the lines joined to what is on screen rather than to where the fan put it, which is a tree of lines to points
 * nobody can see.
 *
 * An element `place` cannot name is not drawn, and neither is any level under it: the lay-out drops a name when the
 * frame has no room for it, and a part drawn at a place of its own with no name on it, or a joint drawn at a part that
 * is not there, is a line to nothing. That is the answer and not a gap in it.
 */
export function treeAt(
  elements: Held[],
  member: [number, number],
  place: (element: Held) => [number, number] | null,
): Stood[] {
  return walk(elements, member, (element) => place(element));
}
