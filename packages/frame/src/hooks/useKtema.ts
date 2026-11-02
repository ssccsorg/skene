import { useEffect, useMemo } from 'react';
import { keyOf } from '../lib/address';
import { useRecords, volumeOf } from '../stores/records';
import { source, useScenario } from '../stores/scenario';
import { useSelection } from '../stores/selection';
import { useVolume } from './useVolume';
import { useWebSocket } from './useWebSocket';

// The dashboard's one load: the board, the stream, and what happens when there is no stream.
//
// The stream is the record source and the clock. A host that has one sees the run arrive; a host that
// does not still shows the run, read from the project's own file, and the header says which of the
// two it is looking at rather than passing one off as the other.

const REPLAY_MS = 130;

export interface Frame {
  /** The project the address names, or null for the board's own first one. */
  project: string | null;
  /** How many records a frame named in the address asks for, or null for the whole run. */
  at: number | null;
  /** How fast the run arrives, or null for the whole run at once. Only a frame names a pace. */
  pace: number | null;
  /** The record a frame names as picked, by the reader's key, so an envelope is reproducible too. */
  pick: string | null;
}

export function frameFromQuery(search: string): Frame {
  const params = new URLSearchParams(search);
  const at = params.get('at');
  const pace = params.get('pace');
  const integer = at !== null && at !== '' ? Number(at) : Number.NaN;
  return {
    project: params.get('project') || null,
    at: Number.isInteger(integer) ? integer : null,
    pace: pace && Number(pace) > 0 ? Number(pace) : null,
    pick: params.get('pick') || null,
  };
}

export function useKtema(): Frame {
  const search = typeof window === 'undefined' ? '' : window.location.search;
  const frame = useMemo(() => frameFromQuery(search), [search]);

  const status = useScenario((state) => state.status);
  const projectId = useScenario((state) => state.projectId);
  const opened = useScenario((state) => state.opened);
  const model = useScenario((state) => state.model);
  const load = useScenario((state) => state.load);

  const push = useRecords((state) => state.push);
  const pushAll = useRecords((state) => state.pushAll);
  const reset = useRecords((state) => state.reset);
  const setStream = useRecords((state) => state.setStream);
  const setSource = useRecords((state) => state.setSource);
  const seek = useRecords((state) => state.seek);
  const setFollowing = useRecords((state) => state.setFollowing);
  const setFocus = useRecords((state) => state.setFocus);
  const advance = useRecords((state) => state.advance);
  const playing = useVolume().playing;
  const stream = useVolume().stream;
  // A volume is read here rather than streamed, so this window opens no socket for it.
  const volume = Boolean(import.meta.env.VITE_RECORDS);

  useEffect(() => {
    void load('./', frame.project);
  }, [load, frame.project]);

  // The frame reads one project's run, which is the one whose volume the transport and the panels walk. Which
  // project that is belongs to the space and not to this store, so it is told rather than derived here.
  useEffect(() => {
    setFocus(projectId);
  }, [projectId, setFocus]);

  // Every open project's run arrives on its own socket. A project the pilot is not walking still has its newest
  // state drawn on the board, so closing its feed because it is not focused would freeze its marks.
  useWebSocket(opened, {
    // A project opens at its latest state. The run arrives whole rather than a record at a time, so
    // switching to a project lands on the end instead of replaying it, and a frame that wants to watch
    // the run arrive is one that names a pace in its address.
    pace: frame.pace ?? 0,
    at: frame.at ?? undefined,
    enabled: status === 'ready' && !volume,
    // A socket replays its project's run from the start, so the volume it fills is emptied first: a project
    // opened again is a new reading of it and not a second copy of the same records.
    onOpen: reset,
    onRecord: push,
    onRecords: pushAll,
    onState: (project, state, detail) => {
      setStream(project, state, detail);
      if (state === 'live') setSource(project, 'stream');
      // A refused source is one there is nothing to rest on, so the cursor stops being the feed's. The normal
      // end of a run is not: the run arrived whole and the cursor is already on its last record, which is the
      // Latest state and reads as it. Taking the cursor off the feed there would leave the transport saying the
      // pilot had left the end while they were standing on it. It is only the walked project's cursor that is
      // the pilot's, so a refusal on another project's socket is that project's own reading and not this one's.
      if (state === 'error' && project === projectId) setFollowing(false);
    },
  });

  // No stream is not no dashboard. The fallback reads the same run the engine runs and puts the cursor
  // where the feed would have left it. It arrives whole rather than a record at a time, because nothing here
  // plays itself: a run that animated in would be the autoplay this screen does not do.
  //
  // It reads the run through the source rather than out of the parse it happens to hold, so where a run comes from is
  // one thing for both paths: a deployment that reads a volume runs this same code. What it asks for is the run whole,
  // because nothing here is drawn against a window yet, and the length the run reports is what a named frame is clamped
  // to: a frame names a place in the run and not a place in what has been read of it.
  useEffect(() => {
    if (status !== 'ready' || !model || !projectId) return undefined;
    if (!volume && stream !== 'error' && stream !== 'closed') return undefined;
    if (volumeOf(projectId).received.length > 0) return undefined;

    setSource(projectId, 'local');
    let gone = false;
    void source.window(projectId, 0, Number.POSITIVE_INFINITY).then(
      (run) => {
        if (gone) return;
        pushAll(projectId, run.entries);
        // A named frame stands still on its own length; an unnamed one rests on the whole run.
        if (frame.at === null) setFollowing(true);
        else seek(Math.min(frame.at, run.total));
      },
      // A run that cannot be read is said in the header, where the other readings of the feed are, rather than thrown
      // at a person as a crash.
      (error: unknown) => {
        if (!gone) setStream(projectId, 'error', error instanceof Error ? error.message : String(error));
      },
    );
    return () => {
      gone = true;
    };
  }, [status, model, projectId, stream, frame.at, pushAll, seek, setSource, setStream, setFollowing, volume]);

  // A frame can name the record it picked, so an envelope is as reproducible as a figure: the pick is
  // applied when the record it names has arrived, and only when nothing has been picked by hand.
  const count = useVolume().received.length;
  useEffect(() => {
    if (!frame.pick || useSelection.getState().selected || !projectId) return;
    const hit = volumeOf(projectId).received.find((entry) => keyOf(entry) === frame.pick);
    if (hit) useSelection.getState().select(hit);
  }, [frame.pick, count, projectId]);

  // Playback is the one clock this dashboard has, and it is the person's: nothing starts it but the
  // play button. A record at a time, at the pace a person can read rather than the pace the feed was
  // read at, because the run it replays has already arrived whole.
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(advance, REPLAY_MS);
    return () => clearInterval(timer);
  }, [playing, advance]);

  return frame;
}
