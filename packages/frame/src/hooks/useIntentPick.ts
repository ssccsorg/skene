import { useCallback } from 'react';
import type { Intent } from '@ssccsorg/skene-kernel';
import { useSelection } from '../stores/selection';

/**
 * What a press on a declaration does, which is one thing read in two places.
 *
 * The queue of declared work stands in the rail and again in the board's own reading of it, and a press in either is the
 * same press: it opens the record the work was declared in and picks the member that declared it. Two copies of that
 * would be two answers to where a press lands.
 *
 * It does not move the run's cursor. The queue is derived from the record up to that cursor, so rewinding to a
 * declaration retracts every intent declared after it and turns a closed intent back into an open one: the press would
 * consume the very reading it was made in. Every intent the queue holds is already revealed, so the record can be shown
 * without moving the run.
 */
export function useIntentPick(): (intent: Intent) => void {
  const select = useSelection((state) => state.select);

  return useCallback((intent: Intent) => select(intent.entry), [select]);
}
