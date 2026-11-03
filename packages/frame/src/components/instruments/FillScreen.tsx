import { Fullscreen, Minimize2 } from 'lucide-react';
import { Button } from '@ssccsorg/skene-ui';
import { Hint } from '@ssccsorg/skene-ui';
import { CONTROL } from '@ssccsorg/skene-ui';
import { useFullscreen } from '../../hooks/useFullscreen';
import { registerInstrument } from '../../lib/instruments';
import { cn } from '@ssccsorg/skene-ui';

/**
 * Whether the cockpit is filling the screen.
 *
 * It speaks to every reading for the same reason folding does: the screen is the frame's own, and what is drawn in
 * the middle of it has nothing to say about whether the frame should be the whole of the display. It stands in the
 * frame's own run after the map's, because a whole screen is about the frame and not about the ground the map draws.
 */
function FillScreen() {
  const [whole, toggle, refusal] = useFullscreen();

  return (
    // A press that was refused says why, in the place the control already speaks: a message nobody can see is not a report.
    <Hint label={refusal ?? (whole ? 'windowed' : 'fullscreen')}>
      <Button
        size="icon-xs"
        variant="ghost"
        className={cn(CONTROL)}
        data-on={whole}
        onClick={toggle}
      >
        {whole ? <Minimize2 /> : <Fullscreen />}
      </Button>
    </Hint>
  );
}

registerInstrument({
  key: 'fill-screen',
  order: 51,
  band: 2,
  Control: FillScreen,
});
