// One window model under every content the space can put on its shell.
//
// A media view, a map and a place being chosen differ in what they show and not in being a window: they stand where the
// pilot put them, fold, and are named by the member that carries them. This holds the seam that says so, and the store's
// answer for a window kept from before the kind existed.

import { beforeEach, expect, test } from 'vitest';
import type { DeclaredView } from '@/lib/types';
import { VIEW_STATUS, WINDOW_KINDS, kindOf, readView, statusOf, statusWith, windowOf, windowOfCamera } from '@/lib/windows';
import { VIEW_CONTENT } from '@/properties/ViewContent';
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
  expect(Object.keys(WINDOW_KINDS).sort()).toEqual(['edit', 'map', 'media', 'unknown']);
  for (const kind of Object.values(WINDOW_KINDS)) {
    expect(kind.label).toBeTruthy();
    expect(kind.Icon).toBeTruthy();
  }
});

test('a kind this build does not know is named rather than guessed', () => {
  expect(kindOf(undefined)).toBe('media');
  expect(kindOf('chart')).toBe('unknown');
  expect(WINDOW_KINDS.unknown.label).toBe('view');
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

test('every kind a view can be has a body, so a kind the union names cannot draw nothing', () => {
  // The table is keyed by the union, so the compiler asks for a body when a kind is added. This holds the same answer
  // where the panel reads it, because a kind whose body is missing would be a row with an empty fold.
  expect(Object.keys(VIEW_CONTENT).sort()).toEqual(['map', 'media', 'unknown']);
  for (const kind of Object.keys(VIEW_CONTENT)) {
    expect(VIEW_CONTENT[kind as keyof typeof VIEW_CONTENT]).toBeTypeOf('function');
  }
});

test('the store keeps the kind a window was opened with, and media when none is said', () => {
  useViews.getState().open('drone-2-eye');
  expect(useViews.getState().views[0]).toMatchObject({ id: 'drone-2-eye', kind: 'media' });
  useViews.getState().open('drone-2/map', 'map');
  expect(useViews.getState().views[1]).toMatchObject({ id: 'drone-2/map', kind: 'map' });
});
