// Find anything is the frame's own answer, and a pick is the frame's own look.
//
// The index is the board's: every project the frame holds, and every unit each of them declares. It stands in the kernel,
// so a node tool and a frame ask one list. The field stands in the frame's bar, so every project a build carries has it
// without asking. The look is the space's, so a result is a journey and not only a row that highlights.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const source = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

test('find anything is a control of the frame bar and the command key opens it', () => {
  const header = source('src/components/Header.tsx');
  expect(header, 'the field stands in the frame own bar').toMatch(/<Find \/>/);
  const field = source('src/components/Find.tsx');
  expect(field, 'the answer is the kernel own').toMatch(/from '@ssccsorg\/skene-kernel'/);
  expect(field, 'and it is the board it asks').toMatch(/indexOf\(projects\)/);
  expect(field, 'the command key opens it').toMatch(/event\.metaKey \|\| event\.ctrlKey/);
  expect(field, 'and the letter every palette opens with').toMatch(/event\.key\.toLowerCase\(\) === 'k'/);
  expect(field, 'a choice opens the project it belongs to').toMatch(/openProject\(found\.project\)/);
  expect(field, 'and a member is picked in the same press').toMatch(/selectUnit\(found\.unit, null\)/);
});

test('a pick turns the frame own view, whichever reading draws the space', () => {
  // The look is the space's and not the shell's, because a project may draw the same space as a map, a list or a pane.
  // The frame hands every reading one view, so a pick made in the find field is a journey in all of them.
  const space = source('src/views/Space.tsx');
  expect(space, 'the picked unit is aimed at').toMatch(/aimAt\(onShell\(found\.at, world\)\)/);
  expect(space, 'the one view is turned').toMatch(/useView\.getState\(\)\.aim\(where\.yaw, where\.pitch\)/);
  expect(space, 'a repeated pick is a second look').toMatch(/\[look, unit, world\]/);
});
