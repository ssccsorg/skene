// One window model under every content the space can put on its shell.
//
// A view of any kind differs in what it shows and not in being a window: it stands where the pilot put it, folds, and is
// named by the member that carries it. This holds the seam that says so, and the rule a kind is read by. The frame ships
// a map and nothing else, so the rule is held with a kind this file installs: a kind is any module's declaration, and the
// frame may not know which one it is.

import { beforeEach, expect, test } from 'vitest';
import type { DeclaredView } from '@ssccsorg/skene-kernel';
import { VIEW_STATUS, kindOf, readView, statusOf, statusWith, windowOf, windowOfCamera } from '@/lib/windows';
import { UNKNOWN_KIND, registerViewKind, viewKindOf, viewKinds } from '@/lib/view-kinds';
import { useViews } from '@/stores/views';

/**
 * A kind of this file's own, which claims the default.
 *
 * It is what a deployment's kind is: a name, a mark and a reading of a declaration. The default it claims is the answer a
 * declaration written before kinds existed gets, and which kind claims it is the register's business rather than the
 * frame's.
 */
registerViewKind({
  kind: 'sample',
  label: 'sample',
  Icon: () => null,
  default: true,
  read: (declared: DeclaredView) => ({
    id: declared.id,
    kind: 'sample',
    cells: declared.cells,
    status: statusOf(declared),
    from: declared.from,
    to: declared.to,
  }),
});

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
  expect(viewKinds().map((kind) => kind.kind)).toEqual(['sample']);
  for (const kind of [...viewKinds(), UNKNOWN_KIND]) {
    expect(kind.label).toBeTruthy();
    expect(kind.Icon).toBeTruthy();
  }
});

test('a kind this build does not know is named rather than guessed', () => {
  expect(kindOf(undefined), 'the kind that claims the default is the answer').toBe('sample');
  expect(kindOf('chart')).toBe('unknown');
  expect(UNKNOWN_KIND.label).toBe('view');
});

test('a camera is the window its own kind names, carried by the member that carries it', () => {
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

test('a window kept before its kind existed is read as the kind that claims the default', () => {
  expect(kindOf(undefined)).toBe('sample');
  expect(kindOf('sample')).toBe('sample');
});

test('a view a place writes without a kind is read by the kind that claims it', () => {
  expect(readView({ id: 'camera-1', src: '/media/robot_1.mp4', cells: [1, 0.6] })).toEqual({
    id: 'camera-1',
    kind: 'sample',
    cells: [1, 0.6],
    status: 'live',
    from: undefined,
    to: undefined,
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
  // A kind whose module was never imported has no reading, so the declaration is named rather than guessed at.
  expect(readView({ id: 'radar-1', kind: 'radar', cells: [1, 1] })).toMatchObject({ kind: 'unknown', declared: 'radar' });
});

test('the store keeps the kind a window was opened with, and the default when none is said', () => {
  useViews.getState().open('drone-2-eye');
  expect(useViews.getState().views[0]).toMatchObject({ id: 'drone-2-eye', kind: 'sample' });
  useViews.getState().open('drone-2/map', 'sample');
  expect(useViews.getState().views[1]).toMatchObject({ id: 'drone-2/map', kind: 'sample' });
});

test('a kind reads its own view, and the register is where its mark is found', () => {
  expect(viewKindOf('sample')?.kind).toBe('sample');
  expect(viewKindOf('chart')).toBeUndefined();
});
