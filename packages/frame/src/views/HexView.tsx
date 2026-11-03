import { useEffect } from 'react';
import { Hexagon } from 'lucide-react';
import { UNIT_STATE, useEntityState } from '../hooks/useEntityState';
import { useHolds } from '../hooks/useHolds';
import { STORE, glyphPath } from '../lib/board';
import { ROW } from '../lib/chrome';
import { heldUnder, type Held } from '../lib/holds';
import { useBrand } from '../lib/brand';
import {
  NEST,
  apart,
  between,
  cellPath,
  cellSize,
  cellsOver,
  cellOf,
  centreOf,
  frameReach,
  ringsByDepth,
  ringsFor,
  spread,
  type Cell,
  type Extent,
} from '@ssccsorg/skene-kernel';
import { registerReading, type Board } from '../lib/readings';
import { fromPlace } from '../lib/world';
import { cn } from '../lib/utils';
import { useScenario } from '../stores/scenario';

/**
 * The same ground, read as a lattice of cells.
 *
 * A place is a plane of its own numbers and a picture of it says where things stand; what no picture can say is which
 * piece of the ground a thing stands on, and that is what an order names. So the ground is divided into six-sided cells
 * of one size (`lib/hex`), each cell has an address, and a thing is read in the cell its own coordinate falls in.
 *
 * Every thing is wired to the blackboard, and the wire is a route along the cells rather than a line between two points.
 * This is the whole of what the lattice is for on a ground where things stand close together: a straight line from a
 * thing to the middle of the ground crosses whatever is between them, while a route along the cells crosses the border
 * between two cells at that border's middle and turns by sixty degrees, so a bundle of things toward one side of the
 * ground is drawn as the trunk they share. The wiring is drawn under the marks and not over them, so a route through a
 * cell something else stands in is the route it always was, and what is read at that cell is the thing standing there:
 * the blackboard is a pad every route ends at, and it is named on rollover like every other control in the frame.
 *
 * The same route is what makes the picture recurse, and the frame is the recursion's own shape. What a frame is about
 * stands at its middle and what it holds is spread around it in the ground's own rings, so a place's frame is the
 * blackboard at the middle of its ground with its members round it, and the frame of a member that holds is that same
 * arrangement one cell down, drawn inside the cell the member stands in (`NEST`). One level is drawn and the level it is
 * inside is not, so the picture is the same picture at every depth and the cost of drawing it is one frame's, which is
 * what a shell of everything at once cannot be.
 *
 * What a member holds is a tree and not a plane, so its elements have no coordinates of their own: the ring of an
 * element's depth is where a level of that depth stands (`lib/hex`), from the same reading the tree beside the space
 * walks (`lib/holds`), so the two cannot disagree about what a member holds or about what is open.
 *
 * A cell is a control as well as a reading. A thing picked in the frame and given a cell is a thing moved there, which
 * is the smallest order there is and it is the frame's own machinery rather than this reading's: the move is handed to
 * the frame in the scene's own coordinates and saved as an edit, so the record still says where the work happened, the
 * ground says where the pilot put it, and the branch can be wound back.
 *
 * No name is written beside a cell. A name stands wider than a cell and two neighbours in a lattice are closer together
 * than two names are wide, which is why the one name this reading draws is the thing the level is about, and every other
 * name is one hover away. That name stands at the middle rather than beside it, and it stands over the frame's own ring
 * rather than in a free place, because the ring of one stands directly below the middle and a frame has no free place to
 * put a name. What is drawn last is that name, over a halo of the ground's own colour, so the ring it crosses is still
 * read through it.
 *
 * It is a reading a project asks for and not a mode, and the difference matters. Divided ground is a claim about a space:
 * a place is a plane of its own numbers, its scenario stands things at positions that are continuous, and two things
 * inside one cell of a lattice are two things the lattice cannot tell apart. So the cells are read for a project whose own
 * bundle names this reading in its layout, and a project that says nothing is drawn exactly as it was.
 */

/** The middle of a lattice, which is where the thing a level is about stands. */
const MIDDLE: Cell = { q: 0, r: 0 };
/** A frame with its own middle at its own nought, which is the lattice read in its own numbers rather than on a ground. */
const ZERO: Extent = [0, 0, 0, 0];

export function HexView({ world, pickedId, onPick, onMove }: Board) {
  const brand = useBrand();
  const model = useScenario((state) => state.model);
  const state = useEntityState();

  const place = model?.project.place ?? null;
  const view = (place?.view ?? [0, 0, 1, 1]) as Extent;
  const size = cellSize(view);
  // A hairline at the size of the cell this place declares, because the stroke is in the place's own numbers and a place
  // that declares a small ground draws the same hairline as one that declares a large one.
  const line = size / 26;
  // How large a mark is drawn, as a fraction of the cell it stands in. One number for the pad, for a thing on the ground
  // and for an element of a level, because the wiring meets the same rim at every one of them: three copies of the ratio
  // would be three rims, and a trace that met the one the pad was drawn with would pass through the others.
  const mark = size * 0.62;
  // Where each thing stands on the ground, in the place's own numbers, from the same reading the frame's own coordinate
  // readout uses.
  const standing =
    world && place
      ? world.standing.map((unit) => {
          const [x, y] = unit.ground;
          return { unit, at: [x, y] as [number, number], cell: cellOf([x, y], size, view) };
        })
      : [];
  const picked = standing.find((each) => each.unit.id === pickedId) ?? null;

  // The level in force. What the pilot has picked and that holds lower elements is read as a level of its own, and the
  // ground comes back when nothing is picked: letting go of the pick is going back up, which is the same gesture the tree
  // and the list beside the space use.
  const root = picked?.unit.id ?? null;
  const { rows, open, toggle, ensure } = useHolds(
    picked ? { member: picked.unit.id, at: picked.unit.holdsAt } : null,
  );
  useEffect(() => {
    // A level is asked for where it is drawn, for the reason the board's own tree asks: the room answers one level at a
    // time, so a level nobody asked for is a level that draws nothing.
    if (root) ensure(root);
  }, [root, ensure]);
  const held = root ? heldUnder(root, rows, open) : [];
  // Every hook is above this: the frame's own guard is the first thing this component may return.
  if (!model || !place) return null;

  const storeLabel = place.store?.label ?? STORE;
  const level = levelOf(held, size);
  const ground = !root;

  // The frame: what it is about at the middle, and what it holds spread around it. For a place the middle is the
  // blackboard, which is the one thing on this ground that is not a thing standing on the ground, and the members stand
  // in the rings of the ground's own cells rather than where their own declaration puts them: a thing's declared place is
  // where the run stands it, and which cell of the frame it is read in is the frame's answer to how many things there
  // are. A member that holds is a frame of its own one cell down, which is the whole of the recursion.
  const seated = ground
    ? standing.map((each, index) => ({ ...each, cell: spread(standing.length)[index] ?? MIDDLE }))
    : [];
  const cells = ground ? cellsOver(view, size) : level.cells;
  const at = (cell: Cell) => (ground ? centreOf(cell, size, view) : centreOf(cell, size, ZERO));
  // A wire is a route along the cells with both of its ends brought back to the rims it meets (`apart`), so no trace
  // spends its length under a mark and the wiring reads as wiring. Two marks close enough that their rims meet are joined
  // by their touching, and the trace between them is nothing to draw rather than a line of no length.
  const wires = (
    ground
      ? seated.map((each) => ({ key: each.unit.id, points: between(MIDDLE, each.cell).map(at) }))
      : level.placed.map((each) => ({
          key: each.element.path,
          points: between(holderOf(level, each.element), each.cell).map(at),
        }))
  )
    .map((each) => ({ key: each.key, points: apart(each.points, mark) }))
    .filter((each) => each.points.length > 1);
  // The two middles are the same point of the ground, and that is the whole of what makes a frame inside a cell the same
  // picture as the frame it is inside: the middle of a place's frame is the middle of its own ground.
  const middle = at(MIDDLE);
  // The frame's own boundary, and how far it reaches: a hexagon that holds the outermost ring drawn plus the cells at it.
  const rings = ground ? ringsFor(standing.length) : Math.max(1, deepestOf(held));
  const edge = cellPath(MIDDLE, frameReach(rings) * size, ground ? view : ZERO);
  // The box the picture is drawn in, which holds the ground and the frame's own outline. The outline is the frame's
  // widest part and it is drawn at every depth: an outline cut off at its own corners is a frame nobody reads as a
  // hexagon, which is the whole of what the picture says a frame is.
  const box = frameBox(middle, rings, size, ground ? storeLabel : (picked?.unit.id ?? ''), ground ? view : level.box);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className={cn(ROW, 'gap-2 border-b')}>
        <span
          className="min-w-0 flex-1 truncate text-muted-foreground"
          title={ground ? `${cells.length} cells over the ground this place declares` : `what ${picked?.unit.id} holds`}
        >
          {ground ? (
            <>
              {model.title} · the ground as a frame of {cells.length} cells, with {standing.length} spread over{' '}
              {rings} {rings === 1 ? 'ring' : 'rings'} of the blackboard at the middle
            </>
          ) : (
            <>
              {picked?.unit.id} · what it holds as a frame of {held.length}{' '}
              {held.length === 1 ? 'element' : 'elements'}, wired to it at the middle
              {level.bounded ? ', and the reading stopped where the room stopped answering' : ''}
            </>
          )}
        </span>
        {ground && picked ? (
          <span
            className="shrink-0 tabular-nums text-muted-foreground"
            title="the cell the picked thing stands in, which is what an order names"
          >
            {picked.unit.id} at {picked.cell.q},{picked.cell.r}
          </span>
        ) : null}
      </div>
      <svg
        data-region="hex"
        viewBox={box.join(' ')}
        preserveAspectRatio="xMidYMid meet"
        className="min-h-0 min-w-0 flex-1"
      >
        {/* The ground, which is a control only when something is picked: a cell pressed with nothing picked is a press on
            the map rather than an order. A level has no ground of its own, and the cells it is laid out on are drawn
            because a thing standing in a cell is not the same reading as a thing loose on a plane. */}
        {cells.map((cell) => (
          <path
            key={`cell-${cell.q},${cell.r}`}
            d={cellPath(cell, size, ground ? view : ZERO)}
            onClick={
              ground && onMove && picked ? () => onMove(picked.unit.id, fromPlace(place, ...at(cell))) : undefined
            }
            className={cn(
              'stroke-border',
              ground && picked && cell.q === picked.cell.q && cell.r === picked.cell.r
                ? 'fill-claim/10 stroke-claim'
                : 'fill-transparent',
              ground && onMove && picked ? 'cursor-pointer hover:fill-foreground/5' : '',
            )}
            strokeWidth={line}
          >
            {/* The address, on rollover: a cell is asked for its name by pointing at it. */}
            <title>{`${cell.q},${cell.r}`}</title>
          </path>
        ))}

        {/* The frame's own boundary: the ground a frame reaches, drawn as the hexagon it is. It is what makes a frame a
            thing rather than a scatter of marks, and a frame inside a cell carries one of its own. */}
        <path d={edge} className="fill-none stroke-border" strokeWidth={line * 1.6} />

        {/* The wiring, drawn under everything it joins: every route to the middle, along the cells, stopping at the two
            rims it meets so no trace is read as a gap. */}
        <g className="stroke-muted-foreground/60" fill="none" strokeWidth={line * 1.3} strokeLinejoin="round">
          {wires.map((each) => (
            <polyline
              key={`wire-${each.key}`}
              points={each.points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}
            />
          ))}
        </g>

        {/* What stands in the cells: a thing's own glyph on the ground, and an element of what a member holds on the level
            of its own. */}
        {ground
          ? seated.map(({ unit, at: declared, cell }) => (
              <g
                key={unit.id}
                transform={`translate(${at(cell)[0]} ${at(cell)[1]})`}
                className={cn('cursor-pointer', unit.id === pickedId ? 'text-claim' : UNIT_STATE[state[unit.id] ?? 'offline'])}
                onClick={() => onPick(unit.id)}
              >
                <title>
                  {`${unit.id}\nstands at ${Math.round(declared[0])}, ${Math.round(declared[1])} of the place's own numbers`}
                  {unit.holdsAt ? '\nholds more: press to read it' : ''}
                </title>
                {/* A member that holds something is a frame of its own one cell down, drawn where it stands: the same
                    picture at another size, which is what tells a pilot that pressing this mark reads it. */}
                {unit.holdsAt ? (
                  <path
                    d={cellPath(MIDDLE, frameReach(1) * size * NEST, ZERO)}
                    className="stroke-current"
                    fill="none"
                    opacity={0.7}
                    strokeWidth={line}
                    strokeDasharray={`${line * 3} ${line * 2}`}
                  />
                ) : null}
                <circle r={mark} className="fill-card stroke-current" strokeWidth={line} />
                <svg
                  x={-size / 2}
                  y={-size * 0.8}
                  width={size}
                  height={size}
                  viewBox="0 0 16 16"
                  className="fill-none stroke-current"
                  strokeWidth={1.6}
                >
                  <path d={glyphPath(unit.icon, unit.role)} />
                </svg>
                {unit.id === pickedId ? (
                  <text y={size * 0.95} textAnchor="middle" className="fill-current" style={{ fontSize: size * 0.42 }}>
                    {unit.id}
                  </text>
                ) : null}
              </g>
            ))
          : level.placed.map((each) => {
              const [x, y] = at(each.cell);
              const openHere = open.includes(each.element.path);
              // A directory the reading stopped at is not a control: pressing it would ask for a level nobody reads, and a
              // control that appears to open something and draws nothing is worse than a mark that says it is the end.
              const deeper = each.element.dir && !each.element.bounded;
              return (
                <g
                  key={each.element.path}
                  transform={`translate(${x} ${y})`}
                  className={cn(
                    'stroke-current',
                    each.element.depth === 1 ? 'text-foreground/85' : 'text-muted-foreground',
                    deeper ? 'cursor-pointer' : '',
                  )}
                  onClick={
                    deeper
                      ? () => {
                          if (!openHere) ensure(each.element.path);
                          toggle(each.element.path);
                        }
                      : undefined
                  }
                >
                  <title>
                    {each.element.bounded
                      ? `${each.element.path}: held deeper than this reads`
                      : `${each.element.path}${deeper ? (openHere ? ' · open' : ' · holds more') : ''}`}
                  </title>
                  <circle
                    r={mark}
                    className="fill-card"
                    strokeWidth={line}
                    strokeDasharray={each.element.dir ? `${line * 3} ${line * 2}` : undefined}
                  />
                  {/* What the element is made of is read from the mark the same way a thing's is on the ground: the pad of
                      something that holds more is dashed, so a pilot reads which marks open before pressing one. */}
                  <svg
                    x={-size / 2}
                    y={-size * 0.8}
                    width={size}
                    height={size}
                    viewBox="0 0 16 16"
                    className="fill-none stroke-current"
                    strokeWidth={1.4}
                  >
                    <path d={each.element.dir ? GLYPHS.folder : GLYPHS.file} />
                  </svg>
                </g>
              );
            })}

        {/* The middle: the blackboard on a ground, which is the one place there that is not a thing standing on it, and the
            member itself on a level of its own. It is drawn as a pad because a wire that ends at a point says nothing
            about what the point is. It is drawn over the marks, because the one name the reading writes stands below it
            and the ring of one stands there: the name carries a halo of the ground's own colour so that the marks it
            crosses are read through it, and a name under the marks would be the name nobody reads. */}
        <g className={cn('text-mark', ground ? '' : 'text-claim')}>
          <title>
            {ground ? `${storeLabel}, at the middle of ${model.title}` : `${picked?.unit.id} · what it holds`}
          </title>
          <circle cx={middle[0]} cy={middle[1]} r={mark} className="fill-card stroke-current" strokeWidth={line * 1.4} />
          <svg
            x={middle[0] - size * 0.36}
            y={middle[1] - size * 0.36}
            width={size * 0.72}
            height={size * 0.72}
            viewBox={`0 0 ${brand.mark.viewBox} ${brand.mark.viewBox}`}
            className="fill-none stroke-current"
            strokeWidth={ground ? 2 : 1.6}
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            {/* The member's own glyph where the level is its own, because the middle of a level is the thing the level is
                about and not a place every reading begins at. */}
            {ground ? <path d={brand.mark.path} /> : <path d={glyphPath(picked?.unit.icon ?? null, picked?.unit.role ?? null)} />}
          </svg>
          <text
            x={middle[0]}
            y={middle[1] + size * 1.35}
            textAnchor="middle"
            className="fill-foreground/80 stroke-card"
            strokeWidth={size * 0.34}
            strokeLinejoin="round"
            style={{ fontSize: size * 0.5, paintOrder: 'stroke' }}
          >
            {ground ? storeLabel : picked?.unit.id}
          </text>
        </g>
      </svg>
    </div>
  );
}

/**
 * The box a frame is drawn in: the frame's own hexagon, one cell of room around it, and the name's own line under the
 * middle.
 *
 * A frame is a hexagon and its widest points are its own corners, so a box that stopped at the cells the frame holds
 * would have its outline cut off at exactly the place a frame is read as a hexagon at all. The name the middle carries is
 * the other thing the box has to hold, and for a short name and a small frame it is wider than the frame is: the estimate
 * is `lib/labels`' own, scaled from the panel's font to this drawing's numbers, because a name cut off at the side is a
 * name nobody reads.
 *
 * `hold` is the box of whatever else the picture draws, and it comes back held: a ground is the place's own declared view
 * and a level is the cells its elements stand in, and neither is shrunk by the frame being drawn over it.
 *
 * It is exported for the test that holds it, for the reason `levelOf` is: which box a frame is drawn in is a claim about
 * the picture, and a claim that can only be checked by looking at a window is a claim nobody checks twice.
 */
export function frameBox(
  at: [number, number],
  rings: number,
  size: number,
  label: string,
  hold: [number, number, number, number],
): Extent {
  const reach = frameReach(rings) * size;
  // A name is drawn centred under the middle in a font of `size * 0.5` (the drawing writes that size beside the text), so
  // its half-width is a third of the font for every character and a little more than a name of average letters needs. The
  // estimate is generous on purpose, for the reason `lib/labels` gives for its own: one that came out short would leave
  // exactly the cut the box is drawn to avoid, and one that came out long costs a little room around a short name.
  const half = Math.max(reach, (label.length * size) / 6) + size;
  const tall = reach + size * 2.2;
  const [hx, hy, hw, hh] = hold;
  const x = Math.min(hx, at[0] - half);
  const y = Math.min(hy, at[1] - tall);
  return [x, y, Math.max(hx + hw, at[0] + half) - x, Math.max(hy + hh, at[1] + tall) - y];
}

/** How deep a tree of held elements goes, which is the outermost ring its frame reaches. */
function deepestOf(held: Held[]): number {
  return held.reduce((most, each) => Math.max(most, each.depth), 0);
}

/**
 * A member's held elements as a frame: the cell each one stands in, the cells the frame uses, and the box it is drawn in.
 *
 * The cells are the lattice's own (`lib/hex`): the elements of one depth stand in the ring of that depth, in the order
 * the reading has them, and a depth with more elements than its ring holds carries on outward rather than doubling up on
 * a cell it has already spent.
 * The box is worked out from the cells actually used rather than from a radius, because a level of one element is
 * a small picture and a level of forty is a large one, and one box for both would draw the first as a dot in a field.
 *
 * It is exported for the test that holds it: which cell a level's elements stand in is a claim about a tree drawn on a
 * lattice, and a claim that can only be checked by looking at a window is a claim nobody checks twice.
 */
export function levelOf(
  held: Held[],
  size: number,
): {
  cells: Cell[];
  placed: { element: Held; cell: Cell }[];
  box: [number, number, number, number];
  bounded: boolean;
} {
  const deepest = deepestOf(held);
  const counts = Array.from({ length: deepest }, (_, index) => held.filter((each) => each.depth === index + 1).length);
  const rings = ringsByDepth(counts);
  const taken = new Map<number, number>();
  const placed = held.map((element) => {
    const nth = taken.get(element.depth) ?? 0;
    taken.set(element.depth, nth + 1);
    return { element, cell: rings[element.depth - 1]?.[nth] ?? MIDDLE };
  });
  const cells = [
    MIDDLE,
    ...placed.map((each) => each.cell),
  ].filter((cell, index, all) => all.findIndex((one) => one.q === cell.q && one.r === cell.r) === index);
  const points = cells.map((cell) => centreOf(cell, size, ZERO));
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  // One cell of room around the used cells on every side, so a name under a mark is not cut by the frame's own edge.
  const box: [number, number, number, number] = [
    Math.min(...xs) - size * 1.6,
    Math.min(...ys) - size * 1.6,
    Math.max(...xs) - Math.min(...xs) + size * 3.2,
    Math.max(...ys) - Math.min(...ys) + size * 3.2,
  ];
  return { cells, placed, box, bounded: held.some((each) => each.bounded) };
}

/** The cell an element's own holder stands in, which is the middle for what the member holds directly. */
function holderOf(level: { placed: { element: Held; cell: Cell }[] }, element: Held): Cell {
  if (!element.under) return MIDDLE;
  return level.placed.find((each) => each.element.path === element.under)?.cell ?? MIDDLE;
}

/** The two marks a held element is drawn by: what holds more, and what does not. */
const GLYPHS = {
  folder: 'M1.5 4.5h5l1.4 1.6h6.6v6.4H1.5z',
  file: 'M4 1.5h5.2L12.5 4.8v9.7H4z',
};

registerReading({
  key: 'hex',
  path: '/hex',
  View: HexView,
  button: {
    order: 14,
    title: 'hex',
    Icon: Hexagon,
  },
  asked: true,
});
