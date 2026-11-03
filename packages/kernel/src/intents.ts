// The space's intents: the pieces of work its record declares, read as the queue they are.
//
// An agent's own app lists conversations, because a conversation is what a person had with it. This
// space's own unit of work is not a conversation: it is a piece of work declared over the record, taken by
// a participant, and closed by the fact the work produced. So the list is a queue of intents, and its
// three states are the three things a queue does: open while nobody has claimed it, claimed once one has,
// and closed when the fact it produced has arrived.
//
// The queue is the space's N:N. An intent is a thing one participant declares and another may take, so a
// row names both, and the state says which of the two has happened. Claiming is also how a person comes
// into the space: a person stands on the board because they took work, not because the place lists them.
//
// An intent appears when its declaration does and its state follows the same arrival, so the queue grows
// with the run the way the board and the feed do.

import { keyOf } from './address';
import { HINT, INTENT, entityOf } from './scenario';
import type { Entry } from './types';

export type IntentState = 'open' | 'claimed' | 'closed';

/**
 * The order the queue reads in: what can be taken now, then what is somebody's, then what is done. A
 * queue listed in the order the file happens to declare it hides the race, because the work nobody has
 * taken is the work the reader is looking for.
 */
const RANK: Record<IntentState, number> = { open: 0, claimed: 1, closed: 2 };

export interface Intent {
  /** The declaration's own name, which is the intent's title. */
  id: string;
  state: IntentState;
  /** What the declaration asked for, in the words the record carries. */
  description: string;
  /** The entity that declared it. */
  declaredBy: string;
  /** The participant that claimed it, once one has. */
  worker: string | null;
  /** The fact the work started from, by the name the record gives it. */
  from: string | null;
  /** The fact the work produced, by the name the record gives it. */
  produced: string | null;
  at: number;
  /** The declaration itself, so picking an intent picks one record rather than a shape. */
  entry: Entry;
}

/**
 * The intents a run has declared so far. It reads the records the stream has delivered rather than the
 * whole file, because work the run has not declared is not work the space has.
 *
 * The declaration carries the claim and the outcome whether or not the run has reached them, because the
 * reader resolves the whole file before the stream delivers any of it. So each is counted only when the
 * record itself has arrived, by the one key a record has across the file and the wire.
 */
export function intentsOf(records: Entry[]): Intent[] {
  const arrived = new Set(records.map(keyOf));
  return records
    .filter((record) => record.kind === INTENT)
    .map((intent): Intent => {
      const claim = intent.claim && arrived.has(keyOf(intent.claim)) ? intent.claim : null;
      const produced = intent.produced && arrived.has(keyOf(intent.produced)) ? intent.produced : null;
      return {
        id: intent.label ?? `intent-${intent.at}`,
        state: produced ? 'closed' : claim ? 'claimed' : 'open',
        description: intent.description ?? intent.label ?? 'work',
        declaredBy: entityOf(intent.from?.origin ?? ''),
        worker: claim ? intent.worker ?? null : null,
        from: intent.from?.label ?? intent.fromLabel ?? null,
        produced: produced?.label ?? null,
        at: intent.at,
        entry: intent,
      };
    })
    .sort((left, right) => RANK[left.state] - RANK[right.state] || left.at - right.at);
}

/**
 * The bounds standing over the run: the hints the record declares.
 *
 * A hint carries no link to the work it bounded, so this is the run's own set rather than one intent's, and it is stated
 * as that instead of being quietly joined to a declaration the format does not connect it to. It is one reading rather
 * than a scan beside the queue, so the strip under the transport and the queue above it state the same bounds.
 */
export function boundsOf(records: Entry[]): Entry[] {
  return records.filter((record) => record.kind === HINT);
}
