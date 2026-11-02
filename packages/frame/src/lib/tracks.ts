// The run split by the entity that wrote it.
//
// A record's origin opens with the writer (`unit/part`, `workspace/note`), and a step that is not a reading, a claim,
// names its worker instead. The transport draws one row per writer, which is what makes a run readable as several hands
// rather than one line, and this is the split it draws: every record lands on exactly one row, so the rows are the same
// run and not a second reading of it.
//
// An entity named only as a subject gets no row. The filter is the model's own: a writer is whoever wrote, so a unit that
// was read about but never wrote is not a track.

import type { Entry, NodeKind } from './types';

/** The entity a record was written by: the origin's first segment, or the worker of a step with no origin. */
export function writerOf(entry: Entry): string {
  const origin = entry.origin?.split('/')[0]?.trim();
  if (origin) return origin;
  const worker = entry.worker?.trim();
  return worker || 'the room';
}

export interface Track {
  /** The entity, which is what the row is named. */
  id: string;
  /** The record's place in the run, and its kind, which is the tick. */
  ticks: { at: number; kind: NodeKind }[];
  /** How many of the ticks are steps of the stream rather than readings, which is what a claim is. */
  claims: number;
}

/** One campaign's run, as the transport's branch strip draws it. */
export interface RunBranch {
  id: string;
  title: string;
  /** The campaign's colour, which its flag carries as well. */
  ink: string;
  /**
   * Each record's place in the run, 0 to 1.
   *
   * The place is read over the run's own length, so two runs of different lengths are two branches of one strip rather
   * than a count that assumes they are the same size. The open run's marks are its delivered records, so its last one
   * stands at the end of the strip whatever the other runs hold.
   */
  marks: number[];
  /** Whether this is the run the board is walking. */
  active: boolean;
}

/**
 * The run split by writer, in the order each writer first appears.
 *
 * The order is the run's own rather than a sort of the names: a row appears where its first record does, so reading the
 * rows from the top is reading the order the run brought its writers in.
 */
export function tracksOf(records: Entry[]): Track[] {
  const tracks = new Map<string, Track>();
  records.forEach((entry, at) => {
    const id = writerOf(entry);
    let track = tracks.get(id);
    if (!track) {
      track = { id, ticks: [], claims: 0 };
      tracks.set(id, track);
    }
    track.ticks.push({ at, kind: entry.kind });
    if (entry.kind === 'claim') track.claims += 1;
  });
  return [...tracks.values()];
}
