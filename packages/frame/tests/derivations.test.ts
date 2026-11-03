// The frame's derivations, read over a fixture of the frame's own.
//
// The frame is tested with data it owns. The demonstration's board is one deployment's data, and a suite that reads it
// is a suite that breaks when that deployment is edited, which is a coupling between the frame and one example rather
// than a test of the frame. What stands here is a small board written for these assertions: three members, one
// declaration, and a movement after it.
//
// The same goes for the scenes, the queue, the graph and the campaign evaluator: each is derived from the scenario
// below, so a change in the format shows up here before it shows up in a deployment.

import { expect, test } from 'vitest';

import { campaignAt } from '@/lib/campaign';
import { causesOf, effectsOf } from '@/lib/causes';
import { graphOf } from '@/lib/graph';
import { boundsOf, intentsOf } from '@/lib/intents';
import { buildModel, lineOf, revealedCount, sceneStep, scenes, upto, whoOf, worldOf, writerOf } from '@/lib/world';
import type { Bundle, Campaign } from '@/lib/types';

/** A run the frame owns: one reading, one declaration, one movement after it. */
const SCENARIO = `# Fixture run
seed 1

tick 0
position store 50,50
position mover 10,10
position watcher 90,90
count 3
fact seen 8 mover/observation
hint limit one
count 4
intent fix seen repair
claim fix mover
fact fixed 8 mover/result
count 5
conclude fix ok
count 6
tick 60
position mover 40,60
count 7
`;

const BUNDLE = {
  id: 'fixture',
  title: 'fixture',
  record: 'fixture.txt',
  clock: {},
  resources: [],
  kinds: {
    store: ['reads'],
    mover: ['reads', 'writes', 'emits'],
    watcher: ['person'],
  },
  place: {
    view: [0, 0, 100, 100],
    units: {
      store: { icon: 'store' },
      mover: { icon: 'mover' },
      watcher: { icon: 'watcher', role: 'member' },
    },
    store: { label: 'Store' },
  },
} as unknown as Bundle;

const model = () => buildModel(SCENARIO, BUNDLE);
const cut = scenes(model().events, BUNDLE);
const at = (label: string) => model().records.find((entry) => entry.label === label);

test('the run is cut into the five scenes, in the order the format gives them', () => {
  expect(cut.map((scene) => [scene.key, scene.events.length])).toEqual([
    ['record', 3],
    ['notice', 2],
    ['declare', 1],
    ['act', 3],
    ['resume', 1],
  ]);
  expect(upto(cut, 3)).toBe(cut[2].to);
  expect(revealedCount(cut, { step: 5 })).toBe(model().events.length);
  expect(revealedCount(cut, { cursor: 4 })).toBe(4);
  expect(sceneStep(cut, 4)).toBe(2);
});

test('a unit stands where the record put it, and the interface does not move', () => {
  const world = worldOf(model(), cut.length);
  const mover = world.standing.find((unit) => unit.id === 'mover');
  expect(mover?.ground[0]).toBeCloseTo(40);
  expect(mover?.ground[1]).toBeCloseTo(60);
  expect(mover?.path, 'the first ground and the one after it').toHaveLength(2);
  expect(mover?.written).toBe(6);
  expect(world.storeLabel).toBe('Store');

  const moved = worldOf(model(), cut.length, undefined, model().events, [
    { unit: 'mover', at: [5, 5], abilities: null },
  ]).standing.find((unit) => unit.id === 'mover');
  expect(moved?.ground[0]).toBeCloseTo(5);
  expect(moved?.ground[1]).toBeCloseTo(5);
  expect(moved?.at).toEqual(mover?.at);
});

test('a person stands in the space once they have written', () => {
  const nothing = worldOf(model(), 1, 0);
  expect(nothing.present.map((unit) => unit.id), 'a reader who wrote nothing is not a thing').not.toContain(
    'watcher',
  );
  expect(worldOf(model(), cut.length).present.map((unit) => unit.id)).toContain('watcher');
});

test('a record is its writer, and a hint is by the layer that set the bounds', () => {
  const declaration = model().records.find((entry) => entry.kind === 'intent')!;
  expect(writerOf(declaration)).toBe('mover');
  expect(whoOf(declaration)).toBe('mover');
  expect(whoOf(at('limit')!)).toBe('policy');
  expect(lineOf(declaration)).toBe('repair');
  expect(lineOf(at('ok')!)).toBe('ok');
});

test('the queue reads what can be taken first, and the declaration closes in its outcome', () => {
  const queue = intentsOf(model().events);
  expect(queue.map((each) => [each.id, each.state, each.worker, each.produced])).toEqual([
    ['fix', 'closed', 'mover', 'ok'],
  ]);
  expect(boundsOf(model().records).map((entry) => entry.label)).toEqual(['limit']);
});

test('the graph is the place and its declarations, and a claim is not a record', () => {
  const graph = graphOf(model().events, BUNDLE.place.units ?? {});
  expect(graph.nodes.map((node) => node.id)).toEqual(['store', 'mover', 'watcher']);
  expect(graph.nodes.map((node) => node.written)).toEqual([1, 6, 1]);
  // The mover declared and took its own work, so the one edge the graph could draw is a self-edge it does not.
  expect(graph.edges).toEqual([]);
});

test('what a record came from and what it led to are the links the record holds', () => {
  const declaration = model().records.find((entry) => entry.kind === 'intent')!;
  expect(causesOf(declaration).map((each) => each.role)).toEqual(['from_facts']);
  expect(causesOf(at('ok')!).map((each) => each.role)).toEqual(['produced_by']);
  expect(effectsOf(declaration, model().records).map((each) => each.role)).toEqual([
    'claimed_by',
    'to_fact',
  ]);
  expect(effectsOf(at('seen')!, model().records).map((each) => each.role)).toEqual(['declared']);
});

test('a campaign is read over the run, and its objectives are predicates over the records', () => {
  const campaign = {
    id: 'one',
    title: 'One',
    start: { fact: 'seen' },
    end: { fact: 'ok' },
    objectives: [
      { id: 'take', title: 'Taken', when: { intent: 'fix' } },
      { id: 'done', title: 'Done', when: { fact: 'ok' }, within: 0 },
    ],
  } as Campaign;
  const progress = campaignAt(campaign, model().events, 0);
  expect(progress.state).toBe('ended');
  expect([progress.startedAt, progress.endedAt]).toEqual([0, 0]);
  expect(progress.objectives.map((each) => each.state)).toEqual(['met', 'met']);
  expect(progress.failed).toBe(false);

  // Nothing has happened at a second before the run starts.
  expect(campaignAt(campaign, [], 0).state).toBe('pending');
});
