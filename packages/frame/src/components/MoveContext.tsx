import { useEffect, useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { Button } from './ui/button';
import { LABEL, TITLE } from '../lib/chrome';
import type { Place, World } from '../lib/types';
import { cn } from '../lib/utils';
import { windowOf } from '../lib/windows';
import { toPlace } from '../lib/world';
import { useEdits } from '../stores/edits';
import { useSelection } from '../stores/selection';

/**
 * Where a member stands, chosen in a context of its own.
 *
 * A move on the board itself was a press kept until it became a drag, and the same press was already a pick: the two
 * meanings were told apart by time, and every pointer that travelled a little was read as one or the other by luck. The
 * context separates them. The board keeps its one press, and a place is chosen on a plane whose whole job is the place,
 * with a backdrop that stops the space from turning under the hand.
 *
 * The plane is the place's own view and the numbers are the place's own, so what is saved is the same kind of change the
 * fields in the member panel write: a branch from the record, not a rewrite of it. The pin follows the pointer as a
 * press, and nothing is written until the pilot says so.
 */
export function MoveContext({ id, place, world }: { id: string; place: Place; world: World }) {
  const setMoving = useSelection((state) => state.setMoving);
  const save = useEdits((state) => state.set);
  const drop = useEdits((state) => state.drop);
  const changed = useEdits((state) => state.changes.some((entry) => entry.unit === id));
  const [draft, setDraft] = useState<[number, number] | null>(null);

  const unit = world.standing.find((each) => each.id === id) ?? null;
  const close = () => setMoving(null);
  // The same window model the media pins use: a place being chosen is a window of the `edit` kind, drawn here as a
  // context and one day as a patch of the shell. What it keeps is the window's identity, not a second kind of thing.
  const placeWindow = windowOf('edit', id, id, `move ${id}`);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!unit) return null;
  const [vx, vy, vw, vh] = place.view;
  const here = unit.ground;
  const at = draft ?? here;
  const others = world.standing.filter((each) => each.id !== id);
  const route = unit.path.map((point) => toPlace(point, place)).map(([x, y]) => `${x},${y}`).join(' ');
  const step = Math.max(20, Math.round(vw / 13));
  const vertical: number[] = [];
  for (let x = Math.ceil(vx / step) * step; x <= vx + vw; x += step) vertical.push(x);
  const horizontal: number[] = [];
  for (let y = Math.ceil(vy / step) * step; y <= vy + vh; y += step) horizontal.push(y);

  // The plane's own numbers, from the pointer: the viewBox maps linearly onto the element because the element is given
  // the view's own aspect, so a point of the pointer is a point of the place and not a guess.
  const choose = (event: React.MouseEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    setDraft([
      Math.round(vx + ((event.clientX - box.left) / box.width) * vw),
      Math.round(vy + ((event.clientY - box.top) / box.height) * vh),
    ]);
  };

  const commit = () => {
    if (!draft) return;
    save({ unit: id, at: draft, abilities: null });
    close();
  };

  return (
    <div
      data-region="move-backdrop"
      className="absolute inset-0 z-[90] flex items-center justify-center bg-background/75 p-6"
      onClick={close}
    >
      <div
        data-region="move-context"
        data-window={placeWindow.id}
        data-kind={placeWindow.kind}
        aria-label={placeWindow.title}
        className="flex w-[min(760px,100%)] flex-col gap-2 rounded-md border bg-card p-3 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className={cn(LABEL, 'shrink-0')}>move</span>
          <span className={cn(TITLE, 'min-w-0 flex-1 truncate')}>{id}</span>
          <span className="shrink-0 text-[11.5px] text-muted-foreground">press the ground where it should stand</span>
          <Button size="icon-xs" variant="ghost" title="close without moving" onClick={close}>
            <X />
          </Button>
        </div>

        <svg
          data-region="move-plane"
          viewBox={`${vx} ${vy} ${vw} ${vh}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`the ground of ${id}`}
          onClick={choose}
          className="w-full cursor-crosshair rounded-sm border border-border/70 bg-card/60"
          style={{ aspectRatio: `${vw} / ${vh}` }}
        >
          {vertical.map((x) => (
            <line key={`x${x}`} x1={x} y1={vy} x2={x} y2={vy + vh} className="stroke-border/40" strokeWidth="0.7" />
          ))}
          {horizontal.map((y) => (
            <line key={`y${y}`} x1={vx} y1={y} x2={vx + vw} y2={y} className="stroke-border/40" strokeWidth="0.7" />
          ))}

          {unit.path.length > 1 ? (
            <polyline points={route} className="fill-none stroke-claim/40" strokeWidth="1.4" />
          ) : null}
          {others.map((each) => {
            const [x, y] = each.ground;
            return <circle key={each.id} cx={x} cy={y} r="2.4" className="fill-muted-foreground/40" />;
          })}
          {/* Where the record has it, and where it would go: two readings, so the pilot can see what the press changes. */}
          <g transform={`translate(${here[0]} ${here[1]})`}>
            <circle r="5" className="fill-none stroke-muted-foreground" strokeWidth="1.2" />
          </g>
          <g data-region="move-pin" transform={`translate(${at[0]} ${at[1]})`}>
            <path d="M0 0 L-7 -14 A8 8 0 1 1 7 -14 Z" className="fill-claim" />
            <circle cy="-19" r="3" className="fill-background" />
          </g>
        </svg>

        <div className="flex items-center gap-2 text-[11.5px]">
          <span className="text-muted-foreground tabular-nums">
            at {Math.round(at[0])}, {Math.round(at[1])}
          </span>
          <span className="min-w-0 flex-1" />
          <Button
            size="xs"
            variant="ghost"
            disabled={!changed}
            title="put it back where the record has it"
            onClick={() => {
              drop(id);
              setDraft(null);
            }}
          >
            <RotateCcw />
            Revert
          </Button>
          <Button size="xs" variant="ghost" title="close without moving" onClick={close}>
            Cancel
          </Button>
          <Button size="xs" data-region="move-save" disabled={!draft} onClick={commit}>
            <Check />
            Move here
          </Button>
        </div>
      </div>
    </div>
  );
}
