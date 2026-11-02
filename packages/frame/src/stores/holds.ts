import { create } from 'zustand';
import type { Lower } from '../lib/channel';

// What the room answered about the paths under the space's members, and which of them are open.
//
// What a member holds is the room's answer and not the frame's, so it arrives asynchronously and is read twice: the
// Members panel walks it as a tree, and the board draws it at the member's own place in the space. One answer read by
// two surfaces is what keeps them from disagreeing about what a member holds, which is why it is held here rather
// than in whichever surface asked first.
//
// A path is the room's own address for the thing (`a/b/c`), and the open set is what turns the tree from a list into
// something walked: a level is drawn because its parent is open, so closing a folder closes everything under it.
// Nothing here is persisted, because which folders a pilot had open is a reading of one room and a room is not the
// same one next time.

interface HoldsState {
  /** What the room answered about a path, by path. */
  rows: Record<string, Lower[]>;
  /** Why a path could not be read, by path: a sentence rather than an absence. */
  why: Record<string, string>;
  /** The paths that have been asked, so a level drawn every frame is asked once. */
  asked: Record<string, true>;
  /** The paths that are open, which is what a level being drawn is read from. */
  open: string[];
  /**
   * Record the room's answer about a path.
   *
   * A null answer with no reason is a path claimed while its own answer is in flight, which is what stops a level
   * from being asked once a frame.
   */
  answered: (path: string, rows: Lower[] | null, why?: string | null) => void;
  /** Open a path, or close it and everything under it. */
  toggle: (path: string) => void;
  /** Forget every answer, which another project's room makes necessary. */
  clear: () => void;
}

export const useHoldStore = create<HoldsState>((set) => ({
  rows: {},
  why: {},
  asked: {},
  open: [],

  answered: (path, rows, why = null) =>
    set((state) => ({
      asked: { ...state.asked, [path]: true },
      rows: rows ? { ...state.rows, [path]: rows } : state.rows,
      why: why ? { ...state.why, [path]: why } : state.why,
    })),

  // Closing a folder closes what it holds, because a level stands on its parent being open: leaving the children in
  // the open set would leave them drawn with no mark to have opened.
  toggle: (path) =>
    set((state) => ({
      open: state.open.includes(path)
        ? state.open.filter((each) => each !== path && !each.startsWith(`${path}/`))
        : [...state.open, path],
    })),

  clear: () => set({ rows: {}, why: {}, asked: {}, open: [] }),
}));
