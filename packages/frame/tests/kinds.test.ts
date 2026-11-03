// The frame's atom seam: a project assembles a kind out of the frame's atoms, and every question about a member is
// asked of that assembly rather than of the member's name.
//
// The whole frame rests on this, so it is pinned here. A name no project assembled still answers, because a member the
// frame draws has a reading whatever its project said. A kind a project did assemble is exactly the atoms it listed and
// nothing is added under it, because the atoms are the directions a signal crosses a boundary in and a member that
// emits, or that work is addressed to, need not observe anything. A kind that names an atom the frame does not hold is
// refused where the bundle is read, because a member that silently lost the property its project meant it to have is a
// wrong drawing, and a wrong drawing is harder to see than a refusal.

import { expect, test } from 'vitest';
import { askable, kindsNamed, memberOf, partsOf, propertiesOf } from '@/lib/kinds';
import { ATOM_KEYS, type Properties, type Property } from '@ssccsorg/skene-kernel';

/** The atoms a member's answers hold, in the frame's own order, which is the order a panel reads them off in. */
const on = (properties: Properties) => ATOM_KEYS.filter((key) => properties[key]);

/** A project's own assembly, held as the bundle holds it: a name, and a list of atoms. */
const WORKSPACE: Record<string, Property[]> = { workspace: ['reads', 'writes', 'holds'] };

test('a name no project assembled is read and nothing else', () => {
  expect(on(propertiesOf(undefined, 'servo-drive'))).toEqual(['reads']);
  expect(on(propertiesOf({}, 'servo-drive'))).toEqual(['reads']);
});

test('a name a project assembled elsewhere is not borrowed for another', () => {
  expect(on(propertiesOf(WORKSPACE, 'sensor'))).toEqual(['reads']);
});

test('a kind is the atoms its project listed', () => {
  expect(on(propertiesOf(WORKSPACE, 'workspace'))).toEqual(['reads', 'writes', 'holds']);
});

test('a kind is taken as written, and reading is not put under it on the project behalf', () => {
  // The frame answers for a name it never heard of. A project assembles the rest, and a member that only emits, or that
  // work is only addressed to, does not observe anything: reading added there would answer a question the project had
  // already answered, in the one place the frame's own default is written.
  expect(on(propertiesOf({ person: ['person', 'writes'] }, 'person'))).toEqual(['writes', 'person']);
  expect(on(propertiesOf({ beacon: ['emits'] }, 'beacon'))).toEqual(['emits']);
  expect(on(propertiesOf({ arm: ['writes'] }, 'arm'))).toEqual(['writes']);
});

test('only an atom with something of its own to draw is a part', () => {
  const workspace = propertiesOf(WORKSPACE, 'workspace');
  // Three of the atoms draw: what a member can be asked is the row of controls that ask it, and what it holds is the
  // tree under it. Being a person answers a panel's question and has nothing of its own. The row is the member's own
  // interface, so the three directions offer it and the one that draws it is decided by `abilitiesOwner`.
  expect(partsOf(workspace).map((part) => part.key)).toEqual(['reads', 'writes', 'holds']);
  expect(partsOf(propertiesOf(undefined, 'sensor')).map((part) => part.key)).toEqual(['reads']);
});

test('showing its own state is a property and not a direction a line is said in', () => {
  // A drone shows where it stands and what its eye sees. That is the member speaking about itself, so it is not a
  // direction a turn is addressed in and it is not something the member holds.
  const drone = propertiesOf({ drone: ['reads', 'writes', 'emits', 'shows'] }, 'drone');
  expect(on(drone)).toEqual(['reads', 'writes', 'emits', 'shows']);
  expect(askable(drone), 'the first direction is still the one a control asks through').toBe('reads');
  expect(partsOf(drone).map((part) => part.key)).toEqual(['reads', 'writes', 'emits', 'shows']);
});

test('a kind that names an atom the frame does not hold is refused', () => {
  expect(() => kindsNamed({ robot: ['senses'] })).toThrow(/does not know/);
  expect(() => kindsNamed({ robot: 'senses' })).toThrow(/not a list of atoms/);
  expect(() => kindsNamed(null)).toThrow(/map of names/);
});

test('the atoms a project declares are read back as declared', () => {
  expect(kindsNamed({ workspace: ['holds', 'reads'] })).toEqual({ workspace: ['holds', 'reads'] });
});

test('what a member is to the space is one of three words, read from its own atoms', () => {
  // A user is a person, an agent is a member work can be given, and an entity is what only reads. The third is the
  // frame's own answer for a name no project assembled, which is a thing in the space that nothing is asked of.
  expect(memberOf(propertiesOf({ robot: ['reads', 'writes', 'holds'] }, 'robot')), 'work can be given to it').toBe('agent');
  expect(memberOf(propertiesOf({ camera: ['reads', 'emits'] }, 'camera')), 'a thing that only reads').toBe('entity');
  expect(memberOf(propertiesOf({ person: ['person', 'writes'] }, 'person')), 'a person is a user, not an agent').toBe(
    'user',
  );
  expect(memberOf(propertiesOf(undefined, 'servo-drive')), 'a name the frame never heard of').toBe('entity');
  // A person who writes is a user and not an agent: who a line may be said to is a question about the kind of member,
  // and a person is written to rather than asked. The same atoms asked twice are the same word, which is what lets the
  // list of members and the addresses of a line be one reading.
  const person = propertiesOf({ person: ['person', 'writes'] }, 'person');
  expect(memberOf(person)).toBe(memberOf(person));
});
