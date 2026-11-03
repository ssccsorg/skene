// Where a run is read from, and why the read is a window.
//
// A record store has no index: what it has is an address space and fragments in it, so a run is read as a range of its
// own addresses rather than as a file walked from the beginning. Two things follow, and both are in this file. A read
// names where it starts and how much it wants, and an answer carries the length of the whole run beside the window it
// gave, because a window cannot see how long the run is and a transport has to draw the run.
//
// That is the whole difference from the loader this surface came from. A loader holds the run and hands out pieces of
// it, so it must know what every reader depends on and be edited when that changes. Here the run is somewhere else, the
// reader says which range it wants, and nothing here knows what the reader does with it.
//
// What is not here is the conversation. A turn, a note and a decision are a different axis from the record, which is
// the room in `lib/channel.ts`, and the two meet in a deployment rather than in this file. The live arrival of a run is
// a seam of its own (`lib/record-client.ts`); the two meet when a window short of the cursor's end has to be extended,
// which is the step after this one.

import type { Entry } from './types';

/** A range of a run's own addresses, with the length of the whole: a window cannot see how long the run is. */
export interface Window {
  entries: Entry[];
  total: number;
}

/** Where a run is read from. */
export interface RunSource {
  /** The records at `[from, from + limit)`, and how many records the run holds in all. */
  window(project: string, from: number, limit: number): Promise<Window>;
}

/**
 * The range `[from, from + limit)` of a run, and the length of the run.
 *
 * A range that starts past the end is empty and still reports the total, which is the case a cursor at the end of a run
 * asks for. A cursor that is not a number reads from the beginning, because a window is asked for by arithmetic and an
 * arithmetic that produced nothing at all is a request to start over rather than a failure.
 */
export function windowOf(events: Entry[], from: number, limit: number): Window {
  const at = Number.isFinite(from) ? Math.max(0, Math.trunc(from)) : 0;
  const start = Math.min(at, events.length);
  const end = limit === Number.POSITIVE_INFINITY ? events.length : Math.max(start, Math.min(start + Math.max(0, limit), events.length));
  return { entries: events.slice(start, end), total: events.length };
}

/**
 * A source over a run this host already holds, which is what the demonstration reads.
 *
 * It is a stand-in for a volume and not a second model of one: it answers the same contract from a run that was parsed
 * here, so a deployment replaces it with a source that reads its own store and nothing above this file changes. A
 * project it holds no run for is refused, because an empty window and a project that does not exist are two things and
 * a reader that drew them the same way would hide a project that never loaded.
 */
export function heldSource(eventsOf: (project: string) => Entry[] | undefined): RunSource {
  return {
    window: async (project, from, limit) => {
      const events = eventsOf(project);
      if (!events) throw new Error(`no run is held for ${project}, so there is no window to read`);
      return windowOf(events, from, limit);
    },
  };
}
