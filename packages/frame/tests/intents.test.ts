// The space's queue, held to the order the work is in and not to the order the file declares it.
//
// An intent is open while nobody has claimed it, claimed once one has, and closed when the fact it produced arrived. The
// one subtlety is arrival: a declaration carries its claim and its outcome whether or not the run has reached them, so the
// queue counts each only when the record itself is in what the stream delivered. That is what these read.

import { expect, test } from 'vitest';

import { boundsOf, intentsOf } from '@/lib/intents';
import type { Entry } from '@/lib/types';
const declared = (label: string, extra: Partial<Entry> = {}): Entry => ({
  kind: 'intent',
  label,
  description: `do ${label}`,
  fromLabel: 'reading-1',
  at: 0,
  ...extra,
});

test('a declaration the run has not taken is open, and the queue puts it first', () => {
  const open = declared('open-one');
  const claimed = declared('claimed-one');
  const closed = declared('closed-one');
  const claim: Entry = { kind: 'claim', label: 'claimed-one', worker: 'worker-1', at: 0 };
  const produced: Entry = { kind: 'fact', label: 'out', at: 0 };
  claimed.claim = claim;
  claimed.worker = 'worker-1';
  closed.claim = { kind: 'claim', label: 'closed-one', worker: 'worker-1', at: 0 };
  closed.worker = 'worker-1';
  closed.produced = produced;

  const queue = intentsOf([open, claimed, closed, claim, closed.claim, produced]);
  expect(queue.map((each) => [each.id, each.state])).toEqual([
    ['open-one', 'open'],
    ['claimed-one', 'claimed'],
    ['closed-one', 'closed'],
  ]);
  expect(queue.map((each) => each.worker)).toEqual([null, 'worker-1', 'worker-1']);
  expect(queue[2].produced).toBe('out');
});

test('a claim and an outcome the run has not reached are not claimed', () => {
  const intent = declared('answer');
  intent.claim = { kind: 'claim', label: 'answer', worker: 'worker-1', at: 0 };
  intent.worker = 'worker-1';
  intent.produced = { kind: 'fact', label: 'work-done', at: 0 };

  // Only the declaration arrived: the file resolves the whole run, the stream has delivered one record of it.
  expect(intentsOf([intent])[0]).toMatchObject({ state: 'open', worker: null, produced: null });
  // The produced fact arriving closes it, even before the claim is delivered, because the outcome is the stronger answer.
  expect(intentsOf([intent, intent.produced])[0]).toMatchObject({ state: 'closed', produced: 'work-done' });
  // With both, the taker is named.
  expect(intentsOf([intent, intent.claim, intent.produced])[0]).toMatchObject({
    state: 'closed',
    worker: 'worker-1',
  });
});

test('a declaration is attributed to the entity whose reading it started from', () => {
  const intent = declared('answer', {
    from: { kind: 'fact', label: 'reading-1', origin: 'worker-1/observation', at: 0 },
  });
  expect(intentsOf([intent])[0].declaredBy).toBe('worker-1');
  expect(intentsOf([intent])[0].from).toBe('reading-1');
});

test('a declaration with no name still stands in the queue by the second it was made', () => {
  const [unnamed] = intentsOf([{ kind: 'intent', at: 12 }]);
  expect(unnamed.id).toBe('intent-12');
  expect(unnamed.description).toBe('work');
  expect(unnamed.declaredBy).toBe('');
});
