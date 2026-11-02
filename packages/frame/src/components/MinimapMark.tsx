import { cn } from '../lib/utils';

/**
 * The map, drawn as what it is: a frame with the part of the shell its own reading holds inside it.
 *
 * It is the one glyph the map is named by, and it is drawn rather than taken from a set of icons because a set has a
 * folded paper map and nothing that reads as a map of a space with a view upon it. What tells a minimap from a map is
 * that it carries the frame: the outline is the whole of what there is to see and the rectangle inside it is the part
 * being looked at, which is the same claim the disc makes when it paints the frame's own region.
 *
 * The patch is drawn as a piece of a larger ground rather than as a second frame: a ring inside the outline, with the
 * frame the reading holds in its middle.
 */
export function MinimapMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      role="img"
      aria-label="the map"
      className={cn('size-3.5 shrink-0 fill-none stroke-current [stroke-width:1.3]', className)}
    >
      <rect x="1.7" y="1.7" width="12.6" height="12.6" rx="2.2" />
      <circle cx="8" cy="8" r="4.5" />
      <rect x="5.5" y="5.5" width="5" height="5" rx="0.7" />
    </svg>
  );
}
