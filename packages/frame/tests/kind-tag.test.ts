// The kind mark a deployment draws: one colour, one letter, and the token behind the colour.
//
// A record's kind is a term of the format, so a deployment does not choose how it looks: it draws the frame's mark.
// That is only true if the frame publishes the mark and the stylesheet defines the ink it names, so this holds the two
// ends together: a kind with no token would render an outline with no colour, and nothing on the page would say why.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

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

test('the mark is the kind\'s first letter, and the word travels as the title', () => {
  const tag = source('src/components/KindTag.tsx');
  // The letter is derived from the name rather than carried in a table, so a kind added to the format cannot be marked
  // by a stale second spelling.
  expect(tag, 'the letter is read from the name').toMatch(/kind\.slice\(0, 1\)\.toUpperCase\(\)/);
  expect(tag, 'the whole word is the title').toMatch(/title=\{kind\}/);
});
