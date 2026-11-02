// What a line can name: the name, and where it lives beside it.
//
// The frame reads one address space for every kind of leaf, so a file, a joint and a command are offered the same way and
// the same query finds any of them. What is held here is the rule the offer follows, which is a file finder's: the query
// matches the name and not the path, and the parent is shown beside the name so that two things sharing a name can be told
// apart. The rule is Zed's own (`crates/file_finder/src/file_finder.rs` keeps a match only when it lands in the file name),
// and it is what makes `@src` offer the folder `src` rather than everything under a folder that happens to be called that.

import { expect, test } from 'vitest';
import { addressesOf, offeredAt, offersFor, skillsOf } from '@/lib/offer';

/** One space's addresses, which is what every case below is read out of. */
const ADDRESSES = [
  'drive',
  'drive/servo-drive-1',
  'dir',
  'dir/src',
  'dir/src/file',
  'dir/other/file',
  'sensor-1',
  'sensor-1/move-front',
  'sensor-1/read-distance',
];

test('an address is read whole: the name it is named by, what holds it, and the member it belongs to', () => {
  expect(offeredAt('dir/src/file')).toEqual({ name: 'file', at: 'dir/src', address: 'dir/src/file', member: 'dir' });
  expect(offeredAt('dir/src')).toEqual({ name: 'src', at: 'dir', address: 'dir/src', member: 'dir' });
  expect(offeredAt('drive'), 'a member of the space is held by nothing').toEqual({
    name: 'drive',
    at: '',
    address: 'drive',
    member: 'drive',
  });
});

test('an ability is a leaf of its member, so it is read as one address and not as a second kind of thing', () => {
  // The sensor is who a line goes to and the ability is what it says: one address carries both, which is what makes a press
  // in the space and a mention in the field the same act.
  expect(offeredAt('sensor-1/move-front')).toEqual({
    name: 'move-front',
    at: 'sensor-1',
    address: 'sensor-1/move-front',
    member: 'sensor-1',
  });
});

test('a query names the leaf, and every leaf with that name is offered with its own parent', () => {
  // Same name, two places: the parent is the whole of what tells them apart, so both are offered and neither is a
  // second result of the same thing.
  expect(offersFor(ADDRESSES, 'file')).toEqual([
    { name: 'file', at: 'dir/src', address: 'dir/src/file', member: 'dir' },
    { name: 'file', at: 'dir/other', address: 'dir/other/file', member: 'dir' },
  ]);
});

test('a query for a folder offers the folder, with what holds it beside it', () => {
  // `src` is a leaf like anything else, so naming it offers it rather than the files under it: the path is what a pilot
  // reads to tell two of them apart, not what a pilot searches.
  expect(offersFor(ADDRESSES, 'src')).toEqual([{ name: 'src', at: 'dir', address: 'dir/src', member: 'dir' }]);
});

test('a query that only lands on a parent offers nothing, which is the whole of the finder rule', () => {
  // A file under `src` is not a file named `src`. Offering it would answer a query about a name with everything that
  // happens to live somewhere of that name, which is a different question and a much longer answer.
  const found = offersFor(ADDRESSES, 'src').map((each) => each.address);
  expect(found).not.toContain('dir/src/file');
  expect(offersFor(ADDRESSES, 'other').map((each) => each.address)).toEqual([]);
});

test('the query is read case-insensitively, and an empty one offers everything in the space own order', () => {
  expect(offersFor(ADDRESSES, 'FRONT').map((each) => each.name)).toEqual(['move-front']);
  expect(offersFor(ADDRESSES, '')).toHaveLength(ADDRESSES.length);
  expect(offersFor(ADDRESSES, '').map((each) => each.address)).toEqual(ADDRESSES);
});

test('a member\'s skills are the leaves it answers, read as offers one level under it', () => {
  // The second list a mention opens: naming a member says where the line goes, and its skills are what it can be asked.
  expect(skillsOf(['move-front', 'read-distance'], 'sensor-1')).toEqual([
    { name: 'move-front', at: 'sensor-1', address: 'sensor-1/move-front', member: 'sensor-1' },
    { name: 'read-distance', at: 'sensor-1', address: 'sensor-1/read-distance', member: 'sensor-1' },
  ]);
  // A folder under a workspace is where files are read from, not a command: the caller hands the member's own answers,
  // which is the rule that keeps the second list an interface rather than the whole tree.
  expect(skillsOf(['src'], 'dir').map((each) => each.address)).toEqual(['dir/src']);
  expect(skillsOf([], 'dir')).toEqual([]);
});

test('a string that is not an address offers nothing rather than a place nothing stands at', () => {
  // The frame answers an address and not a path, so a spelling with an empty segment is refused instead of being read as
  // the address it resembles: inventing a place is worse than an empty offer.
  expect(offeredAt('dir//file')).toBeNull();
  expect(offeredAt('/file')).toBeNull();
  expect(offeredAt('')).toBeNull();
  expect(offersFor(['dir//file', 'file'], 'file').map((each) => each.address)).toEqual(['file']);
});

test('the space is offered as its members and then the abilities each of them answered', () => {
  // An ability is offered as a leaf of its member, which is what lets a line name what to do and not only where to go. The
  // members are handed in already filtered, so this reader cannot offer a name the console would refuse a line to.
  const said = (member: string) =>
    member === 'sensor-1' ? [{ name: 'move-front' }, { name: 'read-distance' }] : null;
  expect(addressesOf(['drive', 'sensor-1'], said)).toEqual([
    'drive',
    'sensor-1',
    'sensor-1/move-front',
    'sensor-1/read-distance',
  ]);
  // The project is a name handed in as it stands and the room answers nothing about it, so it stays one address.
  expect(addressesOf(['drive'], (member) => said(member))).toEqual(['drive']);
  // What a member holds is the rest of the tree and comes after the members, because it is read where a member's own
  // elements are read and not here.
  expect(addressesOf(['drive'], (member) => said(member), ['spiderpi-1/legs', 'spiderpi-1/arm'])).toEqual([
    'drive',
    'spiderpi-1/legs',
    'spiderpi-1/arm',
  ]);
  // The walk answers with the member itself as its own root, so a member is offered once even when the tree names it.
  expect(addressesOf(['drive'], (member) => said(member), ['drive', 'drive/apps'])).toEqual(['drive', 'drive/apps']);
  // And a leaf is read back as a leaf of the member that answered for it.
  expect(offersFor(addressesOf(['drive', 'sensor-1'], said), 'front')).toEqual([
    { name: 'move-front', at: 'sensor-1', address: 'sensor-1/move-front', member: 'sensor-1' },
  ]);
});
