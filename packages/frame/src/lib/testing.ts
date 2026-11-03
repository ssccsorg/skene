// A stubbed bridge, turned into the host a test stands a shell up with.
//
// The frame reaches a shell through its host rather than through a global, so every deployment's tests install one. The
// bridge a Tauri window exposes is the same shape whichever product is being drawn, so the adapter lives here once: a
// deployment that writes its own would be a second copy of the same twenty lines, and the second copy is the one that
// goes stale when the bridge changes.

import { setHost } from './host';

interface Bridge {
  __TAURI__?: {
    core?: { invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown> };
    event?: { listen?: (event: string, handler: (message: { payload: unknown }) => void) => Promise<() => void> };
  };
  __TAURI_INTERNALS__?: { invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown> };
}

/** Install the host the stubbed bridge stands for, or the browser's answers when the stub has no invoke. */
export function installHost(bridge: Record<string, unknown>): void {
  const global = bridge as Bridge;
  const invoke = global.__TAURI__?.core?.invoke ?? global.__TAURI_INTERNALS__?.invoke;
  const listen = global.__TAURI__?.event?.listen ?? null;
  setHost(
    invoke
      ? {
          reachable: true,
          ask: <T,>(command: string, args?: Record<string, unknown>) => invoke(command, args) as Promise<T>,
          listen: async <T,>(event: string, handler: (payload: T) => void) =>
            listen ? listen(event, (message) => handler(message.payload as T)) : () => {},
        }
      : undefined,
  );
}
