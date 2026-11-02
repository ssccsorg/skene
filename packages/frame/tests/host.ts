import { setHost } from '@/lib/host';

// The frame reaches a shell through its host and no longer through a global, so a test that stands a shell up
// installs one. This turns the stubbed bridge the tests already build into that host, which keeps them driving the
// real command surface rather than a mock of it.

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
