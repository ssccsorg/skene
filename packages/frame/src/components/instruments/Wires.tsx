import { Waypoints } from 'lucide-react';
import { Button } from '../ui/button';
import { Hint } from '../ui/hint';
import { CONTROL } from '../../lib/chrome';
import { registerInstrument } from '../../lib/instruments';
import { cn } from '../../lib/utils';
import { useDrawing } from '../../stores/drawing';
// The reading this control is about, held as the declaration itself, so a shell renamed or withdrawn stops compiling here
// rather than matching nothing.
import { SHELL } from '../../views/Shell';

/**
 * How the board joins a mark to the middle.
 *
 * It is drawn for the shell and for nothing else, and it says so itself: the wires are the declarations the graph draws,
 * laid over the shell, and a reading that draws a table has no ground to lay a wire over. It stands with the graph for that
 * reason: the two are the same topology read twice, so the switch that changes how one is drawn sits beside the way into
 * the other. One control and not two, because the two ways are one choice: a pilot presses it and the board draws the
 * other, which is the same press every other control here makes, and the state is read off `data-on` rather than written
 * beside the mark.
 *
 * The straight line is kept rather than replaced, and the whole of why is that a route is a claim: it says a wire runs
 * along the ground's cells, which is the tidier picture on a crowded ground and the longer one on a sparse one. A pilot
 * who wants the shorter reading of the same claim has it one press away, and neither is written out of the frame.
 */
function Wires() {
  const wires = useDrawing((state) => state.wires);
  const setWires = useDrawing((state) => state.setWires);
  const along = wires === 'cells';

  return (
    <Hint label="wires">
      <Button
        size="icon-xs"
        variant="ghost"
        className={cn(CONTROL)}
        data-on={along}
        onClick={() => setWires(along ? 'lines' : 'cells')}
      >
        <Waypoints />
      </Button>
    </Hint>
  );
}

registerInstrument({
  key: 'wires',
  order: 31,
  band: 0,
  shows: (picture) => picture === SHELL.key,
  Control: Wires,
});
