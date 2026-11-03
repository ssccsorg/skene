import { keyOf } from '@ssccsorg/skene-kernel';
import type { Intent, IntentState } from '@ssccsorg/skene-kernel';
import { cn } from '../lib/utils';

// The queue of intents: one row a piece of declared work, and the state it has reached. It is where the
// space's N:N is read, which is a participant declaring work another may take, so a row names both and the
// state says which of the two has happened.
//
// The three states are what a queue does rather than three labels: open while nobody has claimed it,
// claimed while it is somebody's and its fact is not in the record, and closed once that fact is there.
// Claiming is how a person comes into the space, so this queue is where a person's arrival is read.

const STATE: Record<IntentState, { mark: string; word: string }> = {
  open: { mark: 'border-[1.5px] border-idle', word: 'open' },
  claimed: { mark: 'animate-pulse bg-idle', word: 'claimed' },
  closed: { mark: 'bg-working', word: 'closed' },
};

/** How an intent's time is said: the record's own seconds, which is the run's clock and not a wall clock. */
function clock(at: number): string {
  return `${at}s`;
}

/** What a row says about the state it is in, which is the queue's own reading and not a repeated word. */
function standing(intent: Intent): string {
  if (intent.state === 'open') return 'open, nobody has claimed it';
  if (intent.state === 'claimed') return `claimed by ${intent.worker ?? 'somebody'}`;
  return `closed, it produced ${intent.produced ?? 'a fact'}`;
}

export function IntentQueue({
  intents,
  picked,
  onOpen,
}: {
  intents: Intent[];
  /** The picked record's key, so the intent a pick landed on is the one marked. */
  picked: string | null;
  onOpen: (intent: Intent) => void;
}) {
  if (!intents.length) {
    return (
      <p className="px-3 py-2 text-[11.5px] text-muted-foreground">
        No work has been declared in this space. Its units write readings and nothing else, which is what
        this list is here to say.
      </p>
    );
  }
  return (
    <ul className="flex flex-col">
      {intents.map((intent) => {
        const state = STATE[intent.state];
        return (
          <li key={`${intent.id}-${intent.at}`}>
            <button
              type="button"
              title={`${intent.description} \u00b7 ${state.word}`}
              onClick={() => onOpen(intent)}
              className={cn(
                'flex w-full flex-col gap-0.5 px-3 py-1.5 text-left text-[11.5px] leading-snug',
                'hover:bg-accent/40',
                picked === keyOf(intent.entry) && 'bg-accent/60',
              )}
            >
              <span className="flex items-center gap-2">
                <span className={cn('size-2 shrink-0 rounded-full', state.mark)} />
                <span className="min-w-0 flex-1 truncate text-foreground">{intent.description}</span>
                <span className="shrink-0 text-[11.5px] text-muted-foreground tabular-nums">
                  {clock(intent.at)}
                </span>
              </span>
              <span className="truncate pl-[16px] text-[11.5px] text-muted-foreground">
                {standing(intent)}
              </span>
              <span className="truncate pl-[16px] text-[11.5px] text-muted-foreground/80">
                {intent.declaredBy ? `${intent.declaredBy} declared` : 'declared'}
                {intent.from ? ` \u00b7 from ${intent.from}` : ''}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
