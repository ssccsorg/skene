/**
 * The part of a run the transport is reading, and the two conversions between a position in the run and a place
 * across the track.
 *
 * A run is read whole until the pilot asks for less of it. The window is `span / zoom` of the run, kept around the
 * cursor and held inside the run, so a cursor near either end pulls the window against that end rather than off it.
 * Every conversion the track makes goes through here, which is what keeps a tick, a scene boundary, a pick, and the
 * playhead on one axis at every depth.
 */
export interface Reading {
  /** Where the window begins, in the run's own units. */
  start: number;
  /** How much of the run the window holds. */
  view: number;
}

export function readingOf(shown: number, span: number, zoom: number): Reading {
  const view = Math.max(span / Math.max(zoom, 1), 1e-6);
  const start = Math.min(Math.max(shown - view / 2, 0), Math.max(span - view, 0));
  return { start, view };
}

/** The place across the track a position in the run is drawn at, as a percentage of its width. */
export function acrossOf(at: number, reading: Reading): number {
  return ((at - reading.start) / reading.view) * 100;
}

/** The position in the run a place across the track names, which is what a click or a drag seeks to. */
export function atOf(across: number, reading: Reading): number {
  return reading.start + (across / 100) * reading.view;
}

/** Whether a position in the run falls inside the window, by the same margin the track draws its ends at. */
export function shownIn(at: number, reading: Reading): boolean {
  const across = acrossOf(at, reading);
  return across >= -0.5 && across <= 100.5;
}
