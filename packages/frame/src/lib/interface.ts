// The abilities a member is drawn with, read once for both places that draw them.
//
// Two facts about a member look alike here and are not the same. One is the place's own declaration of what the member is
// for: the `abilities` names written beside the unit in the space. The other is what a line to the member would run, which
// only the member's side answers (`Room.asks`). A machine that runs its own commands answers with them, a member the sim
// stands in for nothing answers with nothing, and a deployment with no executor-side path answers with nothing at all.
//
// The frame draws the second and only the second, in both places a member's abilities are read: the row of controls under
// a member that is picked, and the words on the member's own row in the list of members. One answer and two affordances,
// which is what the list and the row cannot disagree about, and the reason the declaration is not read here. A chip drawn
// from the declaration is work the list promises and the row cannot offer: a pilot reads three ways to ask a servo drive,
// presses the member, and finds no control at all.
//
// The declaration is not lost and is not a second interface. It is what a project states of a member, it is drawn and
// edited where the member is opened whole (`components/EntityDetail`), and a member whose declaration the room answers
// with nothing is a member this room has no interface for yet.

import type { Asked } from './channel';
import { memberOf } from './kinds';
import type { Standing } from './types';

/**
 * The abilities a member is drawn with, from the room's answer.
 *
 * A null answer is a room that has not answered about this member or one that does not answer the question, and both draw
 * as nothing: the frame holds no ability it cannot put to an answer, and the two are one picture either way.
 *
 * A person is the one member whose answer is not an interface whatever the room says. A person states work rather than
 * being given it and a note is what goes to them, so the room's answer about one says what the people around them can do
 * with a line rather than what the line could command, and a control drawn from it would be a promise nobody keeps. The
 * rule stands here rather than at a panel because the two places have to agree about it: a member drawn with controls in
 * one and without them in the other is the disagreement this whole reading exists to prevent.
 */
export function drawnAbilities(member: Standing, answered: Asked[] | null): Asked[] {
  if (member.properties.person) return [];
  return answered ?? [];
}

/**
 * The words a member's row is searched by: what it is, and the abilities that row draws.
 *
 * The declaration is not among them, for the same reason it is not drawn: the filter is how a pilot finds a member whose
 * row says what can be asked of it, so a word that finds a member whose row draws nothing is a search promising what the
 * drawing does not.
 */
export function wordsOf(unit: Standing, answered: Asked[] | null): string[] {
  return [
    unit.icon ?? '',
    unit.role ?? '',
    unit.title ?? '',
    memberOf(unit.properties),
    ...drawnAbilities(unit, answered).map((each) => each.name),
  ];
}
