import { X } from 'lucide-react';
import { Button } from '@ssccsorg/skene-ui';
import { Hint } from '@ssccsorg/skene-ui';
import { useFrame } from '../hooks/useFrame';
import { CONTROL } from '@ssccsorg/skene-ui';
import { frontPanel, usePanels } from '../lib/panels';
import { cn } from '@ssccsorg/skene-ui';
import { useSelection } from '../stores/selection';

/**
 * The frame's panels, drawn over the space, for a window with no room to stand them beside it.
 *
 * A panel that is out is a panel the pilot asked for, and a frame that answered that press with nothing is a frame that
 * lost it. So the panels are not hidden when the window narrows: the frame stops standing them in its own row and draws
 * the one that was brought forward over the space instead, which is the same arrangement read at a width that has to
 * choose. Nothing here decides which panels there are, and nothing decides what one draws: the register answers the
 * first and the panel's own module the second, so a panel added later is drawn here without this being told it exists.
 *
 * It stands below the bar that names the panels, so the bar is still there to press: a pilot switches between panels
 * the way they always did, and the overlay follows rather than offering a second list of its own. That is why the
 * overlay is inset at the top by the row's own height rather than covering the frame: a covering overlay would take the
 * one control that gets out of it.
 *
 * The close control is drawn over the panel's own header because a panel has no closed form of its own: what a panel
 * draws is the panel, and being away is the frame's answer and so is the way back.
 */
export function PanelOverlay() {
  const room = useFrame();
  const panels = usePanels();
  const front = useSelection((state) => state.front);
  const drawn = frontPanel(panels, front);
  if (room || !drawn) return null;

  return (
    <div
      data-region="overlay"
      data-panel={drawn.unit.key}
      className="absolute inset-x-0 bottom-0 top-7 z-40 flex flex-col bg-background/85 backdrop-blur-sm"
    >
      {/* The panel keeps its own measure and its own shape, so a column fills the height it is given and the row's own
          height stands, which is what one wrapper can say without the frame knowing which of the two it is drawing. */}
      <div className="flex min-h-0 flex-1 flex-col [&>*]:h-full [&>*]:max-w-full">
        <drawn.unit.View />
      </div>
      <Hint label="close">
        <Button
          size="icon-xs"
          variant="ghost"
          className={cn(CONTROL, 'absolute right-1.5 top-1.5')}
          onClick={drawn.toggle}
        >
          <X />
        </Button>
      </Hint>
    </div>
  );
}
