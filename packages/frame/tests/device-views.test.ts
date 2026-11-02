import { afterEach, describe, expect, it } from 'vitest';
import { setHost } from '@/lib/host';
import { deviceViews } from '@/lib/host';
import { installHost } from './host';

// A device's picture carries a token, so its address is the launcher's to hand over and not the sources'. The shell
// reads the file the launcher named and passes the text; this is the one place the frame turns it back into addresses.

const bridge = globalThis as unknown as {
  __TAURI_INTERNALS__?: { invoke?: (command: string) => Promise<unknown> };
};

describe('deviceViews', () => {
  afterEach(() => {
    delete bridge.__TAURI_INTERNALS__;
    setHost(undefined);
  });

  it('takes the addresses the launcher handed the window', async () => {
    const source = 'http://robot:8081/snapshot.jpg?token=t';
    bridge.__TAURI_INTERNALS__ = { invoke: async () => JSON.stringify({ 'spiderpi-eye': source }) };
    installHost(bridge);
    expect(await deviceViews()).toEqual({ 'spiderpi-eye': source });
  });

  it('answers nothing for a window with no launcher, which keeps the place own addresses', async () => {
    expect(await deviceViews()).toEqual({});
  });

  it('drops an answer that is not a map of addresses', async () => {
    bridge.__TAURI_INTERNALS__ = { invoke: async () => '["not", "a", "map"]' };
    installHost(bridge);
    expect(await deviceViews()).toEqual({});
    bridge.__TAURI_INTERNALS__ = {
      invoke: async () => {
        throw new Error('the shell did not answer');
      },
    };
    installHost(bridge);
    expect(await deviceViews()).toEqual({});
  });
});
