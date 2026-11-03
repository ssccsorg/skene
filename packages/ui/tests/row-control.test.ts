// The one geometry a control at a row's edge is placed by.
//
// A control is drawn at the size of the row and takes its own padding back at the edge, so the glyph lands on the label's
// vertical. The size and the edge are one answer, and the kit is where that answer is written.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const source = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

test('a control at the edge of a row takes its edge from the same table as its size', () => {
  expect(source('../src/row-control.tsx'), 'the size and the edge are one answer').toMatch(/ROW_CONTROL_EDGE\[/);
});
