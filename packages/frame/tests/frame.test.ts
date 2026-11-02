// A frame with no room to stand its panels, held to the two answers it has to get right.
//
// The width is one number and the whole of the rule, so what a window is drawn as cannot depend on what device it is on:
// a panel that hid itself on a breakpoint of its own answered that question four times, in four files, and the frame's
// bar went on offering a control for a panel no window could draw. The threshold is therefore asserted from both sides,
// because a rule that only says "narrow is narrow" would pass while every width was narrow.
//
// Which panel is drawn when there is room for one is the other half, and its answer is that only the one brought forward
// is drawn. A fallback to the first panel that was out looked harmless and was not: the register's order puts the frame's
// row first, so a narrow window came up with its transport over a space that had nothing to do with it, and nobody had
// pressed anything.

import { expect, test } from 'vitest';
import { FRAME_HAS_ROOM, roomAt } from '@/hooks/useFrame';
import { frontPanel, type Standing } from '@/lib/panels';

/** One panel as the frame reads it: what it is called, whether it is out, and the press its own control makes. */
function panel(key: string, open: boolean): Standing {
  return {
    unit: { key, at: 'left', order: 0, side: 'left', label: key, title: key, starts: false, Icon: () => null, View: () => null },
    open,
    toggle: () => undefined,
  };
}

test('the frame has room at its own width and not below it', () => {
  expect(roomAt(FRAME_HAS_ROOM), 'the width itself has room').toBe(true);
  expect(roomAt(FRAME_HAS_ROOM - 1), 'a pixel less does not').toBe(false);
  expect(roomAt(0), 'and no width at all is a frame with no room').toBe(false);
});

test('the width the frame needs is the one it stands every panel at, which is what a cockpit is drawn for', () => {
  // A panel standing beside the space takes the space's room and not the frame's, so the middle is the thing the
  // threshold protects: a frame that let its panels stand at any width would keep the panels and lose the space.
  expect(FRAME_HAS_ROOM).toBeGreaterThanOrEqual(1024);
});

test('a frame with room for one draws the panel brought forward', () => {
  const panels = [panel('rail', true), panel('console', true), panel('timeline', false)];
  expect(frontPanel(panels, 'console')?.unit.key, 'the pilot last asked for the console').toBe('console');
});

test('nothing brought forward is nothing drawn, so a space with room for one gets it', () => {
  // The fallback this replaces drew the first panel that was out, which at a register order that puts the row first is
  // the transport: a frame came up with its timeline over the space and nobody had pressed anything.
  const panels = [panel('timeline', true), panel('rail', true)];
  expect(frontPanel(panels, null)).toBeNull();
  expect(frontPanel([], null)).toBeNull();
});

test('a panel brought forward that is away draws nothing, which is what the bar says about it', () => {
  const panels = [panel('rail', true), panel('console', false)];
  expect(frontPanel(panels, 'console'), 'the bar draws that control off, so the overlay draws nothing').toBeNull();
  expect(frontPanel([panel('console', true)], 'nobody'), 'and a key no panel answers to is nothing').toBeNull();
});
