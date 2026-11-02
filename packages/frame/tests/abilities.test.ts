// The member's own interface: what it can be asked, and which atom draws it.
//
// What can be run is the member's own answer, and the place's own declaration of what a member is for is a different fact
// about it. So the frame draws the answer in the row of controls under a picked member and filters the list on the same
// reading (`lib/interface`), and a member the room answers nothing about is drawn with no ability in either place rather
// than with its declaration in one of them. What the atoms decide is held here too: the row is one row, so a member
// assembled out of two directions draws it once, and the atoms are the same question asked of a member that reads, that is
// addressed, or that emits.
//
// The line a press composes is pinned with it, because it is the whole of how the interface is one: a reading and a
// command are the same control, the same mark and the same line, and what answers the request is the member's own
// surface rather than the frame.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { askLine } from '@/components/Abilities';
import { drawnAbilities, wordsOf } from '@/lib/interface';
import { askable, askableNames, propertiesOf } from '@/lib/kinds';
import { ATOM_KEYS, type Properties, type Property, type Standing } from '@/lib/types';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** A project's own assembly, held as the bundle holds it. */
const KINDS: Record<string, Property[]> = {
  camera: ['reads', 'emits'],
  machine: ['reads', 'writes'],
  belt: ['reads', 'writes'],
  arm: ['writes'],
  beacon: ['emits'],
  folder: ['reads', 'writes', 'holds'],
  person: ['person'],
};

const owner = (name: string) => askable(propertiesOf(KINDS, name));

test('a member that reads draws its interface through reading', () => {
  // Reading stands first in the frame's order, so a member that reads owns the row whatever else it is.
  expect(owner('camera')).toBe('reads');
  expect(owner('machine')).toBe('reads');
  expect(owner('folder')).toBe('reads');
});

test('a member whose only direction is being addressed draws it through that', () => {
  expect(owner('arm')).toBe('writes');
});

test('a member that only emits draws it through emitting', () => {
  expect(owner('beacon')).toBe('emits');
});

test('a person is not a member a line is said to, so nothing draws a row for one', () => {
  expect(owner('person')).toBeNull();
});

test('a name no project assembled is read and nothing else, which is a reading', () => {
  expect(askable(propertiesOf(undefined, 'servo-drive'))).toBe('reads');
});

test('the row a press composes is the same one for a reading and for a command', () => {
  // The interface is one and what answers is the member's own surface: the mark promises that the line is run where the
  // work is and no model is called, and that promise is what makes a reading cheap enough to ask for.
  expect(askLine('frame-capture')).toBe(':frame-capture');
  expect(askLine('wheel-drive')).toBe(':wheel-drive');
});

test('every direction atom can own the row, so no direction is a member the frame cannot ask', () => {
  // A direction the frame knows and never draws with would be an atom that answers a panel's question and offers a
  // pilot nothing, which is the hole this closes.
  const owners = (['reads', 'writes', 'emits'] as Property[]).map((key) =>
    askable({ ...empty(), [key]: true }),
  );
  expect(owners).toEqual(['reads', 'writes', 'emits']);
});

test('the names a line may be said to are the members that can be asked', () => {
  // The menu and the row of controls are one question, so they are one answer: a member offered as an addressee is a
  // member whose own reading offers the controls to ask it, and one a pilot can only read is offered by neither.
  const standing = ['camera', 'machine', 'person', 'refuse-bin'].map((name) => ({
    id: name,
    properties: propertiesOf({ ...KINDS, 'refuse-bin': ['holds'] }, name),
  }));
  expect(askableNames('game', standing)).toEqual(['game', 'camera', 'machine']);
});

function empty(): Properties {
  return Object.fromEntries(ATOM_KEYS.map((key) => [key, false])) as Properties;
}

/** One member of a space as the panel draws it: what the place declares of it, and nothing the room has said yet. */
function member(declares: string[], kind = 'belt'): Standing {
  return {
    id: 'conveyor-7',
    icon: kind,
    model: null,
    role: null,
    title: null,
    properties: propertiesOf(KINDS, kind),
    abilities: declares,
    holdsAt: 'conveyor-7',
    at: [0, 0, 0],
    from: [0, 0, 0],
    orbital: false,
    altitude: null,
    watch: null,
    ground: [0, 0],
    path: [[0, 0, 0]],
    moved: false,
    written: 0,
  };
}

const BELT = member(['speed-control', 'run-log']);

/** What a room says about a member, in the pairs a control is drawn from. */
const SAID = [{ name: 'speed-control', does: 'set the belt speed' }];

test('a member is drawn with what the room answered and never with what the place declared', () => {
  // The list and the row are one reading, and this is the whole of it: a chip drawn from the declaration is a control the
  // row cannot offer, so a chip drawn from the declaration is a list of members a pilot opens one at a time to find out
  // which of them can be asked anything. The declaration below is unchanged across the three cases and drawn in none.
  expect(drawnAbilities(BELT, SAID)).toEqual(SAID);
  expect(drawnAbilities(BELT, []), 'a room that answered nothing draws no ability').toEqual([]);
  expect(drawnAbilities(BELT, null), 'a member nobody has answered about draws none either').toEqual([]);
  expect(BELT.abilities, 'the declaration is the same one throughout').toEqual(['speed-control', 'run-log']);
});

test('a person is drawn with no ability whatever the room answers, in both places that draw one', () => {
  // A person states work rather than being given it, so an answer about one is not an interface a control can be drawn
  // from. The rule is the reading's and not a panel's, which is what keeps the list of members and the row of controls
  // under a picked member from disagreeing about a member the two of them share.
  const who = member(['approve', 'assign'], 'person');
  expect(drawnAbilities(who, SAID)).toEqual([]);
  expect(wordsOf(who, SAID), 'and no word of the answer finds them either').not.toContain('speed-control');
});

test('the row draws the reading and the list filters on it, which is what a test cannot see', () => {
  // Nothing in this suite renders a panel, so the drawing is held where it can be read: the row goes through the reading,
  // and the list's filter does too, so a revert to `unit.abilities` in either leaves every test in this file green while
  // the chips promise work the row refuses. The list draws no chip of its own: the row of controls under a picked member
  // is the one place a member's abilities are drawn, which is what a member with two directions no longer duplicates.
  const panel = readFileSync(here('../src/components/EntityPanel.tsx'), 'utf8');
  const row = readFileSync(here('../src/components/Abilities.tsx'), 'utf8');
  expect(panel, 'the list filters on the reading').toMatch(/wordsOf\(unit, asks\(unit\.id\)\)/);
  expect(panel, 'and never the place declaration').not.toMatch(/\.abilities\b/);
  expect(panel, 'and draws no chip of its own').not.toMatch(/data-region="abilities"/);
  expect(row, 'the row draws the reading').toMatch(/drawnAbilities\(member, asks\(member\.id\)\)/);
  expect(row, 'and never the place declaration').not.toMatch(/\.abilities\b/);
});

test('the words a row is searched by are the ones it draws, so no word finds a row that shows nothing', () => {
  // A search is how a pilot finds a member whose row says what can be asked of it, so a declared name that reaches no
  // answer would be a filter promising what the drawing does not: `torque-control` finds nothing while the row is empty.
  expect(wordsOf(BELT, null)).toEqual(['belt', '', '', 'agent']);
  expect(wordsOf(BELT, [])).toEqual(['belt', '', '', 'agent']);
  expect(wordsOf(BELT, SAID)).toEqual(['belt', '', '', 'agent', 'speed-control']);
});
