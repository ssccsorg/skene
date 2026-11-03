import { SquareTerminal } from 'lucide-react';
import { Console } from '../Console';
import { Splitter } from '../Splitter';
import { useWorld } from '../../hooks/useWorld';
import { CONSOLE } from '../../lib/capabilities';
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
  // A console is a conversation with a room, and a deployment that has no live room has none to draw. The project says
  // whether its deployment has one, so the panel and the controls that open it are one answer.
  needs: CONSOLE,
  Icon: SquareTerminal,
  View: ConsolePane,
});
