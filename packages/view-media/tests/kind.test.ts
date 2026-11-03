// What footage is, as the package that holds it.
//
// The frame knows a kind has a name, a mark and a reading of a declaration. This is that reading for footage: which
// declarations it draws, how a projection is named, and what a view with no bytes is. The register's own behaviour is the
// frame's and is held there; what is held here is what this kind puts into it.

import { expect, test } from 'vitest';
import { kindOf, readView } from '@ssccsorg/skene-frame/lib/windows';
import { viewKindOf, viewKinds } from '@ssccsorg/skene-frame/lib/view-kinds';
import { useViews } from '@ssccsorg/skene-frame/stores/views';
import type { MediaView } from '@ssccsorg/skene-kernel';
import { MEDIA } from '../src/index';

test('the package is what installs the kind', () => {
  expect(viewKinds().map((kind) => kind.kind)).toContain('media');
  expect(viewKindOf('media')).toBe(MEDIA);
});

test('a declared footage view is read into the picture this build draws', () => {
  expect(readView({ id: 'camera-1', src: '/media/robot_1.mp4', cells: [1, 0.6] })).toEqual({
    id: 'camera-1',
    kind: 'media',
    src: '/media/robot_1.mp4',
    cells: [1, 0.6],
    status: 'live',
    from: undefined,
    to: undefined,
  });
});

test('a still is read from its declaration, and a spatial feed keeps its projection', () => {
  const view = readView({
    id: 'look',
    kind: 'media',
    src: '/media/look.png',
    medium: 'image',
    projection: '360',
    cells: [1, 1],
  });
  const media = view.kind === 'media' ? (view as MediaView) : null;
  expect(media?.medium).toBe('image');
  expect(media?.projection, 'a 360 declaration is read into the spatial renderer').toBe('spatial');
});

test('a medium this build does not know is left out rather than guessed at', () => {
  const view = readView({ id: 'odd', kind: 'media', src: '/x', medium: 'hologram', cells: [1, 1] });
  const media = view.kind === 'media' ? (view as MediaView) : null;
  expect(media?.medium).toBeUndefined();
});

test('a view with no bytes is not a picture, so it is named rather than drawn', () => {
  expect(readView({ id: 'camera-2', cells: [1, 1] })).toMatchObject({ kind: 'unknown', declared: 'media' });
});

test('footage claims the declaration that names no kind, which is what every place wrote before kinds', () => {
  expect(kindOf(undefined)).toBe('media');
  useViews.getState().reset();
  useViews.getState().open('drone-2-eye');
  expect(useViews.getState().views[0]).toMatchObject({ id: 'drone-2-eye', kind: 'media' });
});
