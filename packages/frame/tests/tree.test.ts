// The tree a member holds: how much of it is read, and where it stands.
//
// Both bounds are claims about the data and not about the drawing, which is why they are held here. A room answers one
// level at a time and a directory answers another level for every level asked, so a tree is unbounded by the room and
// bounded by whoever reads it; and a directory holds as many entries as it likes, so the depth is not a bound on its own.
// Two renderers that each stopped where they liked would stop in two different places.
//
// Where the tree stands is the same kind of claim. A level is drawn at the name the space's own lay-out placed, and every
// level under it at the element holding it: a line then joins two things that are on screen rather than two points nobody
// can see.

import { expect, test } from 'vitest';

import type { Lower } from '@/lib/channel';
import { HELD_DEPTH, fanTree, heldUnder, treeAt, withinOf } from '@/lib/holds';
import { layoutLevels, nameWidth, type NameAt } from '@/lib/labels';

const file = (name: string): Lower => ({ name, dir: false });
const dir = (name: string): Lower => ({ name, dir: true });

test('a level stands at its path within the member, which is the one thing the room is asked about', () => {
  // A room states a member's elements under the member, so an address leads with the member and the ask is the part under
  // it. The member's own level is the empty path, which is the same ask as any other level with nothing under it.
  expect(withinOf('delta-cockpit', 'delta-cockpit')).toBe('');
  expect(withinOf('delta-cockpit', 'delta-cockpit/src')).toBe('src');
  expect(withinOf('delta-cockpit', 'delta-cockpit/src/lib/mention.ts')).toBe('src/lib/mention.ts');
  // A machine's parts are its own names, so a level under one is already the part's path.
  expect(withinOf('spiderpi-1', 'spiderpi-1/legs/leg-3')).toBe('legs/leg-3');
});

test('an address that does not lead with the member is asked about as it stands', () => {
  // A reader handed an address from somewhere else asks about that rather than about a mangled one: a member name that is
  // a prefix of another name must not be taken for it.
  expect(withinOf('rover-1', 'hub/motor')).toBe('hub/motor');
  expect(withinOf('rover', 'rover-1/hub')).toBe('rover-1/hub');
});

test('a level at the member is read, and a level under an open one is read for it', () => {
  const rows = { '/a': [dir('/a/one'), file('/a/two')], '/a/one': [file('/a/one/leaf')] };
  expect(heldUnder('/a', rows, []).map((each) => each.path), 'a closed level reads its own level only').toEqual([
    '/a/one',
    '/a/two',
  ]);
  expect(
    heldUnder('/a', rows, ['/a/one']).map((each) => [each.path, each.depth, each.under]),
    'and an open one is read a level further, under the element that holds it',
  ).toEqual([
    ['/a/one', 1, null],
    ['/a/two', 1, null],
    ['/a/one/leaf', 2, '/a/one'],
  ]);
});

test('a tree the room would answer more about is read to the bound, and says where it stopped', () => {
  // A directory that answers another directory for every level asked, which is the shape no reader can follow to the end.
  const rows: Record<string, Lower[]> = {};
  const open: string[] = [];
  let path = '/root';
  for (let depth = 0; depth < HELD_DEPTH + 2; depth += 1) {
    const child = `${path}/d${depth}`;
    rows[path] = [dir(child)];
    open.push(child);
    path = child;
  }

  const read = heldUnder('/root', rows, open);
  expect(read.length, 'no deeper than the bound').toBe(HELD_DEPTH);
  expect(read.at(-1)?.bounded, 'and the element it stopped at says so').toBe(true);
  expect(read.slice(0, -1).every((each) => !each.bounded), 'nothing above the bound is marked').toBe(true);

  const shallower = heldUnder('/root', rows, open, 2);
  expect(shallower.length, 'a reader may ask for less').toBe(2);
  expect(shallower.at(-1)?.bounded).toBe(true);
});

test('what a tree is spent at is a level at a time, so the level nearest the member is read whole', () => {
  // A directory of directories: the level nearest the member stands whole and the spend lands on the levels below it,
  // which is what a reader wants first. A spend that went as the walk descended would stop inside the first folder.
  const rows: Record<string, Lower[]> = {};
  const open: string[] = [];
  for (let index = 0; index < 4; index += 1) {
    const dir = `/wide/d${index}`;
    rows[dir] = Array.from({ length: 6 }, (_, at) => file(`${dir}/f${at}`));
    open.push(dir);
  }
  rows['/wide'] = Array.from({ length: 4 }, (_, index) => dir(`/wide/d${index}`));

  const read = heldUnder('/wide', rows, open, HELD_DEPTH, 10);
  expect(read.length, 'the spend is the bound').toBe(10);
  expect(read.filter((each) => each.depth === 1).length, 'the nearest level stands whole').toBe(4);
  const last = read.at(-1);
  expect(last?.bounded, 'and the element the reading stopped before says there is more').toBe(true);
  expect(read.slice(0, -1).every((each) => !each.bounded), 'nothing before it was cut').toBe(true);
});

const WIDE = 900;

test('a level is brought inside the frame it is fanned for, and the levels under it follow it in', () => {
  // Eight names in a level are wider than a narrow board, and a name off the side of the board is a name the pilot goes
  // looking for. The fan is geometry and geometry does not know how wide a name is, so the frame's own width is what
  // brings them back in.
  const rows = {
    '/a': Array.from({ length: 8 }, (_, index) => file(`/a/file-${index}.rs`)),
  };
  const held = heldUnder('/a', rows, []);
  for (const width of [260, 400, WIDE]) {
    const stood = fanTree(held, [width / 2, 100], width);
    for (const each of stood) {
      expect(each.at[0], `a name of ${width} px stands inside it`).toBeGreaterThanOrEqual(0);
      expect(each.at[0]).toBeLessThanOrEqual(width);
    }
  }
  // And a frame wide enough for the fan does not have it moved: the clamp only ever brings a name back in.
  const roomy = fanTree(held, [WIDE / 2, 100], WIDE);
  const tight = fanTree(held, [WIDE / 2, 100]);
  expect(roomy.map((each) => each.at)).toEqual(tight.map((each) => each.at));
});

test('a level under a closed folder is not drawn, and neither are the lines of it', () => {
  const rows = {
    '/a': [dir('/a/one'), dir('/a/two')],
    '/a/one': [file('/a/one/x'), file('/a/one/y')],
    '/a/two': [file('/a/two/x')],
  };
  const member: [number, number] = [100, 100];
  const closed = fanTree(heldUnder('/a', rows, ['/a/one']), member);
  expect(closed.map((each) => each.path), 'the folder is open, so its level stands').toContain('/a/one/x');
  const shut = fanTree(heldUnder('/a', rows, []), member);
  expect(
    shut.map((each) => each.path),
    'a folder nobody has open is a name and nothing under it',
  ).toEqual(['/a/one', '/a/two']);
});

/**
 * The tree as the board draws it, which is the whole of the pipeline and not one step of it.
 *
 * A tree of this size cannot be drawn by geometry alone: a name is about a hundred pixels wide on a row thirty pixels
 * tall, so a level of many names fanned out is names over one another and a bundle of lines crossing the board. What is
 * held here is that the drawing the board makes of it never has two names over one another, never stands a name outside
 * the frame, and never draws a line to a place nothing is at -- which between them is the picture a pilot complained
 * about, and the pipeline is asserted rather than a step so that a change to any of the three is caught.
 */
test('the tree the board draws puts no name over another and joins every line to a name', () => {
  // A directory of directories, four levels deep and wide at every level, which is what a repository is.
  const rows: Record<string, Lower[]> = {};
  const open: string[] = [];
  const grow = (path: string, depth: number) => {
    if (depth >= HELD_DEPTH) return;
    rows[path] = Array.from({ length: 6 }, (_, at) => dir(`${path}/d${at}`));
    for (let at = 0; at < 6; at += 1) {
      open.push(`${path}/d${at}`);
      grow(`${path}/d${at}`, depth + 1);
    }
  };
  grow('/root', 0);
  const held = heldUnder('/root', rows, open);
  expect(held.length, 'the reading is spent rather than unbounded').toBeGreaterThan(20);
  expect(held.length, 'and the spend is what bounded it').toBeLessThanOrEqual(32);

  for (const size of [[900, 700] as [number, number], [420, 360] as [number, number]]) {
    const member: [number, number] = [size[0] / 2, size[1] * 0.3];
    const seeded = fanTree(held, member, size[0]);
    const levels = seeded.reduce<NameAt[][]>((groups, each) => {
      const group = groups[each.depth - 1] ?? (groups[each.depth - 1] = []);
      group.push({ id: each.path, at: each.at, text: each.name });
      return groups;
    }, []);
    const laid = new Map(layoutLevels(levels, size[1]).map((name) => [name.id, name]));
    const stood = treeAt(seeded, member, (each) => {
      const name = laid.get(each.path);
      return name && !name.dropped ? name.at : null;
    });

    const drawn = new Map(stood.map((each) => [each.path, each]));
    for (const each of stood) {
      expect(each.at[0], `${each.path} stands inside the frame`).toBeGreaterThanOrEqual(0);
      expect(each.at[0]).toBeLessThanOrEqual(size[0]);
      expect(each.at[1]).toBeGreaterThanOrEqual(0);
      expect(each.at[1]).toBeLessThanOrEqual(size[1]);
      // A line joins the element to the element that holds it, and both are drawn: a line to a place nothing is at is
      // the unfinished line the drawing exists to refuse.
      const holds = each.under ? drawn.get(each.under) : null;
      if (each.under) expect(holds, `${each.path} is joined to ${each.under}`).toBeDefined();
      expect(each.from, `${each.path} is joined to what holds it`).toEqual(holds ? holds.at : member);
    }

    for (let i = 0; i < stood.length; i += 1) {
      for (let j = i + 1; j < stood.length; j += 1) {
        const [one, other] = [stood[i], stood[j]];
        const apart =
          Math.abs(one.at[1] - other.at[1]) >= 29 ||
          Math.abs(one.at[0] - other.at[0]) >= (nameWidth(one.name) + nameWidth(other.name)) / 2;
        expect(apart, `${one.path} and ${other.path} are not drawn over one another`).toBe(true);
      }
    }
  }
});
test('the tree is drawn from the element that holds it, and the member level from the lay-out the space made', () => {
  const rows = { '/a': [dir('/a/one'), file('/a/two')], '/a/one': [file('/a/one/leaf')] };
  const elements = heldUnder('/a', rows, ['/a/one']);
  const member: [number, number] = [100, 100];
  // Every element is named by the lay-out that drew it, and the tree follows it: a leaf's line starts at the name the
  // pilot can see rather than at the place the fan put it.
  const laidOut: Record<string, [number, number]> = {
    '/a/one': [200, 140],
    '/a/two': [40, 150],
    '/a/one/leaf': [240, 210],
  };
  const stood = treeAt(elements, member, (element) => laidOut[element.path] ?? null);
  const at = (path: string) => stood.find((each) => each.path === path);

  expect(at('/a/one')?.from, 'the member level starts at the member').toEqual(member);
  expect(at('/a/one')?.at, 'and stands where the lay-out put it').toEqual([200, 140]);
  expect(at('/a/one/leaf')?.from, 'a level under it starts at what holds it').toEqual([200, 140]);
  expect(at('/a/one/leaf')?.at, 'and stands where the lay-out put it in its turn').toEqual([240, 210]);
  expect(at('/a/two')?.from, 'and every level at the member starts at the member').toEqual(member);
  expect(at('/a/two')?.at, 'a level the lay-out named is drawn where it says').toEqual([40, 150]);
});

test('a level the space has no place for is not drawn, and neither is anything under it', () => {
  const rows = { '/a': [dir('/a/one'), file('/a/two')], '/a/one': [dir('/a/one/deep'), file('/a/one/leaf')], '/a/one/deep': [file('/a/one/deep/x')] };
  const elements = heldUnder('/a', rows, ['/a/one', '/a/one/deep']);
  const member: [number, number] = [100, 100];
  // The lay-out drops the name of a part when the frame has no room for it. A line drawn to the place the fan would have
  // put it joins a thing to nothing, which is the drawing this refuses to make: the part and everything it holds go
  // together, and the rest of the tree stands.
  const stood = treeAt(elements, member, (element) => (element.path === '/a/one' ? null : ([50, 150] as [number, number])));
  expect(stood.map((each) => each.path), 'the level and what it holds are gone together').toEqual(['/a/two']);
});

test('the fan places every level, which is what a lay-out is handed before it has run', () => {
  const rows = { '/a': [dir('/a/one'), file('/a/two')], '/a/one': [file('/a/one/leaf')] };
  const elements = heldUnder('/a', rows, ['/a/one']);
  const stood = fanTree(elements, [100, 100]);
  expect(stood.map((each) => each.path), 'nothing is held back, a level at a time').toEqual([
    '/a/one',
    '/a/two',
    '/a/one/leaf',
  ]);
  expect(
    stood.every((each) => each.at[1] > each.from[1]),
    'every level fans below what holds it',
  ).toBe(true);
  const leaf = stood.find((each) => each.path === '/a/one/leaf');
  expect(leaf?.from, 'and a level under a part holds at the part').toEqual(stood[0].at);
});
