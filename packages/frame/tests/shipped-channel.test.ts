import { afterEach, expect, test } from 'vitest';
import { bundleOf, type ProjectDocument } from '@/lib/project';
import { setHost } from '@/lib/host';

// A board is one file and two hosts read it: the product's window, where a channel is where a project's work is sent, and
// a bundle's, where there is no room at all. A bundle that refused the channel its deployment had would refuse to read
// its own board, so the declaration is kept as a name where nothing is routed.

const board = (channel: string): ProjectDocument => ({
  id: 'digital',
  resources: [
    { kind: 'record', at: 'scenario/digital.txt' },
    { kind: 'channel', at: channel },
  ],
});

const shipped = { reachable: false, static: true, ask: async () => null, listen: async () => () => {} };

afterEach(() => {
  setHost(undefined);
});

test('a shipped bundle reads a channel this build has no room for', () => {
  setHost(shipped);
  expect(bundleOf(board('stack'), []).channel).toBe('stack');
});

test('a live window still refuses a channel it cannot answer', () => {
  setHost({ reachable: true, ask: async () => null, listen: async () => () => {} });
  expect(() => bundleOf(board('stack'), [])).toThrow('no channel named stack');
});
