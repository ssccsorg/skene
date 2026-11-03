// What a window kind is, and the one register a kind is installed in.
//
// A reading is a way of reading the whole space, and a window kind is a thing a member can present inside it: footage, a
// map, and whatever a deployment adds. Both are the same shape of question, so both are answered the same way, by a
// register a module writes itself into rather than a table the frame keeps. The frame knows that a kind has a name, a mark
// and a body, and it stops there: which kinds exist is a fact of the modules that were imported.
//
// The register is here rather than in the store or the layer because a mark, a row body and a picture are all read from
// it, and a kind declared in one of those three places would be a kind the other two could not find. A kind this build
// does not hold is not an error: `unknown` says what the declaration was called and that this build cannot draw it,
// which is what makes a newer place readable rather than blank.

import type { ComponentType } from 'react';
import { Frame } from 'lucide-react';
import type { Bearing } from './board';
import type { FrameBox } from './views';
import type { CarriedView, DeclaredView, Place, UnitView, World } from '@ssccsorg/skene-kernel';
import type { OwnView } from './world';

/**
 * What a kind is handed when it paints a window on the shell.
 *
 * One object rather than a prop per kind, for the reason the board is one object: a kind added later must not be able to
 * add a requirement the frame has to be told about. What a kind needs is a fact about the kind, and it is answered by
 * taking it or leaving it.
 */
export interface WindowPaint {
  /** The name the window is a window of. */
  id: string;
  /** What the window is a view of: the declaration read into this build, carrying its own kind's fields. */
  source: CarriedView;
  /** Where the window stands on the shell. */
  bearing: Bearing;
  /** How large it is, in cells of the graticule. */
  cells: Bearing;
  /** The two bearings of the line back to the entity that carries it. */
  lead: [Bearing, Bearing] | null;
  /** Whether the pilot has put it away. A folded picture keeps running with nothing drawn. */
  hidden: boolean;
  /** The pilot's stack, so a picture is drawn in the order its controls are stacked in. */
  order: number;
  /** The open project's space and place, which a map reads and a picture does not. */
  world: World;
  place: Place;
  pickedId: string | null;
  /** The map's own tone, which is the frame's setting rather than this window's. */
  tone: 'dark' | 'light';
}

/** What a kind is handed when a member's row draws it. */
export interface WindowRow {
  view: UnitView;
  member: string;
  own: OwnView;
  place: Place;
  world: World | null;
  pickedId: string | null;
  onPick: (id: string) => void;
  running: boolean | undefined;
  setRunning: (id: string, running: boolean) => void;
}

/** What a kind is handed when the page draws something of the window that cannot be a texture. */
export interface WindowPage {
  id: string;
  /** The window's own box, clipped to what the frame holds. */
  at: FrameBox;
  world: World;
  place: Place;
  pickedId: string | null;
  onPick: (id: string) => void;
  tone: 'dark' | 'light';
}

/**
 * One kind of window, as the module that draws it declares it.
 *
 * `read` is the kind's own reading of a declaration: the frame parses a view into what this build can draw, and a kind
 * that knows no such view returns nothing rather than a blank picture. `Paint` is the picture on the shell and `Page` is
 * the part of it the page has to draw, because a button cannot be a texture. `Row` is the body under a member's rows and
 * `Thumb` is the mark a row carries for a member that presents one, which is what lets a kind reach the panel at all.
 */
export interface ViewKind {
  /** The name a place writes in a declaration, which is what every other field is read by. */
  kind: string;
  /** What the kind is called where a mark is read aloud. */
  label: string;
  /** How the mark is drawn. A component rather than an element, because the register does not draw it. */
  Icon: ComponentType<{ className?: string }>;
  /** Read a declared view of this kind into this build, or null when it cannot draw it. */
  read?: (declared: DeclaredView) => UnitView | null;
  /** The picture painted on the shell. Absent means the window is drawn by the page or not at all. */
  Paint?: ComponentType<WindowPaint>;
  /** The part of the window the page has to draw, standing where the window's own box falls. */
  Page?: ComponentType<WindowPage>;
  /** The body under a member's row. */
  Row?: ComponentType<WindowRow>;
  /** The mark a row carries for a member that presents this kind. */
  Thumb?: ComponentType<{ id: string; src: string; className?: string }>;
  /**
   * Whether the window stands over the place rather than over the entity that carries it.
   *
   * A window of one member stands where that member does; a window of the whole ground stands over the place, and moving
   * it to keep clear of the members it draws would shrink the picture of them.
   */
  anchor?: 'place';
  /**
   * Whether the pilot's cell is drawn round the picture.
   *
   * The cell is the window's outer frame and the picture is the medium's own shape, so a kind whose picture fills its
   * box draws no frame. Absent means the frame is drawn.
   */
  edge?: boolean;
  /**
   * The control that reaches this kind's own surface, when it has one.
   *
   * The frame draws it where a member's row and a window's pin have room for it and nowhere else, because what a surface
   * is and how a picture is sent to it is the kind's answer. A kind with no surface supplies none.
   */
  Forward?: ComponentType<{ origin: string; where: 'row' | 'handle' }>;
  /** Whether this kind's views fill the room's surface. */
  fills?: boolean;
  /**
   * The picture that fills the room's surface, when this kind has one.
   *
   * The board hands it the space and the observer and draws whatever it returns, so the surface's own layout and rate are
   * the kind's and a board with no such kind draws a room with nothing inside it.
   */
  Surface?: ComponentType<{ world: World; pickedId: string | null }>;
  /** How the surface is filled: the control the board's column carries, when the kind has a surface to fill. */
  SurfaceControl?: ComponentType<{ world: World; pickedId: string | null }>;
  /**
   * Whether this kind can draw a member's own position.
   *
   * A member's place is a view the place does not have to declare, and the panel draws one when a kind says it can. It is
   * the kind that knows how a position becomes a picture, so the panel asks rather than naming a kind itself.
   */
  place?: boolean;
  /**
   * Whether this is the kind a declaration without one is read as.
   *
   * A place written before a view had a kind wrote footage and nothing else, so the kind that says this is what keeps
   * those places readable. It is a fact of a kind rather than a word in the frame, and one kind may say it.
   */
  default?: boolean;
}

const registered = new Map<string, ViewKind>();
let fallback: string | null = null;

/** Install a kind, where the module that draws it is written. The declaration comes back so a caller can hold it. */
export function registerViewKind(kind: ViewKind): ViewKind {
  registered.set(kind.kind, kind);
  if (kind.default) fallback = kind.kind;
  return kind;
}

/** The kind a declaration with none is read as, or null while no kind has claimed it. */
export function defaultViewKind(): string | null {
  return fallback;
}

/** One kind, or undefined when this build does not hold it. */
export function viewKindOf(kind: string): ViewKind | undefined {
  return registered.get(kind);
}

/** Every kind this build holds, in the order they were installed. */
export function viewKinds(): ViewKind[] {
  return [...registered.values()];
}

/**
 * The mark of a kind this build cannot draw, which is a name and no picture.
 *
 * It is a kind like any other rather than a null check at each caller: the panel names the declaration, the row says
 * which kind it was, and the board draws nothing, all from one entry.
 */
export const UNKNOWN_KIND: ViewKind = {
  kind: 'unknown',
  label: 'view',
  Icon: Frame,
};
