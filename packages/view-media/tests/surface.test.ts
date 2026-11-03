import { readFileSync } from 'node:fs';
// The surface is one picture with layouts: the tests hold the layouts, the observer rule, and the media declaration
// that tells a flat camera from a still or a spatial feed.

import { expect, test } from 'vitest';
import { mediumOf, slotsOf, surfaceMedia } from '../src/surface';
import { useSurface } from '../src/surface-store';
import type { Camera } from '@ssccsorg/skene-kernel';

const camera = (id: string, origin: string, src = '/media/robot_1.mp4'): Camera => ({
  id,
  kind: 'media',
  src,
  cells: [1, 1],
  origin,
});

test('a single medium covers the surface and a multi-medium mode uses its cells', () => {
  expect(slotsOf('off', 3)).toEqual([]);
  expect(slotsOf('single', 0)).toEqual([]);
  expect(slotsOf('single', 3)).toEqual([{ x: 0, y: 0, w: 1, h: 1 }]);
  expect(slotsOf('split', 2)).toEqual([
    { x: 0, y: 0, w: 0.5, h: 1 },
    { x: 0.5, y: 0, w: 0.5, h: 1 },
  ]);
  expect(slotsOf('grid', 3)).toEqual([
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ]);
});

test('the layout is the mode even when an entity carries fewer media than its cells', () => {
  expect(slotsOf('split', 1)).toEqual(slotsOf('split', 2));
  expect(slotsOf('grid', 1)).toEqual(slotsOf('grid', 4));
  expect(slotsOf('grid', 2)).toEqual(slotsOf('grid', 4));
});

test('a picked entity with its own media is the observer, and one without leaves the run', () => {
  const cameras = [camera('drone-eye', 'drone-1'), camera('heli-eye', 'heli-1')];
  expect(surfaceMedia(cameras, 'drone-1').map((each) => each.id)).toEqual(['drone-eye']);
  expect(surfaceMedia(cameras, 'satellite-1').map((each) => each.id)).toEqual(['drone-eye', 'heli-eye']);
  expect(surfaceMedia(cameras, null).map((each) => each.id)).toEqual(['drone-eye', 'heli-eye']);
  const many = Array.from({ length: 6 }, (_, index) => camera(`eye-${index}`, 'unit'));
  expect(surfaceMedia(many, null), 'the surface plays no more feeds than a grid can show').toHaveLength(4);
});


test('forwarding a media item turns the surface on in the layout it was left in', () => {
  // A surface nobody has turned off opens in its layout, and one that was off opens in the layout it was turned off
  // from. The reset to the default frame is the failure this holds out.
  useSurface.setState({ mode: 'single', previous: 'single' });
  useSurface.getState().activate();
  expect(useSurface.getState().mode).toBe('single');

  useSurface.getState().setMode('grid');
  useSurface.getState().setMode('off');
  expect(useSurface.getState().previous, 'the layout behind the off is kept').toBe('grid');
  useSurface.getState().activate();
  expect(useSurface.getState().mode).toBe('grid');

  useSurface.getState().setMode('split');
  useSurface.getState().activate();
  expect(useSurface.getState().mode).toBe('split');

  // Off is never a layout to return to, whichever way the surface is turned off again.
  useSurface.getState().setMode('grid');
  useSurface.getState().setMode('off');
  useSurface.getState().setMode('off');
  expect(useSurface.getState().previous).toBe('grid');
});

test('a still is read from its declaration or its source name', () => {
  expect(mediumOf(camera('still', 'unit', '/media/villa.png'))).toBe('image');
  expect(mediumOf(camera('video-with-png-name', 'unit', '/media/clip.png'))).toBe('image');
  expect(mediumOf({ ...camera('declared', 'unit', '/media/clip.png'), medium: 'video' })).toBe('video');
});

test('the store is remembered under the package, by the one rule that names a key', () => {
  const source = readFileSync(new URL('../src/surface-store.ts', import.meta.url), 'utf8');
  expect(source, 'the key is reached through the one function that names it').toContain("storageName('surface')");
});
