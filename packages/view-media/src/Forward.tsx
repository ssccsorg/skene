// The control that sends a picture to the room's surface.
//
// It is the kind's own rather than the frame's, because what it does is the kind's: the surface is where footage is read
// through the room, and a deployment that adds a kind with a surface of its own brings its own way to reach it. The frame
// gives it a place on the member's row and on the window's pin and draws nothing itself.
//
// Two shapes because the two places are two shapes: a row is a line of small controls and a pin is a bar of its own. The
// markup here is the row's and the pin's as they were when the frame drew them, so a deployment sees no difference.

import { ArrowUpRight } from 'lucide-react';
import { Button } from '@ssccsorg/skene-ui';
import { Hint } from '@ssccsorg/skene-ui';
import { CONTROL } from '@ssccsorg/skene-ui';
import { cn } from '@ssccsorg/skene-ui';
import { useView } from '@ssccsorg/skene-frame/stores/view';
import { useSurfaceForward } from './useSurfaceForward';

export function Forward({ origin, where }: { origin: string; where: 'row' | 'handle' }) {
  const forward = useSurfaceForward();
  // A sphere filled with the place's own cell is drawn by the cell, so there is no room on it for a picture to be sent to.
  const filled = useView((state) => state.filled);
  const label = filled ? 'the sphere is filled with the cell' : 'forward to the sphere';

  if (where === 'row') {
    return (
      <Hint label={label}>
        <button
          type="button"
          data-region="surface-forward"
          className="flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground disabled:cursor-default disabled:opacity-40"
          disabled={filled}
          onClick={() => forward(origin)}
        >
          <ArrowUpRight className="size-3.5" />
        </button>
      </Hint>
    );
  }

  return (
    <Hint label={label}>
      <Button
        size="icon-xs"
        variant="ghost"
        className={cn(CONTROL)}
        data-region="surface-forward"
        disabled={filled}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          forward(origin);
        }}
      >
        <ArrowUpRight />
      </Button>
    </Hint>
  );
}
