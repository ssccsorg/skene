import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Pencil } from 'lucide-react';
import { STORE, altitudeOf, edgeAt, glyphPath, liftOf, orbitalAt, placed as onShell, project, spreadOnEdge, unfold } from '../lib/board';
import { fanTree, heldUnder, treeAt } from '../lib/holds';
import { useHolds } from '../hooks/useHolds';
import { MARK, MARK_INSET } from '../lib/views';
import { BrandMark } from '../lib/brand';
import { EdgeMark } from './EdgeMark';
import { layoutLevels, layoutNames, nameWidth, type Blocker, type NameAt } from '@ssccsorg/skene-ui';
import { lineOf, writerOf } from '../lib/world';
import type { Neighbour } from '../lib/world';
import { useView } from '../stores/view';
import { useSelection } from '../stores/selection';
import type { Entry, ProjectStatus, World } from '@ssccsorg/skene-kernel';
import { cn } from '@ssccsorg/skene-ui';
import { BoardLabel, BOARD_NAME } from './BoardLabel';

/** The one id the composition's own label is placed under, so no unit can be named like it. */
const STORE_NAME = '\u0000store';
/** A group's name is namespaced for the same reason: a project and a unit are both named things here. */
const groupName = (id: string) => `\u0000group-${id}`;
/** And so is a held element's, which is named on the same lattice as everything else in the space. */
const heldName = (path: string) => `\u0000held-${path}`;
/** How far outside the frame a mark is still named, in pixels: a name is wider than its mark and reaches past it. */
const BAND = 24;
/** How far apart two icons held on one edge are laid along it, so that no two are drawn over one another. */
const MARK_STEP = MARK + 6;

/**
 * Whether the frame holds a mark at all, which is what says whether it is named where it stands or held on the edge.
 * The band is the width of a name: a mark a name's own width outside the frame still has a name that reaches it, and a
 * mark past that is one nothing of it is on the frame.
 */
const onFrame = (mark: { at: [number, number]; depth: number }, size: [number, number]): boolean =>
  mark.depth > 0.05 &&
  mark.at[0] > -BAND &&
  mark.at[0] < size[0] + BAND &&
  mark.at[1] > -BAND &&
  mark.at[1] < size[1] + BAND;

/** The one bright reading a group carries: what the project declares it is doing. */
const STATE: Record<ProjectStatus, string> = {
  running: 'animate-pulse bg-working',
  idle: 'bg-idle',
  offline: 'bg-offline',
};

/**
 * The names of the space, drawn over the canvas at the projection of their marks. It is a layer of the
 * cockpit and not a list: each name stands where its unit stands, a name is a way to pick the unit, and
 * a unit that has written nothing says so by having no last record to show.
 *
 * Every name carries the unit's glyph, because a name is read for what the thing is. The store a unit
 * writes into is not repeated on its name: every unit has one, so a mark on each of them says the same
 * thing a dozen times, and the roster is where a unit is opened and its store read.
 *
 * The space is around the pilot, so a name is drawn for the marks in front of them: a name behind the pilot is a name
 * on the wrong side of the eye, and a name outside the frame is a name the pilot reaches by turning. Neither is a
 * mark nobody can reach, though, and what a mark the frame does not hold gets instead is a control held on the edge
 * it is past, carrying the unit's own glyph so the edge says what is there as well as which way to turn. The two are
 * read from one projection, so a mark is named or held and never both, and the named ones go to the layout before it
 * runs: a name that is drawn gets the space it needs rather than sharing it with names nobody can see.
 *
 * A name is placed by `layoutNames` rather than at its bare projection, and a name that had to step out
 * of another's way wears a leader back to its mark. The composition's own mark is placed with them,
 * because it is where the pilot's eye rests and no name should sit on it.
 */
export function BoardOverlay({
  world,
  neighbours,
  size,
  pickedId,
  tints,
  arrival,
  onPick,
  onOpenProject,
}: {
  world: World;
  /** The other projects the shell holds, drawn as the groups they are and not as the runs they are not. */
  neighbours: Neighbour[];
  size: [number, number];
  pickedId: string | null;
  tints: Record<string, string | null>;
  /** How far the open project's members have come out of its group, which its names move with. */
  arrival: number;
  onPick: (id: string) => void;
  /** Enter the project whose group was pressed, which is the space's own way into another place. */
  onOpenProject: (id: string) => void;
}) {
  const yaw = useView((state) => state.yaw);
  const pitch = useView((state) => state.pitch);
  const fov = useView((state) => state.fov);

  // The box the names are drawn in, which is what a pointer's own coordinates are read against: the projection this
  // layer draws with is the frame's, so a pixel of it is a pixel of this element and of nothing else.
  const layer = useRef<HTMLDivElement>(null);
  /**
   * The mark whose edit control is out, which is a reading of the pointer rather than a state of the space.
   *
   * A control that was always drawn on every mark would be a control a dozen of them wide, and the board is read by its
   * shape: the edit stands beside the one mark the pointer is on. The mark and the control both keep it out, with a short
   * grace between them, because the control stands clear of the mark and the pointer crosses a gap to reach it.
   */
  const [editing, setEditing] = useState<string | null>(null);
  const away = useRef<number | null>(null);
  const stay = (id: string) => () => {
    if (away.current) window.clearTimeout(away.current);
    setEditing(id);
  };
  const leave = () => {
    if (away.current) window.clearTimeout(away.current);
    away.current = window.setTimeout(() => setEditing(null), 140);
  };
  const setMoving = useSelection((state) => state.setMoving);

  const centre = useMemo(() => onShell([0, 0, 0], world.aspect, world.sector), [world.aspect, world.sector]);

  // Every mark of the open field, projected. A mark the frame holds is named where it stands. A mark it does not is
  // not gone: the space is a shell the pilot stands inside, so a unit behind them or beside them is a unit they turn
  // to, and what a mark needs then is a control held on the edge it is past rather than a name off the side of the
  // frame. Both are read from the one projection, so a mark is either named or held and never both, and neither is a
  // mark nobody can reach.
  const projected = useMemo(() => {
    if (size[0] === 0 || size[1] === 0) return [];
    const view = { yaw, pitch, fov };
    return world.present.map((unit) => {
      const base = unfold(onShell(unit.at, world.aspect, world.sector), centre, arrival);
      const lift = liftOf(unit);
      const where = lift ? orbitalAt(base, lift) : base;
      const [x, y, depth] = project(where, size[0], size[1], view);
      return { unit, at: [x, y] as [number, number], depth };
    });
  }, [world, size, yaw, pitch, fov, centre, arrival]);

  const visible = useMemo(() => projected.filter((mark) => onFrame(mark, size)), [projected, size]);

  // What the picked member holds, drawn at the member's own place. It is the same reading the Members panel walks,
  // which is what keeps the space and the list from disagreeing about a member's lower elements: the room's answer is
  // read once and drawn twice.
  const member = useMemo(
    () => world.standing.find((unit) => unit.id === pickedId && unit.properties.holds) ?? null,
    [world.standing, pickedId],
  );
  const { rows, open, toggle, ensure } = useHolds(member ? { member: member.id, at: member.holdsAt } : null);
  useEffect(() => {
    // The member's own level is the root of its tree, and the room states a level under the member, so what is asked for
    // and what a level is keyed by are the same name.
    if (member) ensure(member.id);
  }, [member, ensure]);
  const tracked = useMemo(() => {
    const past = projected
      .filter((mark) => !onFrame(mark, size))
      .map((mark) => ({
        unit: mark.unit,
        edge: edgeAt(mark.at, mark.depth <= 0.05, size, [MARK_INSET, MARK_INSET]),
      }));
    // Held where their own directions say they would be one control drawn a dozen times, so they are laid out along the
    // edge each was held on: the order along an edge is the reading it has room for, and the place a mark stands along
    // it is the one thing about a mark past the frame that a pilot can still go by.
    const spreadAt = spreadOnEdge(
      past.map((each) => each.edge),
      size,
      MARK_STEP,
      MARK_INSET,
    );
    return past.map((each, index) => ({ unit: each.unit, at: spreadAt[index] }));
  }, [projected, size]);

  // The projects the pilot is not inside, each as the group it is: one mark and one name where its patch
  // stands. The name is at the patch's own middle and not at its edge, because a group is a thing standing
  // there and a pilot presses the place itself; a directory entry at the edge of a patch is not a place and
  // cannot be entered. This is the layer a container is entered from, and a container inside a container is
  // another of these, so nesting adds no case here.
  const groups = useMemo(
    () =>
      neighbours
        .map((neighbour) => {
          const [x, y, depth] = project(
            onShell([0, 0, 0], world.aspect, neighbour.sector),
            size[0],
            size[1],
            { yaw, pitch, fov },
          );
          return {
            id: neighbour.id,
            title: neighbour.title,
            status: neighbour.status,
            count: neighbour.units.length,
            at: [x, y] as [number, number],
            depth,
          };
        })
        .filter(
          (each) =>
            each.depth > 0.05 &&
            each.at[0] > -24 &&
            each.at[0] < size[0] + 24 &&
            each.at[1] > -24 &&
            each.at[1] < size[1] + 24,
        ),
    [neighbours, size, world.aspect, world.sector, yaw, pitch, fov],
  );

  // The held elements of the picked member, laid out once against the fan: the lay-out below is what decides where each
  // of them actually stands, and the tree is read back against that. Both readings are the model's (`lib/holds`), because
  // where a leg's joints are drawn is a claim about the tree and not about the drawing.
  //
  // The tree stands at the member, so a member the frame does not hold has no place to stand it. The pilot turns away
  // from what they picked and the mark goes behind them or past an edge, and the mark is then held on the edge it is past
  // rather than named. A tree drawn at that projection is the same reading of a point the frame does not have: its own
  // lines meet outside the frame and its names are pushed past the edge, which is a subtree drawn where the member it
  // belongs to is not. So the tree is drawn for the member the frame holds and for no other, and the turn back to a
  // member the frame is not pointed at is what brings its tree with it.
  //
  // The fan is seeded for the frame's own width, which is the one thing geometry cannot know: a level of many names fans
  // wider than any frame, and a name off the side of the frame is a name the pilot has to go looking for. The layout
  // under it moves the names sideways no further than the fan put them, so the bound holds for the drawing too.
  //
  // It is above the frame's own guard because every hook has to run before the first thing this component can return.
  const memberMark = useMemo(
    () => projected.find((mark) => mark.unit.id === member?.id) ?? null,
    [projected, member],
  );
  const memberAt = memberMark && onFrame(memberMark, size) ? memberMark.at : null;
  const held = useMemo(
    () => (member && memberAt ? fanTree(heldUnder(member.id, rows, open), memberAt, size[0]) : []),
    [member, memberAt, rows, open, size],
  );

  if (size[0] === 0 || size[1] === 0) return null;

  const lastOf = new Map<string, Entry>();
  for (const point of world.records) lastOf.set(writerOf(point.event), point.event);

  const storeView = { yaw, pitch, fov };
  const storeAt = project(
    onShell(world.store ?? [0, 0, 0], world.aspect, world.sector),
    size[0],
    size[1],
    storeView,
  );
  const storeLabel = world.storeLabel ?? STORE;
  const storeBehind = storeAt[2] <= 0.05;
  // What a label says, decided here and not by a stylesheet breakpoint, because the layout has to be
  // handed exactly what will be drawn: a width estimated from a record the label then hides is a phantom,
  // and eleven phantoms in a narrow space push names further than they need to go.
  const showRecord = size[0] >= 560;
  // What the label of a mark the frame does not hold says beyond its name: the record the picked unit wrote last, which
  // is the same reading the names on the frame carry, and only on the unit the pilot asked about.
  const detailOf = (id: string) => {
    const last = lastOf.get(id) ?? null;
    return last && id === pickedId && showRecord ? lineOf(last) : '';
  };

  // A name carries the glyph and the name, and the record only on the unit that is picked. What a unit
  // wrote last is the same three words on every label, so twenty of them is a column of the same reading
  // repeated; the one the pilot is looking at is the one that needs it, and the rest of the space is read
  // from the rail and the plan. It is also what lets a crowded space keep its names.
  const marks = visible.map((mark) => {
    const last = lastOf.get(mark.unit.id) ?? null;
    const detail = last && mark.unit.id === pickedId && showRecord ? ` ${lineOf(last)}` : '';
    const height = mark.unit.altitude != null ? ` ${altitudeOf(mark.unit.altitude)}` : '';
    return { id: mark.unit.id, at: mark.at, text: `${mark.unit.id}${height}${detail}` };
  });
  // The composition is a name of this layer too, a row below its own mark so that the mark is not
  // covered by the word for it. It is laid out with the units and read back by position, so that no unit
  // can be named like it. What the middle means is not written beside it: a sentence about the picture is
  // a sentence taking the room of the picture, and the label says what the place declares it is.
  const storeName = {
    id: STORE_NAME,
    at: [storeAt[0], storeAt[1] + 26] as [number, number],
    text: storeLabel,
  };
  // The groups are names of this space like the units are, so they go on the same lattice and a group name
  // cannot be drawn over a member's name: one lattice for the whole space is what keeps a crowded band
  // readable. A group is named the way the units are named, by the id the place gives it and not by the
  // sentence its record opens with: a name in this space is a name for a thing in it, and the column's own
  // list is where a project is read by the sentence it carries.
  const groupMarks = groups.map((each) => ({
    id: groupName(each.id),
    at: [each.at[0], each.at[1] + 26] as [number, number],
    text: each.id,
  }));
  // The picked member's own level is named on the same lattice as the units and the groups, so a part's name never lands
  // on a unit's: what the space holds besides the tree is what the layout has to keep the names apart from.
  const laidOut = layoutNames(
    [...(storeBehind ? [] : [storeName]), ...marks, ...groupMarks],
    size[1],
    storeBehind ? [] : [{ at: [storeAt[0], storeAt[1]], width: 22 }],
  );
  const byName = new Map(laidOut.map((name) => [name.id, name]));
  const placed = new Map(marks.map((name) => [name.id, byName.get(name.id) as (typeof laidOut)[number]]));
  const storePlaced = byName.get(STORE_NAME);

  // Where the tree is drawn, which is its own pass over the same lattice: the frame's names are placed first and are
  // immovable, and the tree fills around them. It is not thrown in with them, because a single pass would let a file's
  // name take a row from a machine's, and the drawing would then have decided that a file matters more than a machine. So
  // every name the frame placed stands as a name the tree must keep clear of, and what the tree cannot fit it does not
  // draw: the model has already bounded how much of it there is (`HELD_ELEMENTS`), and the panel beside the space lists
  // all of it whatever the frame has room for.
  //
  // The tree goes on the lattice rather than at its own fanned points, which is the whole of what makes it readable: a
  // fan is geometry and geometry cannot know how wide a name is, so a level of six parts at their fanned points is a
  // spray of names over one another and a bundle of lines crossing everything. What the fan is for is the sideways order,
  // which the lattice keeps.
  const textOf = new Map<string, string>();
  if (!storeBehind) textOf.set(STORE_NAME, storeName.text);
  for (const each of [...marks, ...groupMarks]) textOf.set(each.id, each.text);
  const taken: Blocker[] = [
    ...(storeBehind ? [] : [{ at: [storeAt[0], storeAt[1]] as [number, number], width: 22 }]),
    ...laidOut
      .filter((name) => !name.dropped && textOf.has(name.id))
      .map((name) => ({ at: name.at, width: nameWidth(textOf.get(name.id) as string) })),
  ];
  const laidOutHeld = layoutLevels(
    // A level at a time, in the order the reading is: a part's name is placed before anything the part holds, so a joint
    // deep in the tree cannot take the row a part's name then has nowhere to be. A part with no row is a part the board
    // does not name, and everything under it goes with it.
    held.reduce<NameAt[][]>((levels, each) => {
      const level = levels[each.depth - 1] ?? (levels[each.depth - 1] = []);
      level.push({ id: heldName(each.path), at: each.at, text: each.name });
      return levels;
    }, []),
    size[1],
    taken,
  );
  const heldAt = new Map(laidOutHeld.map((name) => [name.id, name]));

  // Where each element of the tree stands: where the tree's own lay-out put it, joined to the element that holds it,
  // which is where that element was put. What the lay-out dropped is dropped here with everything under it, so a line
  // never joins a part to a point nothing is drawn at. It is worked out in this render rather than held, because what it
  // depends on is the lay-out above. The frame's own guard is above: no hook may follow it.
  const placedHeld = memberAt
    ? treeAt(held, memberAt, (element) => {
        const name = heldAt.get(heldName(element.path));
        return name && !name.dropped ? name.at : null;
      })
    : [];

  return (
    <div ref={layer} className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* A name that had to step is joined back to its mark, so that a moved name still says which mark
          it belongs to. Drawn under the names, in the unit's own colour and quietly. */}
      <svg aria-hidden className="absolute inset-0 size-full">
        {visible.map((mark) => {
          const name = placed.get(mark.unit.id);
          if (!name?.stepped) return null;
          const towards = name.at[1] > mark.at[1] ? 1 : -1;
          return (
            <line
              key={mark.unit.id}
              x1={mark.at[0]}
              y1={mark.at[1] + towards * 8}
              x2={name.at[0]}
              y2={name.at[1] - towards * 11}
              stroke={tints[mark.unit.id] ?? 'currentColor'}
              strokeWidth={1}
              opacity={0.5}
              className="text-muted-foreground"
            />
          );
        })}
        {groups.map((each) => {
          const name = byName.get(groupName(each.id));
          if (!name?.stepped) return null;
          const towards = name.at[1] > each.at[1] ? 1 : -1;
          return (
            <line
              key={`group-${each.id}`}
              x1={each.at[0]}
              y1={each.at[1] + towards * 10}
              x2={name.at[0]}
              y2={name.at[1] - towards * 11}
              stroke="currentColor"
              className="text-muted-foreground"
              strokeWidth={1}
              opacity={0.4}
            />
          );
        })}
      </svg>

      {/* The mark itself, as a target: a name is drawn where the layout put it and a mark is where the unit
          stands, so a press on either is the same press. It sits under the names, is the size of a
          fingertip rather than of the mark, and says nothing: a mark carries no glyph, and the press on it
          does what the press on the name beside it does. */}
      {visible.map((mark) => (
        <div
          key={`mark-${mark.unit.id}`}
          className="absolute"
          style={{ left: mark.at[0], top: mark.at[1] }}
          onPointerEnter={stay(mark.unit.id)}
          onPointerLeave={leave}
        >
          <button
            type="button"
            aria-label={mark.unit.id}
            title={mark.unit.id}
            onClick={() => onPick(mark.unit.id)}
            className="pointer-events-auto absolute size-[24px] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full"
          />
          {/* The way into the context, drawn only on the mark the pointer is on: a move is not a press of the space and it
              is not a long press either, so it stands as a control of its own beside the mark. */}
          <button
            type="button"
            data-region="entity-edit"
            data-unit={mark.unit.id}
            aria-label={`move ${mark.unit.id}`}
            title={`move ${mark.unit.id} on the ground`}
            onPointerEnter={stay(mark.unit.id)}
            onPointerLeave={leave}
            onClick={(event) => {
              event.stopPropagation();
              setMoving(mark.unit.id);
            }}
            className={cn(
              'absolute top-[-28px] left-[9px] flex size-[18px] items-center justify-center rounded-full',
              'border border-border/70 bg-card text-muted-foreground shadow-sm transition-opacity hover:text-foreground',
              editing === mark.unit.id ? 'opacity-100' : 'opacity-0',
            )}
          >
            <Pencil className="size-3" />
          </button>
        </div>
      ))}

      {/* A mark the frame has pushed out, held on the edge it is past, as the icon it is read by: its own glyph while
          the pilot is not asking, and the whole of its label on the side of it the frame has room for while they are.
          Where it stands is `edgeAt`'s reading, so a unit behind the pilot is held on the edge they must come round to
          rather than the one the projection mirrored it onto, and a press on it is the same press a name makes. */}
      {tracked.map((mark) => (
        <EdgeMark
          key={`tracked-${mark.unit.id}`}
          at={mark.at}
          size={size}
          label={
            mark.unit.altitude != null
              ? `${mark.unit.id} ${altitudeOf(mark.unit.altitude)}`
              : mark.unit.id
          }
          glyph={
            <svg viewBox="0 0 16 16" className="size-3.5 fill-none stroke-current [stroke-width:1.6]">
              <path d={glyphPath(mark.unit.icon, mark.unit.role)} />
            </svg>
          }
          tint={tints[mark.unit.id] ?? undefined}
          ringed={mark.unit.id === pickedId}
          detail={detailOf(mark.unit.id)}
          onPick={() => onPick(mark.unit.id)}
        />
      ))}

      {/* The places the pilot is not inside, each named at its own mark and pressable to go there. A group
          with no name is the cluster of circles this layer was already fixed for, and a group that cannot be
          pressed is a place with no door: the name is the way in, the mark it stands for is the way in, and
          the list in the column is the other. */}
      {groups.map((each) => (
        <button
          key={`group-mark-${each.id}`}
          type="button"
          aria-label={each.title}
          title={`enter ${each.title}, ${each.count} members`}
          onClick={() => onOpenProject(each.id)}
          className="pointer-events-auto absolute size-[28px] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full"
          style={{ left: each.at[0], top: each.at[1] }}
        />
      ))}

      {groups.map((each) => {
        const name = byName.get(groupName(each.id));
        if (!name || name.dropped) return null;
        return (
          <button
            key={`group-${each.id}`}
            type="button"
            title={`enter ${each.title}, ${each.count} members`}
            onClick={() => onOpenProject(each.id)}
            className={cn(
              'pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-sm',
              'border border-border/70 bg-card/85 px-2 py-0.5 text-[13px] whitespace-nowrap hover:bg-accent/70',
            )}
            style={{ left: name.at[0], top: name.at[1] }}
          >
            <span
              className={cn('size-1.5 shrink-0 rounded-full', STATE[each.status ?? 'offline'])}
            />
            <span className="text-foreground/90">{each.id}</span>
          </button>
        );
      })}

      {visible.map((mark) => {
        const last = lastOf.get(mark.unit.id) ?? null;
        const name = placed.get(mark.unit.id);
        // A frame with no space for a name draws none of it rather than drawing it over another name.
        if (!name || name.dropped) return null;
        return (
          <BoardLabel
            key={mark.unit.id}
            at={name.at}
            ringed={mark.unit.id === world.claimedBy || mark.unit.id === pickedId}
            edit={mark.unit.id}
            onPick={() => onPick(mark.unit.id)}
            onEdit={() => setMoving(mark.unit.id)}
          >
            {/* What the thing is, drawn rather than typed, so the rail and the board read alike. */}
            <svg viewBox="0 0 16 16" className="size-4 fill-none stroke-current [stroke-width:1.6]">
              <path d={glyphPath(mark.unit.icon, mark.unit.role)} />
            </svg>
            <span>{mark.unit.id}</span>
            {/* The height the place declares, on the units that stand above the ground: the mark's lift is depth from the
                seat, so the altitude is read here as well as by the width of its ring. */}
            {mark.unit.altitude != null ? (
              <span className="text-muted-foreground">{altitudeOf(mark.unit.altitude)}</span>
            ) : null}
            {/* The record the picked unit wrote last, and only that one: the space says what is here, and
                what each thing last did is read on the unit the pilot asked about. */}
            {last && mark.unit.id === pickedId && showRecord ? (
              <span className="text-muted-foreground">{lineOf(last)}</span>
            ) : null}
          </BoardLabel>
        );
      })}

      {/* What the picked member holds, as the space around it: what it is made of, each element joined by a hairline to
          the thing that holds it. Every level is named, because a member's parts are the thing the pilot came to see and
          a mark with no name on it is a mark that says nothing. A name is a name wherever it stands, so every level is
          drawn in the member label's own type; the depth is the lay-out (where the name stands), and what the element is
          (a folder or a leaf) is what its own kind says about its ink. Which levels there are is the reading's own answer
          (`lib/holds`) and not this drawing's, and the list beside the space walks the same tree. */}
      <svg aria-hidden className="absolute inset-0 size-full">
        {placedHeld.map((each) => (
          <line
            key={`held-${each.path}`}
            x1={each.from[0]}
            y1={each.from[1]}
            x2={each.at[0]}
            y2={each.at[1]}
            stroke="currentColor"
            className="text-muted-foreground"
            strokeWidth={1}
            opacity={0.35}
          />
        ))}
      </svg>

      {placedHeld.map((each) => {
        const at = { left: each.at[0], top: each.at[1] };
        const openHere = open.includes(each.path);
        // A directory the reading stopped at is not a control: pressing it would ask for a level nobody reads, and a
        // control that appears to open something and draws nothing is worse than a mark that says it is the end.
        const deeper = each.dir && !each.bounded;
        const box = cn(
          'absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-sm whitespace-nowrap',
          BOARD_NAME,
        );
        if (deeper) {
          return (
            <button
              key={each.path}
              type="button"
              title={each.path}
              // Opening a level asks the room for it here as well as in the panel. What a member holds is one reading of
              // the room's answers, and the panel's own walk asked for each level it drew: a board that drew a level
              // nobody had asked for drew nothing under a folder it had marked open, and a board whose tree then filled in
              // because a panel happened to be mounted would be a picture that depends on which panel is on screen.
              onClick={() => {
                if (!openHere) ensure(each.path);
                toggle(each.path);
              }}
              className={cn(
                box,
                'pointer-events-auto border border-border/70 bg-card/85 py-0.5 pr-1.5 pl-1 hover:bg-accent/70',
                'text-foreground/90',
                openHere && 'border-accent bg-accent',
              )}
              style={at}
            >
              <ChevronRight className={cn('size-3 shrink-0 transition-transform', openHere && 'rotate-90')} />
              <span>{each.name}</span>
            </button>
          );
        }
        return (
          <span
            key={each.path}
            title={
              each.bounded
                ? each.dir
                  ? `${each.path}: held deeper than this reads`
                  : `${each.path}: the reading stopped here, and there is more of this level`
                : each.path
            }
            className={cn(
              box,
              'border border-border/50 bg-card/70 px-1.5 py-0.5 text-muted-foreground',
              each.bounded && 'border-border/30 text-muted-foreground/70',
            )}
            style={at}
          >
            {each.name}
          </span>
        );
      })}

      {/* The middle: not a place the records go, but the space's stores composed into one record a reader
          can ask. It is named where the names are drawn and it carries one small mark, because every unit
          already carries one of its own: a second, larger drawing of the same figure says the storage is a
          place apart rather than the thing every unit has. */}
      {storeBehind ? null : (
        storePlaced && !storePlaced.dropped ? (
          <BoardLabel at={storePlaced.at} ringed={false}>
            <BrandMark className="size-4 text-mark" />
            <span>{storeLabel}</span>
          </BoardLabel>
        ) : null
      )}
    </div>
  );
}
