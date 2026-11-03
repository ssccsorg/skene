// The key a store is remembered under.
//
// The frame is one package every deployment links, so a key named after one of them is a key another
// deployment reads that state from. What is asserted here is that every store reaches its key through the
// one function that names it, and that no product's name is left in the frame's own source.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

import { storageName } from '@/lib/persist';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}${entry.name}`;
    if (entry.isDirectory()) return files(`${path}/`);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });

const source = files(SRC).map((path) => ({ path, text: readFileSync(path, 'utf8') }));

const relative = (path: string) => path.slice(SRC.length);

test('a store is named under the package, not under a product', () => {
  expect(storageName('surface')).toBe('skene.surface');
});

test('every persisted store reaches its key through the one function that names it', () => {
  const stores = source.filter(({ path }) => relative(path).startsWith('stores/'));
  const declared = stores.flatMap(({ path, text }) =>
    [...text.matchAll(/^\s+name:\s*(.+),$/gm)].map((match) => ({ path, value: match[1].trim() })),
  );
  expect(declared.map((each) => relative(each.path)).sort(), 'the stores that persist their state').toEqual([
    'stores/frame.ts',
    'stores/scenario.ts',
    'stores/selection.ts',
    'stores/sizes.ts',
    'stores/surface.ts',
    'stores/views.ts',
  ]);
  // One store reads its key in two places, so it holds it in a constant rather than spelling it twice.
  for (const { path, value } of declared) {
    expect(value, `${relative(path)} names its key through storageName`).toMatch(
      /^(?:storageName\('[a-z]+'\)|PERSIST_KEY)$/,
    );
  }
  const views = stores.find(({ path }) => relative(path) === 'stores/views.ts')?.text ?? '';
  expect(views).toContain("const PERSIST_KEY = storageName('windows');");
});

test('the namespace is written once, so a second spelling cannot appear', () => {
  const spellings = source.filter(({ text }) => text.includes('skene.')).map(({ path }) => relative(path));
  expect(spellings).toEqual(['lib/persist.ts']);
});

test('no product name is left in the frame\'s own source', () => {
  // The names are here so they can be refused. Nothing in the frame may carry one, in prose or in a key, because a
  // deployment inherits both the source and the namespace.
  const products = /\bexaspec\b|['"](?:ktema|kletos|delta)['"]/i;
  const hits = source.filter(({ text }) => products.test(text)).map(({ path }) => relative(path));
  expect(hits).toEqual([]);
});
