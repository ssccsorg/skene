// Where the names of the space are drawn, and why none is over another.
//
// A name stands beside the mark it belongs to, and two marks can stand close enough that their two names
// would be drawn over one another: on the cell's floor the vision camera and the operator console are a
// hand's width apart and each name is wider than that. A name cannot be carried off to a margin, because
// the board's own claim is that a name stands where its unit stands. What it can do is step out of
// another name's way, down or up, and a name that has stepped wears a leader so the reader can still see
// which mark it belongs to.
//
// The width is an estimate and deliberately generous. The layout runs before the labels exist, so there
// is nothing to measure; and an estimate that came out short would leave exactly the collision this
// module exists to remove, where one that came out long costs a step that was not needed.
//
// A name with nowhere to go is not drawn at all. A frame short enough to run out of rows has more names
// than it can carry, and the choice is between a name lost and a name over another name; a name nobody
// can read is not a name, and the unit is still reachable from the roster and from the record it wrote.

/** A name as the layout is handed it: where its mark stands, and what the name says. */
export interface NameAt {
  id: string;
  at: [number, number];
  /** The name and the record beside it, which is what decides how much space the name needs. */
  text: string;
}

/** A name as the board draws it: where it stands, and whether it had to step or could not be placed. */
export interface PlacedName {
  id: string;
  at: [number, number];
  /** Whether the name is not at its mark's own height, which is what a leader is drawn for. */
  stepped: boolean;
  /** Whether the frame had no space for it, in which case the board draws it nowhere. */
  dropped: boolean;
}

/**
 * The height a row needs. A label renders at about 22 px (an 11.5 px line in a box with a glyph beside it), so a row is
 * a little over that: a row of the rendered height alone would leave two stepped names touching, which is the collision
 * with a smaller number on it.
 */
export const NAME_ROW = 29;
const ROW = NAME_ROW;
/** The glyph, the border and the padding a name carries before its first character. */
const PREFIX = 36;
const PER_CHAR = 6.9;

/** How wide a name is taken to be. Exported so a test can hold the estimate to what a label renders. */
export function nameWidth(text: string): number {
  return PREFIX + PER_CHAR * text.length;
}

/** Something drawn in the space that a name must keep clear of and that cannot move to suit it. */
export interface Blocker {
  at: [number, number];
  width: number;
}

/**
 * The names of several groups placed in the order the groups are given, each group keeping clear of the ones before it.
 *
 * It is what a tree needs and one flat pass cannot give: a level nearer the root is placed first and is not displaced,
 * where one pass over the whole tree by x lets a leaf deep in the tree take the row a part's name then has nowhere to be.
 * A part that is not drawn is a part whose name the board does not say, and the whole of what it holds goes with it,
 * because a line from a joint to a part that is not there joins a thing to nothing.
 *
 * The groups are placed one at a time and the group already placed is what the next must keep clear of, which is the
 * whole of it: what a group is a level of the tree, the tree's spine, or anything else is the caller's business.
 */
export function layoutLevels(groups: NameAt[][], height: number, blockers: Blocker[] = []): PlacedName[] {
  const out: PlacedName[] = [];
  let taken = blockers;
  for (const group of groups) {
    const placed = layoutNames(group, height, taken);
    out.push(...placed);
    taken = [
      ...taken,
      ...placed
        .filter((name) => !name.dropped)
        .map((name) => ({ at: name.at, width: nameWidth(group.find((each) => each.id === name.id)?.text ?? '') })),
    ];
  }
  return out;
}

/**
 * The names placed so that no two are drawn over one another. A name is left at its mark's own height when
 * there is space, and otherwise takes the nearest free row; the names are walked left to right, so a name
 * steps out of one drawn before it and the layout is the same every frame rather than depending on the
 * order the units arrived in. The result comes back in the caller's order, because the caller draws them
 * in that order.
 *
 * The rows are one lattice for the whole space and not a lattice fixed by each mark. A name searching out
 * from its own mark alone lands between two other names' rows, and the space it leaves is a gap no later
 * name can use: two marks are rarely exactly a row apart, so every name that steps adds a fragment. One
 * lattice means the free space is whole rows, which is what lets a crowded band still find one.
 *
 * A blocker is what the space draws and a name cannot move: the composition's own mark, which stands where
 * the place's centre is. It is not a name and it is not laid out, but a name drawn under it is a name as
 * lost as one drawn under another name.
 */
export function layoutNames(names: NameAt[], height: number, blockers: Blocker[] = []): PlacedName[] {
  const placed: { name: PlacedName; width: number }[] = blockers.map((blocker, index) => ({
    name: { id: `\u0000blocker-${index}`, at: blocker.at, stepped: false, dropped: false },
    width: blocker.width,
  }));
  const byId = new Map<string, PlacedName>();
  const ordered = [...names].sort(
    (left, right) => left.at[0] - right.at[0] || left.id.localeCompare(right.id),
  );
  const rows: number[] = [];
  for (let y = ROW; y <= Math.max(height - ROW, ROW); y += ROW) rows.push(y);
  /** A name is drawn whole: its centre never comes closer to an edge than half a row. */
  const clamp = (value: number) =>
    Math.min(Math.max(value, ROW), Math.max(height - ROW, ROW));

  for (const name of ordered) {
    const width = nameWidth(name.text);
    const clear = (y: number) =>
      placed.every(
        (other) =>
          Math.abs(name.at[0] - other.name.at[0]) >= (width + other.width) / 2 ||
          Math.abs(y - other.name.at[1]) >= ROW,
      );

    const bare = clamp(name.at[1]);
    let chosen: PlacedName | null = clear(bare)
      ? { id: name.id, at: [name.at[0], bare], stepped: bare !== name.at[1], dropped: false }
      : null;
    if (!chosen) {
      const byDistance = [...rows].sort(
        (left, right) => Math.abs(left - name.at[1]) - Math.abs(right - name.at[1]) || left - right,
      );
      for (const y of byDistance) {
        if (!clear(y)) continue;
        chosen = { id: name.id, at: [name.at[0], y], stepped: true, dropped: false };
        break;
      }
    }

    // A name with no row is not a blocker: it takes nothing, because it draws nothing.
    if (chosen) {
      placed.push({ name: chosen, width });
      byId.set(name.id, chosen);
    } else {
      byId.set(name.id, { id: name.id, at: name.at, stepped: false, dropped: true });
    }
  }

  return names.map((name) => byId.get(name.id) as PlacedName);
}
