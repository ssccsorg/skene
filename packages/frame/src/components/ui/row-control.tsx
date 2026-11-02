import type { ComponentProps } from 'react';
import { Button } from './button';
import { CONTROL, ROW_CONTROL_EDGE, type RowControlSize } from '../../lib/chrome';
import { cn } from '../../lib/utils';

/**
 * A control on a row, at one of its edges or between them.
 *
 * The size and the edge are stated together because they are one answer: the size decides how much the control pads
 * itself, and the edge is the row's inset less exactly that. A control that named one without the other would stand a
 * few points further in than the words beside it, which is the defect this replaces.
 *
 * A control between two others keeps its whole box, so `middle` is the answer for one that is not at either end: the
 * edge is the row's inset given back, and a control that is not on the edge has nothing to give back.
 */
export function RowControl({
  at = 'end',
  size = 'icon-xs',
  className,
  ...props
}: ComponentProps<typeof Button> & { at?: 'start' | 'end' | 'middle'; size?: RowControlSize }) {
  const edge = ROW_CONTROL_EDGE[size];
  const inset = at === 'middle' ? null : at === 'start' ? edge.start : edge.end;

  return (
    <Button
      {...props}
      size={size}
      variant="ghost"
      data-row-control={at}
      className={cn(CONTROL, inset, className)}
    />
  );
}
