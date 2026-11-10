import { Badge } from '@ssccsorg/skene-ui';
import { cn } from '@ssccsorg/skene-ui';
import type { NodeKind } from '@ssccsorg/skene-kernel';
import { useKindWords } from '../lib/words';

// One kind, one colour, one letter. The four are peers: a fact, a declaration of work, what bounded it
// and the act that took it are four kinds of the same record, and the colour is the whole of what
// says which. The size never carries the kind, because a size would rank what the format does not.
//
// The word is the project's and not the format's. `fact`, `intent` and `hint` are the engine's names for the three things
// a run is made of, and a screen that wrote them would be reading a record to a person in the engine's vocabulary: a
// compliance board calls the same three evidence, a calculation and a requirement. So the mark is a letter of the word
// the reader is given, and the whole of it travels as the title and the accessible name.
//
// The colour is the kind's and stays the kind's. A project names a word; which of the four inks a kind is drawn in is the
// frame's, because two screens that coloured one kind two ways would be two boards.

const INK: Record<NodeKind, string> = {
  fact: 'text-fact border-fact',
  intent: 'text-intent border-intent',
  hint: 'text-hint border-hint',
  claim: 'text-claim border-claim',
};

/** The letter a word is marked by, which is its own first and not a second vocabulary to keep in step. */
const MARK = (word: string) => word.slice(0, 1).toUpperCase();

export function KindTag({ kind, className }: { kind: NodeKind; className?: string }) {
  const words = useKindWords();
  // A claim is a step a declaration takes rather than a record, so it is one of the four inks and none of the three
  // words a project names.
  const word = kind === 'claim' ? 'claim' : words[kind];
  return (
    <Badge
      variant="outline"
      title={word}
      aria-label={word}
      className={cn(
        'min-w-5 justify-center rounded-full px-1 py-0.5 text-[11.5px] leading-4 font-normal',
        INK[kind],
        className,
      )}
    >
      {MARK(word)}
    </Badge>
  );
}
