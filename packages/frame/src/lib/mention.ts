// The mention: the `@` a line is addressed with, and the members it can name.
//
// A mention is how a line names the member it is said to, and it is the same one value the pick and the menu carry:
// naming a member in the field moves the mark above it rather than writing a second name into the sentence, which is why
// the mention is taken out of the draft when it is chosen. The field's own rule is the reason: it says what the line is
// about to become and nothing about where it goes, and where it goes stands on the row above it.
//
// What the `@` offers is the space's own addresses (`lib/offer`), so a name a line may be said to is exactly the name the
// console's own list carries. The reader here is the field's half of that: which mention the caret is standing in, and
// what the draft is once the mention is resolved.
//
// It is here rather than in the panel because it is arithmetic over a string and not a drawing: a mention that survived
// into the sentence sent, or a draft that lost a character next to it, is a defect a test can hold and a panel cannot.

/**
 * The mention the caret is standing in, or null when it stands in none.
 *
 * A mention opens at an `@` that starts the line or follows a space, and runs to the caret. It is read to the caret
 * rather than to the end of the draft, because the rest of the line is the part being written and the mention is the part
 * being named: a pilot who moves back into the middle of a word is editing that word and not mentioning there.
 *
 * A member's own name has no space in it, so a space ends the mention and the offer closes with it. The `@` is read as a
 * mention and not as a letter of what came before, which is what keeps an address in prose (`write to me@example.com`)
 * from opening the offer when the caret stands in it: the character before the `@` has to be a space or nothing.
 */
export function mentionAt(draft: string, caret: number): { start: number; query: string } | null {
  const at = caret;
  for (let index = at - 1; index >= 0; index -= 1) {
    const character = draft[index];
    if (character === ' ' || character === '\n') break;
    if (character !== '@') continue;
    const before = index === 0 ? '' : draft[index - 1];
    if (before !== '' && before !== ' ' && before !== '\n') return null;
    return { start: index, query: draft.slice(index + 1, at) };
  }
  return null;
}

/**
 * Whether a mention is the first in a draft, which is the one that says where the line goes.
 *
 * A line may name more than one member: who it is said to, and where it is going. The first mention is the addressee,
 * because that is the order a person writes (who, what, where), and a later mention is a place the line talks about.
 * Reading every mention as the addressee would send "@alpha @move to @beta" to beta, which is the machine alpha was
 * told to go to.
 */
export function firstMention(draft: string, at: { start: number; query: string }): boolean {
  return !/(^|\s)@/.test(draft.slice(0, at.start));
}

/**
 * The draft with the mention taken out.
 *
 * What is left where the mention stood is the space it opened at, and the space after it is taken with it: `@cam ` on its
 * own line leaves an empty draft rather than one holding a space, and a mention inside a sentence leaves the sentence's
 * own spacing as it was. The addressee is not written into the text at all, so nothing is put back in its place.
 *
 * A mention reads as opening after any whitespace, so anything the head already ends with is the pilot's own and nothing is
 * added: a mention at the start of a line leaves the line's own break, and one that follows a tab keeps the tab. Reading
 * only for a space is what put a break and a space after it where a sentence had one break.
 */
export function withoutMention(draft: string, at: { start: number; query: string }): string {
  const after = at.start + 1 + at.query.length;
  const tail = draft.slice(after).replace(/^ /, '');
  const head = draft.slice(0, at.start);
  if (!head) return tail;
  return /\s$/.test(head) ? head + tail : `${head} ${tail}`;
}
