// A conversation read as a window of its log: where the window sits, and what the window before it is.
//
// A conversation is longer than the panel that draws it, so the room answers the part of it that is asked for and says
// where in the log that part begins. What is held here is that this side keeps both: the panel can only ask for what
// stands above the reader if it knows where the reader is, and a page drawn without its own beginning would be a page
// whose top looks like the thread's own top.
//
// The room is stubbed at the one place the frame meets it, which is the fetch the sim's channel is written against, so
// what is driven here is the real store over the real channel rather than a mock of either.

import { afterEach, beforeEach, expect, test } from 'vitest';

import { EARLIER, useChat } from '@/stores/chat';
import { setHost } from '@/lib/host';

const real = globalThis.fetch;
/** What the room was asked, one entry a request, so a test can hold the questions as well as the answers. */
const asked: { from: string | null; limit: string | null }[] = [];

/**
 * The sim's thread route, as the panel reads it: a window of a log of `total` entries.
 *
 * It answers the newest window when it is not told where to start and the one it is told otherwise, which is the whole
 * of what the route does, so the store is exercised against the shape it will meet rather than against a convenient one.
 */
function sim(total: number, cap = 40) {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    asked.push({ from: url.searchParams.get('from'), limit: url.searchParams.get('limit') });
    const limit = Number(url.searchParams.get('limit') ?? cap);
    const raw = url.searchParams.get('from');
    const from = raw === null ? Math.max(0, total - limit) : Math.min(Number(raw), total);
    const messages = Array.from({ length: Math.max(0, Math.min(limit, total - from)) }, (_, index) => ({
      id: `m${from + index}`,
      thread_id: 't1',
      role: 'user' as const,
      content: `entry ${from + index}`,
      at: '2026-10-11T03:20:00.000Z',
    }));
    return new Response(JSON.stringify({ messages, from, total }), { status: 200 });
  }) as typeof fetch;
}

beforeEach(() => {
  // The store reaches a room, so the window says it has one: a page that names no host ships its board and asks nothing.
  setHost({ reachable: false, static: false, ask: async () => null, listen: async () => () => {} });
});

afterEach(() => {
  globalThis.fetch = real;
  asked.length = 0;
  setHost(undefined);
  useChat.setState({ project: null, open: null, messages: [], from: 0, total: 0, turn: null, queue: [], error: null });
});

/** A conversation opened, as the console opens one: the project is read before a thread of it is. */
async function opened(total: number, cap = 40) {
  sim(total, cap);
  useChat.setState({ project: 'game' });
  await useChat.getState().choose('game', 't1');
}

test('a conversation is opened on its end, and where the window sits is kept', async () => {
  await opened(100);
  const state = useChat.getState();

  expect(state.open).toBe('t1');
  expect(state.total, 'the room says how long the log is').toBe(100);
  expect(state.from, 'and the window drawn is the newest of it').toBe(60);
  expect(state.messages.map((message) => message.content).at(-1), 'the end of the log').toBe('entry 99');
  expect(
    asked,
    'the opening asks for no window, because where a conversation is opened is the room own answer',
  ).toEqual([{ from: null, limit: null }]);
});

test('the window before what is held is asked for, and what it holds is drawn in front of it', async () => {
  await opened(100);
  await useChat.getState().earlier();
  const state = useChat.getState();

  expect(asked[1], 'a window of the panel own size, before the one held').toEqual({
    from: String(60 - EARLIER),
    limit: String(EARLIER),
  });
  expect(state.from, 'and the window now begins where that one begins').toBe(60 - EARLIER);
  expect(state.messages[0]?.content, 'the oldest entry of the window is the first of it').toBe(`entry ${60 - EARLIER}`);
  expect(state.messages.at(-1)?.content, 'and the end of the conversation has not moved').toBe('entry 99');
  expect(state.total, 'nor has the length of it').toBe(100);
});

test('a conversation whose beginning is already held asks the room for nothing', async () => {
  await opened(30);
  expect(useChat.getState().from, 'a log shorter than a window begins at its beginning').toBe(0);
  asked.length = 0;
  await useChat.getState().earlier();
  expect(asked, 'there is nothing before the beginning').toEqual([]);
});

test('a settled turn adds to the end of the conversation, and the window own beginning stands', async () => {
  await opened(100);
  const was = useChat.getState();
  useChat.getState().applyProgress({
    agent: 'rover-1',
    thread_id: 't1',
    messages: [{ id: 'a1', thread_id: 't1', role: 'assistant', content: 'said', at: '2026-10-11T03:21:00.000Z' }],
    done: true,
  });
  const now = useChat.getState();

  expect(now.from, 'the window begins where it began').toBe(was.from);
  expect(now.total, 'and the log is one entry longer').toBe(was.total + 1);
  expect(now.messages.at(-1)?.id, 'with the answer at its end').toBe('a1');
});

test('an answer already drawn is not counted twice, so a repeated report does not lengthen the log', async () => {
  await opened(100);
  const was = useChat.getState();
  const entry = { id: 'a1', thread_id: 't1', role: 'assistant' as const, content: 'said', at: '2026-10-11T03:21:00.000Z' };
  useChat.getState().applyProgress({ agent: 'rover-1', thread_id: 't1', messages: [entry], done: true });
  const once = useChat.getState();
  useChat.getState().applyProgress({ agent: 'rover-1', thread_id: 't1', messages: [entry], done: true });

  expect(once.total, 'the log grew by what the turn added to it').toBe(was.total + 1);
  expect(useChat.getState().total, 'and a report that repeats adds nothing').toBe(was.total + 1);
});
