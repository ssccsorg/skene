import type { ReactElement } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

/**
 * A control's name on rollover.
 *
 * The frame is one line high, so a control that is only a mark says what it is when the pointer rests on it. The hint
 * replaces the native title rather than standing beside it: two rollovers on one control would be two answers to the
 * same question.
 */
export function Hint({
  label,
  side = 'bottom',
  children,
}: {
  label: string | null | undefined;
  side?: 'top' | 'right' | 'bottom' | 'left';
  children: ReactElement;
}) {
  if (!label) return children;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
