// The round, read from the links the records carry.
//
// A command reaches several machines, and each of them declares, claims and writes. The round is not a second account of
// that: it is the chain of links the records already hold, walked backwards from the newest declaration. What is held here
// is the walk, because the strip at the foot of the frame draws exactly this and a strip that walked differently would be
// a second answer to what happened.

import { expect, test } from 'vitest';
import { boundsOf, roundOf, turnsOf } from '@ssccsorg/skene-kernel';
import type { Entry } from '@ssccsorg/skene-kernel';

/** One turn as the wire leaves it: a declaration, a claim, and the reading it produced. */
function turn(worker: string, said: string, wrote: string, from: Entry | null = null): Entry {
  const intent: Entry = { kind: 'intent', at: 0, origin: worker, label: `${worker}/${said}`, description: said, from };
  intent.claim = { kind: 'claim', at: 0, origin: worker, label: intent.label, worker };
  intent.worker = worker;
  intent.produced = { kind: 'fact', at: 0, origin: wrote, producedBy: intent };
  return intent;
}

test('a round is every turn the line reached, oldest first, with what each of them wrote', () => {
  const one = turn('rover-1', 'drive', 'rover-1/wheel');
  const two = turn('gate-1', 'read the tag', 'gate-1/tag', one.produced ?? null);
  const three = turn('board-1', 'write the score', 'board-1/score', two.produced ?? null);
  const turns = roundOf([
    one,
    one.claim as Entry,
    one.produced as Entry,
    two,
    two.claim as Entry,
    two.produced as Entry,
    three,
    three.claim as Entry,
    three.produced as Entry,
  ]);
  expect(turns.map((each) => each.worker)).toEqual(['rover-1', 'gate-1', 'board-1']);
  expect(turns.map((each) => each.wrote)).toEqual(['rover-1/wheel', 'gate-1/tag', 'board-1/score']);
  // What a turn was told by is the reading of the turn before it, which is the link the round is made of.
  expect(turns[1].from).toBe('rover-1/wheel');
  expect(turns[0].from, 'the line the pilot said comes from outside the round').toBe('');
});

test('the round is the one the newest declaration belongs to, and the ones before it are another round', () => {
  const first = turn('rover-1', 'drive', 'rover-1/wheel');
  const second = turn('gate-1', 'read the tag', 'gate-1/tag', first.produced ?? null);
  // A later round with no link to the first: a pilot said two lines, and the strip says what the space is doing now.
  const later = turn('hexapod-1', 'walk', 'hexapod-1/legs');
  expect(roundOf([first, first.claim as Entry, first.produced as Entry, second, second.claim as Entry, second.produced as Entry, later]).map((each) => each.worker)).toEqual(['hexapod-1']);
});

test('a turn that has declared and not written is a turn of the round, with no reading yet', () => {
  const quiet: Entry = { kind: 'intent', at: 0, origin: 'camera-1', label: 'camera-1/1', description: 'take a frame' };
  const turns = roundOf([quiet]);
  expect(turns).toEqual([
    { intent: quiet, worker: 'camera-1', said: 'take a frame', wrote: '', from: '', claimed: false },
  ]);
});

test('a declaration that reaches itself is cut rather than followed', () => {
  // A link that points back is a round with no beginning. A reader that followed it would stand on one record for ever.
  const loop: Entry = { kind: 'intent', at: 0, origin: 'rover-1', label: 'loop', description: 'drive' };
  loop.produced = { kind: 'fact', at: 0, origin: 'rover-1/wheel', producedBy: loop };
  loop.from = { kind: 'fact', at: 0, origin: 'rover-1/wheel', producedBy: loop };
  expect(roundOf([loop]).map((each) => each.said)).toEqual(['drive']);
});

test('a run with no declaration has no round', () => {
  expect(roundOf([{ kind: 'fact', at: 0, origin: 'rover-1/wheel' }])).toEqual([]);
});

test('a campaign chain is every declaration in the run, with the hints that bound it', () => {
  const first = turn('villa-ops', 'lift the patient', 'medevac-heli-1/rotor');
  const second = turn('rescue-robot-1', 'scan the patient', 'hospital-1/link', first.produced ?? null);
  const bounds: Entry[] = [
    { kind: 'hint', at: 0, label: 'vitals', content: 'hr=118' },
    { kind: 'hint', at: 0, label: 'hospital-choice', content: 'cardiac=ready' },
  ];
  const records = [bounds[0], first, first.claim as Entry, first.produced as Entry, bounds[1], second];

  expect(turnsOf(records).map((each) => each.worker)).toEqual(['villa-ops', 'rescue-robot-1']);
  expect(boundsOf(records).map((each) => each.label)).toEqual(['vitals', 'hospital-choice']);
});

test('a conclusion is named by its label, because it writes no origin', () => {
  const intent: Entry = {
    kind: 'intent',
    at: 18,
    origin: 'rescue-robot-1',
    label: 'scan-the-patient',
    description: 'scan the patient',
  };
  intent.worker = 'rescue-robot-1';
  intent.produced = { kind: 'fact', at: 174, label: 'scan-reported', producedBy: intent };
  expect(roundOf([intent, intent.produced]).map((each) => each.wrote)).toEqual(['scan-reported']);
});

test('a chain read before the claim arrives shows the declaration alone', () => {
  const intent: Entry = {
    kind: 'intent',
    at: 10,
    origin: 'villa-ops',
    label: 'emergency-lift',
    description: 'lift the patient',
  };
  const claim: Entry = { kind: 'claim', at: 12, label: 'emergency-lift', worker: 'villa-ops' };
  const produced: Entry = { kind: 'fact', at: 172, label: 'patient-arrived', producedBy: intent };
  intent.claim = claim;
  intent.worker = 'villa-ops';
  intent.produced = produced;

  const declared = roundOf([intent])[0];
  expect(declared.claimed).toBe(false);
  expect(declared.wrote).toBe('');

  const claimed = roundOf([intent, claim])[0];
  expect(claimed.claimed).toBe(true);
  expect(claimed.wrote).toBe('');

  const producedAt = roundOf([intent, claim, produced])[0];
  expect(producedAt.wrote).toBe('patient-arrived');
});
