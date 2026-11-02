import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SurfaceMode } from '../lib/surface';
import { storageName } from '../lib/persist';

// How the shell surface is filled, which is the pilot's viewing choice rather than the place's declaration.
//
// The place says which media it carries; this says how many of them the room shows and in what shape. It is one answer
// for the cockpit and not one per project, because it is a way of reading a room and the room changes under it: a pilot
// who put the surface into a grid on one project should find the grid when they open the next one, rather than having to
// say it again.
//
// The layout a pilot was reading is kept across an off. Turning the surface off is not a choice of layout, so a media item
// sent to the surface afterwards returns to the grid or the split it came from rather than to the default full frame.

interface SurfaceState {
  mode: SurfaceMode;
  /** The last layout the surface was left in, which is never `off`. */
  previous: SurfaceMode;
  setMode: (mode: SurfaceMode) => void;
  /** Turn the surface on where a media item is sent to it, in the layout it was left in. */
  activate: () => void;
}

export const useSurface = create<SurfaceState>()(
  persist(
    (set) => ({
      mode: 'single',
      previous: 'single',
      setMode: (mode) =>
        set((state) => ({
          mode,
          // Turning the surface off is the one change that keeps the layout behind it, because that layout is what a
          // forwarded media item has to come back to.
          previous: mode === 'off' ? (state.mode === 'off' ? state.previous : state.mode) : mode,
        })),
      activate: () => set((state) => (state.mode === 'off' ? { mode: state.previous } : state)),
    }),
    {
      name: storageName('surface'),
      partialize: (state) => ({ mode: state.mode, previous: state.previous }),
    },
  ),
);
