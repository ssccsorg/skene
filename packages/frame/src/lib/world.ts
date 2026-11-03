// The space, the record over it, and the words a row says. Everything here is derived from the
// parsed scenario and the project's place, so the picture cannot say more than the file does.

import { CELLS_TALL, between, cellOf, centreOf, type Extent } from '@ssccsorg/skene-kernel';
import { FACT, HINT, INTENT, actors, chainFor, entityOf, parseScenario, titleOf } from '@ssccsorg/skene-kernel';
import { camerasIn, viewsIn } from './cameras';
import { propertiesOf } from './kinds';
import { readView } from './windows';
import { sectorOf } from './board';
import type {
  Actor,
  Bundle,
  Chain,
  Entry,
  NodeKind,
  Place,
  Point,
  ProjectStatus,
  Scene,
  SceneKey,
  Standing,
  UnitPlace,
  UnitView,
  World,
} from '@ssccsorg/skene-kernel';
import type { Change } from '../stores/edits';

export interface Model {
  records: Entry[];
  events: Entry[];
  unknown: string[];
  project: Bundle;
  title: string;
  scenes: Scene[];
  chain: Chain[];
  actors: Actor[];
  intents: Entry[];
  hints: Entry[];
}

/**
 * Who a hint is by. A hint is what bounded a judgement rather than a participant's own record, so the
 * format gives it no entity: it belongs to the layer that set the bounds, and that layer's name is the
 * deployment's. The frame knows the role and not the name, so what stands here is the role: a product
 * that calls its policy layer something would be a product the frame was written for.
 */
export const POLICY = 'policy';

const TITLES: Record<SceneKey, string> = {
  record: 'The device records',
  notice: 'The device notices',
  declare: 'The work is declared',
  act: 'The work is taken',
  resume: 'The device resumes',
};

const NOTES: Record<SceneKey, string> = {
  record: 'one observation at a time, written where it happened',
  notice: 'the shape it recorded before, and what bounded the judgement',
  declare: 'one line of work, from the observation it found it in',
  act: "whoever took it, and the taker's own record of the work",
  resume: 'the new fact is read and the run continues',
};

const SCENE_KEYS: SceneKey[] = ['record', 'notice', 'declare', 'act', 'resume'];

/**
 * Cut the timeline into the scenes. The cuts are found rather than matched, because a record's place
 * in the reading is a position and not a property: a labelled fact early in the timeline is part of
 * the finding, and the same shape of record later is what closes it.
 */
export function scenes(events: Entry[], project: Bundle): Scene[] {
  const at = (predicate: (event: Entry) => boolean) => {
    const index = events.findIndex(predicate);
    return index === -1 ? events.length : index;
  };
  const produced = at((event) => Boolean(event.producedBy));
  const cuts = [
    0,
    at((event) => event.kind !== FACT || Boolean(event.label)),
    at((event) => event.kind === INTENT),
    at((event) => event.kind === 'claim'),
    produced === events.length ? events.length : produced + 1,
    events.length,
  ];
  const out: Scene[] = [];
  for (let index = 0; index < SCENE_KEYS.length; index += 1) {
    const from = cuts[index];
    const to = cuts[index + 1];
    if (to <= from) continue;
    const key = SCENE_KEYS[index];
    out.push({
      key,
      title: TITLES[key],
      note: NOTES[key],
      clock: project.clock?.[key] ?? `${events[to - 1]?.at ?? 0}s`,
      from,
      to,
      events: events.slice(from, to),
    });
  }
  return out;
}

/** How many events are on screen at a step: everything up to the end of that scene. */
export function upto(sceneList: Scene[], step: number): number {
  if (step <= 0) return 0;
  return sceneList[Math.min(step, sceneList.length) - 1].to;
}

/**
 * How many events are on screen for a state: a running cursor when there is one, and the end of the
 * step's scene when there is not.
 */
export function revealedCount(sceneList: Scene[], state: { step?: number; cursor?: number } = {}): number {
  const last = sceneList[sceneList.length - 1]?.to ?? 0;
  if (typeof state.cursor === 'number') return Math.min(state.cursor, last);
  return upto(sceneList, state.step ?? 0);
}

/**
 * The scene a cursor is inside, as the step a frame would name. It is the scene the feed is in the
 * middle of rather than the last one it finished, so the title says what is happening now.
 */
export function sceneStep(sceneList: Scene[], cursor: number): number {
  let step = 0;
  sceneList.forEach((scene, index) => {
    if (cursor > scene.from) step = index + 1;
  });
  return step;
}

/**
 * What a record says in one line, one arm a kind.
 *
 * It is a table and not a run of tests for the same reason a panel's fields are: the kinds are the format's own closed
 * set, so a kind added to the format is a missing entry the compiler names, where a chain of tests would let the new
 * kind fall through to a fact's own line and draw it wrong without saying so. The arms that are not a fact's are what
 * that kind says and nothing else: a hint its own words, a declaration its description, a claim the act it is.
 */
const LINE: Record<NodeKind, (event: Entry) => string> = {
  hint: (event) => event.content ?? '',
  intent: (event) => event.description ?? '',
  claim: (event) => `taken by ${event.worker}`,
  fact: readingOf,
};

/** A fact's own line: the words it carries, the name it was written under, or the axis it stands on. */
function readingOf(event: Entry): string {
  if (event.content) return event.content;
  if (event.label) return event.label;
  const axis = event.origin ? event.origin.split('/').slice(1).join('/') : '';
  return axis ? `${axis} ${event.cycle}` : `cycle ${event.cycle}`;
}

/** What a record says in one line, asked of the kind it is. */
export function lineOf(event: Entry): string {
  return LINE[event.kind](event);
}

/** Who acted, as the file says: the worker for work, the origin's first segment for a reading. */
export function whoOf(event: Entry): string {
  if (event.kind === 'claim') return event.worker ?? '';
  // A hint is not a participant's record, so the one thing a row can say about its author is the layer
  // that set the bounds. Without it a hint is a row with no who, which reads as a record nobody wrote.
  if (event.kind === HINT) return POLICY;
  if (event.kind === INTENT) return entityOf(event.from?.origin ?? '');
  if (event.producedBy) {
    return event.producedBy.worker || entityOf(event.producedBy.from?.origin ?? '');
  }
  if (event.origin) return entityOf(event.origin);
  return '';
}

/**
 * The entity a record belongs to. A declaration belongs to the entity whose observation it started
 * from, and the fact it produced belongs to the worker that took it, because that record is the
 * taker's own account of the work.
 */
export function writerOf(record: Entry): string {
  if (record.kind === INTENT) return entityOf(record.from?.origin ?? '');
  if (record.producedBy) return record.producedBy.worker || writerOf(record.producedBy);
  return entityOf(record.origin ?? '');
}

/**
 * Where a place's members stand in the interface, as one position each.
 *
 * The sphere is the interface's own space, so a member is placed by the hierarchy the place declares rather than by a
 * ground coordinate: the list is ordered by kind and then by name, and laid out in a grid that fills the place's patch.
 * A record that moves a machine on the map therefore changes nothing here, and the same members are in the same cells
 * every time they arrive. Only the member list decides the arrangement, which is what makes an activation a layout and
 * not a replay of a route.
 */
export function layoutOf(place: Place, units: Record<string, UnitPlace>): Map<string, [number, number, number]> {
  const [vx, vy, vw, vh] = place.view ?? [0, 0, 1, 1];
  const ordered = Object.keys(units).sort((left, right) => {
    const one = units[left]?.icon ?? '';
    const other = units[right]?.icon ?? '';
    return one.localeCompare(other) || left.localeCompare(right);
  });
  const columns = Math.max(1, Math.ceil(Math.sqrt(ordered.length * (vw / vh))));
  const rows = Math.max(1, Math.ceil(ordered.length / columns));
  const out = new Map<string, [number, number, number]>();
  ordered.forEach((id, index) => {
    const row = Math.floor(index / columns);
    const filled = Math.min(columns, ordered.length - row * columns);
    const inset = (columns - filled) / 2;
    const column = index - row * columns;
    out.set(id, fromPlace(place, vx + ((column + inset + 0.5) / columns) * vw, vy + ((row + 0.5) / rows) * vh));
  });
  return out;
}

/** The space, and the record over it, as one world. */
export function worldOf(
  model: Model,
  step: number,
  cursor?: number,
  events?: Entry[],
  changes: Change[] = [],
  live: Record<string, [number, number]> = {},
): World {
  const place = model.project.place ?? {};
  // The kinds this project assembles, which is what every member's properties are read from: the frame holds atoms and
  // the assembly is the project's, so one space's servant-drive and another's ventilator are read the same way.
  const kinds = model.project.kinds;
  const view = place.view ?? [0, 0, 1, 1];
  const keys = model.scenes.map((scene) => scene.key);
  const index = Math.min(Math.max(step, 1), keys.length) - 1;
  const here = keys[Math.max(index, 0)];
  const before = keys[Math.max(index - 1, 0)];
  const units = place.units ?? {};
  const layout = layoutOf(place, units);
  const aspect = view[2] / view[3];

  // What is drawn is what arrived: a record the stream did not deliver is a record the board does not
  // show, which is what makes the feed the source rather than the file the engine also runs. The cursor is held to what
  // arrived and not to what the file holds, because a room that answers turns writes records the file never had, and a
  // cursor clamped to the file would drop them at the board while the feed and the account kept them.
  const arrived = events ?? model.events;
  const shown =
    typeof cursor === 'number' ? Math.min(cursor, arrived.length) : upto(model.scenes, step);
  const revealed = arrived.slice(0, shown);
  // The record's own clock, which is what a view that stands for a scene is timed by. It is the last thing the frame has
  // reached, so a cursor that has not moved yet is the start of the run rather than the end of it.
  const now = revealed.length ? revealed[revealed.length - 1].at : 0;
  const previousEnd =
    typeof cursor === 'number' ? Math.max(shown - 1, 0) : upto(model.scenes, Math.max(step - 1, 0));

  /**
   * Every ground a unit has written, in the order the record carries them.
   *
   * It is the map's route and the placement plane's route. The sphere does not read it: a member's place there is the
   * interface layout and not a ground.
   */
  const moves = new Map<string, [number, number, number][]>();
  revealed.forEach((event) => {
    const stated = positionOf(event);
    if (!stated) return;
    const who = entityOf(event.origin ?? '');
    if (!who) return;
    const list = moves.get(who) ?? [];
    list.push(fromPlace(place, stated[0], stated[1]));
    moves.set(who, list);
  });

  // A state a device reported is the place's own numbers, so it is read exactly as a position the
  // record wrote. The board and the map then agree about where the live unit stands.
  const livePointOf = (id: string): [number, number, number] | null => {
    const at = live[id];
    return at ? fromPlace(place, at[0], at[1]) : null;
  };

  // A record stands at its writer's interface position, not at the ground the writer's position fact names: the sphere
  // is where a member is in the interface, and the map is the reading that follows the ground.
  const interfaceAt = (id: string): [number, number] => {
    const point = livePointOf(id) ?? layout.get(id);
    return point ? [point[0], point[1]] : [0, 0];
  };

  // The height a record rises to is its place in the run, so the run is the longer of what the file declares and what
  // has arrived: a file-only run keeps the height it had, and a room that has written since makes room for its own.
  const height = Math.max(model.records.length - 1, revealed.filter((event) => event.kind !== 'claim').length - 1, 1);
  const records: Point[] = [];
  revealed.forEach((event, eventIndex) => {
    if (event.kind === 'claim') return;
    const [gx, gy] = interfaceAt(writerOf(event));
    const point: Point = {
      event,
      kind: event.kind,
      at: [gx, gy, (records.length / height) * WORLD_RISE],
      last: false,
      fresh: eventIndex >= previousEnd,
    };
    records.push(point);
  });
  if (records.length) records[records.length - 1].last = true;

  const roles = new Map(model.actors.map((actor) => [actor.id, actor.role]));
  // How much each unit has written so far, which is the height its mark rises to on the board.
  const written = new Map<string, number>();
  for (const event of revealed) {
    if (event.kind === 'claim') continue;
    const who = writerOf(event);
    written.set(who, (written.get(who) ?? 0) + 1);
  }
  const standing: Standing[] = Object.entries(units).map(([id, unit]) => {
    // A unit's path is every ground the place has stood it on up to now. It is the map's reading of movement: the
    // sphere lays the unit out by the interface and does not draw this path. A change the pilot saved is where the unit
    // stands on the ground from the point the branch was taken.
    const change = changes.find((entry) => entry.unit === id);
    const livePoint = livePointOf(id);
    const path: [number, number, number][] = [];
    for (let i = 0; i <= index && i < keys.length; i += 1) {
      // A place may stand a unit only in the record, and the contract says `at` is optional: a unit the place does not
      // stand in a scene is read from its own readings rather than from a declaration it never made.
      const declared = unit.at?.[keys[i]];
      if (declared) path.push(fromPlace(place, declared[0], declared[1]));
    }
    // The place declares where a unit stands in each scene; the record declares every move it made. Both are the path, in
    // the order they happened, so the last step is the unit's own newest reading rather than a place written ahead of it.
    for (const move of moves.get(id) ?? []) path.push(move);
    if (change?.at) path.push(fromPlace(place, change.at[0], change.at[1]));
    // A state the device reported is newer than every record the run holds, so it is the last step.
    if (livePoint) path.push(livePoint);
    // A unit the place never stands anywhere is read at the middle, which is a reading and not a position.
    const to = (path.length ? path[path.length - 1] : [0, 0, 0]) as [number, number, number];
    const here = livePoint ?? layout.get(id) ?? [0, 0, 0];
    // A unit that declares a sub-point is above the ground. The point it watches is that sub-point read back into the
    // place's own numbers, which is what the board's tether ends on.
    const subpoint = unit.geo ? placeOfGeo(place, { lng: unit.geo[0], lat: unit.geo[1] }) : null;
    const watch = subpoint ? fromPlace(place, subpoint[0], subpoint[1]) : null;
    return {
      id,
      icon: unit.icon ?? null,
      model: unit.model ?? null,
      role: roles.get(id) ?? null,
      title: unit.role ?? null,
      // What the unit is comes from the atoms the project assembled for its kind, so the frame asks the assembly rather
      // than testing the name: whether this is a person, whether work can be given to it, and whether it holds lower
      // elements are one answer from one place, and a name the project never assembled gets the frame's own.
      properties: propertiesOf(kinds, unit.icon),
      // Where the unit's own parts read from: a folder's lower elements stand at its own name unless the place
      // points them elsewhere, which is what a unit named for a repository needs.
      holdsAt: unit.holdsAt ?? id,
      abilities: change?.abilities ?? unit.abilities ?? [],
      at: here as [number, number, number],
      from: here as [number, number, number],
      orbital: Boolean(unit.geo),
      altitude: unit.alt ?? null,
      watch,
      ground: toPlace(to, place),
      path,
      moved: false,
      written: written.get(id) ?? 0,
    };
  });

  // A person named in a space is not a thing in the space. The place declares them and the panel lists
  // them with the space, but they stand on the board only once they have intervened, which is taking work
  // or writing a record. A device is in the space whether or not it has written, because that is what the
  // place declares.
  const claimers = new Set<string>();
  for (const event of revealed) if (event.kind === 'claim' && event.worker) claimers.add(event.worker);
  const present = standing.filter(
    (unit) => !unit.properties.person || unit.written > 0 || claimers.has(unit.id),
  );

  const claim = revealed.find((event) => event.kind === 'claim');

  const areas = (place.areas ?? []).map((area) => ({
    label: area.label,
    corners: [
      fromPlace(place, area.x, area.y),
      fromPlace(place, area.x + area.w, area.y),
      fromPlace(place, area.x + area.w, area.y + area.h),
      fromPlace(place, area.x, area.y + area.h),
    ] as [number, number, number][],
    labelAt: fromPlace(place, area.x, area.y + area.h),
  }));

  // The composition's own middle. A cell's nucleus is at the centre of the cell, so the one point every unit publishes to
  // is the point the patch is about: a place declares what its composition is called and not where it stands, because a
  // blackboard standing at a position in the field is a participant, and the one thing every reading of the space is
  // about is the middle of it (the frame's middle, the cell's own centre, the point a zone is measured from).
  const store = place.store ? ([0, 0, 0] as [number, number, number]) : null;

  return {
    aspect,
    sector: sectorOf(place),
    index,
    here,
    before,
    records,
    cameras: camerasIn(place, now),
    views: viewsIn(place, now),
    standing,
    present,
    areas,
    store,
    storeLabel: place.store?.label ?? null,
    claimedBy: claim?.worker ?? null,
    entries: revealed.length,
  };
}

/**
 * A project other than the open one, as the space holds it: the patch of shell it takes, the units the place
 * names in it, and the ground it declares. The one shell holds every project, so what the board draws when
 * it is not the open one is these.
 *
 * Nothing here reads a record. Which project is open is which patch the pilot is reading; the rest are
 * places, and a place is a declaration rather than a run, so a project that is not open has no record for
 * the board to draw and does not need one. Its state is therefore its own declared one and not a reading of
 * its members, which is what makes it a group a pilot can read from a distance.
 */
export interface Neighbour {
  id: string;
  title: string;
  /** The state the project declares, which is the group's own and the one bright thing about it. */
  status: ProjectStatus | null;
  /** The place's own shape, which is what its patch's region is drawn from. */
  aspect: number;
  sector: [number, number];
  units: { id: string; icon: string | null; at: [number, number, number] }[];
  areas: { label: string; corners: [number, number, number][] }[];
}

export function neighboursOf(projects: Bundle[], focused: string | null): Neighbour[] {
  return projects
    .filter((project) => project.id !== focused)
    .map((project) => {
      const place = project.place ?? { view: [0, 0, 1, 1] };
      const [, , vw, vh] = place.view ?? [0, 0, 1, 1];
      const aspect = vw / vh;
      return {
        id: project.id,
        title: project.title,
        status: project.status ?? null,
        aspect,
        sector: sectorOf(place),
        units: Object.entries(place.units ?? {}).map(([id, unit]) => {
          const first = Object.values(unit.at)[0] ?? [vw / 2, vh / 2];
          return { id, icon: unit.icon ?? null, at: fromPlace(place, first[0], first[1]) };
        }),
        areas: (place.areas ?? []).map((area) => ({
          label: area.label,
          corners: [
            fromPlace(place, area.x, area.y),
            fromPlace(place, area.x + area.w, area.y),
            fromPlace(place, area.x + area.w, area.y + area.h),
            fromPlace(place, area.x, area.y + area.h),
          ] as [number, number, number][],
        })),
      };
    });
}

/**
 * The point of the world a place's own coordinate names, which is the height of the floor: a place's own numbers name a
 * position on the ground, and what stands there rises from it.
 *
 * It is the forward reading `toPlace` undoes, written beside it because the two are one conversion: a position read in
 * the place's own numbers and a position written back in them have to be one answer, and a second copy of either is a
 * second answer to where a unit stands. Everything that reads the place's own numbers passes through it, so a unit the
 * frame draws and a cell an order names are the same ground.
 */
export function fromPlace(place: Place, x: number, y: number): [number, number, number] {
  const [vx, vy, vw, vh] = place.view ?? [0, 0, 1, 1];
  return [((x - vx) / vw - 0.5) * (vw / vh), (y - vy) / vh - 0.5, 0];
}

/**
 * The place's own coordinate a record states, or null when it states none.
 *
 * A machine that acts writes where it then stands, and the fact carries the pair in the place's own numbers: the space
 * converts it exactly as it converts a position the place declares, so a move and a declaration land on one ground.
 */
export function positionOf(event: Entry): [number, number] | null {
  if (event.kind !== FACT || !event.content) return null;
  const match = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(event.content.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}

/**
 * The place's own coordinate of a point of the world. It is the inverse of the ground projection above,
 * so a position a reader wrote in the place's own numbers can be shown in the place's own numbers and
 * written back unchanged.
 */
export function toPlace(point: [number, number, number], place: Place): [number, number] {
  const [vx, vy, vw, vh] = place.view ?? [0, 0, 1, 1];
  return [vx + (point[0] / (vw / vh) + 0.5) * vw, vy + (point[1] + 0.5) * vh];
}

/** A point on the earth, as the place's geography states it. */
export interface GeoPoint {
  lng: number;
  lat: number;
}

/**
 * Where a point of the place stands on the earth, or null when the place declares no geography.
 *
 * The place's view is the box the geography covers, and the conversion is affine in both axes: x runs west to east,
 * y runs north to south because the view's y grows downward. A place that declares no box keeps its own coordinates and
 * draws its own plane, which is what every project did before the map was real.
 */
export function geoOf(place: Place, point: [number, number]): GeoPoint | null {
  const bounds = place.geo?.bounds;
  if (!bounds) return null;
  const [vx, vy, vw, vh] = place.view ?? [0, 0, 1, 1];
  const [west, south, east, north] = bounds;
  const x = (point[0] - vx) / vw;
  const y = (point[1] - vy) / vh;
  return {
    lng: west + x * (east - west),
    lat: north - y * (north - south),
  };
}

/**
 * The place's own coordinate of a point on the earth, which is the inverse of `geoOf`.
 *
 * An orbital unit declares its sub-point in longitude and latitude, and the board draws the ground it watches from the
 * place's own numbers. This is the one conversion between the two, so the tether and the map marker name one point.
 */
export function placeOfGeo(place: Place, point: GeoPoint): [number, number] | null {
  const bounds = place.geo?.bounds;
  if (!bounds) return null;
  const [vx, vy, vw, vh] = place.view ?? [0, 0, 1, 1];
  const [west, south, east, north] = bounds;
  const width = east - west;
  const height = north - south;
  if (!(width > 0) || !(height > 0)) return null;
  return [vx + ((point.lng - west) / width) * vw, vy + ((north - point.lat) / height) * vh];
}

/** A box of the earth: west, south, east and north, as a place declares its geography. */
export type GeoBox = [number, number, number, number];

/**
 * How much ground a map keeps around a unit at least, in metres.
 *
 * A place's box can be a yard, a field or a search area, and a map fitted to all of it turns one gait cycle into a pixel.
 * Thirty metres is several steps of the robot's nominal stride, which is enough to see a step and still read a block.
 */
export const MAP_SPAN_METRES = 30;

/**
 * The box a map should show for a unit, in metres around the route it has walked.
 *
 * The window follows the route rather than the place: it is the route's own bounds with a margin. `metres` is the width
 * the window keeps at least, and `aspect` is the map's own width over height, which is what keeps a wide panel from
 * fitting a square window and showing three times the ground across that it shows up. The window is shifted inside the
 * place rather than squeezed by it, so a unit at the edge keeps a full window instead of half of one. A unit that has not
 * moved still gets a window with a step's worth of room in it, because one point has no span of its own.
 */
export function nearBounds(
  bounds: GeoBox,
  path: GeoPoint[],
  at: GeoPoint | null,
  metres = MAP_SPAN_METRES,
  aspect = 1,
): GeoBox {
  const points = path.length ? path : at ? [at] : [];
  if (!points.length) return bounds;

  const [west, south, east, north] = bounds;
  let lowLng = Infinity;
  let lowLat = Infinity;
  let highLng = -Infinity;
  let highLat = -Infinity;
  for (const point of points) {
    lowLng = Math.min(lowLng, point.lng);
    lowLat = Math.min(lowLat, point.lat);
    highLng = Math.max(highLng, point.lng);
    highLat = Math.max(highLat, point.lat);
  }

  // A degree is not a metre: the same thirty metres is a wider arc of longitude the further the place is from the equator.
  const middle = ((south + north) / 2) * (Math.PI / 180);
  const across = metres / (111320 * Math.max(1e-6, Math.cos(middle)));
  const up = metres / (110540 * Math.max(0.01, aspect));
  const widen = (low: number, high: number, least: number): [number, number] => {
    // A margin as well as a floor, so a route that grows past the floor is not drawn against the window's edge.
    const span = Math.max((high - low) * 1.3, least);
    const mid = (low + high) / 2;
    return [mid - span / 2, mid + span / 2];
  };
  const [windowWest, windowEast] = widen(lowLng, highLng, across);
  const [windowSouth, windowNorth] = widen(lowLat, highLat, up);
  const inside = (low: number, high: number, placeLow: number, placeHigh: number): [number, number] => {
    const span = high - low;
    if (span >= placeHigh - placeLow) return [placeLow, placeHigh];
    if (low < placeLow) return [placeLow, placeLow + span];
    if (high > placeHigh) return [placeHigh - span, placeHigh];
    return [low, high];
  };
  const [fittedWest, fittedEast] = inside(windowWest, windowEast, west, east);
  const [fittedSouth, fittedNorth] = inside(windowSouth, windowNorth, south, north);
  return [fittedWest, fittedSouth, fittedEast, fittedNorth];
}

/** What a member shows of itself: where it stands, the route it took, and the footage the place gives it. */
export interface OwnView {
  /** Where the unit stands, in the place's own numbers. */
  at: [number, number];
  /** Every place it has stood, in the place's own numbers, oldest first. */
  path: [number, number][];
  /** What the place says it can show, by the name each view is a view of. */
  views: UnitView[];
  /** Where it stands on the earth, when the place anchors its coordinates. */
  geo: GeoPoint | null;
  /** Its route on the earth, oldest first. */
  geoPath: GeoPoint[];
  /** The box the place's geography covers, when it declares one. */
  bounds: [number, number, number, number] | null;
}

/**
 * Whether the place gives a unit a location of its own, which is what a map may draw.
 *
 * The answer is the member's kind and not the map's: the `shows` atom is what draws the member's own Location and the
 * views it carries, and a kind assembled without it is a thing the place names without placing. A workspace, an agent
 * with no body, and the blackboard the records are read from are all outside the ground, so a map that drew them would
 * be a map of the place's bookkeeping rather than of its machines.
 */
export function located(unit: Standing): boolean {
  return unit.properties.shows;
}

/**
 * Whether a place has a map at all: a real ground and at least one member that presents a location on it.
 *
 * The map button is a view mode like the readings beside it, and a mode that opens an empty picture is worse than one
 * the place does not offer. The ground must be a box with a positive span, because `geoOf` divides the place's view
 * across it; a degenerate box would put every member at one longitude. The member answer is the same `shows` atom the
 * map draws, so a place that declares a location for nobody does not offer the map either.
 */
export function mappable(place: Place | null | undefined, world: World | null): boolean {
  const bounds = place?.geo?.bounds;
  const view = place?.view;
  if (!bounds || bounds.length !== 4 || !bounds.every((value) => Number.isFinite(value))) return false;
  if (!view || !(view[2] > 0) || !(view[3] > 0)) return false;
  const [west, south, east, north] = bounds;
  if (!(east > west) || !(north > south)) return false;
  return Boolean(world?.standing.some(located));
}

/**
 * The attributes an entity presents of itself, read from the world and the place.
 *
 * This is the entity's own top-level property and not something it holds: a lower element is another actor the member owns
 * and can be read on its own, while a position and a view are the member speaking about itself. It is one function because
 * the map, the route and the footage are one reading, and a panel that derived any of them a second way could draw a pin
 * somewhere the unit does not stand.
 */
export function ownView(place: Place, member: Standing): OwnView {
  const path = member.path.map((point) => toPlace(point, place));
  // An orbital unit declares its sub-point, because its board mark is where the interface puts it and not where it is
  // above. Every other unit is projected from the ground the place stands it on.
  const declared = place.units?.[member.id]?.geo;
  return {
    at: member.ground,
    path,
    views: (place.units?.[member.id]?.views ?? []).map(readView),
    geo: declared ? { lng: declared[0], lat: declared[1] } : geoOf(place, member.ground),
    geoPath: path.map((point) => geoOf(place, point)).filter((point): point is GeoPoint => point !== null),
    bounds: place.geo?.bounds ?? null,
  };
}

/**
 * The place's own ground read in the plane the board draws in.
 *
 * The board's points are the place's own numbers mapped onto the shell (`placed`), and `fromPlace` and `toPlace` are the
 * one conversion between the two. A lattice is a division of that ground, and dividing it in one space and drawing it in
 * the other would be two answers about one place: the cells are the same cells read either way, because both are
 * `CELLS_TALL` over the same height, so the lattice is worked out where the board's own points are and lifted onto the
 * shell like every other point. The plane is as wide as the place's own aspect and one unit tall, which is what makes the
 * cell a fraction of the ground rather than a count of place numbers.
 */
export function worldGround(aspect: number): { view: Extent; size: number } {
  return { view: [-aspect / 2, -0.5, aspect, 1], size: 1 / (2 * CELLS_TALL) };
}

/**
 * The route a wire is drawn along: the cells between two things that stand on the ground, in the board's plane.
 *
 * A wire is about where two things stand, and the two are the ends of a declaration: the participant whose reading it
 * started from and the one that took it. Drawn as one straight line it crosses whatever stands between the two, which on
 * a ground where things stand close together is most of the picture; drawn along the ground's own cells it crosses from
 * one cell to the next at the middle of the edge they share and turns by sixty degrees, so wires toward one side of the
 * ground run as the trunk they share. It is drawn under the marks rather than over them, which is what keeps a trunk that
 * crosses a cell a thing stands in from being read as the thing standing there.
 *
 * The two ends are the marks themselves and not the middles of their cells, so a wire meets the units it is about rather
 * than stopping a cell short of each.
 */
export function routeOf(
  aspect: number,
  from: [number, number, number],
  to: [number, number, number],
): [number, number, number][] {
  const { view, size } = worldGround(aspect);
  // A wire is about where two things stand, so the height a record rises to is not part of it: both ends are read on the
  // ground, which is what the cells divide.
  const cells = between(cellOf([from[0], from[1]], size, view), cellOf([to[0], to[1]], size, view));
  return [
    from,
    ...cells.slice(1, -1).map((cell) => {
      const [x, y] = centreOf(cell, size, view);
      return [x, y, 0] as [number, number, number];
    }),
    to,
  ];
}

/** How far the record rises over the ground, in the world's units. */
export const WORLD_RISE = 0.72;

/**
 * How much of what is on screen counts as recent. A unit that wrote in the last third of the run is
 * working, one that wrote before that is idle, and one that has written nothing in the run is offline.
 * The window has a floor so that a frame of a few records still says something.
 *
 * The window is the dial on how busy the space looks, and a third is where the operator asked for it. A
 * quarter made the working group the space's largest group but not its majority (four of nine on the
 * drive), and half made it a majority with nothing left idle (six and none). A third is the dial that
 * gives all three readings at the end of the cell's run: five working, one idle, three offline.
 *
 * The rail and the board both read this, so a unit's mark and its ring cannot disagree about whether
 * the unit is doing anything.
 */
export function workingWindow(shown: number): number {
  return Math.max(3, Math.ceil(shown / 3));
}

/** The units that wrote in the window: the ones the rail and the board draw as working. */
export function workingSet(events: Entry[]): Set<string> {
  return new Set(events.slice(-workingWindow(events.length)).map(writerOf));
}

/** The whole model the views draw from: one function, because a second builder would be a second
 *  place for the picture to drift from. */
export function buildModel(text: string, project: Bundle): Model {
  const { records, events, unknown } = parseScenario(text);
  return {
    records,
    events,
    unknown,
    project,
    title: titleOf(text) || project.id || '',
    scenes: scenes(events, project),
    chain: chainFor(records),
    actors: actors(records),
    intents: records.filter((record) => record.kind === INTENT),
    hints: records.filter((record) => record.kind === HINT),
  };
}

/** The airframe every air role shares, so a payload is the only difference between them on the board. */
const AIRFRAME: [string, Record<string, number | string>][] = [
  ['path', { d: 'M3.4 4.4h2.2L8 8l2.4-3.6h2.2' }],
  ['path', { d: 'M8 8v4.4M6.2 12.8h3.6' }],
  ['circle', { cx: 2.7, cy: 4, r: 1.7 }],
  ['circle', { cx: 13.3, cy: 4, r: 1.7 }],
];

/** A wheel with the body it carries, which is what tells a rover from a crawler from a hauler. */
const WHEEL: [string, Record<string, number | string>][] = [
  ['circle', { cx: 8, cy: 8, r: 5.2 }],
  ['circle', { cx: 8, cy: 8, r: 1.3 }],
  ['path', { d: 'M8 2.8v2.5M8 10.7v2.5M2.8 8h2.5M10.7 8h2.5' }],
];

/** The glyph a unit carries, drawn as SVG rather than as a character. */
export const GLYPHS: Record<string, [string, Record<string, number | string>][]> = {
  workspace: [
    ['path', { d: 'M2.2 5.4c0-.7.5-1.2 1.2-1.2h3l1.5 1.7h5.7c.7 0 1.2.5 1.2 1.2v6c0 .7-.5 1.2-1.2 1.2H3.4c-.7 0-1.2-.5-1.2-1.2z' }],
    ['path', { d: 'M2.2 8.3h11.6' }],
  ],
  machine: [
    ['circle', { cx: 8, cy: 8, r: 3.4 }],
    [
      'path',
      {
        d: 'M8 1.6v2.3M8 12.1v2.3M1.6 8h2.3M12.1 8h2.3M3.5 3.5l1.6 1.6M10.9 10.9l1.6 1.6M12.5 3.5l-1.6 1.6M5.1 10.9l-1.6 1.6',
      },
    ],
  ],
  arm: [
    ['path', { d: 'M2.8 13.4h4.6M5.1 13.4V8.6l3.4-2.6' }],
    ['rect', { x: 8.6, y: 2.6, width: 4.8, height: 4.8, rx: 1.3 }],
  ],
  // A hexapod: six legs off one body, and the head standing clear of it. The legs are drawn as the two joints they
  // are, because what a walker is recognised by is the count of them rather than the shape of any one.
  spider: [
    ['ellipse', { cx: 8, cy: 9.2, rx: 3.3, ry: 2.3 }],
    ['circle', { cx: 8, cy: 4.4, r: 1.5 }],
    ['path', { d: 'M4.9 8.2 2.4 6.1M4.7 9.4H1.4M4.9 10.6 2.4 12.7M11.1 8.2 13.6 6.1M11.3 9.4h3.3M11.1 10.6 13.6 12.7' }],
  ],
  sensor: [
    ['rect', { x: 3.2, y: 3.2, width: 9.6, height: 9.6, rx: 2.4 }],
    ['circle', { cx: 8, cy: 8, r: 2.1 }],
  ],
  wheel: WHEEL,
  rover: [...WHEEL, ['rect', { x: 5.2, y: 3.4, width: 5.6, height: 2.4, rx: 0.8 }]],
  crawler: [...WHEEL, ['path', { d: 'M4 3.2h8M4 4.8h8' }]],
  hauler: [...WHEEL, ['rect', { x: 4.4, y: 3, width: 7.2, height: 3.2, rx: 0.6 }]],
  drone: AIRFRAME,
  scout: [...AIRFRAME, ['circle', { cx: 8, cy: 10.8, r: 1.1 }]],
  thermal: [...AIRFRAME, ['circle', { cx: 8, cy: 10.6, r: 1.7 }], ['path', { d: 'M8 9.6v2' }]],
  relay: [...AIRFRAME, ['path', { d: 'M5.8 2.6a3 3 0 0 1 4.4 0' }], ['path', { d: 'M4.2 1.2a5.4 5.4 0 0 1 7.6 0' }]],
  survey: [...AIRFRAME, ['path', { d: 'M5.4 10.2h5.2M5.4 12h5.2' }]],
  photo: [...AIRFRAME, ['rect', { x: 6.2, y: 9.4, width: 3.6, height: 2.6, rx: 0.6 }], ['circle', { cx: 8, cy: 10.7, r: 0.8 }]],
  boat: [
    ['path', { d: 'M2.4 8.6h11.2l-1.4 4H3.8z' }],
    ['path', { d: 'M5.5 8.6V5.2h5v3.4M8 5.2V2.5' }],
    ['path', { d: 'M1.6 14.2c1 .6 2 .6 3 0s2-.6 3 0 2 .6 3 0 2-.6 3 0' }],
  ],
  auv: [
    ['ellipse', { cx: 8, cy: 8.4, rx: 5, ry: 2.4 }],
    ['path', { d: 'M6 6V3.4h3.2V6' }],
    ['path', { d: 'M3 10.8h10' }],
  ],
  person: [
    ['circle', { cx: 8, cy: 5.2, r: 2.4 }],
    ['path', { d: 'M3.5 13.6c0-2.7 2-4.3 4.5-4.3s4.5 1.6 4.5 4.3' }],
  ],
  belt: [
    ['circle', { cx: 4, cy: 11, r: 2.1 }],
    ['circle', { cx: 12, cy: 11, r: 2.1 }],
    ['path', { d: 'M4 8.9h8M5.6 8.9V6.3h4.8v2.6' }],
  ],
  camera: [
    ['rect', { x: 2, y: 4.6, width: 12, height: 8, rx: 1.6 }],
    ['circle', { cx: 8, cy: 8.6, r: 2.4 }],
    ['path', { d: 'M6 4.6l1-2.2h2l1 2.2' }],
  ],
  console: [
    ['rect', { x: 2.2, y: 3, width: 11.6, height: 8, rx: 1.4 }],
    ['path', { d: 'M8 11v2.2M5.4 13.2h5.2M4.6 5.6h6.8M4.6 8.2h4' }],
  ],
  history: [
    ['ellipse', { cx: 8, cy: 4.4, rx: 4.6, ry: 1.9 }],
    ['path', { d: 'M3.4 4.4v7.2c0 1 2.1 1.9 4.6 1.9s4.6-.9 4.6-1.9V4.4' }],
    ['path', { d: 'M3.4 8c0 1 2.1 1.9 4.6 1.9s4.6-.9 4.6-1.9' }],
  ],
  pump: [
    ['circle', { cx: 7, cy: 9.4, r: 3.4 }],
    ['path', { d: 'M7 9.4l1.9-2.2M10.4 9.4h3.2M3.6 9.4H1.2M7 3.4v2.6' }],
  ],
  station: [
    ['path', { d: 'M8 13.6V6.4M4.6 13.6h6.8' }],
    ['path', { d: 'M4.4 6.2a5 5 0 0 1 7.2 0' }],
    ['circle', { cx: 8, cy: 5, r: 1.3 }],
  ],
  // A body with two panels and the antenna it downlinks on: the one shape that says a unit is above the ground rather
  // than on it.
  satellite: [
    ['rect', { x: 6.4, y: 6.2, width: 3.2, height: 3.6, rx: 0.8 }],
    ['path', { d: 'M8 6.2V3.4M8 9.8v2.8' }],
    ['rect', { x: 1.6, y: 6.8, width: 2.8, height: 2.4, rx: 0.4 }],
    ['rect', { x: 11.6, y: 6.8, width: 2.8, height: 2.4, rx: 0.4 }],
    ['path', { d: 'M4.4 8h2M9.6 8h2' }],
  ],
  store: [
    ['ellipse', { cx: 8, cy: 4, rx: 5, ry: 1.9 }],
    ['path', { d: 'M3 4v8c0 1 2.2 1.9 5 1.9s5-.9 5-1.9V4' }],
    ['path', { d: 'M3 8c0 1 2.2 1.9 5 1.9s5-.9 5-1.9' }],
  ],
};

/**
 * The glyph for a unit: the shape the place named, and what the record makes of the entity otherwise.
 *
 * It is the frame's own font and not a statement about a kind, so a project composes a kind in its bundle and picks
 * the drawing here by the same name. A name the font has never drawn falls back to the direction the record puts the
 * unit in, which is the one reading available when the place says nothing.
 */
export function glyphOf(icon: string | null | undefined, role: string | null | undefined) {
  return GLYPHS[icon ?? ''] ?? GLYPHS[role === 'acts' ? 'arm' : 'sensor'];
}
