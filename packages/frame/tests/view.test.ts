// The two readings of one space: the region holding a place, and the place's own cell filling the frame.
//
// The mode is a way of reading and not a second space, so the projection is unchanged and only what is fitted is. What is
// held here is that the mode can be chosen either way and that choosing it hands the view back to the space: a field the
// pilot picked is not one the board may overwrite, and a fill that could not be seen until the pilot pressed centre would
// be a control that appears to do nothing.

import { beforeEach, expect, test } from 'vitest';
import { useView } from '@/stores/view';

beforeEach(() => {
  useView.setState({ held: false, filled: false });
});

test('the sphere reads the region until a pilot fills it with the cell', () => {
  expect(useView.getState().filled).toBe(false);
  useView.getState().setFilled(true);
  expect(useView.getState().filled).toBe(true);
  useView.getState().setFilled(false);
  expect(useView.getState().filled).toBe(false);
});

test('choosing a reading hands the view back to the space, in both directions', () => {
  useView.setState({ held: true });
  useView.getState().setFilled(true);
  expect(useView.getState().held, 'a filled sphere is fitted, not held').toBe(false);
  useView.setState({ held: true });
  useView.getState().setFilled(false);
  expect(useView.getState().held, 'and the region comes back fitted the same way').toBe(false);
});
