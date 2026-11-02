// The page's own tokens, turned into something three.js can hold.
//
// three.js reads no `oklch()`, so a token handed to it straight leaves the colour at its default and the board is drawn
// white whatever the legend says. The conversion is the only thing between the stylesheet and the picture, so what is
// asserted here is that a token resolves to a colour, that the two ways of writing one agree, and that anything which is
// not one is passed through rather than turned into a wrong colour.

import { expect, test } from 'vitest';

import { oklchToHex, readableColour } from '@/lib/colour';

test('a token resolves to a six-digit colour', () => {
  for (const token of ['oklch(0.7 0.09 240)', 'oklch(0.84 0.2 149)', 'oklch(0.74 0.1 78)']) {
    expect(oklchToHex(token)).toMatch(/^#[0-9a-f]{6}$/);
  }
});

test('a fraction and a percentage are the same lightness', () => {
  expect(oklchToHex('oklch(70% 0.09 240)')).toBe(oklchToHex('oklch(0.7 0.09 240)'));
  expect(oklchToHex('oklch(0.7 22.5% 240)')).toBe(oklchToHex('oklch(0.7 0.09 240)'));
});

test('the ends of the scale are white and black', () => {
  expect(oklchToHex('oklch(1 0 0)')).toBe('#ffffff');
  expect(oklchToHex('oklch(0 0 0)')).toBe('#000000');
});

test('the hue is what tells one record kind from another', () => {
  expect(oklchToHex('oklch(0.7 0.09 240)')).not.toBe(oklchToHex('oklch(0.7 0.09 78)'));
});

test('an alpha channel and a degree sign are read rather than refused', () => {
  expect(oklchToHex('oklch(0.7 0.09 240deg)')).toBe(oklchToHex('oklch(0.7 0.09 240)'));
  expect(oklchToHex('oklch(0.7 0.09 240 / 0.5)')).toBe(oklchToHex('oklch(0.7 0.09 240)'));
});

test('anything that is not a token is not a colour this can resolve', () => {
  expect(oklchToHex('')).toBeNull();
  expect(oklchToHex('#2c6f8f')).toBeNull();
  expect(oklchToHex('oklch(nope)')).toBeNull();
});

test('a colour three.js can hold is a resolved token, a fallback, or the text unchanged', () => {
  expect(readableColour('oklch(0 0 0)', '#ffffff')).toBe('#000000');
  expect(readableColour('', '#ffffff')).toBe('#ffffff');
  // A token this build does not know is still the token: three.js gets what the stylesheet said, not a guess.
  expect(readableColour('var(--fact)', '#ffffff')).toBe('var(--fact)');
});
