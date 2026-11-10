// The bar states what the deployment is, when that is not the frame.
//
// A board that renders records is one reading of them, and a reader who takes the screen for the model has been told
// nothing about where the arrangement came from. The statement belongs to the deployment, so the brand carries it and the
// bar draws it after the status, in the same small type, without a border: a status is what the deployment can do, and a
// note is what it is.
//
// The frame draws nothing when a brand states none.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const source = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

test('a brand may state a note, and stating none is the default', () => {
  const brand = source('src/lib/brand.tsx');
  expect(brand, 'the field is optional').toMatch(/\bnote\?: string;/);
});

test('the bar draws the note after the status, and only when the brand carries one', () => {
  const header = source('src/components/Header.tsx');
  expect(header, 'the note is drawn on the brand button').toMatch(/brand\.note \?/);
  expect(header.indexOf('brand.status'), 'the status comes first').toBeLessThan(
    header.indexOf('brand.note'),
  );
  expect(header, 'the note is set in the bar`s own small type').toMatch(
    /brand\.note[\s\S]*?text-\[1[01](?:\.\d+)?px\]/,
  );
});
