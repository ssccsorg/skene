import { useEffect, useRef } from 'react';
import { RecordStream, streamUrl, type StreamState } from '../lib/record-client';
import type { Entry } from '../lib/types';

/**
 * How long a burst of records is held before it is handed over as one change.
 *
 * A socket replays a run as a message per record, and a store that showed each one would draw the run again from its
 * first scene every time a project opened. The delay is short enough that a live feed still reads as live and long
 * enough that a replay that arrives whole is one change at its end.
 */
const BURST_MS = 80;

/**
 * The record streams of the projects that are open, one socket apiece.
 *
 * A blackboard is per project, so a project that is standing open in the space is a run the space is drawing,
 * and it needs its own feed whether or not the frame is walking it: the marks on the board are the newest state
 * of an open project, and a newest state that stopped arriving is a picture of a run the pilot has left.
 *
 * The client is an object rather than state because a socket is not data: what the store holds is the records it
 * delivered, and each connection's own state is reported beside its own project's. The handlers are kept in a
 * ref so a re-render does not tear the sockets down and build them again, which would drop every record between
 * the two, and the list is compared as a string because the array is a new one on every render.
 */
export function useWebSocket(
  projects: string[],
  options: {
    pace?: number;
    at?: number;
    enabled?: boolean;
    /**
     * Called before a project's socket opens, which is where its volume is emptied.
     *
     * A feed replays a project's records from the start of its volume when it connects, so a volume that was
     * already holding them would take a second copy of the same run: opening a project again is a new reading of
     * it, and so is a socket that came back after a drop.
     */
    onOpen?: (project: string) => void;
    onRecord: (project: string, record: Entry) => void;
    /** A burst of records, when the caller can take one change instead of a callback per record. */
    onRecords?: (project: string, records: Entry[]) => void;
    onState: (project: string, state: StreamState, detail?: string) => void;
  },
): void {
  const handlers = useRef(options);
  handlers.current = options;
  // The sockets are held so a change of list can close exactly the ones that left, and so a re-render of
  // another kind cannot open a second socket for a project that already has one.
  const open = useRef(new Map<string, RecordStream>());
  // Records are held for a moment before they are handed over, one list per project. The timer is the burst's own, so
  // a run that arrives as a thousand messages is one change at its end rather than a thousand frames of its history.
  const held = useRef(new Map<string, { records: Entry[]; timer: ReturnType<typeof setTimeout> }>());
  // Compared as one string: the array itself is rebuilt on every render, and depending on it would reopen
  // every socket on every frame.
  const names = projects.join(',');

  const flush = (project: string) => {
    const burst = held.current.get(project);
    if (!burst) return;
    held.current.delete(project);
    const { onRecord, onRecords } = handlers.current;
    if (onRecords) onRecords(project, burst.records);
    else for (const record of burst.records) onRecord(project, record);
  };

  const take = (project: string, record: Entry) => {
    const burst = held.current.get(project);
    if (burst) {
      clearTimeout(burst.timer);
      burst.records.push(record);
      burst.timer = setTimeout(() => flush(project), BURST_MS);
      return;
    }
    held.current.set(project, {
      records: [record],
      timer: setTimeout(() => flush(project), BURST_MS),
    });
  };

  useEffect(() => {
    const wanted = new Set(names ? names.split(',') : []);
    if (options.enabled === false) wanted.clear();
    for (const [project, stream] of open.current) {
      if (wanted.has(project)) continue;
      stream.close();
      open.current.delete(project);
      flush(project);
    }
    for (const project of wanted) {
      if (open.current.has(project)) continue;
      handlers.current.onOpen?.(project);
      const stream = new RecordStream(streamUrl(project, options.pace, options.at), {
        onRecord: (record) => take(project, record),
        onState: (state, detail) => handlers.current.onState(project, state, detail),
      });
      stream.open();
      open.current.set(project, stream);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names, options.pace, options.at, options.enabled]);

  // A frame that goes away closes what it opened: a socket to a project nobody is looking at is a feed kept
  // alive for a window that is not there.
  useEffect(
    () => () => {
      for (const stream of open.current.values()) stream.close();
      open.current.clear();
      for (const burst of held.current.values()) clearTimeout(burst.timer);
      held.current.clear();
    },
    [],
  );
}
