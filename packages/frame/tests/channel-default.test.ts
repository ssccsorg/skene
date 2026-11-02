import { afterEach, describe, expect, it } from 'vitest';
import { defaultChannel, registerRoom } from '@/lib/channel';
import { setHost } from '@/lib/host';

// A project that declares no channel is answered by the room its deployment names, and by the sim where it names none.
// The frame no longer decides that a shell means a stack: the deployment does, because a room is the deployment's.

describe('defaultChannel', () => {
  afterEach(() => {
    setHost(undefined);
  });

  it('is the room the deployment names', () => {
    registerRoom('elsewhere', () => {
      throw new Error('not opened by this test');
    });
    setHost({
      reachable: true,
      ask: async () => null,
      listen: async () => () => {},
      roomByDefault: () => 'elsewhere',
    });
    expect(defaultChannel()).toBe('elsewhere');
  });

  it('is the sim where the deployment names none, so a browser and a bundle still read a board', () => {
    setHost({ reachable: true, ask: async () => null, listen: async () => () => {} });
    expect(defaultChannel()).toBe('sim');
    setHost(undefined);
    expect(defaultChannel()).toBe('sim');
  });
});
