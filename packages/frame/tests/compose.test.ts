// A turn composed from the space, held until the console takes it.
//
// The space declares what a member can be asked, and the console is where a turn is said. What is held here is the seam
// between them: a press puts words and an addressee down, the console takes them once, and nothing sends a turn on its
// own, because a turn costs a model call and the pilot is the one who pays it.

import { expect, test } from 'vitest';

import { useChat } from '@/stores/chat';

test('a composed turn is held and taken once', () => {
  useChat.getState().compose('spiderpi-1', 'patrol');
  expect(useChat.getState().composing).toEqual({ target: 'spiderpi-1', text: 'patrol' });
  expect(useChat.getState().take()).toEqual({ target: 'spiderpi-1', text: 'patrol' });
  expect(useChat.getState().composing, 'and it is not taken twice').toBeNull();
});

test('a console with nothing composed takes nothing', () => {
  expect(useChat.getState().take()).toBeNull();
});
