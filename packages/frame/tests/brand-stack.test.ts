// The stack in the card names the layers, and where a deployment keeps one, links it.
//
// A layer is a name and nothing else for most deployments. The address is the deployment's, because the frame knows no
// hosting: a link written into the frame would be the frame naming an organisation it does not own.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const source = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

test('a layer is a name, or a name and the address it is kept at', () => {
  const brand = source('src/lib/brand.tsx');
  expect(brand, 'the union is the contract').toMatch(
    /export type Layer = string \| \{ name: string; href\?: string \};/,
  );
  expect(brand, 'the stack takes either').toMatch(/layers: Layer\[\];/);
});

test('the card draws a linked layer as a link, and a bare one as text', () => {
  const card = source('src/components/VersionCard.tsx');
  expect(card, 'the address comes from the brand').toMatch(/layer\.href/);
  expect(card, 'a bare layer is still drawn').toMatch(/typeof layer === 'string'/);
  expect(card, 'a link leaves the card rather than replacing it').toMatch(/target="_blank"/);
});
