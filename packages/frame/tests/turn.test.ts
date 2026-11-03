// The drag, held to what a hand on the space is owed: the thing the pointer took hold of stays under it.
//
// There is one view and two surfaces read it, and they draw two different things. The board draws the space,
// so the space follows the hand. The map draws the pilot's own bearing as a marker, and a marker is the one
// thing on the map that is the pilot rather than the space, so the map hands its drag in negated. What is held
// here is the reading of each surface, and the sign between them.
//
// Every case below is the arithmetic each component calls, and the expected values are the measured behaviour:
// `target/drag4.mjs` drags each surface in a browser and reads which way what it holds moved. That is the check
// that a sign change here would fail, and it is here because both signs were flipped once without one.

import { expect, test } from 'vitest';

import { LEVEL, placed, project } from '@ssccsorg/skene-board';
import { DISC, dragTurn, onDisc } from '@ssccsorg/skene-board';
import { perPixel, useView } from '@/stores/view';

const reset = () => useView.setState({ ...LEVEL, frame: [0, 0], held: false, arrival: 1 });

/** The frame the board is drawn in, and the box the map's own disc is laid out in. */
const FRAME: [number, number] = [754, 694];
const BOX = { width: 412, height: 280 };
const FOV = 34.3;

test('the board is the space, so what the pointer took hold of stays under it', () => {
  reset();
  useView.setState({ frame: FRAME, fov: FOV });
  const mark = placed([0.25, 0.2, 0], 2, [0, 0]);
  const before = project(mark, FRAME[0], FRAME[1], { yaw: 0, pitch: 0, fov: FOV });
  // The mark is off the middle of the frame in both directions, so a drag that holds it has to be right on both
  // axes: a pair of rates that disagreed would show up here as a mark that slid out from under the hand.
  const drag: [number, number] = [60, 40];
  useView.getState().turn(drag[0], drag[1]);
  const after = project(mark, FRAME[0], FRAME[1], useView.getState());
  const moved = [after[0] - before[0], after[1] - before[1]];
  // The hand holds it to within a couple of pixels and not to the pixel: the rate is exact at the middle of the
  // frame and this mark is off it, so what is held is the direction and the order of the distance.
  for (const [index, axis] of ['across', 'up and down'].entries()) {
    expect(Math.sign(moved[index]), `${axis}, the mark went with the pointer`).toBe(Math.sign(drag[index]));
    expect(Math.abs(moved[index] - drag[index]), `${axis}, by the pixels the pointer travelled`).toBeLessThan(4);
  }
});

test('the map is the sphere, so a drag turns the surface with the hand', () => {
  reset();
  useView.setState({ frame: FRAME, fov: FOV });
  const scale = Math.min(BOX.width, BOX.height) / DISC;
  const bearing: [number, number] = [0, 0];
  const was = onDisc(bearing[0], bearing[1], [useView.getState().yaw, useView.getState().pitch]);
  const drag: [number, number] = [60, 40];
  const step = dragTurn(drag[0], drag[1], BOX);
  useView.getState().turn(step.dx, step.dy, step.per);
  const now = onDisc(bearing[0], bearing[1], [useView.getState().yaw, useView.getState().pitch]);
  // The bearing the hand took comes round with it across the map and drops as the pointer is pulled back: the sphere
  // follows the hand, which is the same sign the board's drag has.
  const moved = [(now[0] - was[0]) * scale, (now[1] - was[1]) * scale];
  for (const [index, axis] of ['across', 'up and down'].entries()) {
    expect(Math.sign(moved[index]), `${axis}, the surface went with the pointer`).toBe(Math.sign(drag[index]));
    // The rate is exact at the middle of the disc. This drag is two axes at once, so the bearing it reaches has a
    // pitch of its own and the across rate is multiplied by that pitch's cosine: what is held is the direction and
    // the order of the distance, not the pixel.
    expect(Math.abs(moved[index] - drag[index]), `${axis}, by the pixels the pointer travelled`).toBeLessThan(6);
  }
});

test('a drag to the right takes the bearing away from the pointer, which is the space coming right', () => {
  reset();
  useView.setState({ frame: FRAME, fov: FOV });
  useView.getState().turn(40, 0);
  expect(useView.getState().yaw, 'the pilot came round away from the pointer').toBeLessThan(0);
});

test('the pointer pulled back raises the nose, which is the space dropping away below', () => {
  reset();
  useView.setState({ frame: FRAME, fov: FOV });
  useView.getState().turn(0, 40);
  expect(useView.getState().pitch, 'down the pointer is up the view').toBeGreaterThan(0);
});

test('a pixel of the frame is the angle that frame spends on it, read from its own field and height', () => {
  expect(perPixel(60, 400)).toBeCloseTo((2 * Math.tan((60 * Math.PI) / 360)) / 400, 9);
  expect(perPixel(60, 800), 'a taller frame is a smaller angle per pixel').toBeLessThan(perPixel(60, 400));
  expect(perPixel(90, 400), 'a wider field is a larger angle per pixel').toBeGreaterThan(perPixel(60, 400));
  expect(perPixel(60, 0), 'a frame not yet measured is read at a middle-sized window, not at nothing')
    .toBeGreaterThan(0);
});

test('the drag turns by the frame it was measured on, and by the yaw the space follows the hand with', () => {
  reset();
  useView.setState({ frame: FRAME, fov: FOV });
  useView.getState().turn(100, 0);
  expect(useView.getState().yaw).toBeCloseTo(-100 * perPixel(FOV, FRAME[1]), 9);
});
