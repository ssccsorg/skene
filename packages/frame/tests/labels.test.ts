// The space's names, held to the one rule the layer exists for: no two are drawn over one another.
//
// The projection and the camera are the board's business; what is asserted here is the placement, which
// is arithmetic and the part that fails silently. The crowd below is the drive's own cell: the vision
// camera and the operator console stand a hand's width apart and each name is wider than that, which is
// the collision the layer was written for.

import { expect, test } from 'vitest';
import { NAME_ROW, layoutLevels, layoutNames, nameWidth, type NameAt } from '@/lib/labels';

/** Two names drawn over one another: within half a width of each other and within a row of each other. */
function over(a: { at: [number, number] }, b: { at: [number, number] }, aw: number, bw: number): boolean {
  return Math.abs(a.at[0] - b.at[0]) < (aw + bw) / 2 && Math.abs(a.at[1] - b.at[1]) < NAME_ROW;
}

function collides(names: NameAt[], height = 400) {
  const placed = layoutNames(names, height);
  const width = new Map(names.map((name) => [name.id, nameWidth(name.text)]));
  const found: string[] = [];
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      const a = placed[i];
      const b = placed[j];
      if (over(a, b, width.get(a.id) ?? 0, width.get(b.id) ?? 0)) found.push(`${a.id} over ${b.id}`);
    }
  }
  return { placed, found };
}

test('a name on its own is left where its mark is', () => {
  const placed = layoutNames([{ id: 'solo', at: [200, 150], text: 'servo-drive-3' }], 400);
  expect(placed).toEqual([{ id: 'solo', at: [200, 150], stepped: false, dropped: false }]);
});

test('names standing on the same mark are stepped apart, and each keeps its own', () => {
  const crowd: NameAt[] = [
    { id: 'vision-camera-2', at: [400, 300], text: 'vision-camera-2 frame 18' },
    { id: 'operator-console-1', at: [402, 300], text: 'operator-console-1 setpoint 3' },
    { id: 'conveyor-7', at: [404, 302], text: 'conveyor-7 speed 24' },
    { id: 'line-historian', at: [399, 299], text: 'line-historian shift 0' },
  ];
  const { placed, found } = collides(crowd);
  expect(found, 'no two names are drawn over one another').toEqual([]);
  const ids = placed.map((name) => name.id);
  expect(ids, 'and they come back in the order they were handed over').toEqual([
    'vision-camera-2',
    'operator-console-1',
    'conveyor-7',
    'line-historian',
  ]);
  expect(placed.filter((name) => name.stepped).length, 'and the ones that moved say so').toBeGreaterThan(
    0,
  );
});

test('the collision the cell has is the one the layer removes', () => {
  // The two names as the place stands them: 88 place units apart across a 520 wide view, which on a
  // board of about 700 px is a little over 100 px, and each name is about twice that.
  const crowd: NameAt[] = [
    { id: 'vision-camera-2', at: [290, 210], text: 'vision-camera-2 frame 18' },
    { id: 'operator-console-1', at: [410, 210], text: 'operator-console-1 setpoint 3' },
  ];
  expect(over(crowd[0], crowd[1], nameWidth(crowd[0].text), nameWidth(crowd[1].text))).toBe(true);
  const { placed, found } = collides(crowd);
  expect(found, 'the layout is what removes it').toEqual([]);
  expect(placed.every((name) => name.at[0] === (name.id === 'vision-camera-2' ? 290 : 410))).toBe(true);
});

test('a name is kept inside the frame it is drawn in', () => {
  const placed = layoutNames(
    [
      { id: 'top', at: [100, 2], text: 'servo-drive-3 cycle 1' },
      { id: 'bottom', at: [100, 398], text: 'servo-drive-3 cycle 2' },
    ],
    400,
  );
  for (const name of placed) {
    expect(name.dropped, `${name.id} has space`).toBe(false);
    expect(name.at[1]).toBeGreaterThanOrEqual(NAME_ROW);
    expect(name.at[1]).toBeLessThanOrEqual(400 - NAME_ROW);
  }
});

test('a group placed after another never takes a row the one before it needed', () => {
  // A tree read a level at a time is placed a level at a time, because one pass over the whole of it by x lets a leaf
  // deep in the tree take the row a part's name then has nowhere to be. A part that is not drawn takes everything it
  // holds with it, so the order of the groups is what keeps a branch from being lost to a leaf.
  const spine: NameAt[] = [{ id: 'part', at: [200, 40], text: 'arm' }];
  const deeper: NameAt[] = [{ id: 'joint', at: [200, 44], text: 'shoulder' }];

  const together = layoutNames([...spine, ...deeper], 120);
  const apart = layoutLevels([spine, deeper], 120);
  const of = (placed: { id: string; at: [number, number]; dropped: boolean }[], id: string) =>
    placed.find((name) => name.id === id);

  // Side by side there is room for one of the two at its own height, and which one loses depends on the order the names
  // are walked in. A level at a time the shallower one is placed first and stands where it asked.
  expect(of(together, 'part')?.at[1], 'one pass lets the deeper name take the row').not.toBe(40);
  expect(of(apart, 'part')?.at, 'a level at a time the part keeps its own row').toEqual([200, 40]);
  expect(of(apart, 'joint')?.at[1], 'and the deeper name steps instead').not.toBe(44);
  expect(apart.filter((name) => name.dropped), 'and both are drawn').toEqual([]);
});

test('a frame with no space for a name drops it rather than drawing it over another', () => {
  // A band of rows shorter than the names in it: every name wants the same two rows, and a frame of a
  // hundred pixels has four. What is asserted is the rule and not the arithmetic: no two names drawn,
  // and anything not drawn says so.
  const crowd: NameAt[] = Array.from({ length: 8 }, (_, index) => ({
    id: `unit-${index}`,
    at: [200, 40 + index * 2],
    text: `machine-${index} cycle ${index}`,
  }));
  const placed = layoutNames(crowd, 100);
  const drawn = placed.filter((name) => !name.dropped);
  expect(drawn.length, 'some names are drawn').toBeGreaterThan(0);
  expect(drawn.length, 'and the frame cannot hold all of them').toBeLessThan(crowd.length);
  for (let i = 0; i < drawn.length; i += 1) {
    for (let j = i + 1; j < drawn.length; j += 1) {
      const a = drawn[i];
      const b = drawn[j];
      const width = new Map(crowd.map((name) => [name.id, nameWidth(name.text)]));
      expect(over(a, b, width.get(a.id) ?? 0, width.get(b.id) ?? 0)).toBe(false);
    }
  }
});
