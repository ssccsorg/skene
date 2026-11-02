import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '../lib/utils';

/**
 * The edge of a panel, as the one place it is dragged by.
 *
 * A frame whose panels are fixed is a frame that decides how a pilot works: a record column wide enough for a
 * long line is a map reduced to a strip, and the reverse, so the edge between them is a control. The handle is
 * drawn as the border it stands on and lights up under the pointer, because a cockpit's chrome is quiet until
 * it is asked something.
 *
 * The gesture is taken from the page and not from the element. A handle narrower than the distance a hand
 * travels loses the pointer the moment it moves, so the move and the release are listened for on the window
 * and taken off again when the drag ends; the cursor is set on the body for the same reason, since the pointer
 * leaves the handle immediately and would otherwise show the wrong one for the whole drag.
 *
 * The value handed up is the raw one. The clamp belongs to whoever holds the measure, because a size can be
 * asked for from more than one place and a clamp written here would be a rule the next caller does not have.
 */
export function Splitter({
  axis,
  value,
  measure,
  onChange,
  invert = false,
  className,
}: {
  axis: 'x' | 'y';
  /** The measure as it stands, which is where the drag starts from. */
  value: number;
  /**
   * What the panel is drawn at now, when that is not the measure.
   *
   * A panel whose height has a floor of its own content is drawn larger than the number the pilot asked for, and a drag
   * that started from that number would spend its first pixels closing the gap before the edge moved. The floor is not
   * known until the panel is on screen, so the edge asks for it when the drag begins.
   */
  measure?: () => number;
  onChange: (value: number) => void;
  /** Whether the panel grows the other way, which is what the panels of the far edge do. */
  invert?: boolean;
  className?: string;
}) {
  const held = useRef<{ at: number; from: number } | null>(null);

  const down = (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    const from = measure ? measure() : value;
    held.current = { at: axis === 'x' ? event.clientX : event.clientY, from };
    document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize';

    const move = (moved: PointerEvent) => {
      const start = held.current;
      if (!start) return;
      const delta = (axis === 'x' ? moved.clientX : moved.clientY) - start.at;
      onChange(start.from + (invert ? -delta : delta));
    };
    const up = () => {
      held.current = null;
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return (
    <span
      role="separator"
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      data-region="splitter"
      data-axis={axis}
      title="drag to give this panel more or less of the frame"
      onPointerDown={down}
      className={cn('group absolute z-20 touch-none', axis === 'x' ? 'cursor-col-resize' : 'cursor-row-resize', className)}
    >
      <span
        aria-hidden
        className={cn(
          'block bg-transparent transition-colors group-hover:bg-accent',
          axis === 'x' ? 'h-full w-px' : 'h-px w-full',
        )}
      />
    </span>
  );
}
