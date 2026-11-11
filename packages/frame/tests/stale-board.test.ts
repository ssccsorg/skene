// A window restores the pilot's choice and not a board.
//
// The store writes which project was open and which were standing. An earlier build wrote the board itself, and a board
// read back from a store is a board this build never chose: it carried a channel name the frame no longer answers for,
// and one stored name was enough to take the window down before the real board had loaded.

import { beforeAll, expect, test } from 'vitest';

let scenario: typeof import('@/stores/scenario');

/** The payload an older build wrote: the choice, and the whole board beside it. */
const STALE = {
  state: {
    projectId: 'digital',
    opened: ['digital'],
    projects: [{ id: 'digital', title: 'digital', channel: 'stack', record: '', resources: ['channel'] }],
    models: {},
  },
  version: 0,
};

beforeAll(async () => {
  const held = new Map<string, string>([['skene.projects', JSON.stringify(STALE)]]);
  const localStorage = {
    getItem: (key: string) => held.get(key) ?? null,
    setItem: (key: string, value: string) => void held.set(key, value),
    removeItem: (key: string) => void held.delete(key),
  };
  // The store persists through `window.localStorage`, which is the browser's and not the bare global.
  Object.assign(globalThis, { localStorage, window: { localStorage } });
  scenario = await import('@/stores/scenario');
  // A synchronous storage still rehydrates on a turn of the microtask queue, and this suite reads before the board does.
  await new Promise((resolve) => setTimeout(resolve, 0));
});

test('a payload that carried the board restores only what the pilot chose', () => {
  const state = scenario.useScenario.getState();
  expect(state.projectId).toBe('digital');
  expect(state.opened).toEqual(['digital']);
  expect(state.projects, 'the board is read from the file, never from the store').toEqual([]);
  expect(state.models).toEqual({});
});

test('the same reading holds for a payload that carried nothing else', () => {
  expect(scenario.chosenOnly(STALE.state)).toEqual({ projectId: 'digital', opened: ['digital'] });
  expect(scenario.chosenOnly(null)).toEqual({ projectId: null, opened: [] });
  expect(scenario.chosenOnly({ projectId: 4, opened: ['one', 5] })).toEqual({
    projectId: null,
    opened: ['one'],
  });
});
