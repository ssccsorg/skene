// The acceptance: the end of a conversation that produced an outcome, and who may write it.
//
// A turn ends with something the agent drew, and whether that stands is a person's decision rather than the room's: the
// answer is an outcome, and accepting it is the record that says so. It is a note and not a turn, so it is stored where
// the person and the agent both read it, with the caller's own author on it, and no model is called for it. That is the
// same envelope the console already writes a note with, so nothing about the room's contract is added here.
//
// Who may write it is the room's answer and not the window's: the workspace the gateway names carries a policy, and a
// workspace that names none leaves acceptance open. That is why the policy is read as a value rather than decided as a
// code path. Narrowing it to one owner later is a value the gateway answers, and nothing in this window changes.
//
// It is here rather than in the panel because it is a reading of a conversation and a policy: a conversation that offered
// an acceptance twice, or refused it to the caller the policy allows, is a defect a string can hold and a panel cannot.

import { isToolCall, NOTE_MARK, type Message } from './channel';

/** The note an acceptance is written as, which is the word both ends read in the record. */
export const ACCEPTED = 'accepted';

/** The line an acceptance is written as, which is what the field would hold if a pilot typed it. */
export function acceptLine(): string {
  return `${NOTE_MARK}${ACCEPTED}`;
}

/**
 * The id the credential belongs to.
 *
 * The gateway hands out `Bearer <id>:<key>`, so the caller's own name is the half before the colon and that is the id the
 * identity store knows. A credential with no colon in it belongs to nobody the store can name, which is what a window
 * that has never connected holds.
 */
export function callerOf(token: string): string {
  return token.split(':')[0];
}

/**
 * Whether an outcome stands in a conversation: an answer the agent drew, and not a step of getting to it.
 *
 * A tool call is the turn's own work rather than what came of it, so a conversation holding only calls holds no outcome
 * yet. The reasoning inside an answer is part of the answer, so the entry's role is what decides and the tag is not read
 * a second time here.
 */
export function hasOutcome(messages: Message[]): boolean {
  return messages.some((message) => message.role === 'assistant' && !isToolCall(message));
}

/** Whether the acceptance already stands in it, which is what stops the offer being made twice. */
export function isAccepted(messages: Message[]): boolean {
  return messages.some((message) => message.role === 'note' && message.content.trim() === ACCEPTED);
}

/**
 * Whether this caller may accept, from the policy the workspace names.
 *
 * A workspace that names no policy leaves it open, which is what every deployment that has not narrowed it says, and
 * `any` says the same thing in a word. Anything else is the list of the ids that may, which is the shape an owner-only
 * policy takes.
 */
export function mayAccept(policy: string | null | undefined, caller: string): boolean {
  const named = (policy ?? '').trim();
  if (!named || named === 'any') return true;
  return named
    .split(',')
    .map((part) => part.trim())
    .includes(caller);
}

/**
 * Whether the offer to accept stands, which is the offer and not the record it would write.
 *
 * Four things have to hold and each of them is somebody else's answer: there is a conversation to accept from, the room
 * is not in a turn over it, the caller may write the record, and no acceptance is in it yet. What is asked here is
 * whether to draw the control, so the caller's own state is asked elsewhere.
 */
export function acceptOffered(args: {
  thread: string | null;
  working: boolean;
  policy: string | null | undefined;
  caller: string;
  messages: Message[];
}): boolean {
  if (!args.thread || args.working) return false;
  if (!mayAccept(args.policy, args.caller)) return false;
  return hasOutcome(args.messages) && !isAccepted(args.messages);
}
