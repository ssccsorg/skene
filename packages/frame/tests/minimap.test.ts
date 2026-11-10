// The minimap is a picture of a sphere, so it stands only where the build has one.
//
// The disc in the space column is the shell seen from outside the pilot: the whole sphere, the patches on it, and the part
// of it the board holds. A build that installs no seat reading has no sphere, and a disc there is a map of nothing. What
// is withdrawn is the disc and the control that folds it, not the column: the projects and the members are the panel's
// other two reasons to be open.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { hasSeat, type Reading } from '@/lib/readings';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const source = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

/** A reading as the register holds it: the filter asks what it declares and not what it draws. */
function reading(fields: Partial<Reading> & { key: string }): Reading {
  return { path: `/${fields.key}`, View: () => null, ...fields } as Reading;
}

test('a build draws from the seat when one of its readings looks through it', () => {
  expect(hasSeat([]), 'no readings, no sphere').toBe(false);
  expect(hasSeat([reading({ key: 'records' })])).toBe(false);
  expect(hasSeat([reading({ key: 'records' }), reading({ key: 'shell', seat: true })])).toBe(true);
});

test('the space column draws the disc on that answer and not on the fold alone', () => {
  // Two conditions and one answer: a column whose disc is folded draws no disc, and neither does a column in a build with
  // no sphere. Reading the fold on its own is the bug this pins.
  const panel = source('src/components/SpacePanel.tsx');
  expect(panel, 'the fold and the seat are one answer').toMatch(/const disc = map && hasSeat\(\);/);
  expect(panel, 'the disc is drawn on it').toMatch(/\{disc \?\s*\(/);
  expect(panel, 'and the control into it').toMatch(/map && hasSeat\(\) \? \(/);
});

test('the column keeps its lists when the disc is withdrawn', () => {
  // What the panel is for is the projects, the members and the devices; the disc is the one section that needs a sphere.
  const panel = source('src/components/SpacePanel.tsx');
  expect(panel, 'the projects stand').toContain('data-region="projects"');
  expect(panel, 'and no early return skips the column').not.toMatch(/if \(!hasSeat\(\)\) return null/);
});
