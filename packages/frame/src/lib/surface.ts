// The media a shell surface shows, and how it lays them out.
//
// A surface is the whole inside of the sphere, so its media are not windows: they are one picture covering the room. The
// layouts are presets over that one picture, which is what keeps a view consistent when the count changes: one medium
// fills the surface, two stand side by side, and a grid is a two-by-two of up to four. A grid with three media leaves its
// fourth cell dark rather than stretching one feed over the surface.
//
// The observer is the entity whose media the surface is read through. A drone, a satellite, or a patrol ship carries its
// own cameras, and the surface is then that entity's view rather than the control room's. The pilot is the observer with
// no entity, and a picked entity with no camera falls back to the run's own active media. The projection is carried by the
// medium (`projection`), so a spatial camera can be added without making this layer a second reading of the place.

import type { Camera } from '@ssccsorg/skene-kernel';

export type SurfaceMode = 'off' | 'single' | 'split' | 'grid';

/** The medium a surface slot is drawn from, which is what the slot renderer switches on. */
export type SurfaceMedium = 'video' | 'image';

/** One slot of the surface, in fractions of the whole picture: x and y from the top left, w and h across and down. */
export interface SurfaceSlot {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The order the surface menu offers: a full medium, a split, a grid, and off. */
export const SURFACE_MODES: SurfaceMode[] = ['single', 'split', 'grid', 'off'];

/** The most media any preset shows. A surface with more active cameras uses the first of them. */
export const SURFACE_MOST = 4;

const FULL: SurfaceSlot = { x: 0, y: 0, w: 1, h: 1 };
const HALVES: SurfaceSlot[] = [
  { x: 0, y: 0, w: 0.5, h: 1 },
  { x: 0.5, y: 0, w: 0.5, h: 1 },
];
const QUARTERS: SurfaceSlot[] = [
  { x: 0, y: 0, w: 0.5, h: 0.5 },
  { x: 0.5, y: 0, w: 0.5, h: 0.5 },
  { x: 0, y: 0.5, w: 0.5, h: 0.5 },
  { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
];

/**
 * The slots a mode uses for a count of media.
 *
 * The mode is the layout, so it holds even when the count is smaller than its cells: a grid with one medium is one cell
 * of a grid and three dark cells, and a split with one is one half. The count only says how many cells are filled; the
 * layout still draws every cell. Collapsing those to a full surface would make the layout control look broken on an
 * entity that carries one camera, which is the case a forwarded member is most often.
 */
export function slotsOf(mode: SurfaceMode, count: number): SurfaceSlot[] {
  if (mode === 'off' || count <= 0) return [];
  if (mode === 'single') return [FULL];
  if (mode === 'split') return HALVES;
  return QUARTERS;
}

/**
 * The media the surface shows for an observer.
 *
 * A picked entity with its own media is the observer, which is what makes the surface an entity's own cockpit rather than
 * the control room's wall. An entity with none leaves the surface reading the run: the pilot does not have to clear a
 * pick to see the cameras the place is standing.
 */
export function surfaceMedia(cameras: Camera[], observer: string | null): Camera[] {
  const own = observer ? cameras.filter((camera) => camera.origin === observer) : [];
  return (own.length ? own : cameras).slice(0, SURFACE_MOST);
}

/** Whether a declared medium is a picture rather than bytes of footage when the place says nothing. */
const IMAGE = /\.(png|jpe?g|webp|gif|avif|bmp)(?:[?#]|$)/i;

/** What a camera's bytes are, from the place's declaration and the source's own name. */
export function mediumOf(camera: Camera): SurfaceMedium {
  if (camera.medium) return camera.medium;
  return IMAGE.test(camera.src) ? 'image' : 'video';
}
