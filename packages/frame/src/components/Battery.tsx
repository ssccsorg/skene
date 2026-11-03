import type { Charge } from '@ssccsorg/skene-kernel';
import { cn } from '../lib/utils';

// A charge, drawn once for every kind of thing that carries one.
//
// The attribute is abstract (`lib/attributes`): a place declares a battery and this draws it, whatever the entity is. The
// mark is a cell with the fill it has and the number beside it, because a proportion is read faster than it is computed
// and a row is a place to read at a glance.
//
// The inks are the three the frame already spends on a state. A full charge is the working ink, an ordinary one the idle
// ink, and a charge that will not last the afternoon is the destructive one: one more thing about an entity that is
// good, ordinary or a problem, in the words the rest of the frame already uses.

/** Where a charge stops being ordinary, as a percentage. */
const LOW = 35;
/** Where it stops being a warning and becomes the thing to act on. */
const CRITICAL = 15;

export function Battery({ charge, className }: { charge: Charge; className?: string }) {
  const percent = Math.round(charge.level * 100);
  const ink = percent <= CRITICAL ? 'bg-destructive' : percent <= LOW ? 'bg-idle' : 'bg-working';
  return (
    <span
      data-region="battery"
      data-level={percent}
      title={`battery: ${percent}%`}
      className={cn('flex shrink-0 items-center gap-1 text-muted-foreground', className)}
    >
      <span className="flex h-2 w-4 rounded-[1.5px] border border-muted-foreground/60 p-[1.5px]">
        <span className={cn('h-full rounded-[0.5px]', ink)} style={{ width: `${percent}%` }} />
      </span>
      <span className="tabular-nums">{percent}%</span>
    </span>
  );
}
