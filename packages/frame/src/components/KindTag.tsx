import { Badge } from '@ssccsorg/skene-ui';
import { cn } from '@ssccsorg/skene-ui';
import type { NodeKind } from '@ssccsorg/skene-kernel';

// One kind, one colour, one letter. The four are peers: a fact, a declaration of work, what bounded it
// and the act that took it are four kinds of the same record, and the colour is the whole of what
// says which. The size never carries the kind, because a size would rank what the format does not.
//
// The mark is the kind's own first letter and the whole word travels as the title, because a column of FACT,
// HINT, INTENT and CLAIM takes four times the width of a mark and says nothing the colour and the letter do not. A
// kind is a term of the format and not a word of the prose around it, so it is always marked the same way.

const INK: Record<NodeKind, string> = {
  fact: 'text-fact border-fact',
  intent: 'text-intent border-intent',
  hint: 'text-hint border-hint',
  claim: 'text-claim border-claim',
};

/** The letter a kind is marked by, which is its own name's first and not a second vocabulary to keep in step. */
const MARK = (kind: string) => kind.slice(0, 1).toUpperCase();

export function KindTag({ kind, className }: { kind: NodeKind; className?: string }) {
  return (
    <Badge
      variant="outline"
      title={kind}
      className={cn(
        'min-w-5 justify-center rounded-full px-1 py-0.5 text-[11.5px] leading-4 font-normal',
        INK[kind],
        className,
      )}
    >
      {MARK(kind)}
    </Badge>
  );
}
