// The card says what the deployment is, and the bar says the card is there.
//
// A view that renders records is not the infrastructure under it, and a reader who opens the name expects the answer to
// "what am I looking at". The lines belong to the deployment, so the brand carries them and the card draws them as a
// list: the frame draws the words and knows nothing about what they mean.
//
// The bar has to show that the name opens something, which is what the info mark beside it is for.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const source = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

test('a brand may say what it is, and stating none is the default', () => {
  const brand = source('src/lib/brand.tsx');
  expect(brand, 'the field is optional').toMatch(/\babout\?: string\[\];/);
});

test('the card draws the lines as a list, and only when the brand carries them', () => {
  const card = source('src/components/VersionCard.tsx');
  expect(card, 'the lines are drawn as a list').toMatch(/<ul\b/);
  expect(card, 'the list is the brand`s lines').toMatch(/brand\.about\.map/);
  expect(card, 'the block is conditional').toMatch(/brand\.about\?\.length \?/);
});

test('the bar marks the name as something that opens', () => {
  const header = source('src/components/Header.tsx');
  expect(header, 'the affordance is an info mark').toMatch(/<Info\b/);
  // The mark stands with the title, so it reads as an affordance on the name rather than on the version.
  expect(header.indexOf('brand.title'), 'the mark comes after the title').toBeLessThan(
    header.indexOf('<Info'),
  );
  expect(header, 'the tooltip says what opens').toMatch(/label="about this view"/);
});
