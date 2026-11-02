import { Expand } from 'lucide-react';
import { Button } from '../ui/button';
import { Hint } from '../ui/hint';
import { CONTROL } from '../../lib/chrome';
import { registerInstrument } from '../../lib/instruments';
import { useArrangement } from '../../lib/panels';
import { cn } from '../../lib/utils';
import { useSelection } from '../../stores/selection';

/**
 * Whether every panel is away, so the view has the layout.
 *
 * It speaks to every reading, because a panel is a panel whichever drawing is in the board: putting them all away is a
 * property of the frame and not of what the frame is showing. It is the one press that does the panels the bar's own
 * toggles do one at a time, and one press has to be undoable, so what it gives back is the arrangement the pilot had.
 *
 * It stands with the fullscreen control, in the frame's own run after the map, rather than with the panels it puts away:
 * it is a control about how much of the frame the pilot is looking at and not a control about one of the frame's edges.
 *
 * What it folds is the arrangement as it stands, which the register answers: the store keeps the answers and does not
 * know what the panels are, so the one place that has both is here.
 */
function FoldPanels() {
  const fading = useSelection((state) => state.beforeAll !== null);
  const foldAll = useSelection((state) => state.foldAll);
  const restore = useSelection((state) => state.restore);
  const arrangement = useArrangement();

  return (
    <Hint label={fading ? 'restore panels' : 'fold panels'}>
      <Button
        size="icon-xs"
        variant="ghost"
        className={cn(CONTROL)}
        data-on={fading}
        onClick={() => (fading ? restore() : foldAll(arrangement))}
      >
        <Expand />
      </Button>
    </Hint>
  );
}

registerInstrument({
  key: 'fold-panels',
  order: 50,
  band: 2,
  Control: FoldPanels,
});
