// One command's whole reach, read from the links the records carry.
//
// A turn declares itself, claims itself and writes what it produced, and a machine the space told writes a declaration
// whose `from` is the fact that told it. So the round one line set off is already in the records, as a chain of links, and
// what a reader needs is not a second description of it: the sequence of turns is walked here out of the records the feed
// delivered.
//
// The walk goes backwards from the newest declaration and stops where a link does not land: a fact written by no turn of
// this run, or a shape the reader cannot follow. That is what a round is: the longest linked run of turns ending at the
// newest one, which is the line just said and the machines it reached, in the order they wrote.

import type { Entry } from './types';

/** One turn of a round, as the records state it. */
export interface Turn {
  /** The declaration, which is the turn itself: what was said and who said it. */
  intent: Entry;
  /** Who took it, which the claim names rather than the declaration. */
  worker: string;
  /** What was said, in the words the line carried. */
  said: string;
  /** The reading it produced, which is its origin or, for a conclusion, the name it wrote. */
  wrote: string;
  /** What the turn was told by, which is the previous turn's reading and null for the line the pilot said. */
  from: string;
  /** Whether the act that took it has arrived, so a chain read at a cursor shows no claim the feed has not delivered. */
  claimed: boolean;
}

/** A declaration and what the records say became of it, read only as far as the feed has delivered. */
function turnOf(here: Entry, records: Entry[]): Turn {
  const claim = here.claim && records.includes(here.claim) ? here.claim : null;
  const produced = here.produced && records.includes(here.produced) ? here.produced : null;
  return {
    intent: here,
    worker: claim ? (here.worker ?? here.origin ?? 'unclaimed') : (here.origin ?? 'unclaimed'),
    said: here.description ?? 'a declaration',
    // A conclusion writes its name and no origin, so the label is the reading in that case.
    wrote: produced?.origin ?? produced?.label ?? '',
    from: here.from?.origin ?? here.from?.label ?? '',
    claimed: claim !== null,
  };
}

/**
 * The turn that produced the fact a declaration started from, or null when that fact came from outside this round.
 *
 * The link is two records deep because that is how the model states it: a declaration says what it started from, and a
 * fact says which declaration produced it. A round is the two read together.
 */
function before(intent: Entry, records: Entry[]): Entry | null {
  const produced = intent.from;
  if (!produced || !records.includes(produced)) return null;
  const producedBy = produced.producedBy;
  return producedBy && producedBy.kind === 'intent' ? producedBy : null;
}

/**
 * The round the newest declaration belongs to, oldest turn first.
 *
 * The run may hold several rounds, and the strip says what the space is doing now, so the walk begins at the newest
 * declaration. A cycle is cut rather than followed: a declaration that reaches itself is a round with no beginning, and a
 * reader that followed it would stand on one record for ever.
 */
export function roundOf(records: Entry[]): Turn[] {
  const newest = records.filter((each) => each.kind === 'intent').at(-1) ?? null;
  if (!newest) return [];

  const turns: Turn[] = [];
  const seen = new Set<Entry>();
  let here: Entry | null = newest;
  while (here && !seen.has(here)) {
    seen.add(here);
    turns.push(turnOf(here, records));
    here = before(here, records);
  }
  return turns.reverse();
}

/**
 * Every declaration the run holds, oldest first.
 *
 * A campaign is longer than one round, so its chain is every turn the run made rather than the newest one. The walk does
 * not follow the links here: the campaign's start and end are its bounds, and the turns inside them are the work.
 */
export function turnsOf(records: Entry[]): Turn[] {
  return records.filter((each) => each.kind === 'intent').map((each) => turnOf(each, records));
}


