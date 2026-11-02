// The run split by writer, held without a screen.
//
// The transport's expanded rows are only coherent if they are the same run: every record on exactly one row, in the
// order the run brought the writers in. That is what these hold, plus the two ways a record names its writer.

import { expect, test } from 'vitest';

import { tracksOf, writerOf } from '@/lib/tracks';
import type { Entry } from '@/lib/types';

const fact = (origin: string): Entry => ({ kind: 'fact', at: 0, origin });
const claim = (worker: string): Entry => ({ kind: 'claim', at: 0, worker });

test('a record belongs to the entity its origin opens with', () => {
  expect(writerOf(fact('spiderpi/legs'))).toBe('spiderpi');
  expect(writerOf(fact('kletos/note'))).toBe('kletos');
  // A part is not a writer: the leg is where the reading stands, and the spider is who wrote it.
  expect(tracksOf([fact('spiderpi/legs'), fact('spiderpi/sonar')]).map((track) => track.id)).toEqual([
    'spiderpi',
  ]);
});

test('a step with no origin belongs to its worker, and one with neither belongs to the room', () => {
  expect(writerOf(claim('litewing'))).toBe('litewing');
  expect(writerOf({ kind: 'claim', at: 0 })).toBe('the room');
});

test('every record lands on exactly one track', () => {
  const run: Entry[] = [
    fact('spiderpi/legs'),
    fact('kletos/note'),
    claim('litewing'),
    fact('spiderpi/position'),
    fact('litewing/rotor'),
    { kind: 'hint', at: 0, label: 'yard-bounds' },
  ];
  const tracks = tracksOf(run);
  expect(tracks.reduce((count, track) => count + track.ticks.length, 0)).toBe(run.length);
  // The record's place in the run is on the tick, so a row can be drawn on the run's own axis.
  const placed = tracks.flatMap((track) => track.ticks.map((tick) => tick.at)).sort((a, b) => a - b);
  expect(placed).toEqual(run.map((_, at) => at));
});

test('the rows come in the order the run brings the writers in', () => {
  const run: Entry[] = [
    fact('spiderpi/legs'),
    fact('kletos/note'),
    fact('spiderpi/position'),
    claim('litewing'),
  ];
  expect(tracksOf(run).map((track) => track.id)).toEqual(['spiderpi', 'kletos', 'litewing']);
});

test('a claim is counted, because a step of the stream is not a reading', () => {
  const tracks = tracksOf([claim('spiderpi'), fact('spiderpi/legs'), claim('spiderpi')]);
  expect(tracks[0].claims).toBe(2);
  expect(tracks[0].ticks.map((tick) => tick.kind)).toEqual(['claim', 'fact', 'claim']);
});
