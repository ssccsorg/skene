// The space as a graph: the participants, and the work one declared and another took.
//
// There is no store node, because every unit keeps its own store and a central one is the thing the record model does not
// have. So the graph is the place's own list, plus any writer the place forgot, and the only edges are declarations
// passed between two different participants.

import { expect, test } from 'vitest';

import { graphOf } from '@/lib/graph';
import type { Entry } from '@/lib/types';
import { example } from './board';

const { bundle, model } = example();

test('a node is a participant the place declares, whether or not the run reached it', () => {
  const graph = graphOf(model.events, bundle.place.units ?? {});
  expect(graph.nodes.map((node) => node.id)).toEqual([
    'blackboard',
    'worker-1',
    'worker-2',
    'machine-3',
    'sensor-1',
    'rover-1',
    'camera-1',
    'reader-1',
  ]);
  expect(graph.nodes.map((node) => node.written)).toEqual([1, 4, 2, 1, 3, 7, 3, 1]);
});

test('a participant the place forgot is appended rather than dropped', () => {
  const entry: Entry = { kind: 'fact', label: 'stray', origin: 'stranger/observation', at: 0 };
  const graph = graphOf([entry], { 'rover-1': {} });
  expect(graph.nodes).toEqual([
    { id: 'rover-1', written: 0 },
    { id: 'stranger', written: 1 },
  ]);
});

test('an edge is a declaration passed to someone else, and a claim is not a record', () => {
  const started: Entry = { kind: 'fact', label: 'reading', origin: 'reader/observation', at: 0 };
  const intent: Entry = { kind: 'intent', label: 'take-it', from: started, at: 0 };
  intent.worker = 'worker-1';
  intent.claim = { kind: 'claim', label: 'take-it', worker: 'worker-1', at: 0 };

  const graph = graphOf([started, intent, intent.claim], { reader: {}, 'worker-1': {} });
  expect(graph.edges).toEqual([
    { id: 'intent-take-it-0', from: 'reader', to: 'worker-1', label: 'take-it' },
  ]);
  // The claim is a step of the stream, so it is neither a node's count nor an edge of its own. The declaration is
  // attributed to the reader whose reading it started from, so it is that party's record too.
  expect(graph.nodes.map((node) => node.written)).toEqual([2, 0]);
});

test('the example\'s edges are the declarations passed across two parties, and a claim is not a record', () => {
  // Two chains have a taker: the sensor's reading goes to a worker, and the worker's answer goes to a machine. The
  // third is nobody's, so it is a declaration with no edge rather than an edge to nowhere.
  const graph = graphOf(model.events, bundle.place.units ?? {});
  expect(graph.edges.map((edge) => `${edge.from}->${edge.to}:${edge.label}`)).toEqual([
    'sensor-1->worker-1:answer',
    'worker-1->machine-3:inspect',
  ]);
});

test('a party that declares work and takes it itself is not an edge to itself', () => {
  const started: Entry = { kind: 'fact', label: 'reading', origin: 'reader/observation', at: 0 };
  const own: Entry = { kind: 'intent', label: 'own-work', from: started, at: 0 };
  own.worker = 'reader';
  expect(graphOf([started, own], { reader: {} }).edges).toEqual([]);
});

test('a declaration is drawn only between two parties the graph holds', () => {
  const started: Entry = { kind: 'fact', label: 'reading', origin: 'reader/observation', at: 0 };
  const intent: Entry = { kind: 'intent', label: 'take-it', from: started, at: 0 };
  intent.worker = 'worker-1';

  // The taker wrote nothing and the place does not list it, so there is no node to draw the edge to.
  expect(graphOf([started, intent], { reader: {} }).edges).toEqual([]);
  // Once the take is in the record, the taker is a writer and the declaration is an edge.
  const answer: Entry = { kind: 'fact', label: 'done', origin: 'worker-1/result', at: 0 };
  expect(graphOf([started, intent, answer], { reader: {} }).edges).toHaveLength(1);
});
