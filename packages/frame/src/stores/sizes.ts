import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storageName } from '../lib/persist';

// How much of the frame each panel takes.
//
// A cockpit's frame is the pilot's, and how much of it a column takes is part of that: a wide record column
// and a narrow map is one way to work, and the reverse is another. So the measures are held here rather than
// written into the layout, and they are kept for the next visit because a pilot who has arranged the frame
// should not have to arrange it again.
//
//
// The rail is two panes and not one, so it is two measures: how wide the column is, and how much of it the
// declarations take with the record under them taking the rest. The queue is the sized one, because what a
// pilot makes room for is the work being declared, and the feed is what it is read against.
//
// Each one is clamped to what the panel has to be to be usable: a column narrower than its own name is a
// column nobody can read, and a transport shorter than its controls is a transport with no transport in it.
// The clamp is here and not at the handle, because the handle is not the only thing that can ask for a size.
//
// What is here is what a section may be, and not what is left over in the panel that holds it: how much room a
// section has is a question about the column, and the column is the thing that measures itself. So a drag that has to
// stop at another section's floor is clamped where both sections are drawn, and this file keeps only the section's own
// ends.

/**
 * What each panel and each section of a panel is measured by.
 *
 * Four of these are a panel's own measure and carry the key of the panel that takes them: a panel's place in the
 * arrangement and a panel's size are keyed by one name, which the register's own test holds. The rest are sections
 * inside a panel: the rail is two panes and the plan holds two.
 */
export const LIMITS = {
  rail: [220, 480],
  intents: [120, 720],
  console: [260, 640],
  plan: [300, 760],
  projects: [88, 480],
  timeline: [60, 420],
  // The transport as one row per writer, which has its own floor and its own size: a split reading and a merged one are
  // two views of the run, so dragging one taller says nothing about the other.
  timelineSplit: [60, 420],
} as const;

export type Panel = keyof typeof LIMITS;

/** A measure as it is allowed to stand: never past what the panel has to be, and never past what it may be. */
export function limit(panel: Panel, value: number): number {
  const [least, most] = LIMITS[panel];
  // A value that is not a number at all is a measure nobody took, so the panel stands at the least it may be
  // rather than at whatever the arithmetic produced.
  if (Number.isNaN(value)) return least;
  return Math.min(Math.max(Math.round(value), least), most);
}

const DEFAULTS: Record<Panel, number> = {
  rail: 300,
  intents: 424,
  console: 330,
  plan: 420,
  projects: 172,
  // The transport's floor: its own content, which `min-h-fit` holds it at, and the height it comes up at.
  timeline: 60,
  timelineSplit: 60,
};

/** The measures there are, which is `DEFAULTS`' own list rather than a second one written out beside it. */
const MEASURES = Object.keys(DEFAULTS) as Panel[];

interface SizesState extends Record<Panel, number> {
  set: (panel: Panel, value: number) => void;
  forget: () => void;
}

export const useSizes = create<SizesState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (panel, value) => set({ [panel]: limit(panel, value) }),
      forget: () => set({ ...DEFAULTS }),
    }),
    {
      name: storageName('sizes'),
      version: 1,
      // The transport's measure used to be a height the panel was given whole. It is now the pilot's from the panel's
      // own content upward, so a height kept from before that is larger than that content is room nobody asked for:
      // the one value this changes is that one, brought back to the floor.
      migrate: (state) => ({ ...(state as Record<Panel, number>), timeline: DEFAULTS.timeline }),
      // Only the measures travel: the actions are this module's, and a stored copy of them would be a stored copy
      // of a function. Which measures there are is `DEFAULTS`' own question, so it is asked rather than repeated.
      partialize: (state) => Object.fromEntries(MEASURES.map((panel) => [panel, state[panel]])),
    },
  ),
);
