// A deployment may name the frame's unit in its own domain.
//
// The frame's unit is a project, and the format goes on writing `project/1`. What a reader sees is the deployment's word:
// a board of star systems says systems. Naming none is the frame's own word, because a noun the frame invented would be a
// claim about a domain it knows nothing about.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const source = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

test('a brand may name the unit, and naming none is the frame`s own', () => {
  const brand = source('src/lib/brand.tsx');
  expect(brand, 'the field is optional').toMatch(/\bunit\?: \{ one: string; many: string \};/);
  expect(brand, 'a brand that names none has the frame`s word').toMatch(
    /useBrand\(\)\.unit \?\? \{ one: 'project', many: 'projects' \}/,
  );
});

test('the panel and the add form read the brand`s word rather than writing their own', () => {
  const panel = source('src/components/SpacePanel.tsx');
  expect(panel, 'the heading is the brand`s plural').toMatch(/<h2 className=\{cn\(LABEL\)\}>\{unit\.many\}<\/h2>/);
  expect(panel, 'the add control names the brand`s singular').toMatch(/label=\{`add \$\{unit\.one\}`\}/);
  const add = source('src/components/AddProject.tsx');
  expect(add, 'the form says what it is adding').toMatch(/new \{unit\.one\}/);
  expect(add, 'and asks for a name by that word').toMatch(/a name for the \$\{unit\.one\}/);
});
