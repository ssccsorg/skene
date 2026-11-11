// The minimap is a picture of a sphere, so it stands only where the project in force has one.
//
// The disc in the space column is the shell seen from outside the pilot: the whole sphere, the patches on it, and the part
// of it the board holds. A project whose readings carry no seat has no sphere, and a disc there is a map of nothing. The
// question is asked of the readings that project stands and not of the build, because a build that installs a seat reading
// has said nothing about a project that does not stand it. What is withdrawn is the disc and the control that folds it,
// not the column: the projects and the members are the panel's other two reasons to be open.
//
// The disc turns the sphere the board draws, so the first push of a hand on it lands the frame on that reading: a pilot
// who turns a map they cannot see the result on is reading a picture of nothing.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { hasSeat, type Reading } from '@/lib/readings';
import { standing } from '@/lib/packs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const source = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

/** A reading as the register holds it: the filter asks what it declares and not what it draws. */
function reading(fields: Partial<Reading> & { key: string }): Reading {
  return { path: `/${fields.key}`, View: () => null, ...fields } as Reading;
}

test('a set of readings draws from the seat when one of them looks through it', () => {
  expect(hasSeat([]), 'no readings, no sphere').toBe(false);
  expect(hasSeat([reading({ key: 'records' })])).toBe(false);
  expect(hasSeat([reading({ key: 'records' }), reading({ key: 'shell', seat: true })])).toBe(true);
});

test('a project keeps the sphere out by enumerating its readings or by naming it off', () => {
  // The two declarations a bundle has for this: `views.on` names the readings it stands, and a `layout` entry of false
  // hides one by key. The disc is drawn on the post-declaration list, so either one withdraws it.
  const all = [reading({ key: 'records' }), reading({ key: 'shell', seat: true })];
  expect(hasSeat(standing(all, { views: { on: ['records'] } })), 'the enumeration leaves it out').toBe(
    false,
  );
  expect(hasSeat(standing(all, { layout: { shell: false } })), 'the layout names it off').toBe(false);
  expect(
    hasSeat(standing(all, { views: { on: ['records', 'shell'] } })),
    'and naming it on keeps it',
  ).toBe(true);
});

test('the space column asks the readings the project stands', () => {
  // Two conditions and one answer: a column whose disc is folded draws no disc, and neither does a column whose project
  // stands no seat. Asking the register on its own is the bug this pins, because it answers for the build rather than
  // for the project in force.
  const panel = source('src/components/SpacePanel.tsx');
  expect(panel, 'the project\u2019s own readings').toMatch(/const readings = useReadings\(\);/);
  expect(panel, 'the seat is asked of them').toMatch(/const sphere = hasSeat\(readings\);/);
  expect(panel, 'the fold and the seat are one answer').toMatch(/const disc = map && sphere;/);
  expect(panel, 'the disc is drawn on it').toMatch(/\{disc \?\s*\(/);
  expect(panel, 'and the control into it').toMatch(/\{map && sphere \? \(/);
});

test('the column keeps its lists when the disc is withdrawn', () => {
  // What the panel is for is the projects, the members and the devices; the disc is the one section that needs a sphere.
  const panel = source('src/components/SpacePanel.tsx');
  expect(panel, 'the projects stand').toContain('data-region="projects"');
  expect(panel, 'and no early return skips the column').not.toMatch(/if \(!hasSeat\(/);
});

test('a hand that turns the disc lands on the sphere', () => {
  const map = source('src/components/SpaceMap.tsx');
  expect(map, 'the reading drawn from the seat').toMatch(
    /const sphere = readings\.find\(\(reading\) => reading\.seat\)/,
  );
  expect(map, 'the first turn opens it').toMatch(
    /onTurn: \(\) => \{[\s\S]*?navigate\(sphere\.path\);/,
  );
  const drag = source('src/hooks/useMapDrag.ts');
  expect(drag, 'fired once, when the press becomes a turn').toMatch(
    /if \(!turned\.current\) options\.onTurn\?\.\(\);/,
  );
});
