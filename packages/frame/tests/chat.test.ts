// The room's own readings, held to what a panel is owed.
//
// A channel's shape is the one thing this app may not guess at: a note mark read the wrong way turns a fact
// somebody wrote into a turn that costs a model call, a reasoning split that drops its unterminated branch
// loses the half of the answer that has already arrived, and a tool call read from a field the channel does
// not send is a call drawn as nothing. Each case here is one of those, against the shape the sim sends.

import { expect, test } from 'vitest';

import { commandOf, noteOf, splitThinking, statusOf, threadTitle, timeOf, toolParts, type Message } from '@/lib/channel';

test('a line that opens with the note mark is a note, and the mark does not travel', () => {
  expect(noteOf(';accepted')).toBe('accepted');
  expect(noteOf('  ; the shift is over')).toBe('the shift is over');
  expect(noteOf(';')).toBeNull();
  expect(noteOf('replace the bearing')).toBeNull();
  // A semicolon inside a line is punctuation and not a mark, which is why the mark is only read at the front.
  expect(noteOf('the call is done; it wrote two facts')).toBeNull();
});

test('a line that opens with the command mark is a command, and the mark does not travel', () => {
  expect(commandOf(':patrol')).toBe('patrol');
  expect(commandOf('  : move-to the aisle')).toBe('move-to the aisle');
  expect(commandOf(':')).toBeNull();
  // A colon inside a line is punctuation, and a line with no mark is a turn rather than a command.
  expect(commandOf('read the tag: it is worn')).toBeNull();
  expect(commandOf('read the tag')).toBeNull();
});

test('a thread is named by the first thing said in it, as one line', () => {
  expect(threadTitle('\n\n the bearing is worn \nand the line is down')).toBe('the bearing is worn');
  expect(threadTitle('x'.repeat(60)).length).toBe(40);
  expect(threadTitle('   ')).toBe('');
});

test('a body splits into what the agent said and the run it reasoned in', () => {
  const runs = splitThinking('reading it now\n<thinking>the wear is 0.30mm</thinking>so I wrote one fact');
  expect(runs.map((run) => run.kind)).toEqual(['text', 'thinking', 'text']);
  expect(runs[1].text).toContain('0.30mm');
  // A turn still arriving ends in an open tag, and that reasoning is the half that has already arrived.
  const arriving = splitThinking('thinking... <thinking>the wear is');
  expect(arriving.map((run) => run.kind)).toEqual(['text', 'thinking']);
  expect(arriving[1].text).toBe('the wear is');
});

test('a tool call reads its name and its status out of its own body', () => {
  const call: Message = {
    id: 'm1',
    thread_id: 't1',
    role: 'assistant',
    entry_type: 'tool_call',
    content: '**Tool Call: replace the bearing**\nStatus: awaiting\n\nthe call is waiting for a decision',
    at: '2026-10-11T03:20:00.000Z',
  };
  expect(toolParts(call)).toEqual({ label: 'replace the bearing', status: 'awaiting', body: 'the call is waiting for a decision' });
  // A call with no head line falls back to the entry's own fields, so an unparsed call is still drawn.
  const bare: Message = { ...call, content: 'the tool wrote this', tool_name: 'read-record', tool_status: 'complete' };
  expect(toolParts(bare)).toEqual({ label: 'read-record', status: 'complete', body: 'the tool wrote this' });
});

test('a status is one stand, and a status nobody has seen before is a call still running', () => {
  expect(statusOf('awaiting a decision')).toBe('waiting');
  expect(statusOf('complete')).toBe('done');
  expect(statusOf('failed')).toBe('failed');
  expect(statusOf('running')).toBe('running');
  expect(statusOf('')).toBe('none');
  expect(statusOf('streaming')).toBe('running');
});

test('a time is the hour, and the day when it is not today', () => {
  const at = '2026-10-11T03:20:00.000Z';
  const sameDay = new Date(2026, 9, 11, 12, 0, 0);
  const later = new Date(2026, 11, 1, 12, 0, 0);
  expect(timeOf(at, sameDay)).toMatch(/^\d\d:\d\d$/);
  expect(timeOf(at, later)).toMatch(/^\d\d-\d\d \d\d:\d\d$/);
  expect(timeOf('not a time', sameDay)).toBe('');
});
