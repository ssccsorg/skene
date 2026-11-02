// The lines held while the room was in a turn, and the conversations a scope shows.
//
// A composer that dropped the next line would throw away what a pilot wrote while watching the last answer arrive, and
// that line is the next thing a pilot has to say rather than an accident. What is held is the line and not the draft:
// the draft is still the pilot's to keep editing, and this is the one they already sent.
//
// The member travels with the line, which is the whole of why the queue is a list of records rather than a map keyed by
// member: the pick a line was said to can move while the line waits, and a queue keyed by member would send the words to
// whoever the pick had moved to by the time the room was free.

import { beforeEach, expect, test } from 'vitest';

import type { ThreadSummary } from '@/lib/channel';
import { scopedThreads, useChat } from '@/stores/chat';

const queue = () => useChat.getState().queue;

// The project is left unset, which is what keeps a drain from reaching for a room: what is held to here is the queue.
beforeEach(() => useChat.setState({ queue: [], project: null }));

test('a line said while the room is busy waits with the member it was said to', () => {
  const state = useChat.getState();
  state.enqueue('rover-1', 'drive the hub');
  state.enqueue('drone-2', 'map the yard');
  expect(queue().map((each) => `${each.target}: ${each.text}`)).toEqual([
    'rover-1: drive the hub',
    'drone-2: map the yard',
  ]);
  expect(new Set(queue().map((each) => each.id)).size, 'two lines are two names').toBe(2);
});

test('a member freeing up sends the line that waited for it and leaves the rest', async () => {
  const state = useChat.getState();
  state.enqueue('rover-1', 'drive the hub');
  state.enqueue('drone-2', 'map the yard');
  await state.drain('drone-2');
  expect(queue().map((each) => each.text), 'the drone is the one that became free').toEqual(['drive the hub']);
  await state.drain('rover-1');
  expect(queue()).toEqual([]);
});

test('a member nothing is waiting for frees nothing, and a second report sends nothing twice', async () => {
  const state = useChat.getState();
  state.enqueue('rover-1', 'drive the hub');
  await state.drain('hexapod-1');
  expect(queue(), 'the line stays where it was').toHaveLength(1);
  await state.drain('rover-1');
  await state.drain('rover-1');
  expect(queue(), 'and the report that repeats does not find it again').toEqual([]);
});

test('a line can be dropped before it goes out', () => {
  const state = useChat.getState();
  state.enqueue('rover-1', 'drive the hub');
  state.enqueue('drone-2', 'map the yard');
  state.drop(queue()[0].id);
  expect(queue().map((each) => each.text)).toEqual(['map the yard']);
});

test('a scope shows the conversations of one piece of work and the one the pilot started', () => {
  const threads = [
    { id: 't1', agent: 'arm', title: 'one', message_count: 1, created_at: '', activity_at: '', work: 'intent:x' },
    { id: 't2', agent: 'arm', title: 'two', message_count: 1, created_at: '', activity_at: '', work: 'intent:y' },
    { id: 't3', agent: 'arm', title: 'three', message_count: 1, created_at: '', activity_at: '' },
  ] as ThreadSummary[];
  expect(scopedThreads(threads, null).map((each) => each.id), 'nothing open is every conversation').toEqual([
    't1',
    't2',
    't3',
  ]);
  expect(scopedThreads(threads, 'intent:x').map((each) => each.id), 'a work open scopes it').toEqual(['t1', 't3']);
});
