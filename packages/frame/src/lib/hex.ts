// The ground divided into six-sided cells.
//
// A place's own numbers are a plane, and a picture of where things stand on it cannot name a piece of it: two things
// side by side on that picture are two points and not two places an order can pick between. A lattice is what gives the
// ground addresses, and six sides are what makes every neighbour the same distance away, which is the property a lattice
// is chosen for: the frame already partitions the shell this way (`CELL` in `lib/board`) and this is the same cell over
// a plane rather than over a sphere.
//
// The cells are axial: two numbers and not three, because a hex's third axis is the negative sum of the other two, and
// carrying it would be a number that can disagree with the other two. A point is read in and a middle is read out by one
// conversion, written together here, because a second copy of either puts a thing in one cell and draws it in another.
//
// It is geometry and nothing else. What stands on the ground, what a cell is worth when it is named, and how a cell is
// drawn belong to the surface that draws them.

/** A cell of the lattice, in axial coordinates: `q` across and `r` down, at sixty degrees to each other. */
export interface Cell {
  q: number;
  r: number;
}

/** A rectangle of the place's own numbers: the view a place declares, which is the ground a map is drawn of. */
export type Extent = [number, number, number, number];

/**
 * How many cells tall a map is, whatever ground it covers.
 *
 * A place's view is its own size, so a cell of a fixed number of the place's units would be one cell on a small place
 * and hundreds on a large one. The count is what a reader can see at once, and the cell's size is what follows from it.
 */
export const CELLS_TALL = 4;

/** How long a cell's edge is, in the place's own numbers, for the ground a place declares. */
export function cellSize(view: Extent): number {
  return view[3] / (2 * CELLS_TALL);
}

/** The middle of a cell, in the place's own numbers. Pointy-top: a cell stands on a corner and has one above it. */
export function centreOf(cell: Cell, size: number, view: Extent): [number, number] {
  const [vx, vy, vw, vh] = view;
  return [
    vx + vw / 2 + size * Math.sqrt(3) * (cell.q + cell.r / 2),
    vy + vh / 2 + size * 1.5 * cell.r,
  ];
}

/** The cell a point of the ground falls in. */
export function cellOf(point: [number, number], size: number, view: Extent): Cell {
  const [vx, vy, vw, vh] = view;
  const x = point[0] - (vx + vw / 2);
  const y = point[1] - (vy + vh / 2);
  // The inverse of `centreOf`, and then the rounding every cell read out of a fraction goes through.
  return roundCell((Math.sqrt(3) / 3) * x / size - y / (3 * size), (2 / 3) * y / size);
}

/**
 * A fraction read out as the cell it is nearest, which is the rounding a hex needs.
 *
 * A fraction rounded on the two axes alone can land outside the cell it is nearest, because the two axes are at sixty
 * degrees and the nearest cell is the nearest by all three: the third axis is rounded too and the one that moved
 * furthest from its own fraction is recomputed from the other two, which is what puts the answer back on the lattice.
 *
 * It is one function because two readings of one fraction have to name one cell: the cell a point falls in, the cell a
 * point in the middle of a route falls in, and the cells a route passes through are the same arithmetic or a trace
 * leaves its own lattice.
 */
function roundCell(q: number, r: number): Cell {
  const s = -q - r;
  const [rq, rr, rs] = [Math.round(q), Math.round(r), Math.round(s)];
  const [dq, dr, ds] = [Math.abs(rq - q), Math.abs(rr - r), Math.abs(rs - s)];
  if (dq > dr && dq > ds) return { q: whole(-rr - rs), r: whole(rr) };
  if (dr > ds) return { q: whole(rq), r: whole(-rq - rs) };
  return { q: whole(rq), r: whole(rr) };
}

/**
 * The cells a route from one cell to another passes through, both ends included, as one chain of neighbours.
 *
 * It is the lattice's own straight line and not a shortest path chosen among the several that exist: the two axes are
 * walked together and every step is read as the cell it lands nearest, which is one route for one pair of cells. A
 * picture of wiring needs exactly that, because two readings of the same pair have to draw the same trace: a pathfinder
 * that picked one of two equal paths by chance would move a wire when nothing about the space did.
 *
 * The route is where a connector goes when the lattice is the ground. It crosses from one cell to the next through the
 * border between them, which is the middle of the edge they share and the point a trace on a board crosses a pad's gap
 * at, and it turns by sixty degrees because that is the angle two neighbours stand at. Two routes that run the same way
 * cover each other, so a bundle of wires toward one side of the ground is drawn as the trunk they share.
 *
 * A route from a cell to itself is that cell alone, and a chain never names the same cell twice in a row: a step that
 * rounds back to where it came from is not a step, and a segment of no length is not a length a drawing can take.
 */
export function between(from: Cell, to: Cell): Cell[] {
  const [dq, dr] = [to.q - from.q, to.r - from.r];
  const steps = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
  const cells: Cell[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const t = steps === 0 ? 0 : step / steps;
    const cell = roundCell(from.q + dq * t, from.r + dr * t);
    const last = cells[cells.length - 1];
    if (!last || last.q !== cell.q || last.r !== cell.r) cells.push(cell);
  }
  return cells;
}

/**
 * The part of a route that is not under the marks at its own two ends.
 *
 * A route joins two things drawn as marks and both of its ends are drawn over: a trace from a ground's middle to a
 * neighbouring cell spends half its length under the two plates, and a picture whose wiring is under its own marks is a
 * picture that reads as no wiring at all. So each end is brought back along its own route to the rim it meets, and the
 * corners between the two are kept whole, because the route is the cells it passes through and a corner pulled in has
 * left the border it turns at.
 *
 * `radius` is the rim's own and belongs to the surface that draws it, the way the marks' sizes do: the lattice knows
 * where a cell is and nothing about how large a thing standing in one is drawn. A route with no length left between its
 * two rims is no line, and an empty answer is that rather than a gap: two marks that meet are joined by their touching.
 */
export function apart(points: [number, number][], radius: number): [number, number][] {
  if (points.length < 2 || radius <= 0) return points;
  let whole = 0;
  for (let index = 1; index < points.length; index += 1) {
    whole += Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]);
  }
  if (whole <= radius * 2) return [];
  const back = (from: [number, number], toward: [number, number]): [number, number] => {
    const span = Math.hypot(toward[0] - from[0], toward[1] - from[1]);
    if (span === 0) return [from[0], from[1]];
    const step = Math.min(radius, span);
    return [from[0] + ((toward[0] - from[0]) / span) * step, from[1] + ((toward[1] - from[1]) / span) * step];
  };
  const last = points.length - 1;
  return [
    back(points[0], points[1]),
    ...points.slice(1, last).map((point) => [point[0], point[1]] as [number, number]),
    back(points[last], points[last - 1]),
  ];
}

/**
 * The cells a frame spreads its own things over: the middle is kept for the thing the frame is about, and what it holds
 * stands in the ring of one, then of two, and so on.
 *
 * It is what makes a picture of a thing and a picture of what is inside it the same picture at another size. A frame is a
 * middle and the things around it, and the frame inside one of those cells is that same arrangement smaller, so a member
 * that holds something is read by looking at it rather than by the frame growing a second way of drawing. The middle is
 * skipped because it is where the thing the frame is about stands: a thing held directly is one remove from it and not
 * at it.
 */
export function spread(count: number): Cell[] {
  return spiral(count + 1).slice(1);
}

/** How many rings a frame of `count` things reaches, which is the smallest ring that holds them all. */
export function ringsFor(count: number): number {
  let ring = 0;
  let held = 0;
  while (held < count) {
    ring += 1;
    held += 6 * ring;
  }
  return ring;
}

/**
 * How far a frame reaches, in cells: a thing on the outermost ring stands at the lattice's own distance and its cell
 * reaches one more past it.
 */
export function frameReach(ring: number): number {
  return Math.sqrt(3) * ring + 1;
}

/**
 * How much smaller the frame inside a cell is than the frame the cell belongs to.
 *
 * A cell is one cell across and the frame inside it is a frame like any other, so the largest one that fits is the one
 * whose own things reach no further than the cell: `frameReach(1)` cells is a frame with one ring, and a frame of that
 * size is exactly a cell. It is derived rather than picked, because a ratio a little too large would put a thing inside
 * a cell outside its own frame, which is the one thing a fractal of frames cannot survive.
 */
export const NEST = 1 / frameReach(1);

/**
 * The six steps around a cell, in the order a ring is walked in.
 *
 * The order is the lattice's own and not a drawing's: a ring walked from any other starting step is the same six cells in
 * another order, and two readings of one level have to name one order or the things on it move when a render happens.
 */
const AROUND: Cell[] = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
];

/**
 * How far a cell stands from the middle, which is the lattice's own distance and not a count of steps taken.
 *
 * It is exported for the tests that hold a ring and a level to it: which remove a cell is at is the property both are read
 * by, and it is the lattice's own answer rather than a table kept beside either.
 */
export function distanceOf(cell: Cell): number {
  return (Math.abs(cell.q) + Math.abs(cell.r) + Math.abs(cell.q + cell.r)) / 2;
}

/**
 * The cells at one distance from a middle, in the order a ring is walked: the first is above it and the walk goes round.
 *
 * A ring is what a level needs and a spiral cannot give on its own. What a level draws is not a heap of things with the
 * nearest cell to each: it is things at one remove from the thing they belong to, and the ring of that remove is where
 * they stand, which is what makes a level read as a level.
 */
export function ring(radius: number): Cell[] {
  if (radius <= 0) return [{ q: 0, r: 0 }];
  const cells: Cell[] = [];
  // The walk starts one step back along the last direction, so the six sides are the six directions and every cell of the
  // ring is named once.
  let cell: Cell = { q: AROUND[4].q * radius, r: AROUND[4].r * radius };
  for (const direction of AROUND) {
    for (let step = 0; step < radius; step += 1) {
      cells.push(cell);
      cell = { q: cell.q + direction.q, r: cell.r + direction.r };
    }
  }
  return cells;
}

/**
 * The cells around a middle, nearest first, as many as asked for.
 *
 * Nearer is nearer on the lattice and not nearer in a drawing: the cells are taken a whole ring at a time, so the sixth
 * and the seventh of a spiral are at different distances, which is what a level needs of the order.
 */
export function spiral(count: number): Cell[] {
  const cells: Cell[] = [];
  for (let radius = 0; cells.length < count; radius += 1) cells.push(...ring(radius));
  return cells.slice(0, Math.max(0, count));
}

/**
 * The cells a level stands in, by depth: what is one remove from the middle in the ring of that remove, and what does not
 * fit carrying on into the rings beyond it.
 *
 * It is what a tree has to become to be drawn on a lattice. What a member holds is a tree and not a plane, so its
 * elements have no coordinates of their own: the ring of their depth is the lattice's own answer to where a level of that
 * depth stands, and a level with more elements than its ring has cells carries on outward rather than doubling up on a
 * cell. No cell is used twice, so two things held by one member are never drawn in one place.
 *
 * The count is per depth, in the order the reading has them, and the answer is one list of cells per depth in the same
 * order.
 */
export function ringsByDepth(counts: number[]): Cell[][] {
  const taken = new Set<string>();
  const name = (cell: Cell) => `${cell.q},${cell.r}`;
  return counts.map((count, depth) => {
    const mine: Cell[] = [];
    // A level of one remove stands in the ring of one: the middle is where the thing the level is about stands, and a
    // level drawn on it would put a thing where the thing holding it is. The radius walks outward while a level is wider
    // than its ring, and the stop of sixty-five is a guard and not a bound anything reaches: what a member holds is spent
    // at `HELD_ELEMENTS` long before a ring of sixty-five cells is walked, so a level that reached it would be a level
    // this reading has no cells for rather than one drawn wrongly.
    for (let radius = depth + 1; mine.length < count && radius < depth + 65; radius += 1) {
      for (const cell of ring(radius)) {
        if (mine.length >= count) break;
        if (taken.has(name(cell))) continue;
        taken.add(name(cell));
        mine.push(cell);
      }
    }
    return mine;
  });
}

/**
 * A whole number as an address.
 *
 * A rounding of a negative fraction lands on nought with a sign, and the sign is not part of an address: a cell is named
 * by the numbers a reader reads, and nought is one name and not two. It is written here rather than at the drawing
 * because a name that has to be fixed where it is shown is a name that is wrong where it is compared.
 */
const whole = (n: number): number => (n === 0 ? 0 : n);

/** The six corners of a cell, in the place's own numbers, starting at the one above its middle. */
export function cornersOf(cell: Cell, size: number, view: Extent): [number, number][] {
  const [cx, cy] = centreOf(cell, size, view);
  return Array.from({ length: 6 }, (_, index) => {
    const angle = ((60 * index + 30) * Math.PI) / 180;
    return [cx + size * Math.cos(angle), cy + size * Math.sin(angle)] as [number, number];
  });
}

/** A cell drawn, as the path an svg takes. */
export function cellPath(cell: Cell, size: number, view: Extent): string {
  const corners = cornersOf(cell, size, view);
  return `${corners
    .map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(3)} ${y.toFixed(3)}`)
    .join(' ')} Z`;
}

/**
 * Every cell the ground a place declares can touch.
 *
 * The axial coordinates are affine in the point, so the extremes of a rectangle are at its corners: the range of `q` and
 * of `r` over the four of them bounds every cell the rectangle meets, and the one cell of slack is for the rounding,
 * which can name a cell whose middle is a little outside the corner that found it. The range is a box in a skewed space
 * and holds more cells than the ground has, so what is kept is the cells whose own middle can be inside it: a hex reaches
 * half of itself past its middle, and the cells at the edge are then cut by the drawing.
 */
export function cellsOver(view: Extent, size: number): Cell[] {
  const [vx, vy, vw, vh] = view;
  const at = [
    [vx, vy],
    [vx + vw, vy],
    [vx, vy + vh],
    [vx + vw, vy + vh],
  ] as [number, number][];
  const found = at.map((point) => cellOf(point, size, view));
  const qs = found.map((cell) => cell.q);
  const rs = found.map((cell) => cell.r);
  const across = size * Math.sqrt(3);
  const cells: Cell[] = [];
  for (let q = Math.min(...qs) - 1; q <= Math.max(...qs) + 1; q += 1) {
    for (let r = Math.min(...rs) - 2; r <= Math.max(...rs) + 2; r += 1) {
      const [cx, cy] = centreOf({ q, r }, size, view);
      if (cx < vx - across || cx > vx + vw + across || cy < vy - size || cy > vy + vh + size) continue;
      cells.push({ q: whole(q), r: whole(r) });
    }
  }
  return cells;
}
