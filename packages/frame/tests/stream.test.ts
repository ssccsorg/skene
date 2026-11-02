// The record source's one piece of real logic: a flat record on the wire resolved against the records
// already received.
//
// A record's links are to other records and a cycle cannot go over a socket, so the two labels travel
// instead and are resolved here. What the store ends up holding has to be the same graph the readers
// derive from a file, because everything above this file is written against that shape. The claim is
// the case that broke: it is a step and not a record, so it must not be named, or the fact a
// declaration produced reaches the claim instead of the declaration.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

import { linkRecord, links, type Links, type WireRecord } from '@/lib/record-client';
import type { Entry } from '@/lib/types';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** The wire as the mock server writes it: flat, with the two labels in place of the records. */
function replay(wires: WireRecord[]): { named: Map<string, Entry>; records: Entry[] } {
  const reading: Links = links();
  const records: Entry[] = [];
  for (const wire of wires) {
    const record = linkRecord(reading, wire);
    if (record) records.push(record);
  }
  return { named: reading.named, records };
}

const DRIVE: WireRecord[] = [
  { seq: 0, kind: 'fact', at: 0, origin: 'servo-drive-3/cycle', bytes: 48, cycle: 0 },
  { seq: 1, kind: 'fact', at: 10, origin: 'servo-drive-3/current', bytes: 48, label: 'window-now' },
  { seq: 2, kind: 'hint', at: 10, label: 'wear', content: 'wear=0.30mm' },
  {
    seq: 3,
    kind: 'intent',
    at: 10,
    label: 'replace-bearing',
    fromLabel: 'window-now',
    description: 'schedule-before-next-shift',
  },
  { seq: 4, kind: 'claim', at: 10, label: 'replace-bearing', worker: 'maintenance-robot-1' },
  {
    seq: 5,
    kind: 'fact',
    at: 10,
    origin: 'maintenance-robot-1/torque',
    bytes: 48,
    label: 'bearing-replaced',
    producedByLabel: 'replace-bearing',
  },
];

test('a claim attaches to its declaration and does not take its name', () => {
  const { named, records } = replay(DRIVE);
  const intent = records.find((record) => record.kind === 'intent');
  const claim = records.find((record) => record.kind === 'claim');
  expect(intent?.claim).toBe(claim);
  expect(intent?.worker).toBe('maintenance-robot-1');
  // The name still reaches the declaration, so a conclusion lands on it and not on the claim.
  expect(named.get('replace-bearing')).toBe(intent);
});

test('a conclusion reaches the declaration it was produced by', () => {
  const { records } = replay(DRIVE);
  const intent = records.find((record) => record.kind === 'intent');
  const produced = records.find((record) => record.label === 'bearing-replaced');
  expect(intent?.produced).toBe(produced);
  expect(produced?.producedBy).toBe(intent);
  // This is what the envelope shows, and it was reading "not concluded" while a claim took the name.
  expect(intent?.produced?.label).toBe('bearing-replaced');
});

test('a turn that wrote two readings keeps the first as the thing it produced', () => {
  // A move is the reading it acted on and then the ground it reached. Both hang off the declaration, and the one the
  // intent produced is the work: a strip naming `position` would say the turn was about a coordinate.
  const { records } = replay([
    { seq: 0, kind: 'intent', at: 0, label: 'drive', description: ':wheel-drive' },
    { seq: 1, kind: 'claim', at: 0, label: 'drive', worker: 'rover-1' },
    { seq: 2, kind: 'fact', at: 40, origin: 'rover-1/wheel', label: 'wheel-1', producedByLabel: 'drive' },
    { seq: 3, kind: 'fact', at: 80, origin: 'rover-1/position', label: 'position-1', producedByLabel: 'drive' },
  ]);
  const intent = records.find((record) => record.kind === 'intent');
  const [wheel, position] = records.filter((record) => record.kind === 'fact');
  expect(intent?.produced).toBe(wheel);
  expect(position?.producedBy).toBe(intent);
});

test('a declaration reaches the fact it started from', () => {
  const { records } = replay(DRIVE);
  const intent = records.find((record) => record.kind === 'intent');
  expect(intent?.from?.label).toBe('window-now');
});

test('a name with no record behind it resolves to nothing', () => {
  const { records } = replay([
    { seq: 0, kind: 'intent', at: 0, label: 'answer', fromLabel: 'missing', description: 'read' },
  ]);
  expect(records[0].from).toBeNull();
  expect(records[0].worker).toBeUndefined();
});

test('a conclusion whose declaration never arrived is dropped rather than shown loose', () => {
  // The wire is a stream and a deployment could start mid-record; a fact that reaches a declaration
  // nobody received is not a record this store can hold whole.
  const reading = links();
  const record = linkRecord(reading, {
    seq: 0,
    kind: 'fact',
    at: 0,
    label: 'outcome',
    producedByLabel: 'never-received',
  });
  expect(record).toBeNull();
  expect(reading.named.has('outcome')).toBe(false);
});

test('a replay is handed over as one change, so opening a project does not walk its history', () => {
  const socket = readFileSync(here('../src/hooks/useWebSocket.ts'), 'utf8');
  expect(socket, 'records are held as a burst').toContain('BURST_MS');
  expect(socket, 'and handed over together when the caller can take them').toContain('onRecords');
  expect(socket, 'the last record of a burst restarts its timer').toMatch(/clearTimeout\(burst\.timer\)/);
});

test('the trace reads what the feed delivered and not the project own file', () => {
  // The chain at the foot of the frame is the line just said and the machines it set off, and nothing renders here, so the
  // wiring is held where it can be read: given the file's records the strip stands still while the panels move, which is
  // what it did until the live turn began declaring itself. The strip is drawn by the frame's bottom edge, which is one
  // component because that edge stands in two places: between the columns and across the frame.
  const bar = readFileSync(here('../src/components/BottomBar.tsx'), 'utf8');
  expect(bar, 'the trace is handed what arrived').toMatch(/records=\{revealed\}/);
  expect(bar, 'and never the parse of the record file').not.toMatch(/records=\{model\.records/);
});
