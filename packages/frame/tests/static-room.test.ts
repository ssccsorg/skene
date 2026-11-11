import { afterEach, describe, expect, it } from 'vitest';
import { roomOf } from '@/stores/chat';
import { setHost } from '@/lib/host';

// A host that says its board and its runs are the files it shipped with has no room to ask, so a project's declared
// channel is not resolved to an address the build never had. The declaration stays in the board, because the board is
// also the one a deployment with a room reads.

const shipped = { reachable: false, static: true, ask: async () => null, listen: async () => () => {} };

describe('roomOf on a shipped bundle', () => {
  afterEach(() => {
    setHost(undefined);
  });

  it('refuses a read instead of resolving the project channel', async () => {
    setHost(shipped);
    await expect(roomOf('drive').read('drive')).rejects.toThrow('shipped its board and its runs');
  });

  it('refuses a write with the same reason', async () => {
    setHost(shipped);
    await expect(roomOf('drive').say('drive', {} as never)).rejects.toThrow('shipped its board and its runs');
  });

  it('answers a subscription with a stop that stops nothing', () => {
    setHost(shipped);
    expect(typeof roomOf('drive').watch('drive', {} as never)).toBe('function');
  });
});
