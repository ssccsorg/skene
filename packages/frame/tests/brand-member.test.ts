// A deployment may name what a place's members are.
//
// The panel is one panel and its rows are not one kind of thing: a cockpit lists the machines it can ask, a corpus lists
// the records it holds. Naming none keeps the frame's three words, which are read from the atoms each member is assembled
// from, so a board that says nothing about its members is read the way it was before the field existed.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const source = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

test('a brand may name its members, and naming none is the frame`s own reading', () => {
  const brand = source('src/lib/brand.tsx');
  expect(brand, 'the field is optional').toMatch(/\bmember\?: \{ one: string; many: string \};/);
  expect(brand, 'a brand that names none has the frame`s plural').toMatch(/many: named\?\.many \?\? 'Members'/);
  expect(brand, 'and every row keeps the frame`s three words').toMatch(
    /wordOf: \(properties\) => named\?\.one \?\? memberOf\(properties\)/,
  );
});

test('the panel reads the brand`s heading and row words rather than writing its own', () => {
  const panel = source('src/components/EntityPanel.tsx');
  expect(panel, 'the heading is the brand`s plural').toMatch(/<h2 className=\{LABEL\}>\{member\.many\}<\/h2>/);
  expect(panel, 'the row`s word is the brand`s reading of the member').toMatch(
    /\{member\.wordOf\(unit\.properties\)\}/,
  );
  expect(panel, 'the frame`s three words stay behind that reading').not.toMatch(/\{memberOf\(unit\.properties\)\}/);
});
