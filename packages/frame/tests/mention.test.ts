// The mention: what the field's `@` opens, and what the draft is once it is named.
//
// A mention is how a line names what it is about, and it resolves to the same one value the menu and the board's pick
// carry: the name is not written into the sentence, because the mark above the field says where the line goes and a
// member written into the text as well would be the same name said twice, once as prose. What the `@` offers is a name
// and where it lives, which is read in `lib/offer`; the reader here is the field's half of it.
//
// The reader is over the draft and the caret rather than over the field, which is what makes it a test: a mention that
// survived into the sentence sent, or a draft that lost a character beside it, is a defect a string can hold.

import { expect, test } from 'vitest';
import { firstMention, mentionAt, withoutMention } from '@/lib/mention';

test('a mention opens at an `@` and runs to the caret', () => {
  expect(mentionAt('@', 1)).toEqual({ start: 0, query: '' });
  expect(mentionAt('@bet', 4)).toEqual({ start: 0, query: 'bet' });
  expect(mentionAt('say it to @bet', 14)).toEqual({ start: 10, query: 'bet' });
  expect(mentionAt('say it to @bet now', 14), 'read to the caret and not to the end').toEqual({
    start: 10,
    query: 'bet',
  });
});

test('a space ends the mention, and a name is one word', () => {
  // A member's name has no space in it, so the offer closes where the word does: what follows is the line's own words.
  expect(mentionAt('say it to @bet now', 18)).toBeNull();
  expect(mentionAt('say it to @bet ', 15)).toBeNull();
});

test('an `@` inside a word is not a mention', () => {
  // An address in prose is not a line being addressed, and the offer opening inside one would be the field reading a
  // character of somebody's mailbox as a control.
  expect(mentionAt('write to me@example.com', 23)).toBeNull();
  expect(mentionAt('write to me@example.com', 12)).toBeNull();
});

test('a draft with no `@` before the caret stands in no mention', () => {
  expect(mentionAt('', 0)).toBeNull();
  expect(mentionAt('say something', 13)).toBeNull();
});

test('the first mention says where the line goes, and a later one is a place it talks about', () => {
  expect(firstMention('@rover-1 ', { start: 0, query: 'rover-1' }), 'the first is the addressee').toBe(true);
  expect(firstMention('@rover-1 @move to @hexapod-1', { start: 19, query: 'hexapod-1' }), 'a later one is not').toBe(
    false,
  );
  expect(firstMention('say it to @bet', { start: 10, query: 'bet' }), 'anything before it may be prose').toBe(true);
  // An address in prose is not a mention, so it does not make the next one a later mention.
  expect(firstMention('write to me@example.com @bet', { start: 24, query: 'bet' })).toBe(true);
});

test('the mention is taken out and the addressee is not written into the text', () => {
  expect(withoutMention('@bet', { start: 0, query: 'bet' })).toBe('');
  expect(withoutMention('@bet ', { start: 0, query: 'bet' })).toBe('');
  // The space the mention opened at stays where the sentence continues past it: what was eaten is the mention and the
  // space after it, and the one before it is the pilot's own.
  expect(withoutMention('say it to @bet', { start: 10, query: 'bet' })).toBe('say it to ');
  expect(withoutMention('say it to @bet now', { start: 10, query: 'bet' })).toBe('say it to now');
});

test('what the pilot wrote around the mention is left as it was', () => {
  // A sentence the mention interrupted keeps its own words and spacing: the offer is a control and not an editor.
  expect(withoutMention('a @bet b', { start: 2, query: 'bet' })).toBe('a b');
  expect(withoutMention('@bet and then some', { start: 0, query: 'bet' })).toBe('and then some');
});

test('a mention at the start of a line leaves one line break where there was one', () => {
  // A mention opens after any whitespace, so whatever the head already ends with is the pilot's own and nothing is added: a
  // break stays one break, and a mention after a tab keeps the tab. What the reading only knew as a space put a break and a
  // space where a sentence had one break.
  expect(withoutMention('one\n@bet two', { start: 4, query: 'bet' })).toBe('one\ntwo');
  expect(withoutMention('one\t@bet two', { start: 4, query: 'bet' })).toBe('one\ttwo');
});

test('what is taken with the mention is the one space that separated it from the words', () => {
  // A break after a mention is the pilot's own line structure rather than the mention's separator, so it stays: taking it
  // would join two lines the pilot wrote apart. The space is the separator and goes, which is what keeps a draft from
  // opening with one.
  expect(withoutMention('@bet two', { start: 0, query: 'bet' })).toBe('two');
  expect(withoutMention('@bet\ntwo', { start: 0, query: 'bet' })).toBe('\ntwo');
});
