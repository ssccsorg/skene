// The bar states what a deployment can do, when that is not everything.
//
// A board served from a committed run is read-only, and a reader looking for a control that is not there has been told
// nothing about why. The statement belongs to the deployment rather than to the frame, so the brand carries it and the
// bar draws it beside the version, which is where a reader looks for what they are standing on.
//
// The frame draws nothing when a brand states none: a status the frame invented would be a claim about a deployment the
// frame knows nothing about.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const source = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

test('a brand may state a status, and stating none is the default', () => {
  const brand = source('src/lib/brand.tsx');
  expect(brand, 'the field is optional').toMatch(/\bstatus\?: string;/);
});

test('the bar draws the status beside the version, and only when the brand carries one', () => {
  const header = source('src/components/Header.tsx');
  expect(header, 'the status is drawn on the brand button').toMatch(/brand\.status \?/);
  // The version and the status are one line, so the status is drawn after the version rather than anywhere in the bar.
  expect(header.indexOf('brand.version'), 'the version comes first').toBeLessThan(
    header.indexOf('brand.status'),
  );
  expect(header, 'the status is set in the bar`s own small type').toMatch(
    /brand\.status[\s\S]*?text-\[1[01](?:\.\d+)?px\]/,
  );
});
