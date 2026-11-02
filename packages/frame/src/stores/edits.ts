import { create } from 'zustand';

// What the pilot has changed in the space, and the point the change is applied from.
//
// A change is not a rewrite of the space. The place is the space's own declaration and the record is what
// the run did; what a pilot changes is a continuation of that run, which is why a change carries the record
// it is applied after. Everything up to that point stands as the record wrote it, and from there the space
// is the pilot's, which is the same shape as a branch and is drawn as one.
//
// The point defaults to the end of the run, because the ordinary thing a person does is change something
// and watch it take effect: the change is applied from the newest record, and the run before it is still
// there to look at by winding the transport back.

/** One thing a pilot changed about one unit. A field left null is a field the pilot left alone. */
export interface Change {
  unit: string;
  /** Where the unit stands now, in the place's own coordinates. */
  at: [number, number] | null;
  /** What the unit can be asked to do now. */
  abilities: string[] | null;
}

interface EditsState {
  changes: Change[];
  /** The record the changes are applied after, or null while they are applied from the end of the run. */
  fork: number | null;
  /** Save a unit's change, replacing any earlier change to the same unit. */
  set: (change: Change) => void;
  /** Take a unit's change back, so the record has it again. */
  drop: (unit: string) => void;
  /** Take the branch from a record rather than from the end of the run. */
  branchAt: (after: number | null) => void;
  /** Forget every change. */
  clear: () => void;
}

export const useEdits = create<EditsState>((set) => ({
  changes: [],
  fork: null,
  set: (change) =>
    set((state) => {
      const existing = state.changes.find((entry) => entry.unit === change.unit);
      const rest = state.changes.filter((entry) => entry.unit !== change.unit);
      // A field the caller left null is a field they did not touch, so the change already saved for this
      // unit keeps it: a text that moves a unit and a form that gives it abilities are the same change.
      const merged: Change = {
        unit: change.unit,
        at: change.at ?? existing?.at ?? null,
        abilities: change.abilities ?? existing?.abilities ?? null,
      };
      const empty = !merged.at && !merged.abilities;
      return { changes: empty ? rest : [...rest, merged] };
    }),
  drop: (unit) => set((state) => ({ changes: state.changes.filter((entry) => entry.unit !== unit) })),
  branchAt: (fork) => set({ fork }),
  clear: () => set({ changes: [], fork: null }),
}));
