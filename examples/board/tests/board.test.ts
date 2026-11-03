// The example board, held to the run it declares.
//
// This is the deployment's test, not the frame's: what is asserted here is that this board is a board the frame can read
// and that the numbers it pins are the numbers the run holds. The frame's own rules are held with the frame; a change to
// this board is a change to these expectations and to nothing in Skene.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

import { causesOf, effectsOf } from '@ssccsorg/skene-kernel';
import { validateProject } from '@ssccsorg/skene-frame/lib/contract';
import { graphOf } from '@ssccsorg/skene-frame/lib/graph';
import { boundsOf, intentsOf } from '@ssccsorg/skene-kernel';
import { bundleOf, type ProjectDocument } from '@ssccsorg/skene-frame/lib/project';
import { actors, chainFor, parseScenario, titleOf } from '@ssccsorg/skene-kernel';
import type { Bundle } from '@ssccsorg/skene-kernel';
import {
  buildModel,
  revealedCount,
  sceneStep,
  scenes,
  upto,
  whoOf,
  worldOf,
  writerOf,
} from '@ssccsorg/skene-frame/lib/world';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

const board = JSON.parse(readFileSync(`${ROOT}projects.json`, 'utf8')) as {
  projects: ProjectDocument[];
};

const document = board.projects[0];
const bundle = bundleOf(document, board.projects) as Bundle;
bundle.text = readFileSync(`${ROOT}${bundle.record}`, 'utf8');
bundle.title = titleOf(bundle.text) || bundle.id;

const model = buildModel(bundle.text ?? '', bundle);
const parsed = parseScenario(bundle.text ?? '');
const cut = scenes(model.events, bundle);
const at = (label: string) => model.records.find((entry) => entry.label === label);

test('the board proves, and it carries its view pack', () => {
  const proof = validateProject(document);
  expect(proof.ok, proof.ok ? '' : JSON.stringify(proof.issues)).toBe(true);
  expect(document.resources.map((resource) => resource.kind)).toContain('views');
});

test('the run is a title, a record, and the counts the file makes about itself', () => {
  expect(bundle.title).toBe('Skene example');
  expect(parsed.unknown).toEqual([]);
  expect(parsed.records).toHaveLength(23);
  expect(parsed.events).toHaveLength(25);
  expect(parsed.checks.map((check) => [check.at, check.expected, check.derived])).toEqual([
    [0, 8, 8],
    [0, 9, 9],
    [0, 10, 10],
    [0, 11, 11],
    [900, 12, 12],
    [1380, 19, 19],
  ]);
});

test('the run declares three chains and names who wrote each record', () => {
  expect(chainFor(parsed.records).map((chain) => chain.label)).toEqual(['answer', 'inspect', 'audit']);
  expect(actors(parsed.records).map((actor) => [actor.id, actor.role, actor.records])).toEqual([
    ['blackboard', 'writes', 1],
    ['worker-1', 'acts', 2],
    ['worker-2', 'writes', 2],
    ['machine-3', 'acts', 1],
    ['sensor-1', 'writes', 2],
    ['rover-1', 'writes', 7],
    ['camera-1', 'writes', 2],
    ['reader-1', 'writes', 1],
  ]);
  expect(boundsOf(parsed.records).map((hint) => hint.label)).toEqual(['bound']);
});

test('the run is cut into the five scenes, at the clocks the board declares', () => {
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
  expect(upto(cut, 3)).toBe(cut[2].to);
  expect(revealedCount(cut, { step: 5 })).toBe(model.events.length);
  expect(sceneStep(cut, 9)).toBe(2);
});

test('every member stands on the ground the record gave it', () => {
  const world = worldOf(model, cut.length);
  expect(world.here).toBe('resume');
  expect(world.entries).toBe(model.events.length);
  expect(world.storeLabel).toBe('Blackboard');

  const worker = world.standing.find((unit) => unit.id === 'worker-1');
  expect(worker?.ground[0]).toBeCloseTo(150);
  expect(worker?.ground[1]).toBeCloseTo(90);
  expect(worker?.path, 'the declared cell and the reading it wrote').toHaveLength(2);
  expect(worker?.written).toBe(4);

  const cells = new Set(world.standing.map((unit) => unit.at.join(',')));
  expect(cells.size, 'the interface gives every member a cell').toBe(world.standing.length);
});

test('a person stands in the space once they have written', () => {
  const nothing = worldOf(model, 1, 0);
  expect(nothing.present.map((unit) => unit.id)).not.toContain('reader-1');
  expect(worldOf(model, cut.length).present.map((unit) => unit.id)).toContain('reader-1');
});

test('the queue is in the three states it can be in', () => {
  const queue = intentsOf(model.events);
  expect(queue.map((each) => [each.id, each.state, each.worker])).toEqual([
    ['audit', 'open', null],
    ['inspect', 'claimed', 'machine-3'],
    ['answer', 'closed', 'worker-1'],
  ]);
  expect(queue.map((each) => each.declaredBy)).toEqual(['camera-1', 'worker-1', 'sensor-1']);
});

test('the graph carries the board and the declarations passed between members', () => {
  const graph = graphOf(model.events, bundle.place.units ?? {});
  expect(graph.nodes.map((node) => node.written)).toEqual([1, 4, 2, 1, 3, 7, 3, 1]);
  expect(graph.edges.map((edge) => `${edge.from}->${edge.to}:${edge.label}`)).toEqual([
    'sensor-1->worker-1:answer',
    'worker-1->machine-3:inspect',
  ]);
});

test('a record is its writer, and a hint is by the layer that set the bounds', () => {
  const declaration = model.records.find((entry) => entry.kind === 'intent')!;
  expect(writerOf(declaration)).toBe('sensor-1');
  expect(writerOf(at('work-done')!)).toBe('worker-1');
  expect(whoOf(at('bound')!)).toBe('policy');
  expect(effectsOf(at('reading-1')!, model.records).map((each) => each.role)).toEqual(['declared']);
  expect(causesOf(at('work-done')!).map((each) => each.role)).toEqual(['produced_by']);
});
