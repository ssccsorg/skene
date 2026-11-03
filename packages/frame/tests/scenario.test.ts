// The scenario's own language, read from text the test owns.
//
// The parser is the frame's floor: every screen is read out of one record's script, so a misreading is not a cosmetic
// defect but a board that says something the run did not. What is held here is the vocabulary and the arithmetic, over
// text written for these assertions rather than over a deployment's run.

import { expect, test } from 'vitest';

import { actors, chainFor, entityOf, parseScenario, titleOf } from '@ssccsorg/skene-kernel';

const RUN = `# One run
seed 1

tick 0
position store 50,50
count 1
fact seen 8 mover/observation
hint limit one
count 2
intent fix seen repair
claim fix mover
fact fixed 8 mover/result
count 3
conclude fix ok
count 4
`;

const parsed = parseScenario(RUN);

test('a run is a title, a record, and the counts the file makes about itself', () => {
  expect(titleOf(RUN)).toBe('One run');
  expect(parsed.unknown).toEqual([]);
  // The hint and the declaration are records; the claim is a step of the stream and writes nothing.
  expect(parsed.records).toHaveLength(6);
  expect(parsed.events).toHaveLength(7);
  expect(parsed.events.filter((entry) => entry.kind === 'claim')).toHaveLength(1);
  expect(parsed.checks.map((check) => [check.expected, check.derived])).toEqual([
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
  ]);
});

test('a declaration reaches the reading it started from, the taker, and what it produced', () => {
  const [intent] = parsed.records.filter((entry) => entry.kind === 'intent');
  expect(intent.label).toBe('fix');
  expect(intent.description).toBe('repair');
  expect(intent.from?.label, 'the reading the work started from').toBe('seen');
  expect(intent.worker).toBe('mover');
  expect(intent.claim?.kind).toBe('claim');
  expect(intent.produced?.label, 'the fact the work produced').toBe('ok');
  expect(intent.produced?.producedBy, 'the produced fact carries the declaration that made it').toBe(intent);
});

test('a hint is a bound and nothing else, so it belongs to no entity', () => {
  const [hint] = parsed.records.filter((entry) => entry.kind === 'hint');
  expect(hint.label).toBe('limit');
  expect(hint.content).toBe('one');
  expect(entityOf(hint.origin)).toBe('');
});

test('a record is named by its writer and its chain by its declaration', () => {
  expect(actors(parsed.records)).toEqual([
    { id: 'store', role: 'writes', records: 1 },
    // The reading it wrote and the result it wrote: the fact a declaration produced carries no origin of its own.
    { id: 'mover', role: 'acts', records: 2 },
  ]);
  const [chain] = chainFor(parsed.records);
  expect(chain).toMatchObject({ label: 'fix', worker: 'mover' });
});

test('a bulk write places its readings at the interval it is given and leaves the clock on the last', () => {
  const { records, checks } = parseScenario('tick 5\nwrite 3 64 sensor 2\ncount 3\n');
  expect(records.map((entry) => entry.at)).toEqual([5, 7, 9]);
  expect(records.every((entry) => entry.origin === 'sensor' && entry.bytes === 64)).toBe(true);
  expect(checks[0].derived).toBe(3);
});

test('a path is a route rather than two endpoints, and it ends where it was sent', () => {
  const { records } = parseScenario('path rover 0,0 10,10 3 1\n');
  expect(records.map((entry) => entry.content)).toEqual(['0,0', '5,5', '10,10']);
  expect(records.map((entry) => entry.at)).toEqual([0, 1, 2]);
});

test('a verb this build does not read is reported rather than dropped', () => {
  expect(parseScenario('teleport rover moon\n').unknown).toEqual(['teleport']);
});

test('a position that is not a pair is refused where it is written, not drawn as a place', () => {
  expect(() => parseScenario('position rover nowhere\n')).toThrow(/not a pair of coordinates/);
});

test('a file whose first line is not a title has no name of its own', () => {
  expect(titleOf('seed 1\n# later\n')).toBe('');
  expect(titleOf('#   Named  \n')).toBe('Named');
  expect(titleOf('')).toBe('');
});
