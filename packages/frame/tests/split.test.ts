// How much of the frame the map takes, as a control rather than an address, and what each project is left with.
//
// The map button is an activation: closing the pane and opening it again returns to the arrangement the pilot chose. The
// arrangement is the project's own, because a pilot who arranged one place has said nothing about another, and a place
// with a ground opens the map beside the globe until the pilot says otherwise.

import { beforeEach, expect, test } from 'vitest';
import { togetherOf, useFrame } from '@/stores/frame';

beforeEach(() => {
  useFrame.setState({ modes: {}, paths: {}, last: 'vertical', tone: 'dark', orbits: {} });
});

test('a project with a ground opens the map beside the globe', () => {
  expect(useFrame.getState().splitOf('villa')).toBe('vertical');
});

test('the pane toggles between the globe alone and the arrangement last chosen', () => {
  useFrame.getState().toggle('villa');
  expect(useFrame.getState().splitOf('villa')).toBe('globe');
  useFrame.getState().toggle('villa');
  expect(useFrame.getState().splitOf('villa')).toBe('vertical');
});

test('choosing an arrangement is remembered, and closing the pane does not forget it', () => {
  useFrame.getState().setSplit('villa', 'horizontal');
  expect(useFrame.getState().splitOf('villa')).toBe('horizontal');
  expect(useFrame.getState().last).toBe('horizontal');
  useFrame.getState().setSplit('villa', 'globe');
  expect(useFrame.getState().last, 'the closed pane keeps what it would reopen as').toBe('horizontal');
  useFrame.getState().toggle('villa');
  expect(useFrame.getState().splitOf('villa')).toBe('horizontal');
});

test('one project arrangement is not another project arrangement', () => {
  useFrame.getState().setSplit('villa', 'globe');
  expect(useFrame.getState().splitOf('villa'), 'the place the pilot closed is closed').toBe('globe');
  expect(useFrame.getState().splitOf('island'), 'and a place they never opened still has its map').toBe('vertical');
});

test('the map taking the frame is an arrangement and not a third reading', () => {
  useFrame.getState().setSplit('villa', 'full');
  expect(useFrame.getState().splitOf('villa')).toBe('full');
  useFrame.getState().toggle('villa');
  expect(useFrame.getState().splitOf('villa')).toBe('globe');
});

test('the orbit is a projection and leaves the arrangement alone', () => {
  useFrame.getState().setSplit('villa', 'horizontal');
  useFrame.getState().toggleOrbit('villa');
  expect(useFrame.getState().splitOf('villa'), 'the frame keeps its shape').toBe('horizontal');
  expect(useFrame.getState().orbitOf('villa'), 'and the map is read on the earth').toBe(true);
  useFrame.getState().toggleOrbit('villa');
  expect(useFrame.getState().splitOf('villa')).toBe('horizontal');
  expect(useFrame.getState().orbitOf('villa')).toBe(false);
});

test('the orbit is kept per project like the arrangement', () => {
  useFrame.getState().toggleOrbit('villa');
  expect(useFrame.getState().orbitOf('villa')).toBe(true);
  expect(useFrame.getState().orbitOf('island'), 'a project never turned keeps the flat map').toBe(false);
});

test('a press on the map alone brings the sphere back beside it', () => {
  useFrame.getState().setSplit('villa', 'full');
  useFrame.getState().returnToTogether('villa');
  expect(useFrame.getState().splitOf('villa')).toBe('vertical');
});

test('the map tone is one toggle for the map and the orbit', () => {
  expect(useFrame.getState().tone).toBe('dark');
  useFrame.getState().toggleTone();
  expect(useFrame.getState().tone).toBe('light');
  useFrame.getState().toggleTone();
  expect(useFrame.getState().tone).toBe('dark');
});

test('a sphere return comes back to both panes, never to the map alone', () => {
  expect(togetherOf('full'), 'the map alone would hide the sphere again').toBe('vertical');
  expect(togetherOf('globe'), 'a closed map opens beside the sphere').toBe('vertical');
  expect(togetherOf('vertical')).toBe('vertical');
  expect(togetherOf('horizontal'), 'a stacked pair comes back stacked').toBe('horizontal');
});

test('a project remembers the reading it was left in', () => {
  useFrame.getState().rememberPath('villa', '/graph');
  expect(useFrame.getState().pathOf('villa')).toBe('/graph');
  expect(useFrame.getState().pathOf('island'), 'and a project never read has no reading to restore').toBeNull();
  useFrame.getState().rememberPath('villa', '/graph');
  expect(useFrame.getState().pathOf('villa')).toBe('/graph');
});
