// The acceptance: when a conversation offers its outcome, and who is allowed to write it.
//
// An acceptance is a note in the record rather than a turn, so what is pinned here is the reading that decides whether to
// offer it and the word it is written as. The reader is over the entries and the policy rather than over the panel, which
// is what makes it a test: an offer that stood after the acceptance landed, or one withdrawn from the caller the policy
// allows, is a defect a list can hold.

import { expect, test } from 'vitest';
import { ACCEPTED, acceptLine, acceptOffered, callerOf, hasOutcome, isAccepted, mayAccept } from '@/lib/accept';
import type { Message } from '@/lib/channel';

const entry = (role: Message['role'], content: string, entry_type?: Message['entry_type']): Message => ({
  id: `${role}-${content.length}`,
  thread_id: 't1',
  role,
  content,
  entry_type,
  at: '2026-10-15T09:00:00.000Z',
});

const OUTCOME = entry('assistant', 'the bearing is worn past its allowance');
const CALL = entry('assistant', '**Tool Call: read-file**', 'tool_call');
const WORDS = entry('user', 'check the drive');
const ACCEPTANCE = entry('note', ACCEPTED);

test("a turn's own calls are not an outcome", () => {
  // A call is the turn getting somewhere rather than what came of it, so a conversation that holds only calls has nothing
  // to accept yet and the offer must not stand over it.
  expect(hasOutcome([WORDS, CALL])).toBe(false);
});

test('an answer the agent drew is an outcome, and the pilot own words are not', () => {
  expect(hasOutcome([WORDS, OUTCOME])).toBe(true);
  expect(hasOutcome([WORDS])).toBe(false);
  expect(hasOutcome([])).toBe(false);
});

test('the acceptance is the note both ends read, found by its own word', () => {
  expect(isAccepted([WORDS, OUTCOME, ACCEPTANCE])).toBe(true);
  expect(isAccepted([WORDS, OUTCOME])).toBe(false);
  // A note saying something else is a note and not an acceptance, and a word it merely contains is not the word.
  expect(isAccepted([entry('note', 'accepted the risk instead')])).toBe(false);
  expect(isAccepted([entry('user', ACCEPTED)])).toBe(false);
});

test('a workspace that names no policy leaves acceptance open, and a word says the same', () => {
  expect(mayAccept(null, 'admin')).toBe(true);
  expect(mayAccept(undefined, 'admin')).toBe(true);
  expect(mayAccept('', 'admin')).toBe(true);
  expect(mayAccept('any', 'admin')).toBe(true);
  expect(mayAccept('  any  ', 'whoever')).toBe(true);
});

test('a policy names the ids that may, so one is let in and another is not', () => {
  expect(mayAccept('admin', 'admin')).toBe(true);
  expect(mayAccept('admin', 'guest')).toBe(false);
  expect(mayAccept('admin, owner', 'owner')).toBe(true);
  expect(mayAccept('admin, owner', 'guest')).toBe(false);
  // The whole id and not a prefix of it: a policy naming one caller must not let a longer name through.
  expect(mayAccept('admin', 'administrator')).toBe(false);
});

test('the caller is the half of the credential the store names', () => {
  expect(callerOf('admin:791bd5d2')).toBe('admin');
  expect(callerOf('guest:c0ffee')).toBe('guest');
  // A window that never connected holds no id, so a policy that names one does not include it.
  expect(callerOf('')).toBe('');
  expect(mayAccept('admin', callerOf(''))).toBe(false);
});

test('the offer needs a conversation, a room that is not in a turn, a caller allowed and no acceptance yet', () => {
  const standing = {
    thread: 't1',
    working: false,
    policy: null,
    caller: 'admin',
    messages: [WORDS, OUTCOME],
  };
  expect(acceptOffered(standing)).toBe(true);
  // The plus opens a conversation the room has not named yet, so there is nothing to accept from.
  expect(acceptOffered({ ...standing, thread: null })).toBe(false);
  // A turn in a room is the room still working, and an outcome is only an outcome once it has stopped.
  expect(acceptOffered({ ...standing, working: true })).toBe(false);
  expect(acceptOffered({ ...standing, policy: 'someone-else' })).toBe(false);
  // The acceptance is in the record by then, so the offer goes away rather than standing twice.
  expect(acceptOffered({ ...standing, messages: [WORDS, OUTCOME, ACCEPTANCE] })).toBe(false);
  // And a conversation with no outcome has nothing to accept even when everything else holds.
  expect(acceptOffered({ ...standing, messages: [WORDS, CALL] })).toBe(false);
});

test('the acceptance is written as the note the field would have held', () => {
  expect(ACCEPTED).toBe('accepted');
  expect(acceptLine()).toBe(';accepted');
});
