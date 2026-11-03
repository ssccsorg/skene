// The views the space carries, read from the place that declares them.
//
// A view is not an entity the way a drive or a conveyor is: it is carried. The two shapes that takes are one relation
// here. A view inside a body is carried by that body, so its origin is the unit that declares it; a view that stands in
// the space as an entity of its own is a unit declaring its own view, and its origin is itself. The one relation is
// what makes this a list: an entity with two views has two windows, so an entity and a window are not one thing and are
// not named as one.
//
// Nothing here says which views there are. The place does, and this reads it, so a project with cameras carries them
// and a project without any has none. The demonstration's footage is the drive's own declaration and not a constant
// held in the app.
//
// The space knows nothing else about a view. Where its window stands is its origin's own place, how large it is is the
// view's own declaration, and a window the pilot has moved belongs to the window and not to the view.

import type { CarriedView, Place } from '@ssccsorg/skene-kernel';
import { readView } from './windows';
import { viewKindOf } from './view-kinds';

/**
 * Every view a place declares that stands at a time in the run, read into what this build can draw, each with the unit
 * that carries it. A view with no window stands for the whole run; `at` absent means the whole run too, which is what a
 * caller with no cursor asks.
 */
export function viewsIn(place: Place, at = Number.POSITIVE_INFINITY): CarriedView[] {
  return Object.entries(place.units ?? {}).flatMap(([origin, declared]) =>
    (declared.views ?? [])
      .map((view) => ({ ...readView(view), origin }))
      .filter((view) => (view.from ?? Number.NEGATIVE_INFINITY) <= at && at <= (view.to ?? Number.POSITIVE_INFINITY)),
  );
}

/**
 * Every view a place declares whose kind fills the room's surface, each one with the unit that carries it.
 *
 * Whether a kind fills the surface is the kind's own declaration, so the frame holds the list and not the word: a
 * deployment's kind that fills the room is in it, and a view of any other kind is carried all the same and drawn where
 * the member's own attributes are read.
 */
export function fillsIn(place: Place, at = Number.POSITIVE_INFINITY): CarriedView[] {
  return viewsIn(place, at).filter((view) => viewKindOf(view.kind)?.fills);
}

/** Whether a view stands in the space as an entity of its own, rather than being carried inside another. */
export function standing(view: CarriedView): boolean {
  return view.id === view.origin;
}

/** Every view one entity carries, which is the list an entity-to-window reading has to be asked for. */
export function viewsOf(views: CarriedView[], origin: string): CarriedView[] {
  return views.filter((view) => view.origin === origin);
}

