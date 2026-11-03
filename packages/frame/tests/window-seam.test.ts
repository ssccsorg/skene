// What the window seam is for, held where a regression would show.
//
// A kind registers itself and the frame asks the register: it holds a name, a mark and a body, and it does not hold the
// module that draws one. The check here is the cheap half of that. The expensive half is the package boundary, which is
// the next cut: footage and maps move out, and the frame's own build is what will fail if the direction is ever reversed.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** The frame's own modules: the board, the panel and the window layer, which are the things a kind is drawn by. */
const CORE = [
  '../src/lib/windows.ts',
  '../src/lib/views.ts',
  '../src/lib/world.ts',
  '../src/components/SceneBoard.tsx',
  '../src/components/EntityPanel.tsx',
  '../src/components/ViewHandle.tsx',
  '../src/components/ViewLayer.tsx',
  '../src/properties/Shows.tsx',
  '../src/properties/ViewContent.tsx',
];

const source = (path: string) => readFileSync(here(path), 'utf8');

test('the frame does not import a window kind it ships', () => {
  // Footage is a package of its own and is not in the frame at all. What is left here is the kind the frame ships.
  const implementations = ['MapPatch3D', 'GroundMap'];
  const reached = CORE.flatMap((path) => {
    const text = source(path);
    return implementations.filter((each) => text.includes(`from './${each}'`) || text.includes(`from '../components/${each}'`));
  });
  expect(reached, 'a kind is reached through the register, not by the frame importing it').toEqual([]);
});

test('the frame names no kind of its own', () => {
  // The two words below are the kinds that exist, and the frame may not spell one: a kind is installed by a module, and a
  // word here would be the frame knowing which one it has.
  const named = CORE.flatMap((path) =>
    [...source(path).matchAll(/'media'|'map'/g)].map((match) => `${path}: ${match[0]}`),
  );
  expect(named).toEqual([]);
});

test('a kind is read through the register where the frame needs its mark, its body or its picture', () => {
  const askers = {
    '../src/lib/windows.ts': 'viewKindOf',
    '../src/components/SceneBoard.tsx': 'viewKindOf',
    '../src/components/ViewLayer.tsx': 'viewKindOf',
    '../src/components/ViewHandle.tsx': 'viewKindOf',
    '../src/properties/Shows.tsx': 'viewKindOf',
    '../src/properties/ViewContent.tsx': 'viewKindOf',
  };
  for (const [path, ask] of Object.entries(askers)) {
    expect(source(path), `${path} asks the register`).toContain(ask);
  }
});
