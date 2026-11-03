// What the kernel is not allowed to become.
//
// The kernel is the contract every package above it compiles against, so a renderer, a store or a browser global reaching
// down here is the boundary failing rather than a convenience: the tests, a node tool and the frame all stand on this
// package, and none of them can carry a canvas. The checks below are the cheap half of that rule. The expensive half is
// the dependency direction, which the frame's own build asserts by not being able to name a package that names it.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}${entry.name}`;
    if (entry.isDirectory()) return files(`${path}/`);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });

const source = files(SRC).map((path) => ({ path: path.slice(SRC.length), text: readFileSync(path, 'utf8') }));

const specifiers = (text: string): string[] => [
  ...text.matchAll(/^\s*(?:import|export)[^;]*?from\s+['"]([^'"]+)['"]/gm),
  ...text.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm),
  ...text.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g),
].map((match) => match[1] ?? '');

test('the kernel imports nothing but itself', () => {
  const outside = source.flatMap(({ path, text }) =>
    specifiers(text)
      .filter((specifier) => !specifier.startsWith('.'))
      .map((specifier) => `${path}: ${specifier}`),
  );
  expect(outside, 'a package above the kernel is what a non-relative import here would name').toEqual([]);
});

test('the kernel holds no browser', () => {
  const browser = source.flatMap(({ path, text }) => {
    const found = ['document.', 'localStorage', 'sessionStorage', 'new Worker('].filter((each) =>
      text.includes(each),
    );
    return found.map((each) => `${path}: ${each}`);
  });
  expect(browser).toEqual([]);
});

test('every module is reachable from the barrel, so none is added and left unannounced', () => {
  const barrel = source.find(({ path }) => path === 'index.ts')?.text ?? '';
  const modules = source
    .map(({ path }) => path)
    .filter((path) => path !== 'index.ts')
    .map((path) => path.replace(/\.tsx?$/, ''));
  const missing = modules.filter((module) => !barrel.includes(`'./${module}'`));
  expect(missing, 'a module missing from the barrel is a contract no consumer can reach').toEqual([]);
});
