// The room's surface, as footage fills it.
//
// What a kind declares is that its views fill the inside of the sphere. The frame hands the board's resources and draws
// whatever the kind returns, so the surface's layouts, the rate its canvas is uploaded at and the fact that it is one
// picture are all here, and a deployment with no footage draws none of it.

import { useMemo } from 'react';
import type { Camera, World } from '@ssccsorg/skene-kernel';
import { useView } from '@ssccsorg/skene-frame/stores/view';
import { SphereSurface } from './SphereSurface';
import { surfaceMedia } from './surface';
import { useSurface } from './surface-store';

export interface SurfaceProps {
  world: World;
  /** The unit the surface is read through, or null while the pilot is the observer. */
  pickedId: string | null;
}

/** The views the place fills the surface with, which are the ones whose kind fills it. */
export function filling(world: World): Camera[] {
  return world.fills.filter((view): view is Camera => view.kind === 'media');
}

/** The picture inside the shell, or nothing while the surface is off or the place fills it with nothing. */
export function MediaSurface({ world, pickedId }: SurfaceProps) {
  const mode = useSurface((state) => state.mode);
  // A sphere filled with the place's own cell is the place's picture, so the room's surface is not painted on it: the
  // footage is still there and comes back when the sphere reads the region again.
  const filled = useView((state) => state.filled);
  const media = useMemo(() => surfaceMedia(filling(world), pickedId), [world, pickedId]);
  if (mode === 'off' || filled || !media.length) return null;
  return <SphereSurface media={media} mode={mode} />;
}
