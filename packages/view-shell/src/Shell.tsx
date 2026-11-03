import { Globe } from 'lucide-react';
import { SceneBoard } from './SceneBoard';
import { registerReading, type Board } from '@ssccsorg/skene-frame/lib/readings';

/**
 * The space itself: every unit at the place its own place gives it, drawn on the shell.
 *
 * It is the reading the frame opens on and the only one the frame's own projection controls are about. It is also the
 * only reading that asks the board for anything, and it asks by taking what it needs: the other three take nothing, and
 * none of them is a case the frame works out.
 *
 * A space that is still being read is not drawn, and that is this reading's own answer rather than the frame's: the table
 * and the graph have something to say about a run with no units in it and a board of shell has a sphere and no content.
 */
function Shell({ world, place, neighbours, pickedId, onPick, onOpenProject }: Board) {
  if (!world || !place) return null;
  return (
    <SceneBoard
      world={world}
      place={place}
      neighbours={neighbours}
      pickedId={pickedId}
      onPick={onPick}
      onOpenProject={onOpenProject}
    />
  );
}

/** The shell reading, held by name because it is the one the frame's own projection controls ask after. */
export const SHELL_READING = registerReading({
  key: 'shell',
  path: '/space',
  View: Shell,
  button: { order: 10, title: 'space', Icon: Globe },
  // The one reading drawn from the pilot's seat, so the one the map paints the frame's own region for.
  seat: true,
});
