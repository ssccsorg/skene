import { useMemo, useSyncExternalStore, type ComponentType } from 'react';
import { useScenario } from '../stores/scenario';
import { standing, type Pack } from './packs';
import type { Bundle, Place, World } from '@ssccsorg/skene-kernel';
import type { Neighbour } from './world';

export { NATIVE, standing } from './packs';
export type { Pack, Want } from './packs';

/**
 * Which reading of the space the board draws, as a name.
 *
 * The name is a string and not the union of the four readings the frame happens to hold, and that is the one cost of a
 * reading declaring itself: TS cannot enumerate the modules that registered. What replaces the union is that the name is
 * asked of the reading and not written down. A control that speaks to one reading compares against that reading's own key
 * (`components/instruments/FitToSpace.tsx`), so a reading renamed or withdrawn is a compile error at the one place that
 * named it rather than a string that stopped matching in silence.
 */
export type Picture = string;

/**
 * What a reading is handed: the board's own resources, which are the same for every reading.
 *
 * A reading takes what it wants from this and the frame does not work out which reading wants which. The shape is one
 * object rather than a prop per reading because a reading added later must not be able to add a requirement the frame has
 * to be told about, which is what a prop of its own would be: what a reading needs is a fact about the reading, and it is
 * answered by taking it or leaving it.
 */
export interface Board {
  /** The open project's space, or null while the board is still being read. */
  world: World | null;
  /**
   * The open project's bundle, whole, which is how a pack's reading reaches what that project carries.
   *
   * The frame hands the bundle rather than the fields a domain turned out to need, for the same reason it hands the
   * board as one object: a pack added later must not be able to add a requirement the frame has to be told about. A
   * reading reads the resource its project declared, and the frame does not learn what it is called.
   */
  project: Bundle | null;
  /**
   * The open project's place, which is the ground a map draws and the projection a reading's coordinates are in.
   *
   * It is read beside the world because a world is the run's positions in the board's own coordinates and a map is a
   * picture of the place those coordinates stand on. A reading that derived the place a second way would be a picture
   * free to disagree with the ground the board already holds.
   */
  place: Place | null;
  /** The places the shell holds beside the open one, each as one summarising mark. */
  neighbours: Neighbour[];
  /** The picked unit, which is what a reading that follows a pick is drawn for. */
  pickedId: string | null;
  onPick: (id: string) => void;
  onOpenProject: (id: string) => void;
  /**
   * Put a member where the pointer left it, in the scene's own coordinates.
   *
   * A board draws where a member stands and a frame says what a member's place is, so the reading answers in the units its
   * own projection works in and the frame turns that into the place's own numbers and writes it. A reading that wrote the
   * edit itself would be a reading that knew what a place's view is, which is the frame's and not the board's.
   */
  onMove?: (id: string, at: [number, number, number]) => void;
}

/**
 * How a reading appears in the bar, when it appears there at all.
 *
 * The order is the reading's own claim and not the bar's: which of two readings comes first is a fact only the readings
 * can state, and it is the order they are read in as well as drawn in. The frame takes the first as the one it opens on.
 */
export interface Button {
  order: number;
  /** What it is, in the words the button carries. */
  title: string;
  /** How it is drawn. A component rather than an element, because the bar draws it and not the declaration. */
  Icon: ComponentType;
}

/**
 * A reading as a module declares it.
 *
 * `key` is the name the bar asks the reading in force by and `path` is the address it is reached at: `shows` in
 * `lib/instruments.ts` compares against the key and the button is marked when the address is the reading's own path. Two
 * names because what a control speaks to and where a reading lives are two questions, and neither is derivable from the
 * other without picking a spelling for the other.
 *
 * `button` is absent for a reading reached by a pick rather than chosen. The act is read by picking a record and pressing
 * the detail's own control, so it has an address and no button: a bar that offered it would offer a reading of nothing
 * until something was picked.
 *
 * `seat` is absent for every reading but the shell's, which is the one picture that is the pilot's own view of the space:
 * what a frame holds of the shell is a fact only a reading drawn from the seat has, so the map paints its region for that
 * reading and for no other.
 *
 * `asked` is the frame's answer to a view a project has to want. A picture of a space is a claim about that space, and a
 * claim its own project does not make is a reading telling a reader something about their data that their data did not
 * say: a lattice of cells over a ground of continuous positions is the shape of it, and a project that means its ground as
 * a picture of where things stand must not be read as a board. So a reading that is a claim is carried where the project
 * in force asks for it and nowhere else, the project asks in its own bundle's layout beside the panels it names, and a
 * reading a project does not name is not in the bar and not at its address.
 */
export interface Reading {
  key: string;
  path: string;
  /** What the board draws for it, handed the board's resources and free to take none. */
  View: ComponentType<Board>;
  button?: Button;
  /**
   * The pack this reading belongs to. Absent means the frame's own, which is the one every project stands.
   *
   * Nothing in the frame is privileged by being native: the frame's readings are registered through the same call a
   * project's are, and `native` is only the name that is always installed. A project that brings a domain brings a pack,
   * and the board offers its readings exactly where the project names it.
   */
  pack?: string;
  /**
   * Whether this reading is carried only where the project in force asks for it.
   *
   * Absent means no, which is the frame's own picture of the space and stands for every project. Present means the
   * reading is a claim about a space and not a picture of one, so it is drawn where that space's own bundle names it.
   */
  asked?: boolean;
  /**
   * Whether this reading draws the space from the pilot's own seat.
   *
   * It is the one thing the map's own region is a claim about: a frame's four corners are the part of the shell the board
   * holds, and a reading that draws the run as a table holds no part of the shell at all. So the region is drawn for the
   * readings that declare this and for no others, and the declaration is here rather than at the map because the map is a
   * drawing of the space and not a place that knows the frame's readings: a reading added later declares it for itself and
   * the map draws its region without being told the reading exists.
   *
   * Absent means no: a reading that says nothing about the seat is a reading looking at the run rather than through it.
   */
  seat?: boolean;
  /**
   * Whether this reading is a pane the board can hold beside the reading in force.
   *
   * A pane is not a place the cockpit goes: it is drawn next to whatever the address names, and the control that opens
   * it toggles it rather than navigating. The shell is the board itself, so the pane is the one reading that declares
   * this, and the frame holds it without knowing which reading it is.
   */
  pane?: boolean;
}

const registered = new Map<string, Reading>();
const listeners = new Set<() => void>();
let revision = 0;

/**
 * Install a pack, which is the one call a domain makes to reach the board.
 *
 * A pack registers its readings through the same call the frame's own use, under its own name, so a domain's view is a
 * reading like any other and the frame keeps no list of domains.
 */
export function registerPack(pack: Pack): void {
  for (const reading of pack.readings) registerReading({ ...reading, pack: pack.id });
}

/**
 * Put a reading in the register, where the module that draws it is written.
 *
 * The declaration comes back, so a place that has to name the reading can hold it rather than its spelling out: one
 * control speaks to the shell alone and says so by comparing against the shell's own key.
 */
export function registerReading(reading: Reading): Reading {
  registered.set(reading.key, reading);
  revision += 1;
  for (const listener of listeners) listener();
  return reading;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Every reading, in the order they stand in the bar. The one reached by a pick sorts after the ones that are chosen. */
function inOrder(readings: Reading[]): Reading[] {
  return [...readings].sort((left, right) => {
    const leftOrder = left.button?.order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.button?.order ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.key.localeCompare(right.key);
  });
}

/**
 * What the bar reads, and what the frame will draw: the register's readings, less the ones the project in force does not
 * ask for. The layout is read here rather than handed in because this is where the readings are, and the project's own
 * declaration is the other half of the same question.
 *
 * It subscribes to the register rather than reading it once, because a reading's module is registered when it is first
 * imported and the bar may draw before that: the counter is what makes the second draw happen.
 */
export function useReadings(): Reading[] {
  const stamp = useSyncExternalStore(
    subscribe,
    () => revision,
    () => revision,
  );
  const layout = useScenario(
    (state) => state.projects.find((each) => each.id === state.projectId)?.layout,
  );
  const views = useScenario(
    (state) => state.projects.find((each) => each.id === state.projectId)?.views,
  );
  return useMemo(
    () => standing(inOrder([...registered.values()]), { layout, views }),
    [stamp, layout, views],
  );
}

/**
 * Every reading as the register has it, asked without subscribing.
 *
 * What draws is `useReadings`, which subscribes so that a reading declared after the first draw is drawn. Resolving the
 * whole list once is a different question, and it is asked by callers that are not a render: a subscription would hand
 * back a value that changes with every registration, which in an effect's dependencies is an effect that runs again on
 * every import. It is the register's own answer and not a value that changes with a render, which is why it is a function
 * and not a hook.
 */
export function declaredReadings(): Reading[] {
  return inOrder([...registered.values()]);
}

/**
 * The reading in force at an address: the one whose path it is, and the frame's own first otherwise.
 *
 * An address the frame does not hold is the shell rather than nothing, which is what makes a link into the cockpit from
 * outside land somewhere. The frame's own first is the one it opens on, so "the address fell through" and "there is no
 * address" are one picture rather than two.
 */
export function useReadingAt(pathname: string): Reading | null {
  const readings = useReadings();
  return useMemo(
    () => readings.find((reading) => reading.path === pathname) ?? readings[0] ?? null,
    [readings, pathname],
  );
}
