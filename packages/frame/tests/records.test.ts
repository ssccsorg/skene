// The cursor: what it rests on, what moves it, and what it is not allowed to do on its own.
//
// The store is the whole of the player's timing, so these are the rules a transport has to keep. The
// one that matters most is the first: nothing plays itself.
//
// The cursor is a project's own, so a case here names the project it feeds and focuses it before it walks it:
// the actions a person takes name no project, which is what makes them the transport of the run on screen.

import { beforeEach, expect, test } from 'vitest';

import { useRecords, volumeOf } from '@/stores/records';
import type { Entry } from '@ssccsorg/skene-kernel';

const fact = (at: number): Entry => ({ kind: 'fact', at, origin: 'servo-drive-3/cycle', bytes: 48, cycle: at });

const feed = (count: number) => {
  for (let index = 0; index < count; index += 1) useRecords.getState().push('p', fact(index));
};

beforeEach(() => {
  useRecords.getState().reset('p');
  useRecords.getState().setFocus('p');
});

test('a fresh cursor rests on the newest record and nothing is playing', () => {
  feed(5);
  const state = volumeOf('p');
  expect(state.shown).toBe(5);
  expect(state.following).toBe(true);
  expect(state.playing).toBe(false);
});

test('a burst of records is one change at its end, which is how a project opens at its latest state', () => {
  useRecords.getState().pushAll('p', [fact(0), fact(1), fact(2), fact(3)]);
  const state = volumeOf('p');
  expect(state.received).toHaveLength(4);
  expect(state.shown, 'the run is not walked through to reach its end').toBe(4);
  expect(state.playing, 'and nothing is playing').toBe(false);
});

test('a burst that arrives while the cursor is not following is received and not shown', () => {
  feed(5);
  useRecords.getState().seek(2);
  useRecords.getState().pushAll('p', [fact(5), fact(6)]);
  expect(volumeOf('p').received).toHaveLength(7);
  expect(volumeOf('p').shown, 'the cursor stayed where the pilot left it').toBe(2);
});

test('a record that arrives while the cursor follows is shown, and one that arrives while it is not is not', () => {
  feed(5);
  useRecords.getState().seek(3);
  feed(2);
  expect(volumeOf('p').shown).toBe(3);
  useRecords.getState().setFollowing(true);
  expect(volumeOf('p').shown).toBe(7);
});

test('playing walks the cursor and hands back to the feed at the last record', () => {
  feed(4);
  useRecords.getState().seek(1);
  useRecords.getState().play();
  expect(volumeOf('p').playing).toBe(true);
  expect(volumeOf('p').following).toBe(false);

  useRecords.getState().advance();
  expect(volumeOf('p').shown).toBe(2);
  useRecords.getState().advance();
  expect(volumeOf('p').shown).toBe(3);

  useRecords.getState().advance();
  expect(volumeOf('p').shown).toBe(4);
  expect(volumeOf('p').playing, 'the walk is over').toBe(false);
  expect(volumeOf('p').following, 'and the cursor is the feed\'s again').toBe(true);
});

test('play on a run that has reached its end plays it again from the start', () => {
  feed(6);
  useRecords.getState().play();
  expect(volumeOf('p').shown).toBe(0);
  expect(volumeOf('p').playing).toBe(true);
});

test('a record that arrives mid-replay is received and not shown', () => {
  feed(6);
  useRecords.getState().seek(1);
  useRecords.getState().play();
  useRecords.getState().advance();
  expect(volumeOf('p').shown).toBe(2);
  feed(3);
  expect(volumeOf('p').received.length).toBe(9);
  expect(volumeOf('p').shown, 'the cursor did not jump to the end of the feed').toBe(2);
});

test('seeking and Latest each stop the other', () => {
  feed(6);
  useRecords.getState().play();
  useRecords.getState().seek(4);
  expect(volumeOf('p').playing).toBe(false);
  expect(volumeOf('p').following).toBe(false);

  useRecords.getState().play();
  useRecords.getState().setFollowing(true);
  expect(volumeOf('p').playing).toBe(false);
  expect(volumeOf('p').shown).toBe(6);
});
