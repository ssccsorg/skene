// A bundle asks no room, and a window that expects one still does.
//
// The frame's loopback address is the demonstration's, so a deployment whose board and runs are files has to be able to
// say so. What is held here is that one declaration and nothing else: the same load, twice, differing only in whether the
// host says the files shipped with the window.

import { afterEach, beforeAll, expect, test } from 'vitest';
import { setHost } from '@/lib/host';

type Scenario = typeof import('@/stores/scenario');
let scenario: Scenario;

const PLAIN = {
  note: 'one project, for this test',
  projects: [
    {
      format: 'project/1',
      id: 'one',
      resources: [{ kind: 'record', at: 'run.txt' }],
    },
  ],
};

/** The same board taken from another deployment, which names the room that deployment had. */
const STACKED = {
  ...PLAIN,
  projects: [
    {
      ...PLAIN.projects[0],
      resources: [
        { kind: 'channel', at: 'stack' },
        { kind: 'record', at: 'run.txt' },
      ],
    },
  ],
};

const RUN = `# One run
tick 0
fact seen 8 mover/observation
count 1
`;

/** The requests a load made, in the order it made them. */
let asked: string[] = [];

// The store persists the project the pilot chose and reads that storage when it is made, so the stub stands before the
// module does. A window here is a window without a browser.
beforeAll(async () => {
  const held = new Map<string, string>();
  Object.assign(globalThis, {
    localStorage: {
      getItem: (key: string) => held.get(key) ?? null,
      setItem: (key: string, value: string) => void held.set(key, value),
      removeItem: (key: string) => void held.delete(key),
    },
  });
  scenario = await import('@/stores/scenario');
});

/** Answer the window's own files and refuse everything else, which is what a static host has. */
function stand(board: unknown = PLAIN): void {
  asked = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    asked.push(url);
    if (url.endsWith('projects.json')) return new Response(JSON.stringify(board), { status: 200 });
    if (url.endsWith('run.txt')) return new Response(RUN, { status: 200 });
    return new Response('', { status: 404 });
  }) as typeof fetch;
}

afterEach(() => {
  setHost(undefined);
  asked = [];
});

test('a window that shipped its board asks no room for it', async () => {
  stand(STACKED);
  setHost({
    reachable: false,
    static: true,
    ask: async () => null,
    listen: async () => () => {},
  });

  await scenario.useScenario.getState().load('./', null);

  expect(scenario.useScenario.getState().status, 'a channel this build lacks is still read').toBe(
    'ready',
  );
  expect(asked, 'the board is the file beside the assets').toContain('./projects.json');
  expect(asked, 'and so is every run it names').toContain('./run.txt');
  expect(asked.filter((url) => url.includes('/v1/')), 'and no room was dialled').toEqual([]);
});

test('a window that says it expects a room still asks for it', async () => {
  stand();
  // A window with no host is a page, so a window that expects a room says so.
  setHost({ reachable: false, static: false, ask: async () => null, listen: async () => () => {} });

  await scenario.useScenario.getState().load('./', null);

  expect(scenario.useScenario.getState().status).toBe('ready');
  expect(asked.some((url) => url.includes('/v1/'))).toBe(true);
});
