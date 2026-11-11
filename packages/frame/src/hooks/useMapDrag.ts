import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { dragTurn } from '@ssccsorg/skene-board';
import { useView } from '../stores/view';

// The disc, taken in the hand and pushed.
//
// The map is drawn twice: the column keeps it at the size of a section and the board draws it whole. Both are one
// projection of one view, and a pilot who turned one of them and found the other pointing elsewhere would be reading two
// maps. So the gesture is one implementation and both surfaces hand it the box they draw the disc in.
//
// A press on a thing the map draws is not a turn, and the two arrive as one gesture: a pointer goes down on a unit and
// comes up somewhere else. So the gesture remembers how far the pointer has travelled and reports whether it decided the
// pilot was turning, which the surface asks before it reads the release as a press on the thing that was under it.
//
// It is a hook rather than a component because the map's own markup is the surface's: one draws it over a panel and the
// other over a board, and neither is the other's box.

/** How far a pointer travels before the map decides the pilot is turning and not pressing something drawn on it. */
const DRAG = 4;

export interface MapDrag {
  /**
   * Whether the press in hand has become a turn.
   *
   * A surface reads it before it treats a release as a press on the thing it started on. It is reset by the next press
   * rather than by the release, because a press that ended outside the thing it started on fires no release there.
   */
  turned: RefObject<boolean>;
  onPointerDown: (event: ReactPointerEvent<Element>) => void;
  onPointerMove: (event: ReactPointerEvent<Element>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
}

export interface MapDragOptions {
  /**
   * Whether this press is one the map turns on.
   *
   * The minimap has a frame drawn on it, and the frame is the part of the sphere the board is showing: a press inside it
   * is a look at what is already in view, so the surface answers no and the press reaches the thing under the pointer.
   * A surface with no frame leaves this out, and then every press turns.
   */
  turnable?: (event: ReactPointerEvent<Element>) => boolean;
  /**
   * What the surface does the moment a press becomes a turn.
   *
   * The minimap is read from outside the sphere and the board from inside it, so a hand that turns the disc is a hand
   * asking to see the space: a surface drawn from anywhere else says so here and lands on the reading that is. A
   * surface already drawn from the seat needs nothing, so it leaves this out.
   */
  onTurn?: () => void;
  /** How much the disc is magnified in its box, which the rate the drag is worth follows. */
  scale?: number;
  /**
   * Which way the map hands its drag to the view.
   *
   * A map drawn from outside the seat holds the pilot's bearing at its middle, so a hand that pushes the surface turns the
   * space the other way. That is the map's own sign and it is passed in here rather than fixed, because the board's drag is
   * the other surface and reads the same pointer the other way round.
   */
  sense?: 1 | -1;
}

/**
 * The map's own drag, bound to the box the disc is drawn in.
 *
 * The box is asked for its pixels on every step rather than measured once, because the disc is drawn in a column the
 * pilot drags and a board a window resizes: a rate read at the start of a gesture would be a turn that runs ahead of the
 * hand on a box that changed shape under it.
 */
export function useMapDrag(box: RefObject<Element | null>, options: MapDragOptions = {}): MapDrag {
  const turn = useView((store) => store.turn);
  const sense = options.sense ?? 1;
  const dragging = useRef<{ id: number; at: [number, number] } | null>(null);
  const turned = useRef(false);

  return {
    turned,
    onPointerDown: (event) => {
      if (options.turnable && !options.turnable(event)) {
        dragging.current = null;
        return;
      }
      dragging.current = { id: event.pointerId, at: [event.clientX, event.clientY] };
      turned.current = false;
    },
    onPointerMove: (event) => {
      const was = dragging.current;
      if (!was || was.id !== event.pointerId) return;
      const [dx, dy] = [event.clientX - was.at[0], event.clientY - was.at[1]];
      if (!turned.current && Math.hypot(dx, dy) < DRAG) return;
      if (!turned.current) options.onTurn?.();
      turned.current = true;
      dragging.current = { id: was.id, at: [event.clientX, event.clientY] };
      const rect = box.current?.getBoundingClientRect();
      if (dx || dy) {
        const step = dragTurn(dx, dy, rect, options.scale);
        turn(step.dx * sense, step.dy * sense, step.per);
      }
    },
    onPointerUp: () => {
      dragging.current = null;
    },
    onPointerCancel: () => {
      dragging.current = null;
    },
  };
}
