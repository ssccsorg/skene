// What the frame's own drawings of the ground may not do.
//
// The declared areas are data: a drawing that walked `place.areas` would be a second reading of the place, free to
// disagree with the one the panel already shows. The projection this screen is drawn by is held in
// `@ssccsorg/skene-board`; what is held here is that no drawing in the frame reads the place a second way.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

/** The frame's own source, read where a drawing has to be held to what it may not draw. */
const source = (path: string) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');

test('the declared areas are data, and no drawing of the ground makes them a dashed rectangle', () => {
  for (const path of [
    'src/components/SpaceMap.tsx',
    'src/components/MoveContext.tsx',
    'src/properties/ViewContent.tsx',
  ]) {
    expect(source(path), path).not.toContain('place.areas');
  }
});
