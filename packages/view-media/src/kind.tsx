// Footage, as a window kind.
//
// The one kind the frame ships that is still a first-party library rather than a core: a video element, the sampler that
// keeps its texture, and the surface it can be sent to. It registers itself the way a deployment's kind would, so the
// frame's own panel reaches it through the register and not through an import.

import { Video } from 'lucide-react';
import { Forward } from './Forward';
import { MediaThumb } from './MediaThumb';
import { ViewPatch } from './ViewPatch';
import { registerViewKind, type WindowPaint, type WindowRow } from '@ssccsorg/skene-frame/lib/view-kinds';
import { statusOf } from '@ssccsorg/skene-frame/lib/windows';
import type { Camera, DeclaredView, MediaView, UnitView } from '@ssccsorg/skene-kernel';

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
  // The kind is this package's own, so its shape is read here: a register holds a kind by name and cannot prove it, and
  // a body that trusted any view would draw a map's row as a video.
  const media = view.kind === 'media' ? (view as MediaView) : null;
  if (!media) return null;
  return (
    <video
      data-region="shows-view"
      src={media.src}
      autoPlay
      muted
      loop
      playsInline
      onPlay={() => setRunning(media.id, true)}
      onPause={() => setRunning(media.id, false)}
      onEnded={() => setRunning(media.id, false)}
      className="aspect-video w-full rounded-sm border border-border/70 bg-black object-cover"
    />
  );
}

/** The picture on the shell, which is the one patch every window kind stands on, handed a texture. */
function MediaPaint({ source, bearing, cells, lead, hidden, order }: WindowPaint) {
  const camera = source.kind === 'media' ? (source as Camera) : null;
  if (!camera) return null;
  return (
    <ViewPatch
      camera={camera}
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
  Forward,
  // The picture fills the box a footage view declares, so the pilot's cell round it would stand away from its own edge.
  edge: false,
  // A place written before a view had a kind wrote footage, so this is what an absent kind is read as.
  default: true,
});
