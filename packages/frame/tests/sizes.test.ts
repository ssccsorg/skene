// The frame's measures, held to what a panel has to be.
//
// A panel narrower than its own name is a panel nobody reads, so the clamp is the whole of this: whatever a
// drag asks for, what stands is a size the panel can be worked in. It is tested here rather than at the
// handle because the handle is not the only caller, and a rule that lived with one of them would be a rule
// the next one does not have.
//
// The other thing held here is that a panel and its measure are one name. Four of these measures are named by the
// key of the panel that takes them, and a fifth name for one panel is exactly the drift a reader does not see: the
// panel's place in the arrangement and the panel's size would be keyed differently, and it would show as a panel that
// folds to the place another panel's measure says.

import { expect, test } from 'vitest';

import { declaredPanels } from '@/lib/panels';
// The panels declare themselves where they are drawn, so importing them is what the frame does when it draws.
import '@/components/panels';

import { LIMITS, limit, type Panel } from '@/stores/sizes';

const PANELS = Object.keys(LIMITS) as Panel[];

/**
 * The measures that are a section of a panel rather than a panel: the rail is two panes, the plan holds two, and the
 * transport is two readings of one run, each with the height it was dragged to.
 */
const SECTIONS = ['intents', 'projects', 'timelineSplit'];

test('the panels the frame measures are the ones it means to', () => {
  // Counted by name and not by length, because a length passes when one panel is traded for another and the
  // set is the reading worth holding: a measure that arrives has to be said here, where its ends are argued.
  //
  // The room is not one of them any more, and that is the reading this list is for: the people the place names were a
  // section of their own with a measure of its own, and the members are one list now, so a measure for people is a
  // measure of a list that no longer stands.
  expect([...PANELS].sort()).toEqual([
    'console',
    'intents',
    'plan',
    'projects',
    'rail',
    'timeline',
    'timelineSplit',
  ]);
});

test('every panel has a floor and a ceiling, and the floor is under the ceiling', () => {
  for (const panel of PANELS) {
    const [least, most] = LIMITS[panel];
    expect(least, panel).toBeGreaterThan(0);
    expect(most, panel).toBeGreaterThan(least);
  }
});

test('a measure past either end stands at that end', () => {
  for (const panel of PANELS) {
    const [least, most] = LIMITS[panel];
    expect(limit(panel, least - 500), panel).toBe(least);
    expect(limit(panel, most + 500), panel).toBe(most);
    expect(limit(panel, Number.POSITIVE_INFINITY), panel).toBe(most);
    expect(limit(panel, Number.NEGATIVE_INFINITY), panel).toBe(least);
  }
});

test('a measure nobody took stands at the least the panel may be', () => {
  for (const panel of PANELS) {
    expect(limit(panel, Number.NaN), panel).toBe(LIMITS[panel][0]);
  }
});

test('a measure inside the ends is taken as it is asked, rounded to the pixel it stands at', () => {
  expect(limit('rail', 321.4)).toBe(321);
  expect(limit('timeline', 150)).toBe(150);
});

test('a measure named for a panel is that panel own, and a section is not a panel', () => {
  const keys = declaredPanels().map((panel) => panel.key);
  for (const name of PANELS) {
    if (SECTIONS.includes(name)) continue;
    expect(keys, `${name} is a measure and no panel is named it`).toContain(name);
  }
  for (const key of keys) {
    expect(PANELS, `the panel ${key} takes a measure`).toContain(key);
  }
  for (const name of SECTIONS) {
    expect(keys, `${name} is a section of a panel and not a panel`).not.toContain(name);
  }
});
