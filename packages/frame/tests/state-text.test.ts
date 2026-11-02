// The board as raw text, held to the one property that makes it an interface: what the board writes is
// what the board reads.
//
// This is the whole claim of the console. A person edits a line and an agent writes one, and the board
// cannot tell the two apart because both are the same text; so the text has to round-trip, an edit has to
// name only what it changes, and a line the board does not know has to come back rather than be dropped.

import { expect, test } from 'vitest';
import { applyPatch, changesBetween, isEdit, parseState, writeState, type BoardState } from '@/lib/state-text';

const state: BoardState = {
  project: 'drive',
  shown: 52,
  total: 52,
  scene: 'the device resumes',
  picked: 'servo-drive-3',
  units: [
    {
      id: 'servo-drive-3',
      at: [460, 62],
      state: 'working',
      last: 'fact cycle 23',
      written: 28,
      abilities: ['torque-control', 'position-control', 'fault-stop'],
    },
    {
      id: 'line-manager-1',
      at: [250, 156],
      state: 'offline',
      last: null,
      written: 0,
      abilities: ['approve', 'assign', 'acknowledge'],
    },
  ],
};

function withUnit(extra: BoardState['units'][number]): BoardState {
  return { ...state, units: [...state.units, extra] };
}

const conveyor: BoardState['units'][number] = {
  id: 'conveyor-7',
  at: [370, 40],
  state: 'idle',
  last: 'fact speed 7',
  written: 8,
  abilities: ['speed-control', 'run-log'],
};

test('the board writes itself out and reads itself back unchanged', () => {
  const text = writeState(state);
  const read = applyPatch(state, parseState(text));
  expect(read).toEqual(state);
  expect(writeState(read), 'and writes the same text again').toBe(text);
});

test('the text says what a reader needs, one directive a line', () => {
  expect(writeState(state)).toBe(
    [
      'board drive 52/52',
      'scene the device resumes',
      'picked servo-drive-3',
      'unit servo-drive-3 460 62 working fact cycle 23',
      '  abilities torque-control position-control fault-stop',
      '  store 28 records',
      'unit line-manager-1 250 156 offline -',
      '  abilities approve assign acknowledge',
      '  store 0 records',
      '',
    ].join('\n'),
  );
});

test('a unit line with only a place is a complete edit', () => {
  const patch = parseState('unit conveyor-7 300 90\n');
  expect(patch.unknown).toEqual([]);
  expect(patch.units.get('conveyor-7')).toEqual({ at: [300, 90] });
  const after = applyPatch(withUnit(conveyor), patch);
  expect(after.units.find((unit) => unit.id === 'conveyor-7')?.at).toEqual([300, 90]);
  expect(changesBetween(withUnit(conveyor), after)).toEqual(['moved conveyor-7 to 300, 90']);
});

test('an edit names only what it changes', () => {
  const patch = parseState('unit conveyor-7 300 90\n  abilities speed-control\n');
  const after = applyPatch(withUnit(conveyor), patch);
  expect(after.units.find((unit) => unit.id === 'conveyor-7')).toEqual({
    ...conveyor,
    at: [300, 90],
    abilities: ['speed-control'],
  });
  expect(after.units.find((unit) => unit.id === 'servo-drive-3'), 'nothing else moved').toEqual(
    state.units[0],
  );
  expect(changesBetween(withUnit(conveyor), after)).toEqual([
    'moved conveyor-7 to 300, 90',
    'conveyor-7 abilities speed-control',
  ]);
});

test('abilities none is an empty list, and a pick of - is no pick', () => {
  expect(parseState('  abilities none\n').units.size).toBe(0);
  const patch = parseState('unit conveyor-7 300 90\n  abilities none\npicked -\n');
  expect(patch.units.get('conveyor-7')?.abilities).toEqual([]);
  expect(patch.picked).toBeNull();
  const after = applyPatch(withUnit(conveyor), patch);
  expect(after.picked).toBeNull();
  expect(changesBetween(withUnit(conveyor), after)).toContain('picked nothing');
});

test('a line the board does not know comes back rather than being dropped', () => {
  const patch = parseState('colour red\nunit conveyor-7 300 90\n  wobble 3\n  abilities run-log\n');
  expect(patch.unknown).toEqual(['colour red', 'wobble 3']);
  expect(patch.units.get('conveyor-7')?.abilities).toEqual(['run-log']);
});

test('a comment and a blank line are not directives', () => {
  const patch = parseState('# the cell, after the shift\n\nunit conveyor-7 300 90\n');
  expect(patch.unknown).toEqual([]);
  expect(patch.units.size).toBe(1);
});

test('the cursor is read from the board line and left alone when the line does not carry it', () => {
  expect(parseState('board drive 20/52\n').shown).toBe(20);
  expect(parseState('board drive\n').shown).toBeUndefined();
  expect(parseState('board other 3/52\n').project).toBe('other');
});

// The text is two languages at once: what the board draws, which follows from the record, and what it can be told. A
// line of the first kind is read so that the text round-trips, and it is not an edit, so the console sends it to the
// room rather than answering in the board's own words about something the board cannot do.
test('the board is told what it cannot draw, and a line of what it draws asks for nothing', () => {
  expect(isEdit(parseState('scene the device resumes\n')), 'the scene is where the cursor has reached').toBe(false);
  expect(isEdit(parseState('# nothing\n\n')), 'a comment asks for nothing').toBe(false);
  expect(isEdit(parseState('')), 'and neither does nothing at all').toBe(false);

  expect(isEdit(parseState('board drive 20/52\n'))).toBe(true);
  expect(isEdit(parseState('picked -\n'))).toBe(true);
  expect(isEdit(parseState('unit conveyor-7 300 90\n'))).toBe(true);
  expect(isEdit(parseState('unit conveyor-7 300 90 idle fact speed 7\n'))).toBe(true);
});

test('a line of what the board draws is read, and holds no field the board can act on', () => {
  const patch = parseState('unit conveyor-7 300 90 idle fact speed 7\n  store 8 records\n');
  expect(patch.units.get('conveyor-7'), 'the place the line carries, and nothing else').toEqual({ at: [300, 90] });
  expect(patch.unknown, 'and it is not a line the board does not know').toEqual([]);
  expect(
    applyPatch(withUnit(conveyor), patch).units.find((unit) => unit.id === 'conveyor-7'),
    'so a state or a store count typed at the board leaves what the record says alone',
  ).toEqual({ ...conveyor, at: [300, 90] });
});
