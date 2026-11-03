// Footage, as a window kind.
//
// The one kind the frame ships that is still a first-party library rather than a core: a video element, the sampler that
// keeps its texture, and the surface it can be sent to. It registers itself the way a deployment's kind would, so the
// frame's own panel reaches it through the register and not through an import.

import { Video } from 'lucide-react';
import { MediaThumb } from '../components/MediaThumb';
import { ViewPatch } from '../components/ViewPatch';
import { registerViewKind, type WindowPaint, type WindowRow } from '../lib/view-kinds';
import { statusOf } from '../lib/windows';
import type { DeclaredView, UnitView } from '@ssccsorg/skene-kernel';

/**
 * A declared footage view as this build holds it.
 *
 * A view with no source has nothing to draw, so it is not this kind's: the frame names the declaration instead of drawing
 * a blank picture. The projection is named `spatial` here and the spellings a spatial device is commonly declared with
 * are read into it, so a 360 camera does not have to be rewritten before this build can hold it.
 */
function readMedia(declared: DeclaredView): UnitView | null {
  if (!declared.src) return null;
  const medium = declared.medium === 'image' || declared.medium === 'video' ? declared.medium : undefined;
  const spatial =
    declared.projection === 'spatial' ||
    declared.projection === '360' ||
    declared.projection === 'equirectangular';
  return {
    id: declared.id,
    kind: 'media',
    src: declared.src,
    cells: declared.cells,
    status: statusOf(declared),
    ...(medium ? { medium } : {}),
    ...(spatial ? { projection: 'spatial' as const } : {}),
    from: declared.from,
    to: declared.to,
  };
}

/** The picture under a member's row, which is the medium itself and not a frame around it. */
function MediaBody({ view, setRunning }: WindowRow) {
  if (view.kind !== 'media') return null;
  return (
    <video
      data-region="shows-view"
      src={view.src}
      autoPlay
      muted
      loop
      playsInline
      onPlay={() => setRunning(view.id, true)}
      onPause={() => setRunning(view.id, false)}
      onEnded={() => setRunning(view.id, false)}
      className="aspect-video w-full rounded-sm border border-border/70 bg-black object-cover"
    />
  );
}

/** The picture on the shell, which is the one patch every window kind stands on, handed a texture. */
function MediaPaint({ source, bearing, cells, lead, hidden, order }: WindowPaint) {
  if (source.kind !== 'media') return null;
  return (
    <ViewPatch
      camera={source}
      bearing={bearing}
      cells={cells}
      lead={lead}
      hidden={hidden}
      order={order}
    />
  );
}

export const MEDIA = registerViewKind({
  kind: 'media',
  label: 'video',
  Icon: Video,
  read: readMedia,
  Paint: MediaPaint,
  Row: MediaBody,
  Thumb: MediaThumb,
  // The picture fills the box a footage view declares, so the pilot's cell round it would stand away from its own edge.
  edge: false,
  forward: true,
  // A place written before a view had a kind wrote footage, so this is what an absent kind is read as.
  default: true,
});
