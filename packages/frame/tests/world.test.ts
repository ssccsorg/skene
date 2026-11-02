// The space and the record over it, held to the run they are read from.
//
// Everything the board draws is derived: the scenes from the timeline, the units from the place, the record's points from
// the writer's own interface position, and the ground from the moves the record wrote. So what is asserted here is that
// derivation, and the two claims the cockpit rests on: a place lays its units out the same way every time, and a record
// stands where its writer stands rather than where the machine happened to be.

import { expect, test } from 'vitest';

import { POLICY, buildModel, fromPlace, lineOf, revealedCount, sceneStep, scenes, upto, whoOf, worldOf, writerOf } from '@/lib/world';
import { example } from './board';

const { bundle, model } = example();
const cut = scenes(model.events, bundle);

/** The ground is a projection there and back, so it is held to the arithmetic rather than to a string. */
const close = (pair: [number, number] | undefined) => ({
  toBe: (expected: [number, number]) => {
    expect(pair?.[0]).toBeCloseTo(expected[0], 6);
    expect(pair?.[1]).toBeCloseTo(expected[1], 6);
  },
});

test('the run is cut into the scenes the project names, in the order it names them', () => {
  expect(cut.map((scene) => [scene.key, scene.events.length])).toEqual([
    ['record', 8],
    ['notice', 2],
    ['declare', 1],
    ['act', 3],
    ['resume', 11],
  ]);
  expect(cut.map((scene) => scene.clock)).toEqual([
    'the run',
    '10:00, the first reading',
    '10:00, the work declared',
    '10:04, taken',
    '10:20, the yard work',
  ]);
  // The cuts are found in the timeline, so the scenes are contiguous and cover it rather than overlapping it.
  expect(cut[0].from).toBe(0);
  for (let index = 1; index < cut.length; index += 1) expect(cut[index].from).toBe(cut[index - 1].to);
  expect(cut[cut.length - 1].to).toBe(model.events.length);
});

test('a step reveals the scenes up to it, and a cursor reveals what arrived', () => {
  expect(upto(cut, 0)).toBe(0);
  expect(upto(cut, 3)).toBe(cut[2].to);
  expect(upto(cut, 99), 'a step past the end is the end').toBe(model.events.length);
  expect(revealedCount(cut, { step: 3 })).toBe(cut[2].to);
  expect(revealedCount(cut, { cursor: 5 })).toBe(5);
  expect(revealedCount(cut, { cursor: 999 }), 'a cursor is held to the run').toBe(cut[cut.length - 1].to);
  // The step names the scene the cursor is inside, which is the one happening now.
  expect(sceneStep(cut, 9)).toBe(2);
  expect(sceneStep(cut, 0)).toBe(0);
});

test('the interface stands a unit in its own cell, and the record puts it on its own ground', () => {
  const world = worldOf(model, cut.length);
  expect(world.here).toBe('resume');
  expect(world.entries).toBe(model.events.length);

  const worker = world.standing.find((unit) => unit.id === 'worker-1');
  close(worker?.ground).toBe([150, 90]);
  expect(worker?.path.length, 'the declared cell and the reading it wrote').toBe(2);
  expect(worker?.written, 'a reading, the answer, the fact it produced and the declaration after it').toBe(4);

  const board = world.standing.find((unit) => unit.id === 'blackboard');
  close(board?.ground).toBe([320, 180]);
  expect(world.storeLabel).toBe('Blackboard');

  // The interface's own positions are a layout of the place, not a reading of the run: two units are two cells.
  const cells = new Set(world.standing.map((unit) => unit.at.join(',')));
  expect(cells.size).toBe(world.standing.length);
});

test('the same place lays its units out the same way every time it is read', () => {
  const again = worldOf(model, cut.length);
  expect(again.standing.map((unit) => [unit.id, unit.at])).toEqual(
    worldOf(model, cut.length).standing.map((unit) => [unit.id, unit.at]),
  );
});

test('a person stands in the space once they have intervened, and not because the place lists them', () => {
  const nothing = worldOf(model, 1, 0);
  expect(nothing.entries).toBe(0);
  expect(nothing.standing.map((unit) => unit.id)).toContain('reader-1');
  expect(nothing.present.map((unit) => unit.id), 'a reader who has written nothing is not a thing').not.toContain(
    'reader-1',
  );
  expect(nothing.present.map((unit) => unit.id), 'a device is in the space because the place says so').toContain(
    'blackboard',
  );

  const written = worldOf(model, cut.length);
  expect(written.present.map((unit) => unit.id)).toContain('reader-1');
});

test('a change moves the ground and leaves the interface, so a pick is still a pick', () => {
  const before = worldOf(model, cut.length).standing.find((unit) => unit.id === 'worker-2');
  const after = worldOf(model, cut.length, undefined, model.events, [
    { unit: 'worker-2', at: [200, 40], abilities: null },
  ]).standing.find((unit) => unit.id === 'worker-2');
  close(after?.ground).toBe([200, 40]);
  expect(after?.at).toEqual(before?.at);
  expect(after?.path[after.path.length - 1]).toEqual(fromPlace(bundle.place, 200, 40));
});

test('what a device reported in its turn is newer than every record, so it is the last step', () => {
  const world = worldOf(model, cut.length, undefined, model.events, [], { 'worker-2': [300, 20] });
  const worker = world.standing.find((unit) => unit.id === 'worker-2');
  close(worker?.ground).toBe([300, 20]);
  expect(worker?.at[0], 'the board reads the reported point through the place').toBeCloseTo(
    fromPlace(bundle.place, 300, 20)[0],
  );
});

test('a record is its writer, in the run\'s own words', () => {
  const intent = model.records.find((entry) => entry.kind === 'intent');
  const claim = model.events.find((entry) => entry.kind === 'claim');
  const hint = model.records.find((entry) => entry.kind === 'hint');
  const produced = model.records.find((entry) => entry.label === 'work-done');
  const reading = model.records.find((entry) => entry.label === 'reading-1');

  expect(writerOf(intent!), 'the declaration belongs to the reading it started from').toBe('sensor-1');
  expect(writerOf(produced!), 'the produced fact is the taker\'s own account').toBe('worker-1');
  expect(whoOf(hint!), 'a hint belongs to the layer that set the bounds').toBe(POLICY);
  expect(whoOf(intent!)).toBe('sensor-1');
  expect(lineOf(intent!)).toBe('take-the-work');
  expect(lineOf(claim!)).toBe('taken by worker-1');
  expect(lineOf(hint!)).toBe('ceiling=one,floor=zero');
  expect(lineOf(reading!)).toBe('reading-1');
});

test('a model is the declaration and the record read together', () => {
  const built = buildModel(bundle.text ?? '', bundle);
  expect(built.title).toBe('Skene example');
  expect(built.unknown).toEqual([]);
  expect(built.intents).toHaveLength(3);
  expect(built.hints).toHaveLength(1);
  expect(built.chain).toHaveLength(3);
  expect(built.project.id).toBe('example');
});
