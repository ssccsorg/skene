import type { Camera, DeclaredView, UnitView, ViewStatus } from '@ssccsorg/skene-kernel';
import { defaultViewKind, viewKindOf } from './view-kinds';

/**
 * The kinds a view can be.
 *
 * It is a string and not a union, which is the one cost of a kind declaring itself: TS cannot enumerate the modules that
 * registered. What replaces the union is that the name is asked of the register and not written down here, so a kind a
 * deployment installs is a kind this frame draws.
 */
export type ViewKind = string;

/**
 * What a window on the shell shows.
 *
 * A window is one abstraction with the contents a kind supplies: the frame holds where it stands, how large it is, whether
 * it is folded and which pin is in front, and a kind says what is inside it and which word its mark carries. `edit` is a
 * window the frame opens for itself, so it has no registered kind and no picture.
 *
 * A kind a newer place writes and this build does not know is `unknown`, which draws the name and says the frame cannot
 * show it rather than guessing at a picture.
 */
export type WindowKind = ViewKind | 'edit';

/** One window the space can carry, whichever of the kinds it is. */
export interface ShellWindow {
  /** The name the window is a window of: one thing, one window. */
  id: string;
  /** What it shows, which is what its content and its mark are chosen from. */
  kind: WindowKind;
  /** The member the window belongs to: what its pin is drawn against and what its handle is set from. */
  origin: string;
  /** What the window is called where a reader is told about it. */
  title: string;
}

/** One window, named by what it shows rather than by a second constructor for each kind. */
export function windowOf(kind: WindowKind, id: string, origin: string, title?: string): ShellWindow {
  return { id, kind, origin, title: title ?? id };
}

/** The window a camera is: its own kind's window, carried by the entity that declares it. */
export function windowOfCamera(camera: Camera): ShellWindow {
  return windowOf(camera.kind, camera.id, camera.origin, camera.id);
}

/**
 * What a view is doing, as the mark and the word the panel reads it in.
 *
 * The mark is the view's own glyph in the state's ink, so the reading costs no second mark: live pulses in the working
 * ink, a recording pulses in the claim ink, and a stopped or replaying medium is still. The word is what the glyph's
 * tooltip and accessible name say, because a colour alone is not a reading for every reader.
 */
export const VIEW_STATUS: Record<ViewStatus, { word: string; ink: string }> = {
  live: { word: 'live', ink: 'motion-safe:animate-pulse text-working' },
  recording: { word: 'recording', ink: 'motion-safe:animate-pulse text-claim' },
  replaying: { word: 'replaying', ink: 'text-muted-foreground' },
  stopped: { word: 'stopped', ink: 'text-offline' },
  unknown: { word: 'unknown', ink: 'text-muted-foreground' },
};

/**
 * The status a view is drawn with: what the place declares, and live when it declares nothing.
 *
 * A status this build does not know is `unknown`, so a newer place is named as a view this frame cannot read rather than
 * drawn in the ink of a state it did not declare.
 */
export function statusOf(view: { status?: string }): ViewStatus {
  if (view.status === undefined) return 'live';
  return Object.prototype.hasOwnProperty.call(VIEW_STATUS, view.status) ? (view.status as ViewStatus) : 'unknown';
}

/**
 * The status a view is shown with, from what the place declares and whether its medium is running.
 *
 * A medium that is not running is stopped whatever the declaration says, and a medium that is running is not
 * stopped whatever the declaration says. Until the picture has said either way, the declaration is the answer.
 */
export function statusWith(view: { status?: string }, running: boolean | undefined): ViewStatus {
  if (running === false) return 'stopped';
  if (running === true && view.status === 'stopped') return 'live';
  return statusOf(view);
}

/**
 * The kind a window was opened with, and the default kind when an older window was kept without one.
 *
 * The store is written to the browser and a window kept before the kind was declared has none; a reader that treated the
 * missing value as an unknown window would drop a picture the pilot had placed. The default is a fact of the kind that
 * asks to be it, not a word here: the frame does not know which of its kinds was once the only one. A kind the place
 * writes and this build does not know is `unknown`, so a newer view is named rather than misread as a picture.
 */
export function kindOf(kind?: string): WindowKind {
  // The editor is the frame's own window and not a place's view, so it has no registered kind and is still a kind.
  if (kind === 'edit') return 'edit';
  const named = kind ?? defaultViewKind();
  if (!named) return 'unknown';
  return viewKindOf(named) ? named : 'unknown';
}

/**
 * One view as a place writes it, read into the kind this build can draw.
 *
 * This is the only place a declaration becomes a `UnitView`, so the store's old data, a place's new kind and a kind this
 * build has never heard of are read once and alike. The reading itself is the kind's own: a kind that knows the
 * declaration returns the view, and one that does not is named rather than guessed at, so a media view with no bytes and
 * a kind this build has never heard of are both `unknown` and both keep the name the place wrote.
 */
export function readView(declared: DeclaredView): UnitView {
  const kind = kindOf(declared.kind);
  const read = viewKindOf(kind)?.read;
  const view = read?.(declared) ?? null;
  if (view) return view;
  return {
    id: declared.id,
    kind: 'unknown',
    declared: declared.kind ?? kind,
    src: declared.src,
    cells: declared.cells,
    status: statusOf(declared),
    from: declared.from,
    to: declared.to,
  };
}
