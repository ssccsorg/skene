// The fitted field, held to the one rule the cockpit rests on: the space opens fitted and stays fitted
// until the pilot takes the view over, so a window that changes shape is a space the pilot can still see
// all of.
//
// The space showing itself again, and the space turning to its own next patch, are the space's own and
// must not count as the pilot taking over: the two ran through the same call that a turn and a zoom do,
// which is what left a resized window stuck on a field fitted to a frame that no longer existed.

import { expect, test } from 'vitest';
import { useView } from '@/stores/view';

const LEVEL = { yaw: 0, pitch: 0, fov: 52 };

test('a fitted space is still the space to fit again', () => {
  useView.setState({ ...LEVEL, held: false });
  useView.getState().fit({ yaw: 0.4, pitch: 0.1, fov: 40 });

  const fitted = useView.getState();
  expect([fitted.yaw, fitted.pitch, fitted.fov]).toEqual([0.4, 0.1, 40]);
  expect(fitted.held, 'fitting is the space showing itself, not the pilot taking it').toBe(false);
});

test('turning to another project does not take the view from the space', () => {
  useView.setState({ ...LEVEL, held: false });
  useView.getState().spin({ yaw: 1, pitch: 0, fov: 44 });

  expect(useView.getState().yaw).toBeCloseTo(1, 6);
  expect(useView.getState().held, 'the space turned to its own patch, which is the space\'s').toBe(false);
});

test('a turn, a zoom or a pick makes the view the pilot\'s, and the space hands it back', () => {
  const takes = [
    () => useView.getState().turn(12, 4),
    () => useView.getState().zoom(-120),
    () => useView.getState().aim(0.3, 0.2),
  ];
  for (const take of takes) {
    useView.setState({ ...LEVEL, held: false });
    take();
    expect(useView.getState().held).toBe(true);
  }

  useView.getState().release();
  expect(useView.getState().held).toBe(false);
});
