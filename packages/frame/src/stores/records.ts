import { create } from 'zustand';
import type { StreamState } from '../lib/record-client';
import type { Entry } from '@ssccsorg/skene-kernel';

// The records a project's own blackboard has delivered, and how far the pilot has walked them.
//
// A blackboard is local to a project. Each one has its own volume, its own cursor and its own feed, and there is
// no volume that spans projects: a record written in one space is not a record of another, and nothing here
// merges two of them. What spans projects is the space they are drawn in, which is a reading of the shell rather
// than of any record.
//
// The feed and the view are two numbers on purpose. `received` is what a deployment would have read out of the
// volume, and `shown` is how far the person has let it play; a volume that is not following keeps receiving and
// stops showing, so coming back to the newest does not have to replay what it missed. What the picture draws
// from is what actually arrived, which is what makes the stream load-bearing rather than decorative.
//
// One of the open projects is the one the frame reads, and the transport and the panels walk that one. The
// others keep arriving at their own end, because a project the pilot is not walking is still a project whose
// run is being written, and what the space draws of it is its newest state.

export type Source = 'stream' | 'local' | 'idle';

/** One project's own blackboard, as the frame reads it. */
export interface Volume {
  received: Entry[];
  shown: number;
  stream: StreamState;
  detail: string | null;
  source: Source;
  /** Whether the cursor rests on the newest record and moves with the feed. */
  following: boolean;
  /** Whether the cursor is being walked forward a record at a time. Never begins on its own. */
  playing: boolean;
}

/** A project with no volume yet reads as an empty one, so a panel drawn a frame early is not a crash. */
export const EMPTY: Volume = {
  received: [],
  shown: 0,
  stream: 'connecting',
  detail: null,
  source: 'idle',
  following: true,
  playing: false,
};

interface RecordsState {
  /** One volume per project, keyed by the project's own address. */
  volumes: Record<string, Volume>;
  /** The project whose volume the frame reads and walks, which is the one the space has focused. */
  focus: string | null;
  setFocus: (project: string | null) => void;
  push: (project: string, record: Entry) => void;
  /** Append a burst as one change, so a replay that arrives whole is drawn at its end rather than record by record. */
  pushAll: (project: string, records: Entry[]) => void;
  reset: (project: string) => void;
  /** Move the focused volume's cursor. Seeking is leaving the feed, so it stops following and playback. */
  seek: (shown: number) => void;
  setFollowing: (following: boolean) => void;
  play: () => void;
  pause: () => void;
  /** One step of playback. It hands back to the feed when it reaches the last record. */
  advance: () => void;
  setStream: (project: string, state: StreamState, detail?: string | null) => void;
  setSource: (project: string, source: Source) => void;
}

/** A volume as it stands, or the empty one: reading a project the frame has not heard from is not an error. */
export const volumeOf = (project: string | null): Volume =>
  (project ? useRecords.getState().volumes[project] : null) ?? EMPTY;

export const useRecords = create<RecordsState>((set, get) => {
  /**
   * The focused volume, changed: the actions a person takes are about the run on screen, so they name no project
   * and this is which one they mean. A frame with nothing focused has nothing to walk and nothing happens.
   */
  const change = (step: (volume: Volume) => Partial<Volume>) =>
    set((state) => {
      const here = state.focus ? state.volumes[state.focus] : null;
      if (!state.focus || !here) return {};
      return { volumes: { ...state.volumes, [state.focus]: { ...here, ...step(here) } } };
    });

  return {
    volumes: {},
    focus: null,

    setFocus: (project) => set({ focus: project }),

    push: (project, record) => get().pushAll(project, [record]),

    pushAll: (project, records) =>
      set((state) => {
        if (!records.length) return {};
        const here = state.volumes[project] ?? EMPTY;
        const received = [...here.received, ...records];
        // Playback is the person's, so records that arrive while it runs are received and not shown: the cursor would
        // otherwise jump to the end of the feed mid-replay. A following cursor moves once, to the end of the burst.
        const shown = here.following ? received.length : here.shown;
        return { volumes: { ...state.volumes, [project]: { ...here, received, shown } } };
      }),

    reset: (project) =>
      set((state) => ({ volumes: { ...state.volumes, [project]: { ...EMPTY } } })),

    seek: (shown) =>
      change((volume) => ({
        following: false,
        playing: false,
        shown: Math.max(0, Math.min(shown, volume.received.length)),
      })),

    setFollowing: (following) =>
      change((volume) => ({
        following,
        playing: following ? false : volume.playing,
        shown: following ? volume.received.length : volume.shown,
      })),

    // A run that has already reached its end plays again from the start, which is what a play button does;
    // one that has not plays on from where the cursor stands.
    play: () =>
      change((volume) => ({
        playing: true,
        following: false,
        shown: volume.shown >= volume.received.length ? 0 : volume.shown,
      })),

    pause: () => change(() => ({ playing: false })),

    advance: () =>
      change((volume) => {
        if (volume.shown >= volume.received.length) return { playing: false, following: true };
        const shown = volume.shown + 1;
        const done = shown >= volume.received.length;
        return { shown, playing: !done, following: done };
      }),

    setStream: (project, stream, detail = null) =>
      set((state) => ({
        volumes: { ...state.volumes, [project]: { ...(state.volumes[project] ?? EMPTY), stream, detail } },
      })),

    setSource: (project, source) =>
      set((state) => ({
        volumes: { ...state.volumes, [project]: { ...(state.volumes[project] ?? EMPTY), source } },
      })),
  };
});
