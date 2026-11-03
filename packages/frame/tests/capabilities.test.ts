// A project's capabilities, and the panel that needs one.
//
// The frame holds no list of deployment features: a project states what its deployment can do, and a panel that is a
// surface rather than a drawing of a run names the capability it needs. What is held here is that the statement is read
// as names, that a panel without one stands everywhere, and that the console and the three controls that open it are one
// answer rather than a panel that is away and a control that presses into nothing.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { CONSOLE, abilitiesOf, holds } from '@/lib/capabilities';
import { standingPanels, type PanelUnit } from '@/lib/panels';
import { bundleOf } from '@/lib/project';
import type { Bundle } from '@ssccsorg/skene-kernel';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const Nothing = () => null;

function panel(key: string, needs?: string): PanelUnit {
  return {
    key,
    at: 'left',
    order: 1,
    side: 'left',
    label: key,
    title: key,
    starts: false,
    needs,
    Icon: Nothing,
    View: Nothing,
  };
}

/** A project with the resources it states, and the run every project needs. */
function project(resources: { kind: string; at: unknown }[]): Bundle {
  return bundleOf(
    { id: 'project', resources: [...resources, { kind: 'record', at: 'scenario/x.txt' }] },
    [],
  );
}

test('a project that states no capability has none', () => {
  expect(project([]).abilities).toEqual([]);
  expect(project([{ kind: 'abilities', at: [] }]).abilities).toEqual([]);
  expect(abilitiesOf(undefined), 'a project nobody has opened states nothing').toEqual([]);
});

test('a project states its capabilities as a resource', () => {
  expect(project([{ kind: 'abilities', at: [CONSOLE] }]).abilities).toEqual(['console']);
  expect(
    project([{ kind: 'abilities', at: CONSOLE }]).abilities,
    'one capability is a declaration too',
  ).toEqual(['console']);
});

test('a capability that is not a name is dropped rather than read', () => {
  // A board is data, and a name is the only thing a capability can be: anything else would be a fact a panel cannot ask
  // about, and dropping it is what keeps a typo a missing feature rather than a crash.
  expect(project([{ kind: 'abilities', at: [CONSOLE, 7, '', '  '] }]).abilities).toEqual(['console']);
  expect(project([{ kind: 'abilities', at: { console: true } }]).abilities).toEqual([]);
});

test('a panel that names no capability stands for every project', () => {
  const panels = [panel('rail'), panel('console', CONSOLE)];
  expect(standingPanels(panels, []).map((each) => each.key)).toEqual(['rail']);
});

test('a panel that names one stands where the project holds it', () => {
  const panels = [panel('rail'), panel('console', CONSOLE)];
  expect(standingPanels(panels, [CONSOLE]).map((each) => each.key)).toEqual(['rail', 'console']);
  expect(holds([CONSOLE], CONSOLE), 'the project holds it').toBe(true);
  expect(holds([], CONSOLE), 'the project does not').toBe(false);
});

test('the console stands for every project, and the room inside it is what a project has to hold', () => {
  // The panel's text is the frame's own drawing of the run, so the panel is not gated. The exchange under it is a room a
  // deployment has to have shipped, so the body asks the question the controls that compose a line ask.
  const panel = readFileSync(here('../src/components/panels/ConsolePane.tsx'), 'utf8');
  expect(panel, 'the panel stands for every project').not.toMatch(/needs:\s*CONSOLE/);
  const body = readFileSync(here('../src/components/Console.tsx'), 'utf8');
  expect(body, 'the room is drawn against the capability').toMatch(/useCapability\(CONSOLE\)/);
});

test('every control that opens the console is drawn against the capability', () => {
  // A press that composes a line into a room the project does not have is a press into nothing, so the three places that
  // compose a line ask the same question the room does.
  for (const path of [
    '../src/components/Abilities.tsx',
    '../src/properties/Holds.tsx',
    '../src/components/panels/Intents.tsx',
  ]) {
    const source = readFileSync(here(path), 'utf8');
    expect(source, `${path} opens the console`).toMatch(/setOpen\('console', true\)/);
    expect(source, `${path} asks the project`).toMatch(/useCapability\(CONSOLE\)/);
  }
});
