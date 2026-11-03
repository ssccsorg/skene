import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { writerOf } from '../lib/world';
import { storageName } from '../lib/persist';
import type { Entry } from '@ssccsorg/skene-kernel';

// What is picked, and how the space is being shown.
//
// A record picked in the stream, on the board or on the plan is the same choice as the entity that
// wrote it, so one pick is one state: `unit` is the entity and `selected` is the record, whichever of the
// two a surface names. Clicking an entity picks its last record and clicking a record picks its writer,
// so the rail, the plan, the board and the console cannot end up pointing at two different things. The
// view itself is the router's, because a view is a place in an address and a choice is state.
//
// The other half of this store is the arrangement of the frame's panels, which is held here because the same
// arrangement is pressed from three places and two names for it would part the way the pick would. It is held as one
// map keyed by the panels' own names rather than as a field a panel, so that this store knows no panel: the register
// in `lib/panels.ts` is the list, and a panel added there is a panel this arranges without being told it exists.
//
// What the pilot has said about the panels travels between visits and the rest of this store does not. Which panels
// are out and which way the account reads are the pilot's arrangement of the frame, and a pilot who arranged it should
// not have to arrange it again; the pick, the look and the fold's memory are about the run on screen, and a run is not
// the same one after a reload. A project that declares an arrangement still stands over what was kept, because the
// declaration is applied over the pilot's and a panel the project says nothing about keeps the place it was left in.

interface SelectionState {
  selected: Entry | null;
  /** The entity the pick lands on: the unit that was picked, or the writer of the record that was. */
  unit: string | null;
  /**
   * What the pilot has said about each panel: out or away, keyed by the panel's own name.
   *
   * A panel nobody has spoken about is not here, and what it is then is its own answer rather than this store's. That is
   * what keeps the store from having to know what the panels are, and it is why the map is allowed to be short.
   */
  open: Record<string, boolean>;
  /**
   * The panel the pilot last brought forward, which is the one a frame with room for one panel draws.
   *
   * A frame wide enough for its panels draws every one that is out, and there is nothing to decide between them. A
   * frame with room for one cannot draw them all, and which of them it draws is the pilot's own last press rather than
   * the order the register happens to hold them in: a press is a request to see a panel, and the second press that
   * asked for the console did not ask for the rail a second time. It is null when nothing has been brought forward, and
   * then the first panel that is out stands instead, which is the frame's own answer for a project that opened one.
   */
  front: string | null;
  /**
   * The reading the frame was last drawn as, which is where a window comes back to.
   *
   * An address names a reading, so a reload of one lands where it says and this is only what answers an address that
   * names none: the window a pilot opens from the dock, which has no address of its own. It is held by the reading's key
   * and not by its path, so a reading moved to another address is the same reading and comes back as the one it is.
   */
  reading: string | null;
  /**
   * What every panel was before they were all put away, and null when the surface is the pilot's own.
   *
   * Putting the whole frame away so the view has the layout is one press, and one press has to be undoable: what it
   * undoes to is the arrangement the pilot had and not a default one, because a cockpit that puts its panels back
   * somewhere else has not undone anything. The memory is also the flag, so there is no second name that can disagree
   * with it. Any one panel put away on its own clears it, because from then on the arrangement is the pilot's again.
   */
  beforeAll: Record<string, boolean> | null;
  /** Which way the account reads: newest first is the way back through the run. */
  order: 'newest' | 'oldest';
  /**
   * How far the frame's bottom edge reaches.
   *
   * `inset` is the bar standing between the two columns, so the columns run the height of the frame. `full` is the bar
   * taking the whole bottom and the columns standing above it, which gives the strip a run the width of the window and
   * takes that height from the columns. It is one answer for the frame and not one per project, because it is about how
   * the pilot reads the frame rather than about what the project is.
   */
  bottom: 'inset' | 'full';
  /**
   * The edge whose hidden panels are being looked at, or null.
   *
   * An edge that is put away shows nothing, so the way back is the pointer: resting it on the edge brings that edge's
   * panels out over the space while it stays there. This is a look and not an answer: the arrangement is unchanged, and
   * moving the pointer away puts the edge back the way the pilot left it.
   */
  peek: 'left' | 'right' | 'bottom' | null;
  /**
   * Whether the frame's bottom edge is drawn.
   *
   * The edge is a region and not one panel: the campaigns, the transport, the scene and the trace stand there together,
   * and a pilot reading the board wants all of them or none. Its own header stays while the rest is away, so the press
   * that put it away is the press that brings it back.
   */
  bar: boolean;
  /**
   * How many picks have been made.
   *
   * The board looks at the unit it has been handed when the pick arrives, and a pick of the unit already picked is a
   * second look at it: what changes is not the pick but the look. It is a count rather than a flag because what it says
   * is that a thing happened and not what is true, and the press that needs it is a control held on the frame's edge,
   * where a window or a mark the pilot has turned away from is reached by pressing it and nothing about the pick
   * changes when they do.
   */
  look: number;
  /**
   * The member whose ground is being placed, or null while no place is being edited.
   *
   * A move is a context of its own rather than a gesture on the mark: the board's own press is a pick and a drag on it is
   * the space being turned, so a place a member is moved to is chosen on a plane that has nothing else to do. The member is
   * named here and the plane is drawn where the frame gathers the place, so the context is one state and not a window that
   * holds a copy of the space.
   */
  moving: string | null;
  select: (entry: Entry | null) => void;
  selectUnit: (unit: string, entry: Entry | null) => void;
  setMoving: (unit: string | null) => void;
  /** Say whether a panel is out, which is the press its own control makes. */
  setOpen: (key: string, open: boolean) => void;
  /** Put every panel away, remembering the arrangement that stood, which is what makes the press undoable. */
  foldAll: (standing: Record<string, boolean>) => void;
  /** Give back the arrangement the last fold put away. */
  restore: () => void;
  /** Say which reading is in force, which is every address that names one. */
  remember: (key: string) => void;
  /** Come up in the arrangement a project declares, panel by panel. */
  arrange: (open: Record<string, boolean>) => void;
  setOrder: (order: 'newest' | 'oldest') => void;
  setBottom: (bottom: 'inset' | 'full') => void;
  setBar: (bar: boolean) => void;
  setPeek: (peek: 'left' | 'right' | 'bottom' | null) => void;
}

/**
 * Whether two arrangements say the same thing.
 *
 * A project's declaration is applied from an effect, and an arrangement written again that says what already stands is a
 * no-op rather than a new map: the map is what the panels are read from, so a write that changed nothing would notify
 * every reader of it and, from an effect, would notify itself.
 */
function same(left: Record<string, boolean>, right: Record<string, boolean>): boolean {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key]);
}

export const useSelection = create<SelectionState>()(
  persist(
    (set) => ({
      selected: null,
      unit: null,
      // Nothing has been said about any panel yet: the frame comes up in each panel's own answer, and a project that
      // declares an arrangement is arranged when it is opened.
      open: {},
      beforeAll: null,
      front: null,
      reading: null,
      order: 'newest',
      bottom: 'inset',
      bar: true,
      peek: null,
      look: 0,
      moving: null,
      select: (selected) =>
        set((state) => ({
          selected,
          unit: selected ? writerOf(selected) || null : null,
          look: state.look + 1,
        })),
      selectUnit: (unit, selected) => set((state) => ({ unit, selected, look: state.look + 1 })),
      setMoving: (moving) => set({ moving }),
      setOpen: (key, open) =>
        set((state) => ({
          open: { ...state.open, [key]: open },
          // Bringing a panel forward is what opening one means when the frame has room for one: a panel put away stops
          // being what is drawn, and one put away that was not the front panel leaves the front where it was.
          front: open ? key : state.front === key ? null : state.front,
          beforeAll: null,
        })),
      foldAll: (standing) =>
        set({
          beforeAll: standing,
          open: Object.fromEntries(Object.keys(standing).map((key) => [key, false])),
          front: null,
        }),
      restore: () =>
        set((state) => (state.beforeAll ? { open: state.beforeAll, beforeAll: null } : {})),
      // What a project declares, applied over the arrangement that stands: a panel the project says nothing about keeps the
      // place the pilot left it in, so the console stands open across projects until the pilot or a project closes it. A
      // project that declares nothing changes nothing, and the frame comes up where each panel says it starts.
      arrange: (declared) =>
        set((state) => {
          const open = { ...state.open, ...declared };
          // A project that opens a panel is asking for it, so the last one it names is brought forward: a declaration
          // that opens the console is a project whose work is the console, and a frame with room for one panel would
          // otherwise draw nothing while the bar said a panel was out.
          //
          // The guard is about the write and not about the declaration. What is read from this store travels between
          // visits and what is brought forward does not, so on the second visit the map already says what the project
          // declares and the guard would return before the panel was brought forward: the declaration is applied and
          // the frame comes up with nothing up, which is the one case this whole field exists for.
          const named = Object.keys(declared).filter((key) => declared[key]);
          const front = named.at(-1) ?? state.front;
          if (same(state.open, open) && front === state.front) return {};
          return { open, front, beforeAll: null };
        }),
      setOrder: (order) => set({ order }),
      setBottom: (bottom) => set({ bottom }),
      setBar: (bar) => set({ bar }),
      setPeek: (peek) => set({ peek }),
      // A reading that is already the one in force is not a write: this is called from an effect on every address, and a
      // write that changed nothing would notify every reader of the store on every render.
      remember: (key) => set((state) => (state.reading === key ? {} : { reading: key })),
    }),
    {
      name: storageName('arrangement'),
      // What the pilot said about the frame and where it was left: the pick and the look name a moment in a run that a
      // reload does not carry, and the fold's memory is the arrangement that stood before one press, which the press
      // itself must not outlive.
      partialize: (state) => ({
        open: state.open,
        order: state.order,
        front: state.front,
        reading: state.reading,
        bottom: state.bottom,
        bar: state.bar,
      }),
    },
  ),
);
