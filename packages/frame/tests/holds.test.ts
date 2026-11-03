// What a member holds, as a reading of the room's answers.
//
// The Members panel walks this tree and the space draws it, so the reading is the one thing the two surfaces share.
// What is held here is the shape of that reading: a member's own level always stands, a level under it stands only
// while its parent is open, an element knows what holds it, and a deeper level is drawn closer in so a tree stays
// inside the frame it is drawn in.

import { expect, test } from 'vitest';
import { fanAt, fanTree, heldUnder, leafOf, reachOf, spreadOf } from '@/lib/holds';
import { nameWidth } from '@ssccsorg/skene-ui';
import { useHoldStore } from '@/stores/holds';
import type { Lower } from '@/lib/channel';

const ROWS: Record<string, Lower[]> = {
  'spiderpi-1': [
    { name: 'spiderpi-1/arm', dir: true },
    { name: 'spiderpi-1/legs', dir: true },
    { name: 'spiderpi-1/vision', dir: true },
  ],
  'spiderpi-1/legs': [
    { name: 'spiderpi-1/legs/leg-1', dir: true },
    { name: 'spiderpi-1/legs/leg-2', dir: true },
  ],
  'spiderpi-1/legs/leg-1': [{ name: 'spiderpi-1/legs/leg-1/hip', dir: false }],
};

test('a member own level stands whether or not anything is open', () => {
  expect(heldUnder('spiderpi-1', ROWS, []).map((each) => each.name)).toEqual(['arm', 'legs', 'vision']);
});

test('a level stands only under an open parent', () => {
  // A level at a time, so the whole of the member's own level is read before the level under it is begun: a part's name
  // is placed before anything the part holds, which is what puts a level at its own parent rather than at the member.
  expect(heldUnder('spiderpi-1', ROWS, ['spiderpi-1/legs']).map((each) => `${each.depth}:${each.name}`)).toEqual([
    '1:arm',
    '1:legs',
    '1:vision',
    '2:leg-1',
    '2:leg-2',
  ]);
  expect(
    heldUnder('spiderpi-1', ROWS, ['spiderpi-1/legs', 'spiderpi-1/legs/leg-1']).map((each) => each.name),
    'and a level of that level under it',
  ).toContain('hip');
  expect(
    heldUnder('spiderpi-1', ROWS, ['spiderpi-1/arm']).map((each) => each.name),
    'an open folder with nothing under it adds nothing',
  ).toEqual(['arm', 'legs', 'vision']);
});

test('an element says what holds it, so a level is drawn at its own parent', () => {
  const held = heldUnder('spiderpi-1', ROWS, ['spiderpi-1/legs']);
  expect(held.find((each) => each.name === 'legs')?.under).toBeNull();
  expect(held.find((each) => each.name === 'leg-1')?.under).toBe('spiderpi-1/legs');
});

test('an element is named by the last step of the room own address for it', () => {
  expect(leafOf('spiderpi-1/legs/leg-3/hip')).toBe('hip');
  expect(leafOf('workspace/apps/cockpit')).toBe('cockpit');
  expect(leafOf('/'), 'an address with no step is left as it is rather than drawn empty').toBe('/');
});

test('a level fans out below what holds it, and a level of one stands in the middle', () => {
  const [middleX, middleY] = fanAt([100, 100], 0, 1, 1);
  expect(Math.round(middleX)).toBe(100);
  expect(middleY, 'straight down, because the screen own y grows downward').toBeGreaterThan(100);

  const [left, right] = [fanAt([100, 100], 0, 2, 1), fanAt([100, 100], 1, 2, 1)];
  expect(left[0]).toBeLessThan(right[0]);
  expect(Math.round(left[1]), 'and a level is spread along one arc').toBe(Math.round(right[1]));
});

test('a level is reached far enough that its own names do not overlap', () => {
  // The reach follows the count, because what has to fit is the level's own names: a level of six stands further out
  // than a level of two, and a deeper level with a narrower fan reaches further to keep the same spacing.
  for (let count = 2; count <= 6; count += 1) {
    for (let depth = 1; depth <= 3; depth += 1) {
      const at = Array.from({ length: count }, (_, index) => fanAt([0, 0], index, count, depth));
      for (let index = 1; index < count; index += 1) {
        const gap = Math.hypot(at[index][0] - at[index - 1][0], at[index][1] - at[index - 1][1]);
        expect(Math.round(gap), `a level of ${count} at depth ${depth}`).toBeGreaterThanOrEqual(41);
      }
    }
  }

  // A level wider than the frame has room for is drawn a little tighter rather than off the frame.
  expect(reachOf(40, spreadOf(1))).toBeLessThanOrEqual(170);
});

test('a tree fanned for a frame is drawn inside it', () => {
  // A fan is geometry and geometry does not know how wide a name is, so the frame the tree is about to be drawn in is
  // handed in: the board seeds the fan for its own width, and every name comes back inside it. A frame of no width
  // (or none given at all) is the space without a drawing in it, which is why the bound is the width's and not a
  // constant here.
  const rows: Record<string, Lower[]> = {
    'w': Array.from({ length: 9 }, (_, index) => ({ name: `w/part-${index}`, dir: true })),
  };
  const held = heldUnder('w', rows, []);
  expect(held).toHaveLength(9);

  for (const width of [200, 420, 900]) {
    const at = fanTree(held, [width / 2, 300], width);
    expect(at, 'every element is placed').toHaveLength(9);
    for (const each of at) {
      const half = Math.min(nameWidth(each.name) / 2, width / 2);
      expect(each.at[0], `${each.name} at width ${width}`).toBeGreaterThanOrEqual(half - 1e-9);
      expect(each.at[0], `${each.name} at width ${width}`).toBeLessThanOrEqual(width - half + 1e-9);
    }
  }

  // A level far wider than the frame is drawn down the frame's own edges rather than past them, which is the whole of
  // what the bound is for: a name past the edge is a name the pilot has to go looking for.
  const narrow = fanTree(held, [100, 300], 160);
  for (const each of narrow) {
    const half = Math.min(nameWidth(each.name) / 2, 80);
    expect(each.at[0]).toBeGreaterThanOrEqual(half - 1e-9);
    expect(each.at[0]).toBeLessThanOrEqual(160 - half + 1e-9);
  }
});

test('closing a folder closes everything under it', () => {
  const store = useHoldStore.getState();
  store.clear();
  store.toggle('spiderpi-1/legs');
  store.toggle('spiderpi-1/legs/leg-1');
  expect(useHoldStore.getState().open).toEqual(['spiderpi-1/legs', 'spiderpi-1/legs/leg-1']);

  useHoldStore.getState().toggle('spiderpi-1/legs');
  expect(useHoldStore.getState().open, 'a level whose parent is closed is not drawn').toEqual([]);
});
