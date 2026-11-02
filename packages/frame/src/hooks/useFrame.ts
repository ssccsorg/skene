import { useEffect, useState } from 'react';

/**
 * Whether the frame has room to stand its panels beside the space.
 *
 * It is a question about the window and nothing else. A panel that hid itself on a breakpoint of its own was a panel
 * that knew what device it was on: the console was drawn from a large breakpoint and the plan from a wider one, so
 * which panels a window had was four decisions in four files, and the frame's own bar went on offering a control for a
 * panel that could not be drawn. What the frame asks here is one question, in one place, and the answer is the width it
 * has to give.
 *
 * The width is the one the frame was drawn for: at or above it, every panel's own measure plus a middle worth looking
 * at fits, so they stand where they stand. Below it, a panel standing beside the space takes the space's room rather
 * than the frame's, which is the one thing the middle must not be asked to pay, so the frame draws the panels over the
 * space instead (`components/PanelOverlay`).
 *
 * The threshold is stated as a number rather than as a media query because a media query is a second vocabulary for the
 * same fact and one that the frame cannot ask about: what a panel is drawn as and what a surface decides to draw are
 * two questions, and only one of them can be answered by the stylesheet.
 */
export const FRAME_HAS_ROOM = 1280;

/** Whether a frame of this width has room, which is the whole rule and is kept apart from reading the window. */
export function roomAt(width: number): boolean {
  return width >= FRAME_HAS_ROOM;
}

/**
 * Whether this window has room, kept up to date as it is resized.
 *
 * A resize is a fact about the window and not an event with meaning, so only the answer is kept: the many widths a drag
 * passes through are one boolean, and React is handed the same value until it changes.
 */
export function useFrame(): boolean {
  const [room, setRoom] = useState(() => (typeof window === 'undefined' ? true : roomAt(window.innerWidth)));

  useEffect(() => {
    const onResize = () => setRoom(roomAt(window.innerWidth));
    // The first read is the effect's own, because the window may have been resized between the first render and the
    // subscription, which is the one width a resize event never reports.
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return room;
}
