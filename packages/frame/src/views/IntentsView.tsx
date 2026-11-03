import { useMemo } from 'react';
import { IntentQueue } from '../components/IntentQueue';
import { useIntentPick } from '../hooks/useIntentPick';
import { useWorld } from '../hooks/useWorld';
import { keyOf } from '@ssccsorg/skene-kernel';
import { LABEL, ROW } from '@ssccsorg/skene-ui';
import { boundsOf, intentsOf } from '@ssccsorg/skene-kernel';
import { registerReading } from '../lib/readings';
import { cn } from '@ssccsorg/skene-ui';
import { useSelection } from '../stores/selection';

/**
 * The work this space has declared, read in the board.
 *
 * The rail's own queue is a strip of a column, and a queue of a run's work is the one reading of this space that wants
 * the whole of it: a declaration carries who made it, who took it and the fact it produced, and three lines a row in a
 * column that is also the feed is where the middle of that is clipped. So the queue declares itself as a reading like the
 * account does, and the rail's half of it stands down while this one is in force.
 *
 * What bounds the judgements stands at the head of it rather than on a row, because a hint is the layer's own record and
 * not a participant's, which is the same reading the rail draws at its own scale.
 */
export function IntentsView() {
  const { revealed } = useWorld();
  const selected = useSelection((state) => state.selected);
  const open = useIntentPick();

  const intents = useMemo(() => intentsOf(revealed), [revealed]);
  const bounds = useMemo(() => boundsOf(revealed), [revealed]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className={cn(ROW, 'gap-2 border-b')}>
        <span className={cn(LABEL, 'shrink-0')}>Intents</span>
        <span className="min-w-0 flex-1 truncate text-muted-foreground" title={bounds.map((bound) => bound.label ?? 'a bound').join(', ')}>
          {bounds.length ? `bounded by ${bounds.map((bound) => bound.label ?? 'a bound').join(', ')}` : 'nothing has bounded this run'}
        </span>
        <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
          {intents.length} {intents.length === 1 ? 'declaration' : 'declarations'}
        </span>
      </div>
      <div data-region="intents-board" className="min-h-0 flex-1 overflow-y-auto">
        <IntentQueue intents={intents} picked={selected ? keyOf(selected) : null} onOpen={open} />
      </div>
    </div>
  );
}

/**
 * The queue's reading, held by name because the rail's own half speaks to it.
 *
 * It declares no button, and that is the rail's doing rather than the reading's: the queue read whole is the rail's own
 * subject at another size, so its way in stands on the row that names it, carrying the same glyph the row's own subject
 * is read by. A reading that is also in the frame's bar offers the same picture twice, once for a reader looking at the
 * rail and once for a reader looking at the bar.
 */
export const INTENTS = registerReading({
  key: 'intents',
  path: '/intents',
  View: IntentsView,
});
