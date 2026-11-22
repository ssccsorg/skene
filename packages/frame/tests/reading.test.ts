// The frame while it reads the board.
//
// A window with no board had one line of text where the cockpit would be, inside panels that held nothing: the state
// every visit passes through was the one surface nobody had drawn. What is held here is that the body is that one state
// until the board answers, and that the state is drawn in the frame's own terms: the rectangle a place declares, the
// inks the chrome already reads a waiting and a refused thing in, and no motion for a reader who asked for none.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const source = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

const shell = source('src/App.tsx');
const view = source('src/components/Reading.tsx');

test("the body is one state until the board answers", () => {
  expect(shell, 'the shell asks whether the board is ready').toContain("status === 'ready'");
  expect(shell, 'and draws the reading view when it is not').toContain('<Reading');
  expect(shell, 'the reading is not a paragraph in the shell').not.toContain('reading the board');
});

test("the reading state is the frame's own ground, empty", () => {
  expect(view, 'it is a region of its own').toContain('data-region="reading"');
  expect(view, "it draws the place's own rectangle").toContain('aspect-[520/176]');
  expect(view, 'and the middle a star will stand at').toContain('place-items-center');
});

test("the reading state speaks in the inks the chrome already uses", () => {
  expect(view, 'a waiting thing is the idle ink').toContain('text-idle');
  expect(view, 'a refused one is the offline ink').toContain('text-offline');
  expect(view, "the words are the row's own size").toContain('text-[11.5px]');
});

test("a refusal keeps the reason it came back with", () => {
  expect(view, 'the reason is drawn rather than a fixed sentence').toMatch(/error \?\?/);
});

test("nothing moves for a reader who asked for no motion", () => {
  // Every animation the state names is asked for through the media query, so a reader who asked for no motion gets a
  // still frame. The prefix is read from the text before each utility rather than stripped, because stripping it
  // leaves the utility in place.
  const found = [...view.matchAll(/animate-[a-z]+/g)];
  expect(found.length, 'the state moves while it reads').toBeGreaterThan(0);
  const bare = found.filter((match) => !view.slice(Math.max(0, match.index - 12), match.index).endsWith('motion-safe:'));
  expect(
    bare.map((match) => match[0]),
    'every animation is asked for through the media query',
  ).toEqual([]);
});
