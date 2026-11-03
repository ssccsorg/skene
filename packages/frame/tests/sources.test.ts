// Where a member's own lower elements come from.
//
// A member's parts are one question with more than one answer: a mock tree the project declares, a folder on a host, or
// the room. The adapters are `lib/sources`, and the panel that asks is `hooks/useHolds` and `hooks/useTree`. What is held
// here is that the ask goes through the register: a hook that reached for the room's files itself would be a second
// adapter, and a project's own declaration would be read by neither.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const source = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

test('the tree asks the source register and not a hardcoded room decision', () => {
  for (const path of ['src/hooks/useHolds.ts', 'src/hooks/useTree.ts']) {
    const text = source(path);
    expect(text, `${path} asks the register`).toContain('sourceFor');
    expect(text, `${path} does not reach for the room's files itself`).not.toContain('room.files');
  }
});

test('the register is the one place an adapter is chosen', () => {
  const text = source('src/lib/sources.ts');
  // The three answers, and the room's as the one a member with no declaration gets.
  expect(text).toContain("spec.kind === 'mock'");
  expect(text).toContain("spec.kind === 'bridge'");
  expect(text).toContain('roomSource(project)');
  expect(text, 'a source the project did not declare is the room').toContain('if (!spec) return roomSource(project);');
});
