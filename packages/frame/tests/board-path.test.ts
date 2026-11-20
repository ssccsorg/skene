// Where a deployment's board stands, and what a host that names none gets.
//
// One application serves an exhibition and a customer, and what tells them apart is the board file and the runs it
// names. The host names the file outright, so a build made before this field existed reads the name the frame has
// always read.

import { afterEach, beforeAll, expect, test } from 'vitest';
import { setHost, type Host } from '@/lib/host';

let scenario: typeof import('@/stores/scenario');

const asked: string[] = [];

function shipped(board?: string): Host {
  return {
    reachable: false,
    static: true,
    ...(board ? { endpoints: { board } } : {}),
    ask: async () => null,
    listen: async () => () => {},
  } as unknown as Host;
}

beforeAll(async () => {
  const held = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => held.get(key) ?? null,
    setItem: (key: string, value: string) => void held.set(key, value),
    removeItem: (key: string) => void held.delete(key),
  };
  // The store persists through `window.localStorage`, which is the browser's and not the bare global.
  Object.assign(globalThis, { localStorage, window: { localStorage } });
  Object.assign(globalThis, {
    fetch: async (input: RequestInfo | URL) => {
      asked.push(String(input));
      return { ok: true, json: async () => ({ projects: [] }), text: async () => '' } as Response;
    },
  });
  scenario = await import('@/stores/scenario');
});

afterEach(() => {
  setHost(undefined);
  asked.length = 0;
});

test('a host that names its board is read from where it says', async () => {
  setHost(shipped('/sets/exhibition/projects.json'));
  await scenario.useScenario.getState().load('./');
  expect(asked).toEqual(['/sets/exhibition/projects.json']);
});

test('a host that names none reads the board file beside the app', async () => {
  setHost(shipped());
  await scenario.useScenario.getState().load('./');
  expect(asked).toEqual(['./projects.json']);
});
