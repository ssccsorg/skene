// What a device reported in its turn.
//
// The bridge adds one line to a turn that the board can take, so the reader is the whole of the channel between a room's
// prose and a unit's position. A line it cannot read is dropped rather than drawn as a place, which is the one property
// that matters: a device reported at a place it is not is worse than a device reported nowhere.

import { expect, test } from 'vitest';

import { statesOf } from '@ssccsorg/skene-kernel';

test('a state line is a map of units to positions', () => {
  expect(statesOf('state {"rover-1":[100,130],"crawler-2":[20,40]}')).toEqual({
    'rover-1': [100, 130],
    'crawler-2': [20, 40],
  });
});

test('a turn is prose around the line, and the line is read wherever it stands', () => {
  const content = ['I moved the rover.', '', '  state {"rover-1":[5,6]}  ', 'Done.'].join('\n');
  expect(statesOf(content)).toEqual({ 'rover-1': [5, 6] });
});

test('a later line for the same unit is the newer reading', () => {
  expect(statesOf('state {"a":[1,2]}\nstate {"a":[3,4]}')).toEqual({ a: [3, 4] });
});

test('a line that is not a state is not a position', () => {
  expect(statesOf('the rover is at 100,130')).toEqual({});
  expect(statesOf('state []')).toEqual({});
  expect(statesOf('state {oops}')).toEqual({});
  expect(statesOf('')).toEqual({});
});

test('a unit whose point is not two numbers is dropped, and its neighbour stands', () => {
  expect(statesOf('state {"a":[1],"b":["2",3],"c":[1,2],"d":null,"e":[1,null]}')).toEqual({
    c: [1, 2],
  });
});
