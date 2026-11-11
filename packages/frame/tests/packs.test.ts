// The board's plugin seam: a pack of readings, the readings a project stands, and the resource kinds a pack brings.
//
// The frame's own views (the sphere, the map) are the `native` pack, so nothing is privileged by being built in. What
// these tests pin is that a domain reaches the board through one declaration and that the frame learns nothing about
// it: a project names a pack, stands the readings it wants, and declares a resource the frame has never heard of.

import { expect, test } from 'vitest';
import { NATIVE, landingOf, standing } from '@/lib/packs';
import { bundleOf, registerResource, type ProjectDocument } from '@/lib/project';
import type { Reading } from '@/lib/readings';

const View = () => null;
const reading = (key: string, extra: Partial<Reading> = {}): Reading => ({
  key,
  path: `/${key}`,
  View,
  ...extra,
});

/** A board wide enough to tell the three kinds of reading apart. */
const READINGS = [
  reading('space'),
  reading('map', { pane: true }),
  reading('hex', { asked: true }),
  reading('field', { pack: 'spec' }),
  reading('ledger', { pack: 'spec' }),
];

test('the frame’s own readings are a pack, and one that asks to be asked for still is', () => {
  const keys = standing(READINGS).map((each) => each.key);
  expect(keys, 'a native reading stands for a project that says nothing').toContain('space');
  expect(keys, 'a native reading that declares itself asked waits').not.toContain('hex');
  expect(keys, 'another pack’s reading waits for the project').not.toContain('field');
});

test('a project that names a main reading opens on it, before the pilot’s last one', () => {
  const landed = landingOf(READINGS, { pack: 'spec', main: 'ledger' }, 'space');
  expect(landed?.key, 'the project has said which picture it is').toBe('ledger');
});

test('a project that names none opens where the pilot was, then on the register’s first', () => {
  expect(landingOf(READINGS, undefined, 'space')?.key, 'the pilot’s last reading').toBe('space');
  expect(landingOf(READINGS, undefined, 'gone')?.key, 'a reading that is no longer there').toBe('space');
  expect(landingOf([], undefined, 'space'), 'no readings, no landing').toBeNull();
});

test('a project that does not name the pack does not get its readings', () => {
  const keys = standing(READINGS, { views: { main: 'field' } }).map((each) => each.key);
  expect(keys).not.toContain('field');
});

test('naming the pack is the whole of what a project has to say', () => {
  const standing_ = standing(READINGS, { views: { pack: 'spec' } }).map((each) => each.key);
  expect(standing_, 'the pack’s readings stand').toEqual(expect.arrayContaining(['field', 'ledger']));
  expect(standing_, 'and the frame’s own stand beside them').toContain('space');
});

test('a pack may be a list, so two domains ride together', () => {
  const keys = standing([...READINGS, reading('orbit', { pack: 'flight' })], {
    views: { pack: ['spec', 'flight'] },
  }).map((each) => each.key);
  expect(keys).toEqual(expect.arrayContaining(['field', 'ledger', 'orbit']));
});

test('on names the readings exactly, which is how a project takes a subset', () => {
  const keys = standing(READINGS, { views: { pack: 'spec', on: ['field'] } }).map((each) => each.key);
  expect(keys).toEqual(['field']);
});

test('the layout a project already wrote still asks for an asked reading', () => {
  const keys = standing(READINGS, { layout: { hex: true } }).map((each) => each.key);
  expect(keys).toContain('hex');
});

test('a project’s view declaration is part of its bundle', () => {
  const document: ProjectDocument = {
    id: 'spec-one',
    resources: [
      { kind: 'record', at: 'scenario/one.txt' },
      { kind: 'views', at: { pack: 'spec', main: 'field', on: ['field', 'ledger'] } },
    ],
  };
  const bundle = bundleOf(document, []);
  expect(bundle.views).toEqual({ pack: 'spec', main: 'field', on: ['field', 'ledger'] });
  expect(bundle.resources).toContain('views');
});

test('a pack brings a resource kind the frame does not know', () => {
  registerResource('space', (at) => ({ fields: at }));
  const document: ProjectDocument = {
    id: 'spec-two',
    resources: [
      { kind: 'record', at: 'scenario/two.txt' },
      { kind: 'space', at: ['funct3', 'funct7', 'rd', 'rs1', 'rs2'] },
    ],
  };
  const bundle = bundleOf(document, []) as unknown as { space: { fields: string[] } };
  expect(bundle.space.fields, 'the pack’s own reader answered').toEqual(['funct3', 'funct7', 'rd', 'rs1', 'rs2']);
});

test('a kind nobody reads is still refused by name', () => {
  const document: ProjectDocument = {
    id: 'spec-three',
    resources: [
      { kind: 'record', at: 'scenario/three.txt' },
      { kind: 'nonsense', at: 1 },
    ],
  };
  expect(() => bundleOf(document, [])).toThrow(/no reader for a resource of kind nonsense/);
});

test('the native pack is the name the frame’s own readings are registered under', () => {
  // A reading with no pack is native, which is what every view in `src/views` is until one declares otherwise.
  expect(reading('space').pack).toBeUndefined();
  expect(NATIVE).toBe('native');
});

test('a field beside the resources is refused by name rather than dropped', () => {
  // The shape a capability was once written in: a board that looks right, opens, and silently has none, because the
  // reader only ever looked at the resources.
  const document = {
    id: 'spec-four',
    abilities: ['console'],
    resources: [{ kind: 'record', at: 'scenario/four.txt' }],
  } as unknown as ProjectDocument;
  expect(() => bundleOf(document, [])).toThrow(/declares abilities at the project level/);
});
