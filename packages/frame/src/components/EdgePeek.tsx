import { BottomBar } from './BottomBar';
import { Panes } from './Panes';
import { usePanels } from '../lib/panels';
import { useSelection } from '../stores/selection';
import { cn } from '../lib/utils';

/**
 * What an edge shows while the pointer rests on it.
 *
 * An edge that is away draws nothing, which is what the press that put it away asked for. The pointer is how a folded
 * edge is looked at without being answered: it rests on the edge of the window, the edge comes out over the space for as
 * long as it stays there, and moving away puts it back exactly as it was. Nothing is pressed and the arrangement does
 * not change, so a look cannot leave the frame in a state the pilot did not ask for.
 *
 * The sensor is the edge itself and not a handle drawn on it: a strip eight points wide along the frame, invisible until
 * it is asked something. The strip and what it shows are one element, so the pointer that brought the panels out is
 * inside them while they are out, and the edge goes away when the pointer leaves them and not a moment before.
 */
const SENSOR = 8;

export function EdgePeek() {
  const peek = useSelection((state) => state.peek);
  const setPeek = useSelection((state) => state.setPeek);
  const bar = useSelection((state) => state.bar);
  const panels = usePanels();
  const folded = panels.every((each) => !each.open);
  const away = (at: 'left' | 'right') => panels.some((each) => each.unit.at === at && !each.open);

  return (
    <>
      {(['left', 'right'] as const).map((edge) =>
        away(edge) ? (
          <div
            key={edge}
            data-region="edge-peek"
            data-edge={edge}
            className={cn('absolute inset-y-0 z-40 flex', edge === 'left' ? 'left-0' : 'right-0')}
            onPointerEnter={() => setPeek(edge)}
            onPointerLeave={() => {
              if (peek === edge) setPeek(null);
            }}
          >
            {peek === edge ? (
              <div
                className={cn(
                  'flex h-full bg-background shadow-lg',
                  edge === 'left' ? 'border-r' : 'border-l',
                )}
              >
                <Panes at={edge} only="closed" />
              </div>
            ) : (
              <div style={{ width: SENSOR }} />
            )}
          </div>
        ) : null,
      )}
      {!bar || folded ? (
        <div
          data-region="edge-peek"
          data-edge="bottom"
          className="absolute inset-x-0 bottom-0 z-40 flex flex-col"
          onPointerEnter={() => setPeek('bottom')}
          onPointerLeave={() => {
            if (peek === 'bottom') setPeek(null);
          }}
        >
          {peek === 'bottom' ? (
            <div className="flex flex-col bg-background shadow-lg">
              <BottomBar />
            </div>
          ) : (
            <div style={{ height: SENSOR }} />
          )}
        </div>
      ) : null}
    </>
  );
}
