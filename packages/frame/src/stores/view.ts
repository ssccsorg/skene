import { create } from 'zustand';
import { FOV_MAX, FOV_MIN, LEVEL, type View } from '../lib/board';

// Where the pilot is facing and how much of the space they are taking in. It lives here rather than in the
// board because it is the pilot's and not the space's: the space does not move, and two views of the same
// board are two pilots looking at it.
//
// The pilot is at the centre of the shell and does not travel, which is the whole shape of this board:
// what is behind you is behind you, and turning is the only way to it. So the state is two angles and a
// field, and there is no position to hold in step with anything.
//
// The space opens fitted. Until the pilot takes the view into their own hands the field is recomputed
// whenever the space changes, so a project that arrives or a window that is resized is a space the pilot can
// still see all of; the first turn or zoom hands it over. The fitted field is the one thing here that
// depends on the space, which is why the board computes it and hands it in.

/** How far the pilot may look up or down, in radians. */
const PITCH_LIMIT = (72 * Math.PI) / 180;
/** The frame a drag is read against before the board has measured its own: a middle-sized window. */
const NOMINAL_HEIGHT = 760;

/**
 * The angle one pixel of a frame is worth at its middle. A frame spends its whole field on its own height
 * there, and across it spends the same angle on the same pixels, so a drag turns the view by the angle the
 * pointer travelled whichever way it went. It is read from the frame rather than fixed because one rate is
 * a drag that runs ahead of the pointer on a tall frame and behind it on a short one. Both readings of the
 * view are told where the pointer went, and a marker that does not keep up with the pointer is not a turn.
 */
export function perPixel(fov: number, height: number): number {
  const frame = height > 0 ? height : NOMINAL_HEIGHT;
  return (2 * Math.tan((fov * Math.PI) / 360)) / frame;
}
/** How much of a zoom a notch of the wheel is worth. */
const PER_NOTCH = 0.0016;
/**
 * How much wider the field goes at the middle of a turn to another project. The pilot pulls back, comes
 * round and settles, which is what moving to another place reads as where a cut would read as a picture.
 */
const TRAVEL_WIDE = 1.2;

interface ViewState extends View {
  /**
   * The board's own size, in pixels. It is the pilot's rather than the space's because it is the shape of
   * the frame the pilot is looking through, and the minimap needs it to paint the region the frame holds.
   */
  frame: [number, number];
  /** Whether the pilot has taken the view over: the fitted field stops following the space. */
  held: boolean;
  /**
   * How far the open project's own marks have come out of its group: nought at the start of a turn to it and
   * one once it has settled. It is the one number the entry motion is, and the board draws every member of
   * the project against it, so a place the pilot moved to unfolds rather than appears.
   */
  arrival: number;
  /** Record the frame's size, which the board measures and nothing else knows. */
  setFrame: (frame: [number, number]) => void;
  /**
   * Turn the view by a drag, with the space taken in the hand: the thing the pointer took hold of stays under
   * it. Across, that means the bearing comes round away from the way the pointer went, because the space moving
   * right is the pilot's own view moving left; back, the bearing rises, because the space dropping away below
   * is the pilot looking up. Both axes are the same rule and the same hand.
   *
   * There is one view and two surfaces read it, and they draw two different things. The board draws the space,
   * so the space follows the hand and this is handed the drag as it comes. The map draws the pilot's own
   * bearing as a marker, and a marker is the one thing on the map that is the pilot rather than the space, so
   * it is the map that hands its drag in negated. That is the whole of the difference between the two surfaces,
   * and it is a sign at one call site rather than a second turn. Measured on both surfaces, on both axes:
   * `target/drag4.mjs` drags each surface and reads which way what it holds moved.
   */
  turn: (dx: number, dy: number, per?: number) => void;
  /** Narrow or widen the frame, by a wheel's delta. */
  zoom: (delta: number) => void;
  /** Face a point of the space, so the thing the pilot picked is what they are looking at. */
  aim: (yaw: number, pitch: number) => void;
  /**
   * Take a view the space computed, which is where the pilot opens their eyes. It does not take the view
   * over: the space is still the space's, so a window that changes shape is fitted again.
   */
  fit: (view: View) => void;
  /**
   * Turn to a view rather than jumping to it, which is what choosing another project does: one patch of the
   * shell comes round to the middle and the others go round with it. The space turning to its own next patch
   * is the space's own, so this does not take the view over either.
   *
   * The place the pilot turns to opens as it arrives: the field pulls back at the middle of the turn and the
   * marks of the project they are reaching come out of the group they were summarised as, which is what makes
   * the turn a move between places rather than a swap of one picture for another.
   */
  spin: (view: View) => void;
  /** Hand the view back to the space: the fitted field follows the space again. */
  release: () => void;
}

const clampFov = (fov: number) => Math.min(Math.max(fov, FOV_MIN), FOV_MAX);

/** How long a turn to another patch takes. Long enough to read as a turn and short enough to sit through. */
const SPIN_MS = 520;

function wrap(yaw: number): number {
  const turn = Math.PI * 2;
  return ((yaw + Math.PI) % turn + turn) % turn - Math.PI;
}

/**
 * The view the space itself wants, and a counter of the writes that have happened since.
 *
 * The space asks for a view and the pilot asks for one, and they are not the same writer: the fitted view is
 * recomputed whenever the space changes, which during a run is many times, while a turn to another project is an
 * animation half a second long. Without one place to say which of them has the last word, a frame that fitted during a
 * turn left the frame holding the turn's target and not its own, which is a board drawn narrower than the space it is
 * of. So the wanted view is held here and a turn stops the moment it is no longer wanted.
 */
let wanted: View | null = null;
let generation = 0;

/** Whether the space is already asking for this view, in which case asking again is not a new turn. */
function isWanted(view: View): boolean {
  return (
    wanted !== null && wanted.yaw === view.yaw && wanted.pitch === view.pitch && wanted.fov === view.fov
  );
}

/** A pilot's own write. The view is theirs from here, so the space stops wanting one and a turn in flight is over. */
function handed(): void {
  wanted = null;
  generation += 1;
}

export const useView = create<ViewState>((set, get) => ({
  ...LEVEL,
  frame: [0, 0],
  held: false,
  arrival: 1,
  setFrame: (frame) =>
    set((state) => (state.frame[0] === frame[0] && state.frame[1] === frame[1] ? state : { frame })),
  turn: (dx, dy, per) => {
    handed();
    set((state) => {
      const rate = per ?? perPixel(state.fov, state.frame[1]);
      return {
        held: true,
        yaw: wrap(state.yaw - dx * rate),
        pitch: Math.min(Math.max(state.pitch + dy * rate, -PITCH_LIMIT), PITCH_LIMIT),
      };
    });
  },
  zoom: (delta) => {
    handed();
    set((state) => ({ held: true, fov: clampFov(state.fov * (1 + delta * PER_NOTCH)) }));
  },
  aim: (yaw, pitch) => {
    handed();
    set({
      held: true,
      arrival: 1,
      yaw: wrap(yaw),
      pitch: Math.min(Math.max(pitch, -PITCH_LIMIT), PITCH_LIMIT),
    });
  },
  fit: (view) => {
    // A space that keeps asking for the same view is one space and not a new instruction, so a board that measures
    // itself again or a run that delivers another record does not restart anything.
    if (isWanted(view)) return;
    wanted = view;
    generation += 1;
    set({ ...view, arrival: 1 });
  },
  spin: (view) => {
    if (isWanted(view)) return;
    wanted = view;
    const mine = (generation += 1);
    const from = { yaw: get().yaw, pitch: get().pitch, fov: get().fov };
    // The short way round: a patch is at a bearing, and a bearing is never more than half a turn away.
    const turn = wrap(view.yaw - from.yaw);
    if (typeof requestAnimationFrame !== 'function') {
      set({ ...view, arrival: 1 });
      return;
    }
    const wide = Math.min(FOV_MAX, Math.max(from.fov, view.fov) * TRAVEL_WIDE);
    const start = performance.now();
    const step = () => {
      // The space this turn was toward is not the space any more: a fit for a frame that changed shape, another turn,
      // or the pilot's own hand has written since. A turn that kept going would be the last word on a view nobody
      // asked for, which is how a project's own marks came to stand outside the frame they were fitted to.
      if (mine !== generation) return;
      const t = Math.min((performance.now() - start) / SPIN_MS, 1);
      // Eased in and out, so the turn settles rather than stopping dead on the patch.
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      // The pull back is a hump: it is nought at both ends of the turn and widest at the middle, so the
      // frame the pilot left and the frame they arrive at are the ones the space asked for.
      const hump = Math.sin(Math.PI * t);
      set({
        arrival: eased,
        yaw: wrap(from.yaw + turn * eased),
        pitch: from.pitch + (view.pitch - from.pitch) * eased,
        fov: from.fov + (view.fov - from.fov) * eased + (wide - from.fov) * hump,
      });
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },
  release: () => {
    handed();
    set({ held: false });
  },
}));
