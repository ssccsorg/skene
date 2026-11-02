import { PanelsTopLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Hint } from './ui/hint';
import { useFrame } from '../hooks/useFrame';
import { useMenu } from '../hooks/useMenu';
import { usePanels } from '../lib/panels';
import { cn } from '../lib/utils';
import { useSelection } from '../stores/selection';

/**
 * The frame's panels as one control, for a window with no room to stand them beside the space.
 *
 * A frame with no room draws its panels over the space, which is the frame's own answer for a window that has to choose.
 * What it does not have is a way in that a reader finds by looking: the bar's own controls are still there and still
 * switch panels, but a window this narrow is a window whose bar is read as a title rather than as a row of controls.
 *
 * So the panels stand as one control at the foot of the space, drawn where a floating control belongs and opening the
 * list of them. It names no panel itself: the register answers which there are, and each row is that panel's own label
 * and its own icon. Pressing the one that is drawn puts it away, which is the same press the bar's control makes, and
 * pressing any other brings it forward.
 *
 * It stands only where the frame has no room, because where it has room the panels are beside the space and a second way
 * to the same arrangement is a second thing to keep clear of the drawing.
 */
export function FloatingPanels() {
  const room = useFrame();
  const panels = usePanels();
  const front = useSelection((state) => state.front);
  const setOpen = useSelection((state) => state.setOpen);
  const [open, setMenu, box] = useMenu();

  if (room) return null;

  return (
    <div
      ref={box}
      data-region="panel-control"
      className="pointer-events-none absolute right-2 bottom-2 z-50 flex flex-col items-end gap-1"
    >
      {open ? (
        <ul className="pointer-events-auto min-w-[11rem] rounded-md border bg-popover p-1 shadow-md">
          {panels.map((panel) => (
            <li key={panel.unit.key}>
              <button
                type="button"
                data-region="panel-choice"
                data-on={front === panel.unit.key}
                title={panel.unit.title}
                onClick={() => {
                  setOpen(panel.unit.key, front !== panel.unit.key);
                  setMenu(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-[11.5px] transition-colors hover:bg-accent/60',
                  front === panel.unit.key && 'bg-accent/60 text-foreground',
                )}
              >
                <panel.unit.Icon />
                <span className="min-w-0 flex-1 truncate">{panel.unit.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Hint label="panels">
        <Button
          size="icon"
          variant="outline"
          className="pointer-events-auto size-8 rounded-full shadow-md"
          data-region="panel-control-open"
          onClick={() => setMenu(!open)}
        >
          <PanelsTopLeft />
        </Button>
      </Hint>
    </div>
  );
}
