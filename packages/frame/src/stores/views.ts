import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Bearing } from '../lib/board';
import type { WindowKind } from '../lib/windows';
import { storageName } from '../lib/persist';

// The windows the space is carrying: the views the place declares (footage and maps), the places and editors the pilot
// has open, where they have put each one, and which of them is in front.
//
// A window is a thing's and not an entity's: an entity with two cameras has two windows, and a map and an editor are
// windows of the same model under their own kinds (`lib/windows`). Nothing here is keyed by an entity, and opening one
// is opening that thing.
//
// A window is a patch of the shell, so where it stands is a bearing and the store holds the offset from its own
// camera's origin rather than a place: an offset of nothing means the pilot has not moved it, and then its place is
// the clear one `lib/views.ts` computes for it. That is the whole of what a window keeps of its own. Everything else
// about it is read from the camera and from the space, which is why nothing here holds a name or a source.
//
// What the pilot has said is remembered across a reload: a size they dragged out, a place they dragged it to and
// whether they put it away are things a person said, and a person who says them expects to find them said. It is
// kept in the browser and keyed by the demonstration, and `reset` is what forgets it.
//
// The stack is kept, and it is the order both the pins and the pictures are read in: the patch's own `renderOrder` is
// the same number, so a press on a picture raises the picture under it rather than a control higher in the page.

export interface WindowView {
  /** The thing this window is the view of, which is also its name: one thing, one window. */
  id: string;
  /** What it shows, which is what the frame draws inside it and what its mark says. */
  kind: WindowKind;
  /** Where the pilot has put it, as a shift of its own origin's bearing, or null while they have not moved it. */
  offset: Bearing | null;
  /**
   * How large the pilot has made it, in cells of the graticule, or null while they have not sized it and it is the
   * camera's own. Cells and not pixels, so a window is the same window whatever frame it is drawn in, and it is kept
   * here rather than recomputed because a size the pilot gave is a thing they said and not a thing to work out again.
   */
  size: Bearing | null;
  /** Whether it is folded away, which is the picture gone and its pin left behind. */
  folded: boolean;
  /** Its place in the stack of the pins: the highest is in front. */
  z: number;
}

interface ViewsState {
  views: WindowView[];
  /** The highest place handed out so far, which the next raised pin takes. */
  top: number;
  /**
   * Which windows' own medium is running, as the pictures themselves report it.
   *
   * It is kept apart from what the pilot said, and it is not written to the browser with it: a place, a size and a fold
   * are things a person said and expects to find said again, and whether a medium is running this second is not
   * something anybody said. It is here rather than in the picture because the icon the frame draws for a window the pilot
   * cannot see is the only place it is read, and the picture is the only thing that knows.
   */
  running: Record<string, boolean>;
  /** Open a window, which is putting its patch on the shell. Media is the kind a window keeps when none is said. */
  open: (id: string, kind?: WindowKind) => void;
  close: (id: string) => void;
  /** Bring a window to the front, which is what a press on any part of it does. */
  raise: (id: string) => void;
  /** Put a window somewhere of its own, which is the pilot taking it off its origin. */
  move: (id: string, offset: Bearing) => void;
  /** Make a window the size the pilot dragged it to, in cells of the graticule. */
  resize: (id: string, size: Bearing) => void;
  /** Fold a window away, or bring it back. */
  fold: (id: string) => void;
  /** Say whether a window's own medium is running, which its own picture reports. */
  setRunning: (id: string, running: boolean) => void;
  /** Forget what the pilot did to every window, and what was remembered of it. */
  reset: () => void;
}

/**
 * The key what the pilot has said is remembered under. It is written by the store and cleared by `reset`, so it is
 * one reading read in two places rather than two strings that have to be kept in step.
 */
const PERSIST_KEY = storageName('windows');

export const useViews = create<ViewsState>()(
  persist(
    (set, get) => ({
      views: [],
      top: 0,
      running: {},

      open: (id, kind = 'media') => {
        const already = get().views.find((view) => view.id === id);
        // A camera that is open is a window that is somewhere: opening it again brings it to the front rather than
        // putting a second window on the shell. The place's declaration is still the answer to what the window is, so
        // a window kept from before its view had a kind is corrected here rather than left drawn as footage.
        if (already) {
          set((state) => ({
            views: state.views.map((view) =>
              view.id === id ? { ...view, kind, z: state.top + 1 } : view,
            ),
            top: state.top + 1,
          }));
          return;
        }
        set((state) => ({
          views: [...state.views, { id, kind, offset: null, size: null, folded: false, z: state.top + 1 }],
          top: state.top + 1,
        }));
      },

      close: (id) => set((state) => ({ views: state.views.filter((view) => view.id !== id) })),

      raise: (id) => {
        const views = get().views;
        const top = get().top;
        const view = views.find((each) => each.id === id);
        // A press on the pin already in front is not a change, so nothing is written and nothing re-renders.
        if (!view || view.z === top) return;
        set({ views: views.map((each) => (each.id === id ? { ...each, z: top + 1 } : each)), top: top + 1 });
      },

      move: (id, offset) =>
        set((state) => ({
          views: state.views.map((view) => (view.id === id ? { ...view, offset } : view)),
        })),

      resize: (id, size) =>
        set((state) => ({
          views: state.views.map((view) => (view.id === id ? { ...view, size } : view)),
        })),

      fold: (id) =>
        set((state) => ({
          views: state.views.map((view) => (view.id === id ? { ...view, folded: !view.folded } : view)),
        })),

      setRunning: (id, running) =>
        set((state) => (state.running[id] === running ? state : { running: { ...state.running, [id]: running } })),

      reset: () => {
        set({ views: [], top: 0, running: {} });
        // A page with no storage at all is one where nothing was remembered to forget.
        if (typeof localStorage !== 'undefined') localStorage.removeItem(PERSIST_KEY);
      },
    }),
    {
      name: PERSIST_KEY,
      // Only what the pilot said is kept: a window is a camera and everything else about it is read from the space,
      // so keeping more would be keeping a copy of something that has one home already.
      partialize: (state) => ({ views: state.views, top: state.top }),
    },
  ),
);
