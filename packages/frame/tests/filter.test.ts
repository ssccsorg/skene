// The participants' filter, held to the two things it is asked for: a name and a kind.
//
// The list is thirty rows and the field is one line, so what it matches has to be the unit's own words
// and nothing about where the field happens to be: a word typed that no word of the unit carries is a
// row that is not in the answer.

import { expect, test } from 'vitest';
import { matches } from '@/components/EntityPanel';

const camera = ['camera', 'writes', '', 'frame-capture', 'inspection'];
const person = ['person', 'acts', 'admin', 'approve', 'assign', 'acknowledge'];

test('a filter by name finds the unit and nothing else', () => {
  expect(matches('vision-camera-3', camera, 'vision-camera-3')).toBe(true);
  expect(matches('vision-camera-3', camera, 'camera-3')).toBe(true);
  expect(matches('vision-camera-3', camera, 'camera-4')).toBe(false);
  expect(matches('vision-camera-2', [], '')).toBe(true);
});

test('a filter by kind finds every unit of that kind', () => {
  expect(matches('vision-camera-3', camera, 'camera')).toBe(true);
  expect(matches('line-manager-1', person, 'person')).toBe(true);
  expect(matches('line-manager-1', person, 'camera')).toBe(false);
});

test('every word typed has to match, so a filter narrows rather than widens', () => {
  expect(matches('vision-camera-3', camera, 'camera frame')).toBe(true);
  expect(matches('vision-camera-3', camera, 'camera person')).toBe(false);
  expect(matches('line-manager-1', person, '  person   admin ')).toBe(true);
});
