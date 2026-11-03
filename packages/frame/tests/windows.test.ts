// One window model under every content the space can put on its shell.
//
// A media view, a map and a place being chosen differ in what they show and not in being a window: they stand where the
// pilot put them, fold, and are named by the member that carries them. This holds the seam that says so, and the store's
// answer for a window kept from before the kind existed.

import { beforeEach, expect, test } from 'vitest';
import type { DeclaredView } from '@ssccsorg/skene-kernel';
import { VIEW_STATUS, kindOf, readView, statusOf, statusWith, windowOf, windowOfCamera } from '@/lib/windows';
import { UNKNOWN_KIND, viewKindOf, viewKinds } from '@/lib/view-kinds';
import { useViews } from '@/stores/views';

const camera = {
  id: 'drone-2-eye',
  kind: 'media' as const,
  origin: 'drone-2',
  src: '/media/robot_1.mp4',
  cells: [1, 0.6] as [number, number],
};

beforeEach(() => {
  useViews.getState().reset();
});

test('every kind of window is one window with a word and a glyph', () => {
  expect(viewKinds().map((kind) => kind.kind).sort()).toEqual(['map', 'media']);
  for (const kind of [...viewKinds(), UNKNOWN_KIND]) {
    expect(kind.label).toBeTruthy();
    expect(kind.Icon).toBeTruthy();
  }
});

test('a kind this build does not know is named rather than guessed', () => {
  expect(kindOf(undefined)).toBe('media');
  expect(kindOf('chart')).toBe('unknown');
  expect(UNKNOWN_KIND.label).toBe('view');
});

test('a camera is a media window of the member that carries it', () => {
  expect(windowOfCamera(camera)).toEqual({
    id: 'drone-2-eye',
    kind: 'media',
    origin: 'drone-2',
    title: 'drone-2-eye',
  });
});

test('a map and a place are the same window model, named by what they show', () => {
  expect(windowOf('map', 'drone-2/map', 'drone-2')).toMatchObject({ kind: 'map', origin: 'drone-2' });
  expect(windowOf('edit', 'drone-2', 'drone-2', 'move drone-2')).toMatchObject({
    kind: 'edit',
    title: 'move drone-2',
  });
});

test('a view is drawn with the status the place declares, and live when it declares none', () => {
  const view: DeclaredView = { id: 'drone-2-eye', src: '/media/robot_1.mp4', cells: [1, 0.6] };
  expect(statusOf(view)).toBe('live');
  expect(statusOf({ ...view, status: 'replaying' })).toBe('replaying');
  expect(statusOf({ ...view, status: 'streaming' as never })).toBe('unknown');
  expect(Object.keys(VIEW_STATUS).sort()).toEqual(['live', 'recording', 'replaying', 'stopped', 'unknown']);
  for (const status of Object.values(VIEW_STATUS)) {
    expect(status.word).toBeTruthy();
    expect(status.ink).toBeTruthy();
  }
});

test('a view is stopped when its medium is not running, and its declaration answers until it says', () => {
  const view: DeclaredView = { id: 'drone-2-eye', src: '/media/robot_1.mp4', cells: [1, 0.6] };
  expect(statusWith(view, undefined)).toBe('live');
  expect(statusWith(view, true)).toBe('live');
  expect(statusWith(view, false)).toBe('stopped');
  expect(statusWith({ ...view, status: 'replaying' }, true)).toBe('replaying');
  expect(statusWith({ ...view, status: 'recording' }, false)).toBe('stopped');
  expect(statusWith({ ...view, status: 'stopped' }, true)).toBe('live');
});

test('a window kept before its kind existed is read as media', () => {
  expect(kindOf(undefined)).toBe('media');
  expect(kindOf('map')).toBe('map');
});

test('a view a place writes without a kind is read as the footage it is', () => {
  // Every place written before a view had a kind declares bytes and nothing else, and those are a camera.
  expect(readView({ id: 'camera-1', src: '/media/robot_1.mp4', cells: [1, 0.6] })).toEqual({
    id: 'camera-1',
    kind: 'media',
    src: '/media/robot_1.mp4',
    cells: [1, 0.6],
    status: 'live',
  });
  expect(readView({ id: 'yard-map', kind: 'map', cells: [1, 1] })).toEqual({
    id: 'yard-map',
    kind: 'map',
    cells: [1, 1],
    status: 'live',
  });
  // A map of the whole place is the N:1 case: one window over every unit, and the scope is part of the view rather
  // than of the window. A scope this build does not know is read as the carrier, which is what every map was before.
  expect(readView({ id: 'array-map', kind: 'map', scope: 'place', cells: [1.2, 0.75] })).toEqual({
    id: 'array-map',
    kind: 'map',
    scope: 'place',
    cells: [1.2, 0.75],
    status: 'live',
  });
  expect(readView({ id: 'other-map', kind: 'map', scope: 'galaxy', cells: [1, 1] })).toEqual({
    id: 'other-map',
    kind: 'map',
    cells: [1, 1],
    status: 'live',
  });
});

test('a kind this build cannot draw is kept rather than dropped or misread', () => {
  // A newer place is named by the kind it wrote, and what it carried is kept with it, so the panel can say what the
  // view is instead of showing a picture that belongs to another kind.
  expect(readView({ id: 'chart-1', kind: 'chart', src: '/x.json', cells: [1, 1], status: 'streaming' })).toEqual({
    id: 'chart-1',
    kind: 'unknown',
    declared: 'chart',
    src: '/x.json',
    cells: [1, 1],
    status: 'unknown',
  });
  // A media view with no bytes is not a picture either, so it takes the same undrawable row.
  expect(readView({ id: 'camera-2', cells: [1, 1] })).toMatchObject({ kind: 'unknown', declared: 'media' });
});

test('a kind that reads a view draws its row, so a registered kind cannot fold to nothing', () => {
  // The register is the answer the panel reads, and a kind that reads a declaration without a body would be a row with an
  // empty fold. A kind this build does not hold is named by the panel instead, which is what the unknown entry is for.
  for (const kind of viewKinds().filter((each) => each.read)) {
    expect(kind.Row, `${kind.kind} reads a view and draws no body`).toBeTypeOf('function');
  }
  expect(viewKindOf('chart')).toBeUndefined();
});

test('the store keeps the kind a window was opened with, and media when none is said', () => {
  useViews.getState().open('drone-2-eye');
  expect(useViews.getState().views[0]).toMatchObject({ id: 'drone-2-eye', kind: 'media' });
  useViews.getState().open('drone-2/map', 'map');
  expect(useViews.getState().views[1]).toMatchObject({ id: 'drone-2/map', kind: 'map' });
});
