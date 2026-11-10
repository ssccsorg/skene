// The minimap stands where the build draws from the seat, and nowhere else.
//
// The panel named `plan` is a picture of the sphere seen from outside the pilot: the whole shell, the patches on it, and
// the part of it the board holds. A build that ships no seat reading has no sphere, so the disc would be a map of
// nothing, and the bar would offer a control into it. The rule is on the register and not on the panel, so a panel added
// later that draws the same sphere declares the same thing.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { standingPanels, type PanelUnit } from '@/lib/panels';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const source = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

/** The panel as the register holds it, without a component: the filter asks about the declaration and not the drawing. */
function panel(fields: Partial<PanelUnit> & { key: string }): PanelUnit {
  return {
    at: 'right',
    order: 1,
    side: 'right',
    label: fields.key,
    title: fields.key,
    starts: true,
    Icon: () => null,
    View: () => null,
    ...fields,
  } as PanelUnit;
}

const PLAN = panel({ key: 'plan', needsSeat: true });
const RECORDS = panel({ key: 'records' });

test('the minimap stands where a seat reading is installed', () => {
  expect(standingPanels([PLAN, RECORDS], [], true).map((each) => each.key)).toEqual([
    'plan',
    'records',
  ]);
});

test('and not where the build draws no seat, while every other panel still stands', () => {
  // A board with no shell is a board whose readings look at the run rather than through the pilot's eyes, so the disc
  // has nothing to be a picture of. The panels that are the frame's drawing of a run are unaffected.
  expect(standingPanels([PLAN, RECORDS], [], false).map((each) => each.key)).toEqual(['records']);
});

test('the plan panel declares it, and the capability gate is a different question', () => {
  // Two gates and not one: a capability is a fact about a project, and a seat is a fact about the build. A panel that
  // needs both has to be off when either is missing.
  const plan = source('src/components/panels/PlanPane.tsx');
  expect(plan, 'the panel that draws the minimap says so').toMatch(/needsSeat: true/);
  expect(
    standingPanels([panel({ key: 'plan', needsSeat: true, needs: 'space' })], [], true),
    'a seat and no capability is still away',
  ).toEqual([]);
});
