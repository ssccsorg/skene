// The links a record holds, read as the two directions a player moves in.
//
// A declaration keeps both of its own links and a produced fact keeps the declaration that made it, so those directions
// are stored. The one link that runs the other way, a declaration that started from a fact, is only findable by reading
// the run, which is why `effectsOf` is handed the records and `causesOf` is not.

import { expect, test } from 'vitest';

import { causesOf, effectsOf } from '@/lib/causes';
import { example } from './board';

const { model } = example();

const intent = model.records.find((entry) => entry.kind === 'intent')!;
const produced = model.records.find((entry) => entry.label === 'work-done')!;
const reading = model.records.find((entry) => entry.label === 'reading-1')!;
const claim = model.events.find((entry) => entry.kind === 'claim')!;

test('what a record came from is read from the record alone', () => {
  expect(causesOf(intent).map((each) => each.role)).toEqual(['from_facts']);
  expect(causesOf(intent)[0].record).toBe(reading);
  expect(causesOf(produced).map((each) => each.role)).toEqual(['produced_by']);
  expect(causesOf(produced)[0].record).toBe(intent);
  // A reading the run wrote from nothing has nothing behind it.
  expect(causesOf(reading)).toEqual([]);
});

test('what a declaration led to is the taker and the fact it produced', () => {
  expect(effectsOf(intent, model.records).map((each) => each.role)).toEqual(['claimed_by', 'to_fact']);
  expect(effectsOf(intent, model.records)[0].record).toBe(claim);
  expect(effectsOf(intent, model.records)[1].record).toBe(produced);
});

test('what a fact led to is the work declared from it, which only the run can say', () => {
  const [declared] = effectsOf(reading, model.records);
  expect(declared.role).toBe('declared');
  expect(declared.record).toBe(intent);
  // The same fact with the declaration left out of the run led to nothing, because the link is not on the record.
  expect(effectsOf(reading, [reading])).toEqual([]);
  expect(effectsOf(produced, model.records), 'a produced fact is where the work ended').toEqual([]);
});
