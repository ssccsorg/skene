import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// What the frame shows of one project, kept by project.
//
// A project is a place, and a pilot who arranged one place has said nothing about another. The map's arrangement and the
// reading in force are therefore two answers per project and not two answers for the cockpit: going from a space with a
// map to one without and back returns the map to the arrangement it had. A single answer would be a map the pilot opens
// again on every visit, or one that stays open over a place with no ground.
//
// The map is open by default where a project has one. A place that declares a location is a place the map is a reading of,
// and a reading that is present is not one the pilot has to switch on to find. The default is the store's answer here and
// not the panel's, so the frame and the map's own controls read the same one.
//
// `last` is the open arrangement a press returns to. Closing the map and opening it again should not also forget which
// arrangement the pilot chose.
//
// The orbit is not an arrangement. It is the projection the map is read through, so it stands beside the arrangement and
// both are kept per project: pressing the orbit changes how the map is drawn and not how much of the frame it takes.

export type MapSplit = 'globe' | 'vertical' | 'horizontal' | 'full';

/** The arrangements that draw the sphere beside the map, or the map alone. */
export type OpenSplit = Exclude<MapSplit, 'globe'>;

/** The map's own tone: the page's dark ground, or the ground as the tiles draw it. */
export type MapTone = 'dark' | 'light';

/** The map's own default where a project has not said otherwise: a place with a ground opens beside the globe. */
const MAP_ON: OpenSplit = 'vertical';

/**
 * The arrangement a sphere return comes back to.
 *
 * The last arrangement is where the map pane opens again, and it may be the map taking the whole frame. A sphere return
 * must not come back to that one, because it would hide the sphere it was pressed to show: the map alone falls back to
 * the two-pane default, and a stacked pair comes back stacked.
 */
export function togetherOf(mode: MapSplit): OpenSplit {
  return mode === 'horizontal' ? 'horizontal' : 'vertical';
}

interface FrameState {
  /** The map's arrangement, by project. Absent means the default. */
  modes: Record<string, MapSplit>;
  /** The reading in force, by project, as the address it is reached at. */
  paths: Record<string, string>;
  /** The arrangement a closed pane comes back to. */
  last: OpenSplit;
  /** Whether the map is drawn on the page's dark ground or on the tiles' own colour. */
  tone: MapTone;
  /** Whether the map is read through the flat projection or on the earth, by project. */
  orbits: Record<string, boolean>;
  splitOf: (project: string | null) => MapSplit;
  orbitOf: (project: string | null) => boolean;
  pathOf: (project: string | null) => string | null;
  setSplit: (project: string | null, mode: MapSplit) => void;
  toggle: (project: string | null) => void;
  /** Switch the flat map and the orbit between the page's dark ground and the tiles' own colour. */
  toggleTone: () => void;
  /** Switch the map's projection without changing how much of the frame it takes. */
  toggleOrbit: (project: string | null) => void;
  /** Bring the sphere back from the map alone. */
  returnToTogether: (project: string | null) => void;
  rememberPath: (project: string | null, path: string) => void;
  /** Forget every project's arrangement, which is what a reset of the frame is. */
  reset: () => void;
}

export const useFrame = create<FrameState>()(
  persist(
    (set, get) => ({
      modes: {},
      paths: {},
      last: MAP_ON,
      tone: 'dark',
      orbits: {},

      // A state written before the orbit became a projection has the old value in `modes`; it is read as the flat
      // arrangement the pilot left and the projection it asks for.
      splitOf: (project) => {
        if (!project) return 'globe';
        const raw = get().modes[project] as MapSplit | 'orbit' | undefined;
        return raw === 'orbit' ? get().last : raw ?? MAP_ON;
      },

      orbitOf: (project) => {
        if (!project) return false;
        const raw = get().modes[project] as MapSplit | 'orbit' | undefined;
        return get().orbits[project] ?? raw === 'orbit';
      },

      pathOf: (project) => (project ? (get().paths[project] ?? null) : null),

      setSplit: (project, mode) => {
        if (!project) return;
        set((state) => ({
          modes: { ...state.modes, [project]: mode },
          last: mode === 'globe' ? state.last : mode,
        }));
      },

      toggle: (project) => {
        const mode = get().splitOf(project);
        get().setSplit(project, mode === 'globe' ? get().last : 'globe');
      },

      toggleTone: () => set((state) => ({ tone: state.tone === 'dark' ? 'light' : 'dark' })),

      toggleOrbit: (project) => {
        if (!project) return;
        const orbit = !get().orbitOf(project);
        set((state) => ({ orbits: { ...state.orbits, [project]: orbit } }));
      },

      returnToTogether: (project) => {
        if (get().splitOf(project) !== 'full') return;
        get().setSplit(project, togetherOf(get().last));
      },

      rememberPath: (project, path) => {
        if (!project) return;
        if (get().paths[project] === path) return;
        set((state) => ({ paths: { ...state.paths, [project]: path } }));
      },

      reset: () => set({ modes: {}, paths: {}, last: MAP_ON, orbits: {} }),
    }),
    {
      name: 'exaspec.frame',
      version: 1,
      migrate: (persisted) => {
        const state = persisted as {
          modes?: Record<string, MapSplit | 'orbit'>;
          paths?: Record<string, string>;
          last?: OpenSplit | 'orbit' | 'globe';
          tone?: MapTone;
          orbits?: Record<string, boolean>;
        };
        const modes: Record<string, MapSplit> = {};
        const orbits = { ...(state.orbits ?? {}) };
        for (const [id, mode] of Object.entries(state.modes ?? {})) {
          if (mode === 'orbit') {
            orbits[id] = true;
            modes[id] = state.last === 'horizontal' || state.last === 'full' ? state.last : MAP_ON;
          } else {
            modes[id] = mode;
          }
        }
        const last = state.last === 'horizontal' || state.last === 'full' ? state.last : MAP_ON;
        return { ...state, modes, orbits, last, tone: state.tone === 'light' ? 'light' : 'dark' } as unknown as FrameState;
      },
      partialize: (state) => ({
        modes: state.modes,
        paths: state.paths,
        last: state.last,
        tone: state.tone,
        orbits: state.orbits,
      }),
    },
  ),
);
