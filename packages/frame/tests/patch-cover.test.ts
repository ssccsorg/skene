// The shape a window shows and the shape it is.
//
// A patch is whatever the pilot dragged it to, and a medium has its own shape. Stretching the second to the first is what
// made a video look wrong on the shell: the default window is nearly the video's shape and a resized one is not. The rule
// held here is the one the panel's thumbnail and the shell surface already follow, that the picture fills the window and
// keeps its proportions.

import { expect, test } from 'vitest';
import { coverUv, framedCells, patchAspect } from '@/lib/board';

test('a patch is as wide as its own cells, narrowed by the parallel it stands on', () => {
  // The patch is a quad of the room's own coordinates, so its width in angles is its cells and its width on the surface
  // is that much shorter by the cosine of its elevation: the meridians a picture's sides are drawn on stand closer
  // together the higher it stands. A decal drawn from the ratio of the cells alone is stretched across by that much.
  expect(patchAspect([1, 0.6], 0)).toBeCloseTo(1 / 0.6, 6);
  expect(patchAspect([1, 1], 0)).toBeCloseTo(1, 6);
  expect(patchAspect([1, 0.6], Math.PI / 9)).toBeCloseTo((1 / 0.6) * Math.cos(Math.PI / 9), 6);
  expect(patchAspect([1, 0.6], Math.PI / 9), 'a picture higher up is narrower').toBeLessThan(1 / 0.6);
});

test('a medium wider than the patch keeps its shape and loses its sides', () => {
  const patch = 1.5;
  const medium = 16 / 9;
  const { repeat, offset } = coverUv(patch, medium);
  expect(repeat[1]).toBe(1);
  expect(repeat[0]).toBeCloseTo(patch / medium, 6);
  expect(offset[0]).toBeCloseTo((1 - patch / medium) / 2, 6);
  expect(offset[1]).toBe(0);
});

test('a medium narrower than the patch keeps its shape and loses its top and bottom', () => {
  const patch = 4;
  const medium = 16 / 9;
  const { repeat, offset } = coverUv(patch, medium);
  expect(repeat[0]).toBe(1);
  expect(repeat[1]).toBeCloseTo(medium / patch, 6);
  expect(offset[1]).toBeCloseTo((1 - medium / patch) / 2, 6);
  expect(offset[0]).toBe(0);
});

test('what the crop shows has the patch own shape, whatever the medium is', () => {
  for (const medium of [4 / 3, 16 / 9, 2.39, 1]) {
    for (const patch of [0.9, 1.5, 2.35, 4]) {
      const { repeat } = coverUv(patch, medium);
      expect((repeat[0] * medium) / repeat[1], `${medium} in ${patch}`).toBeCloseTo(patch, 6);
    }
  }
  expect(coverUv(0, 2)).toEqual({ repeat: [1, 1], offset: [0, 0] });
  expect(coverUv(2, 0)).toEqual({ repeat: [1, 1], offset: [0, 0] });
});

test('a medium keeps its own shape inside the frame it is put in', () => {
  // The window is the pilot's shape, so the picture is scaled to it instead of being cropped to it. A
  // wide medium in a square frame takes the full width and less height; a tall one takes the full
  // height and less width; and a medium the frame's own shape is left exactly where the frame is.
  const wide = framedCells([1, 1], 0, 2);
  expect(wide[0]).toBeCloseTo(1, 6);
  expect(wide[1]).toBeCloseTo(0.5, 6);
  expect(patchAspect(wide, 0)).toBeCloseTo(2, 6);

  const tall = framedCells([2, 1], 0, 0.5);
  expect(tall[1]).toBeCloseTo(1, 6);
  expect(tall[0]).toBeCloseTo(0.5, 6);
  expect(patchAspect(tall, 0)).toBeCloseTo(0.5, 6);

  expect(framedCells([2, 1], 0, 2)).toEqual([2, 1]);
  expect(framedCells([1, 0.6], 0, undefined), 'an unknown medium takes the frame').toEqual([1, 0.6]);
});
