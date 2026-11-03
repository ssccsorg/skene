import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { BOARD_NAME, cn } from '@ssccsorg/skene-ui';

// A name in the space. It is drawn as DOM over the canvas rather than as a portal inside it: the
// projection is the pilot's own and the page can do that arithmetic, and nine portals into a canvas is
// nine chances for one of them to be lost. It also makes a name something a person can press, which is
// how a unit is picked without a list.
//
// Names alternate above and below their mark, because two units can stand at almost the same place in
// a space and a name is a line wide. What a name carries is the caller's: the unit's own store mark, the
// unit's glyph, its name and the last record it wrote.
//
// The type is the frame's one type, so a name on the space and a name in the rail are the same name at the same size;
// what changes with what is named is where its name stands, and whether the name is a folder or a leaf is its kind's own
// ink. A held element is drawn in the same type as the member it belongs to.
export function BoardLabel({
  children,
  ringed,
  at,
  edit,
  onPick,
  onEdit,
}: {
  children: ReactNode;
  ringed: boolean;
  at: [number, number];
  /** The member the name stands for, when the name offers the way into the move context. */
  edit?: string;
  onPick?: () => void;
  onEdit?: () => void;
}) {
  return (
    <span
      className={cn(
        'group pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-sm border bg-card/90 px-2 py-0.5 whitespace-nowrap',
        BOARD_NAME,
        'flex items-center gap-1',
        onPick && 'cursor-pointer hover:bg-accent/70',
        ringed ? 'border-claim text-claim' : 'border-border text-foreground/90',
      )}
      style={{ left: at[0], top: at[1] }}
      onClick={onPick}
    >
      {children}
      {/* The way into the context, on the name because the name is what a hand points at: the mark under it is a target
          and not a thing a reader looks for. It stands clear of the pill so a name's own width is still its own. */}
      {onEdit ? (
        <button
          type="button"
          data-region="entity-edit"
          data-unit={edit}
          aria-label={`move ${edit ?? 'it'}`}
          title={`move ${edit ?? 'it'} on the ground`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          className="absolute -right-[18px] top-1/2 flex size-[18px] -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-foreground"
        >
          <Pencil className="size-3" />
        </button>
      ) : null}
    </span>
  );
}
