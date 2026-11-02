import type { ComponentType } from 'react';
import { Frame, MapPin, Move, Video } from 'lucide-react';
import type { Camera, DeclaredView, UnitView, ViewStatus } from './types';

/** The kinds a view can be, which are the kinds the content table has a renderer for. */
export type ViewKind = UnitView['kind'];

/**
 * What a window on the shell shows.
 *
 * A window is one abstraction with the contents the frame knows: a camera's picture, a member's place on the earth, the
 * place being chosen, and a view this build cannot draw. They share everything the frame does to a window (where it
 * stands, how large it is, whether it is folded, which pin is in front), and they differ only in what is inside it and
 * which word its mark carries.
 *
 * A view kind is what a place may declare; `edit` is a window the frame opens for itself, so it has no view variant.
 * Keeping the kind here rather than in the store or the layer is what lets the record's editor become a window without
 * changing what a window is. A kind a newer place writes and this build does not know is `unknown`, which draws the
 * name and says the frame cannot show it rather than guessing at a picture.
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

/** What each kind is called and drawn by, in one table so a mark and a handle cannot name it two ways. */
export const WINDOW_KINDS: Record<WindowKind, { label: string; Icon: ComponentType<{ className?: string }> }> = {
  media: { label: 'video', Icon: Video },
  // A map here is ground the place declares and not the minimap the frame draws around the pilot, so its mark is a
  // pin on that ground rather than a folded sheet.
  map: { label: 'map', Icon: MapPin },
  edit: { label: 'place', Icon: Move },
  unknown: { label: 'view', Icon: Frame },
};

/** One window, named by what it shows rather than by a second constructor for each kind. */
export function windowOf(kind: WindowKind, id: string, origin: string, title?: string): ShellWindow {
  return { id, kind, origin, title: title ?? id };
}

/** The window a camera is: the media kind, carried by the entity that declares it. */
export function windowOfCamera(camera: Camera): ShellWindow {
  return windowOf('media', camera.id, camera.origin, camera.id);
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
 * The kind a window was opened with, and media when an older window was kept without one.
 *
 * The store is written to the browser and a window kept before this field existed has no kind; a reader that treated
 * the missing value as an unknown window would drop a picture the pilot had placed. A kind the place writes and this
 * build does not know is `unknown`, so a newer view is named rather than misread as a picture.
 */
export function kindOf(kind: string | undefined): WindowKind {
  if (!kind) return 'media';
  return Object.prototype.hasOwnProperty.call(WINDOW_KINDS, kind) ? (kind as WindowKind) : 'unknown';
}

/**
 * One view as a place writes it, read into the kind this build can draw.
 *
 * This is the only place a declaration becomes a `UnitView`, so the store's old data, a place's new kind and a kind
 * this build has never heard of are read once and alike. Absent kind is media, because that is what every place wrote
 * before a view had a kind. A kind with no renderer becomes `unknown` and keeps its name and source, so the panel can
 * say what it is; a media view with no bytes has nothing to draw, so it becomes `unknown` too rather than a blank
 * picture.
 */
export function readView(declared: DeclaredView): UnitView {
  const kind = kindOf(declared.kind);
  const status = statusOf(declared);
  const when = { from: declared.from, to: declared.to };
  if (kind === 'media' && declared.src) {
    // A medium and a projection this build does not know are left out rather than guessed at: the medium then falls back
    // to the source's name and the projection to a flat frame.
    const medium = declared.medium === 'image' || declared.medium === 'video' ? declared.medium : undefined;
    // The renderer names the projection `spatial`; the spellings a spatial device is commonly declared with are read into
    // the same value so a 360 camera does not have to be rewritten before this build can hold it.
    const spatial =
      declared.projection === 'spatial' ||
      declared.projection === '360' ||
      declared.projection === 'equirectangular';
    const projection = spatial ? 'spatial' : undefined;
    return {
      id: declared.id,
      kind,
      src: declared.src,
      cells: declared.cells,
      status,
      ...(medium ? { medium } : {}),
      ...(projection ? { projection } : {}),
      ...when,
    };
  }
  if (kind === 'map') {
    return {
      id: declared.id,
      kind,
      cells: declared.cells,
      status,
      ...(declared.scope === 'place' ? { scope: 'place' as const } : {}),
      ...when,
    };
  }
  return {
    id: declared.id,
    kind: 'unknown',
    declared: declared.kind ?? 'media',
    src: declared.src,
    cells: declared.cells,
    status,
    ...when,
  };
}
