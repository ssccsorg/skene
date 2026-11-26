// What a press on a held row does, as the place that stands the member decides it.
//
// A held element is an address and not a record: the frame knows a member holds lower elements and that they stand at a
// path, and what that path means is the room's own vocabulary. So a deployment installs a link and the frame draws the
// press it answers; a place that installs none keeps a leaf as the address it is, with nothing to press.
//
// A register is one per process, so each case below names the addresses it owns: a link that answered everything would
// take the press from every case after it, which is the behaviour the first case is about.

import { expect, test } from 'vitest';
import { heldLinks, linkOf, registerHeldLink } from '../src/lib/held-links';
import type { Standing } from '@ssccsorg/skene-kernel';

const member = { id: 'smoke' } as Standing;

test('a place that installs no link leaves a leaf as the address it is', () => {
  expect(linkOf({ address: 'smoke/nothing-owns-this', member }), 'nothing answers').toBeNull();
});

test('a link that has nowhere to send a row does not take the press from the one after it', () => {
  registerHeldLink({
    key: 'narrow',
    label: 'the narrow one',
    to: ({ address }) => (address.includes('a-narrow-row') ? `/${address}` : null),
  });
  registerHeldLink({
    key: 'wide',
    label: 'the wide one',
    to: ({ address }) => (address.includes('a-wide-row') ? `/any/${address}` : null),
  });

  expect(linkOf({ address: 'smoke/a-wide-row', member }), 'the narrow one declined').toEqual({
    href: '/any/smoke/a-wide-row',
    label: 'the wide one',
  });
  expect(linkOf({ address: 'smoke/a-narrow-row', member }), 'the narrow one answered').toEqual({
    href: '/smoke/a-narrow-row',
    label: 'the narrow one',
  });
});

test('a link is told whose element it is, which is what makes an address resolvable', () => {
  const seen: string[] = [];
  registerHeldLink({
    key: 'owner',
    label: 'the owner',
    to: ({ member: held, address }) => {
      if (!address.includes('an-owned-row')) return null;
      seen.push(`${held.id}:${address}`);
      return null;
    },
  });

  linkOf({ address: 'smoke/an-owned-row', member });
  expect(seen, 'the member travels with the address').toEqual(['smoke:smoke/an-owned-row']);
});

test('what a build holds is the links installed in it, in the order they were installed', () => {
  registerHeldLink({ key: 'order-first', label: 'the first', to: () => null });
  registerHeldLink({ key: 'order-second', label: 'the second', to: () => null });

  const keys = heldLinks().map((link) => link.key);
  expect(keys.indexOf('order-first')).toBeLessThan(keys.indexOf('order-second'));
});
