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
import { useSurfaceForward } from './useSurfaceForward';

export function Forward({ origin, where }: { origin: string; where: 'row' | 'handle' }) {
  const forward = useSurfaceForward();

  if (where === 'row') {
    return (
      <Hint label="forward to the sphere">
        <button
          type="button"
          data-region="surface-forward"
          className="flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
          onClick={() => forward(origin)}
        >
          <ArrowUpRight className="size-3.5" />
        </button>
      </Hint>
    );
  }

  return (
    <Hint label="forward to the sphere">
      <Button
        size="icon-xs"
        variant="ghost"
        className={cn(CONTROL)}
        data-region="surface-forward"
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
