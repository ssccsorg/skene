// The bar's controls say what they are, and a control with nothing to draw leaves no rule.
//
// A control on the bar is a mark, so the only place its name can be is the rollover. The scan below holds every
// instrument to that one answer: it uses the hint rather than a native title, because two rollovers on one control are
// two answers. The rule between runs is drawn by the control's own box, which is empty when the control is absent, so a
// map a place does not offer is absent from the bar without leaving a separator behind.

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const INSTRUMENTS = `${ROOT}src/components/instruments`;

const source = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

test('every instrument names itself on rollover and keeps no native title', () => {
  const files = readdirSync(INSTRUMENTS).filter((file) => file.endsWith('.tsx'));
  expect(files.length, 'there are instruments to hold this over').toBeGreaterThan(0);

  for (const file of files) {
    const text = readFileSync(`${INSTRUMENTS}/${file}`, 'utf8');
    expect(text, `${file} names its controls on rollover`).toMatch(/<Hint\b/);
    expect(text, `${file} does not carry a second rollover in a title`).not.toMatch(/\btitle=/);
  }
});

test('a control that draws nothing leaves no rule between runs', () => {
  const display = source('src/components/DisplayButtons.tsx');
  expect(display, 'the run is the control own box').toContain('data-band-start');
  expect(display, 'and an empty box is hidden').toContain('empty:hidden');
});

test('the map control is absent where the place has no map', () => {
  const map = source('src/components/instruments/MapSplit.tsx');
  expect(map, 'the control asks whether the place offers a map').toContain('mappable(');
  expect(map, 'and returns nothing when it does not').toContain('if (!available) return <></>;');
  expect(map, 'it is not a disabled control').not.toMatch(/disabled=\{/);
});
