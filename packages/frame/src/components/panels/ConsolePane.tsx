import { SquareTerminal } from 'lucide-react';
import { Console } from '../Console';
import { Splitter } from '../Splitter';
import { useWorld } from '../../hooks/useWorld';
import { registerPanel } from '../../lib/panels';
import { useSelection } from '../../stores/selection';
import { useSizes } from '../../stores/sizes';

/**
 * The board as text, on the frame's inner left.
 *
 * It is the board's other side: the same space as text, which is what a person edits and what an agent would write. It
 * is away by default, because the space is the work and the console is how you reach it.
 *
 * It draws its own box and its own edge, and it draws nothing at all until the space has been read: a console of a space
 * that has no units is a text of nothing, and the panel that says what the board is has nothing to say yet.
 *
 * The panel stands for every project: the text is the frame's own reading of the run. The exchange under it is a room,
 * which is a surface a deployment has to have shipped, and that is asked where the room is drawn rather than here.
 */
function ConsolePane() {
  const { model, received, shown, world, scene } = useWorld();
  const pickedId = useSelection((state) => state.unit);
  const width = useSizes((state) => state.console);
  const setSize = useSizes((state) => state.set);

  if (!world || !model) return null;

  return (
    <div style={{ width }} className="relative shrink-0">
      <Console
        place={model.project.place}
        world={world}
        project={model.project.id}
        scene={scene?.title ?? ''}
        shown={shown}
        total={received.length}
        pickedId={pickedId}
      />
      <Splitter axis="x" value={width} onChange={(value) => setSize('console', value)} className="inset-y-0 -right-[3px] w-1.5" />
    </div>
  );
}

registerPanel({
  key: 'console',
  at: 'left',
  order: 20,
  side: 'left',
  label: 'Console',
  title: 'the board as text, where a person types at it',
  starts: false,
  Icon: SquareTerminal,
  View: ConsolePane,
});
