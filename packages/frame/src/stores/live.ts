import { create } from 'zustand';
import type { Progress } from '../lib/channel';
import { statesOf } from '@ssccsorg/skene-kernel';

// The positions the room's devices have stated, by project and unit.
//
// A stack project's board is the place's until a turn says otherwise, so this holds only what
// a device has reported and never a default. The reading is per project because two projects
// may stand a unit under one name and a position from one is not a position in the other.

export const NO_STATES: Record<string, [number, number]> = {};

interface LiveState {
  /** The project the held positions belong to. */
  project: string | null;
  states: Record<string, [number, number]>;
  /** Read the state lines out of a turn's reports, which is the only place a device states one. */
  apply: (project: string, progress: Progress) => void;
  /** Forget a project's positions, which is what opening another one is. */
  reset: (project: string) => void;
}

export const useLive = create<LiveState>((set) => ({
  project: null,
  states: NO_STATES,

  apply: (project, progress) => {
    let found: Record<string, [number, number]> = {};
    for (const message of progress.messages) {
      if (message.role !== 'assistant') continue;
      found = { ...found, ...statesOf(message.content) };
    }
    if (!Object.keys(found).length) return;
    set((state) => ({
      project,
      states: state.project === project ? { ...state.states, ...found } : found,
    }));
  },

  reset: (project) => set({ project, states: NO_STATES }),
}));
