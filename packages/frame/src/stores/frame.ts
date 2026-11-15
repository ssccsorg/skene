import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storageName } from '../lib/persist';

// What the frame shows of one project, kept by project.
//
// A project is a place, and a pilot who arranged one place has said nothing about another. The pane's arrangement and the
// reading in force are therefore two answers per project and not two answers for the cockpit: going from a space with a
// pane to one without and back returns the pane to the arrangement it had. A single answer would be a pane the pilot opens
// again on every visit, or one that stays open over a board it has no picture of.
//
// The pane is open by default where a project brings one. A picture of the space is not one the pilot has to switch on to
// find, and the default is the store's answer here rather than a panel's, so the frame and the pane's own controls read
// the same one.
//
// `last` is the open arrangement a press returns to. Closing the pane and opening it again should not also forget which
// arrangement the pilot chose.
//
// The orbit and the tone are not arrangements. They are how a map is drawn, so the map brings the controls for them and
// they are kept per project beside the arrangement.

export type Split = 'globe' | 'vertical' | 'horizontal' | 'full';

/** The arrangements that draw the sphere beside the pane, or the pane alone. */
export type OpenSplit = Exclude<Split, 'globe'>;

/** The map's own tone: the page's dark ground, or the ground as the tiles draw it. */
export type Tone = 'dark' | 'light';

/** The pane's own default where a project has not said otherwise: a project that brings a pane opens it beside the sphere. */
const PANE_ON: OpenSplit = 'vertical';

/**
 * The arrangement a sphere return comes back to.
 *
 * The last arrangement is where the pane opens again, and it may be the pane taking the whole frame. A sphere return must
 * not come back to that one, because it would hide the sphere it was pressed to show: the pane alone falls back to the
 * two-pane default, and a stacked pair comes back stacked.
 */
export function togetherOf(mode: Split): OpenSplit {
  return mode === 'horizontal' ? 'horizontal' : 'vertical';
}

interface FrameState {
  /** The pane's arrangement, by project. Absent means the default. */
  modes: Record<string, Split>;
  /** The reading in force, by project, as the address it is reached at. */
  paths: Record<string, string>;
  /** The arrangement a closed pane comes back to. */
  last: OpenSplit;
  /** Whether the map is drawn on the page's dark ground or on the tiles' own colour. */
  tone: Tone;
  /** Whether the map is read through the flat projection or on the earth, by project. */
  orbits: Record<string, boolean>;
  splitOf: (project: string | null) => Split;
  orbitOf: (project: string | null) => boolean;
  pathOf: (project: string | null) => string | null;
  setSplit: (project: string | null, mode: Split) => void;
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
      last: PANE_ON,
      tone: 'dark',
      orbits: {},

      // A state written before the orbit became a projection has the old value in `modes`; it is read as the flat
      // arrangement the pilot left and the projection it asks for.
      splitOf: (project) => {
        if (!project) return 'globe';
        const raw = get().modes[project] as Split | 'orbit' | undefined;
        return raw === 'orbit' ? get().last : raw ?? PANE_ON;
      },

      orbitOf: (project) => {
        if (!project) return false;
        const raw = get().modes[project] as Split | 'orbit' | undefined;
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

      reset: () => set({ modes: {}, paths: {}, last: PANE_ON, orbits: {} }),
    }),
    {
      name: storageName('frame'),
      version: 1,
      migrate: (persisted) => {
        const state = persisted as {
          modes?: Record<string, Split | 'orbit'>;
          paths?: Record<string, string>;
          last?: OpenSplit | 'orbit' | 'globe';
          tone?: Tone;
          orbits?: Record<string, boolean>;
        };
        const modes: Record<string, Split> = {};
        const orbits = { ...(state.orbits ?? {}) };
        for (const [id, mode] of Object.entries(state.modes ?? {})) {
          if (mode === 'orbit') {
            orbits[id] = true;
            modes[id] = state.last === 'horizontal' || state.last === 'full' ? state.last : PANE_ON;
          } else {
            modes[id] = mode;
          }
        }
        const last = state.last === 'horizontal' || state.last === 'full' ? state.last : PANE_ON;
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
