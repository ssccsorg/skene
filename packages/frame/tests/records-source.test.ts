// A run read through the wire, which is the shape a room sends.
//
// The records a socket carries are flat: a record names its neighbours by label and the reader keeps a table of what it
// has already seen. A window over a volume is the same answer, so this holds the two halves of that one rule: the flat
// records a caller supplies resolve into the run the board draws, and a window over them is a range with the run's own
// length beside it. The fixtures are wire records rather than a store, because what is held is the frame's side of the
// boundary and the boundary belongs to whoever serves it.

import { expect, test } from 'vitest';
import { entriesOf, recordsSource, type Records } from '@/lib/records-source';
import type { WireRecord } from '@/lib/record-client';

/** One flat record as a room sends it: a label, and the label it reaches for when it reaches for one. */
const fact = (label: string, content: string, origin: string, at = 0): WireRecord => ({
  seq: at,
  kind: 'fact',
  at,
  label,
  content,
  origin,
});

const volume = (records: WireRecord[]): (() => Promise<Records>) => async () => ({
  records,
  total: records.length,
});

test('a flat set of records reads as one run', async () => {
  const records: WireRecord[] = [
    fact('f_1', 'the patient collapsed', 'villa/patient', 0),
    {
      seq: 1,
      kind: 'intent',
      at: 1,
      label: 'i_1',
      fromLabel: 'f_1',
      description: 'evacuate the patient',
    },
    { seq: 2, kind: 'hint', at: 2, label: 'h_1', content: 'the wind is rising' },
  ];

  const entries = entriesOf(records);
  const reading = entries.find((entry) => entry.kind === 'fact');
  const intent = entries.find((entry) => entry.kind === 'intent');
  const hint = entries.find((entry) => entry.kind === 'hint');

  expect(entries).toHaveLength(3);
  expect(reading?.origin).toBe('villa/patient');
  expect(reading?.content).toBe('the patient collapsed');
  expect(intent?.description).toBe('evacuate the patient');
  expect(intent?.from?.origin, 'the intent starts from the record it was written over').toBe(
    'villa/patient',
  );
  expect(hint?.content).toBe('the wind is rising');
});

test('a window of the run is a range, and the run reports its length', async () => {
  const source = recordsSource(
    volume([fact('f_1', 'one', 'villa/one', 0), fact('f_2', 'two', 'villa/two', 1)]),
  );

  const first = await source.window('villa', 0, 1);
  expect(first.entries.map((entry) => entry.content)).toEqual(['one']);
  expect(first.total).toBe(2);

  const last = await source.window('villa', 1, 5);
  expect(last.entries.map((entry) => entry.content)).toEqual(['two']);
  expect(last.total).toBe(2);

  const end = await source.window('villa', 2, 1);
  expect(end.entries).toEqual([]);
  expect(end.total).toBe(2);
});

test('an empty run is an empty window and not a failure', async () => {
  const source = recordsSource(volume([]));
  expect(await source.window('villa', 0, 10)).toEqual({ entries: [], total: 0 });
});

// The wire shape is the socket's, so a record this reading cannot place is refused the way the socket refuses it.
test('a conclusion that names no intent it has seen is not placed', () => {
  const orphan: WireRecord = { seq: 0, kind: 'fact', at: 1, label: 'f_1', producedByLabel: 'i_gone' };
  expect(entriesOf([orphan])).toEqual([]);
});
