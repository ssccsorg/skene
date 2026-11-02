// The scenario's own language, held to the file the engine runs.
//
// Every screen in the frame is read out of one text: the record's own script. So the parser is the frame's floor, and a
// misreading is not a cosmetic defect but a board that says something the run did not. What is asserted here is the
// vocabulary the example uses, the counts the file declares as its own check, and the two answers the rest of the frame
// is built on: who wrote a record, and what chain a declaration makes.

import { expect, test } from 'vitest';

import { actors, chainFor, entityOf, parseScenario, titleOf } from '@/lib/scenario';
import { scenario } from './board';

const parsed = parseScenario(scenario());

test('a run is a title, a record, and the checks the file makes about itself', () => {
  expect(titleOf(scenario()), 'the first line names the run').toBe('Skene example');
  expect(parsed.unknown, 'every verb the example uses is one this build reads').toEqual([]);
  expect(parsed.records).toHaveLength(10);
  // A claim is a step of the stream and writes nothing, so the timeline carries one entry the volume does not.
  expect(parsed.events).toHaveLength(11);
  expect(parsed.events.filter((entry) => entry.kind === 'claim')).toHaveLength(1);
});

test('every count the file declares is a count the parser derives', () => {
  expect(parsed.checks.map((check) => [check.at, check.expected, check.derived])).toEqual([
    [0, 4, 4],
    [0, 5, 5],
    [0, 6, 6],
    [0, 7, 7],
    [3600, 8, 8],
  ]);
});

test('a declaration reaches the reading it started from, the taker, and what it produced', () => {
  const [intent] = parsed.records.filter((entry) => entry.kind === 'intent');
  expect(intent.label).toBe('answer');
  expect(intent.description).toBe('take-the-work');
  expect(intent.from?.label, 'the reading the work started from').toBe('reading-1');
  expect(intent.worker).toBe('worker-1');
  expect(intent.claim?.kind).toBe('claim');
  expect(intent.produced?.label, 'the fact the work produced').toBe('work-done');
  // The produced fact carries the declaration that made it, which is the one link the volume keeps.
  expect(intent.produced?.producedBy).toBe(intent);
  expect(intent.at).toBe(0);
});

test('a hint is a bound and nothing else, so it belongs to no entity', () => {
  const [hint] = parsed.records.filter((entry) => entry.kind === 'hint');
  expect(hint.label).toBe('bound');
  expect(hint.content).toBe('ceiling=one,floor=zero');
  expect(entityOf(hint.origin)).toBe('');
});

test('a record is named by its writer and its chain by its declaration', () => {
  expect(actors(parsed.records)).toEqual([
    { id: 'blackboard', role: 'writes', records: 1 },
    { id: 'worker-1', role: 'acts', records: 3 },
    { id: 'worker-2', role: 'writes', records: 2 },
    { id: 'reader-1', role: 'writes', records: 1 },
  ]);
  const [chain] = chainFor(parsed.records);
  expect(chain).toMatchObject({
    label: 'answer',
    from: expect.objectContaining({ label: 'reading-1' }),
    worker: 'worker-1',
    produced: expect.objectContaining({ label: 'work-done' }),
  });
});

test('the clock moves by ticks, and a position is a fact written where it happened', () => {
  const positions = parsed.records.filter((entry) => entry.origin?.endsWith('/position'));
  expect(positions).toHaveLength(4);
  expect(positions[0]).toMatchObject({ origin: 'blackboard/position', content: '260,88', at: 0, bytes: 16 });
  expect(parsed.records[parsed.records.length - 1].at, 'the tick before the last reading').toBe(3600);
});

test('a bulk write places its readings at the interval it is given and leaves the clock on the last', () => {
  const { records, checks } = parseScenario('tick 5\nwrite 3 64 sensor 2\ncount 3\n');
  expect(records.map((entry) => entry.at)).toEqual([5, 7, 9]);
  expect(records.every((entry) => entry.origin === 'sensor' && entry.bytes === 64)).toBe(true);
  expect(checks[0].derived).toBe(3);
});

test('a path is a route rather than two endpoints, and it ends where it was sent', () => {
  const { records } = parseScenario('path rover-1 0,0 10,10 3 1\n');
  expect(records.map((entry) => entry.content)).toEqual(['0,0', '5,5', '10,10']);
  expect(records.map((entry) => entry.at)).toEqual([0, 1, 2]);
});

test('a verb this build does not read is reported rather than dropped', () => {
  const { unknown } = parseScenario('teleport rover-1 moon\n');
  expect(unknown).toEqual(['teleport']);
});

test('a position that is not a pair is refused where it is written, not drawn as a place', () => {
  expect(() => parseScenario('position rover-1 nowhere\n')).toThrow(/not a pair of coordinates/);
});

test('a file whose first line is not a title has no name of its own', () => {
  expect(titleOf('seed 1\n# later\n')).toBe('');
  expect(titleOf('#   Named  \n')).toBe('Named');
  expect(titleOf('')).toBe('');
});
