// The board as one thing to ask, held to what a reader types and what a choice names.
//
// The panels search the list each of them draws. This is the board's own answer: a system, a planet, a moon, a gate, a
// station, and the system each of them stands in. A system is a project; a member is a unit of one; a row carries the
// project so that whatever draws the field can open it.

import { expect, test } from 'vitest';
import { find, indexOf } from '../src/find';
import type { Bundle } from '../src/types';

const bundle = (id: string, title: string, units: Record<string, unknown>, label = title) =>
  ({ id, title, place: { view: [0, 0, 520, 176], store: { label }, units } }) as unknown as Bundle;

const PROJECTS = [
  bundle(
    'jita',
    'EVE Online: the Jita corridor',
    {
      jita: { icon: 'system', label: 'Jita' },
      'jita-iv': { icon: 'planet', label: 'Jita IV' },
      'jita-iv-moon-4': { icon: 'moon', label: 'Jita IV - Moon 4' },
      'jita-4-4': { icon: 'station', label: 'Caldari Navy Assembly Plant' },
    },
    'Jita',
  ),
  bundle('airmia', 'Airmia', {
    airmia: { icon: 'system', label: 'Airmia' },
    'airmia-i': { icon: 'planet', label: 'Airmia I' },
  }),
];
const INDEX = indexOf(PROJECTS);

test('the index is every project and every unit, with the star kept as its system', () => {
  expect(INDEX).toHaveLength(6);
  expect(INDEX.filter((each) => each.unit === null).map((each) => each.project)).toEqual(['jita', 'airmia']);
  expect(INDEX.find((each) => each.unit === 'jita')).toBeUndefined();
  expect(INDEX.find((each) => each.unit === 'airmia')).toBeUndefined();
  expect(INDEX.find((each) => each.unit === 'jita-iv')?.place).toBe('Jita');
  expect(INDEX.find((each) => each.unit === 'jita-iv')?.kind).toBe('planet');
});

test('a row is named by its place and not by the run the place carries', () => {
  // A project's title is its record's, and a reader looking for a moon is looking for the system it stands in.
  expect(INDEX.find((each) => each.unit === 'jita-iv')?.place).toBe('Jita');
  expect(find(INDEX, 'corridor')[0].project, 'the run is still searchable').toBe('jita');
  expect(find(INDEX, 'corridor')[0].place).toBe('Jita');
});

test('a system is found by its name, and it stands above its own members', () => {
  const hits = find(INDEX, 'jita');
  expect(hits[0].project).toBe('jita');
  expect(hits[0].unit).toBeNull();
  expect(hits.slice(1).every((each) => each.project === 'jita')).toBe(true);
});

test('a member is found by its name, its id, its kind, or its system', () => {
  expect(find(INDEX, 'moon 4')[0].unit).toBe('jita-iv-moon-4');
  expect(find(INDEX, 'jita-iv-moon-4')[0].unit).toBe('jita-iv-moon-4');
  expect(find(INDEX, 'station')[0].unit).toBe('jita-4-4');
  expect(find(INDEX, 'airmia i')[0].unit).toBe('airmia-i');
  expect(find(INDEX, 'caldari')[0].unit).toBe('jita-4-4');
});

test('every word typed has to match something about the row', () => {
  expect(find(INDEX, 'jita moon')).toHaveLength(1);
  expect(find(INDEX, 'jita airmia')).toEqual([]);
  expect(find(INDEX, '   ')).toEqual([]);
  expect(find(INDEX, 'zzz')).toEqual([]);
});

test('a search is a list of twelve, which is a list to choose from', () => {
  expect(find(INDEX, 'j', 2)).toHaveLength(2);
  expect(find(INDEX, 'j', 1)[0].project).toBe('jita');
});
