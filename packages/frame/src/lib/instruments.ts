import { useMemo, useSyncExternalStore, type ReactElement } from 'react';
import type { Picture } from './readings';

/**
 * The frame's own controls, and the questions the frame asks of them.
 *
 * A cockpit's controls are not one list a caller switches through. The frame's bar draws what belongs there, and
 * what belongs there is a question each control answers about the reading in force: how much of the space the frame
 * takes is a question about the shell and nothing else, while filling the screen is a question about the cockpit
 * whichever reading is up. A bar that asked `if` about each of them would know every rule in it, and a control added
 * later would be a new arm in someone else's conditional.
 *
 * So a control declares itself where it lives and the bar asks the questions it has of it. What it declares is not
 * one record with a field for everything: the pieces below are separate questions, a control composes the ones it
 * has an answer to, and the frame answers the rest. Four of the six controls here have nothing to say about which row
 * they stand in and six have nothing to say about which readings they speak to, and a shape that made them all say
 * `side: 'right'` and `shows: () => true` would be a declaration of the frame's own answers written five times.
 *
 * The bands are the row's own arrangement and not the bar's: controls in the same band stand together and a rule is
 * drawn where the band changes, so a rule is never a separator someone placed between two names.
 *
 * There are two rows and not one, because the bar has a name in the middle of it: the panels of the left edge stand to
 * the left of the name and the rest to the right, so where a control stands is a fact about the panel it opens and not
 * a position someone picked.
 */

// The name of the reading a control is asked about is the reading's own key, and a reading declares itself: the set of
// names is whatever the register holds, and the register is `lib/readings.ts`. So this file asks the question and the
// readings answer it, and the frame keeps no union of its own that would have to be kept in step with them.

export type { Picture };

/** Which of the bar's two rows a control stands in. */
export type Side = 'left' | 'right';

/** Its name, which is what the register keeps it under and what a row keys it by. */
export interface Named {
  key: string;
}

/**
 * What it draws, as a component and not as a value the row calls. A control reads stores, so it is a component; one
 * the row invoked as a function would be a hook called from a loop.
 */
export interface Drawn {
  Control: () => ReactElement;
}

/**
 * Where it stands.
 *
 * These are the control's own claim and the frame does not make it: which of two controls comes first, and where the
 * run it belongs to breaks, are facts about the row that only the controls standing in it can state. The side is the
 * one the frame can answer, because most controls stand on the right and the ones that do not open a panel on the
 * left edge and know they do.
 */
export interface Placed {
  order: number;
  band: number;
  side?: Side;
}

/** Whether it has anything to say about the reading in force. A control that says nothing speaks to every one. */
export interface Spoken {
  shows?: (picture: Picture) => boolean;
}

/** A control as a module declares it: the pieces it has an answer to, and nothing else. */
export type Instrument = Named & Drawn & Placed & Spoken;

/** A control as a row draws it, which is the same control with the frame's own answers filled in. */
export interface Settled extends Named, Drawn {
  order: number;
  band: number;
  side: Side;
}

/**
 * What the frame answers when a control leaves a question open.
 *
 * It is the frame's and not the control's, because it is a statement about the bar: most controls stand on the right,
 * and a control that has nothing to say about a reading still belongs to the row whichever reading is up.
 */
const FRAME = { side: 'right' as Side, shows: () => true };

const registered = new Map<string, Instrument>();
const listeners = new Set<() => void>();
let revision = 0;

/** Put a control in the register. The last one under a name is the one that stands, so a reload replaces. */
export function registerInstrument(instrument: Instrument): void {
  registered.set(instrument.key, instrument);
  revision += 1;
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** One control with the frame's answers filled in, so a row reads one shape rather than asking again. */
function settled(instrument: Instrument): Settled {
  return {
    key: instrument.key,
    Control: instrument.Control,
    order: instrument.order,
    band: instrument.band,
    side: instrument.side ?? FRAME.side,
  };
}

/** Whether a control has anything to say about the reading in force, with the frame answering for a silent one. */
const speaks = (instrument: Instrument, picture: Picture): boolean => (instrument.shows ?? FRAME.shows)(picture);

/** Where a control stands, asked of it rather than read off it by the row. */
const stands = (instrument: Instrument, side: Side): boolean => (instrument.side ?? FRAME.side) === side;

/** Every control that speaks to the reading in force and stands in the row asked for, in the row's own order. */
function controlsFor(picture: Picture, side: Side): Settled[] {
  return [...registered.values()]
    .filter((instrument) => speaks(instrument, picture) && stands(instrument, side))
    .sort((left, right) => left.order - right.order)
    .map(settled);
}

/**
 * What a row of the bar draws.
 *
 * It subscribes to the register rather than reading it once, because a control's module is registered when it is
 * first imported and the bar may draw before that: the counter is what makes the second draw happen.
 */
export function useInstruments(picture: Picture, side: Side): Settled[] {
  const stamp = useSyncExternalStore(
    subscribe,
    () => revision,
    () => revision,
  );
  // The stamp is a dependency because it is what the register changed; the list is derived from the register and the
  // reading, and neither of those is a value the memo can compare.
  return useMemo(() => controlsFor(picture, side), [picture, side, stamp]);
}
