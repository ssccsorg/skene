// The kind mark a deployment draws: one colour, one letter, and the token behind the colour.
//
// The colour is the frame's, because a kind is the format's. The letter is the word's, because the word is the project's:
// `fact`, `intent` and `hint` are what the engine calls its three kinds, and what a reader is shown is the projection
// its domain names. So this holds both ends: the ink is published and defined, and the word is read rather than assumed.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { FORMAT_WORDS, wordsOf } from '@/lib/words';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const source = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

const KINDS = ['fact', 'intent', 'hint', 'claim'] as const;

test('the frame publishes the mark it draws a kind with', () => {
  expect(source('src/index.ts'), 'a deployment reads the mark from the package root').toMatch(
    /export \{ KindTag \} from '\.\/components\/KindTag';/,
  );
});

test('every kind the format defines has an ink, a letter, and the token the ink names', () => {
  const tag = source('src/components/KindTag.tsx');
  const tokens = source('../ui/tokens.css');

  for (const kind of KINDS) {
    expect(tag, `${kind} names its own ink`).toContain(`  ${kind}: 'text-${kind} border-${kind}',`);
    // `text-<kind>` resolves only where the stylesheet defines the colour it stands for.
    expect(tokens, `${kind} has a colour token`).toContain(`--color-${kind}:`);
  }
});

test('the mark is a letter of the word the reader is given, and the word travels as the title', () => {
  const tag = source('src/components/KindTag.tsx');
  // The letter is derived from the word rather than carried in a table, so a kind a project renames cannot be marked by
  // a stale second spelling, and no screen can fall back to the engine's first letters by accident.
  expect(tag, 'the word is read from the projection').toMatch(/const words = useKindWords\(\)/);
  expect(tag, 'the letter is read from the word').toMatch(/word\.slice\(0, 1\)\.toUpperCase\(\)/);
  expect(tag, 'the whole word is the title').toMatch(/title=\{word\}/);
  expect(tag, 'and the accessible name').toMatch(/aria-label=\{word\}/);
});

test('a project\'s words are laid over the deployment\'s, which are laid over the format\'s', () => {
  // Three layers and one order: the project speaks for its own domain, the deployment for everything it draws, and the
  // format for whatever nobody named. A layer that names one kind leaves the other two to the layer under it.
  expect(wordsOf()).toEqual(FORMAT_WORDS);
  expect(wordsOf(undefined, { fact: 'observation' })).toEqual({
    fact: 'observation',
    intent: 'intent',
    hint: 'hint',
  });
  const project = { fact: 'evidence', intent: 'calculation', hint: 'requirement' };
  const deployment = { fact: 'observation', intent: 'action' };
  expect(wordsOf(project, deployment), 'the project wins').toEqual(project);
  expect(wordsOf({ hint: 'policy' }, deployment), 'and a kind it leaves alone is the deployment\'s').toEqual({
    fact: 'observation',
    intent: 'action',
    hint: 'policy',
  });
});
