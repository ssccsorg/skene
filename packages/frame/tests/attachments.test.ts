// The files that go with a line: whose they are, how one is given up, and what a held line carries.
//
// A file is taken by the room before the line that carries it is said, so what stands in the composer is a fact about the
// room rather than a draft. It is kept per conversation for the reason a draft is kept per conversation: a file taken for a
// line about one machine is not a file to send with a line to the next, and a composer that carried it across would put a
// photograph of one cell in front of another.
//
// The upload itself is the room's and is not reached from here: what these hold is the holding, the giving up, and the
// carrying, which are the three things a panel can get wrong without a server being involved.

import { beforeEach, expect, test } from 'vitest';

import type { Taken } from '@/lib/channel';
import { useChat, withoutFiles } from '@/stores/chat';

const file = (id: string): Taken => ({ id, name: `${id}.txt`, bytes: 12 });
const held = () => useChat.getState().attached;
const at = (key: string) => held()[key]?.map((each) => each.id);

beforeEach(() => useChat.setState({ attached: {}, open: null, queue: [] }));

test('the files taken for a conversation are that conversation own', () => {
  useChat.setState({ open: 't1', attached: { t1: [file('a')] } });
  expect(at('t1')).toEqual(['a']);
  expect(held().t2, 'a conversation nothing was taken for holds nothing').toBeUndefined();
});

test('a conversation the room has not named yet holds its own, under the name the draft is kept under', () => {
  useChat.setState({ attached: { new: [file('a')], t1: [file('b')] } });
  useChat.getState().untake('a');
  expect(at('new'), 'the plus is a conversation before the room names one').toEqual([]);
  expect(at('t1'), 'and the conversation that was open is left alone').toEqual(['b']);
});

test('a file can be given up before the line goes, and the rest stay', () => {
  useChat.setState({ open: 't1', attached: { t1: [file('a'), file('b'), file('c')] } });
  useChat.getState().untake('b');
  expect(at('t1')).toEqual(['a', 'c']);
});

test('a line held until the room is free carries the files it was written about', () => {
  const state = useChat.getState();
  state.enqueue('rover-1', 'look at this', ['a', 'b']);
  state.enqueue('drone-2', 'and this');
  expect(
    useChat.getState().queue.map((each) => each.attachments),
    'a line with no file carries none, and one with two carries two',
  ).toEqual([['a', 'b'], undefined]);
});

test('what a line took is taken out of the list it was in and no other', () => {
  const held = { t1: [file('a'), file('b')], t2: [file('c')] };
  // By id and not by conversation, which is the whole reason it is a list of ids: the list the file stands in is not the
  // thing that says it went.
  expect(withoutFiles(held, ['b']).t1?.map((each) => each.id)).toEqual(['a']);
  expect(withoutFiles(held, ['b']).t2?.map((each) => each.id), 'another conversation keeps its own').toEqual(['c']);
  expect(withoutFiles(held, ['a', 'c']).t1?.map((each) => each.id)).toEqual(['b']);
  expect(withoutFiles(held, ['a', 'c']).t2).toEqual([]);
});

test('a file attached while a line was waiting is not taken by that line', () => {
  // A held line goes out from the composer it was written in, and the ids it carries are the ones it named. A pilot who
  // attached a file for the line they are writing while the last one waited must not lose it to a line that never had it.
  const held = { t1: [file('a'), file('b')] };
  expect(withoutFiles(held, ['a']).t1?.map((each) => each.id)).toEqual(['b']);
});
