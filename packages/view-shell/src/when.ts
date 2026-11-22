// When a view stands in the run.
//
// A view is a camera, and a camera that shows a scene shows it at that scene's time: a set of stills declared with
// `from` and `to` is footage the run plays, and a window is on the shell only while the cursor stands in its scene. The
// reading is one function so the picture, its pin and its press target are gated by the same answer, and so a view that
// declares no bounds is read exactly as it was before a view could be timed: one window for the whole run.

import type { CarriedView } from '@ssccsorg/skene-kernel';

/** Whether a view's own standing is bounded, which is what makes it a scene the run plays rather than a window it keeps. */
export function timed(view: Pick<CarriedView, 'from' | 'to'>): boolean {
  return view.from !== undefined || view.to !== undefined;
}

/** Whether a view stands at `at`, the run's own second. A view with no bounds stands for the whole run. */
export function standsAt(view: Pick<CarriedView, 'from' | 'to'>, at: number): boolean {
  // Half-open on the far end: the second a scene closes at is the second the next one opens at, and a boundary belongs
  // to the scene the run has just entered. Two frames of one sequence never stand together.
  return (view.from ?? Number.NEGATIVE_INFINITY) <= at && at < (view.to ?? Number.POSITIVE_INFINITY);
}
