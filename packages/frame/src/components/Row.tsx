import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { LABEL } from '@ssccsorg/skene-ui';
import { cn } from '@ssccsorg/skene-ui';

/**
 * One row of a panel: a label, a value, and the content the row opens.
 *
 * A part contributes the three and this decides the caret, the grid, and the fold, so a panel's rows are one shape
 * whatever they read. The caret is its own control rather than the row's, because a value may hold controls of its own
 * (an ability is a press) and a control inside a control is not a thing a browser will read.
 *
 * A row with no content is a reading rather than an expansion, which is what an ability row is. The label column is a
 * width rather than the label's own size, so the values of a panel's rows start on one line.
 *
 * The caret stands before the label by default, because the label is what the row is and the caret opens it. A row whose
 * value carries a run of marks puts the caret on the right instead: the marks then follow the label on one line, and
 * the control that opens the row is at the end of that line rather than between the two.
 */
export function Row({
  label,
  value,
  content,
  defaultOpen = true,
  fold = 'left',
  expanded,
  onExpandedChange,
}: {
  label: string;
  value: ReactNode;
  content?: ReactNode;
  defaultOpen?: boolean;
  fold?: 'left' | 'right';
  /** The open state when the caller owns it, which is what lets a value carry its own more control. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [mine, setMine] = useState(defaultOpen);
  const open = expanded ?? mine;
  const setOpen = (next: boolean) => {
    if (expanded === undefined) setMine(next);
    onExpandedChange?.(next);
  };
  const caret = content ? (
    <button
      type="button"
      data-region="row-fold"
      aria-expanded={open}
      title={open ? `close ${label.toLowerCase()}` : `open ${label.toLowerCase()}`}
      onClick={() => setOpen(!open)}
      className="flex items-center justify-center text-muted-foreground"
    >
      <ChevronRight className={cn('size-3.5 transition-transform', open && 'rotate-90')} />
    </button>
  ) : null;
  return (
    <div data-region="row" data-row={label.toLowerCase()} className="flex flex-col gap-1.5 text-[11.5px]">
      {/* A row with nothing to expand has no caret column, so its label sits at the panel's own edge rather than
          behind a control that is not there. */}
      <div
        className={cn(
          'grid items-center gap-2',
          content ? (fold === 'right' ? 'grid-cols-[72px_1fr_14px]' : 'grid-cols-[14px_72px_1fr]') : 'grid-cols-[72px_1fr]',
        )}
      >
        {content && fold === 'left' ? caret : null}
        <span className={cn(LABEL, 'whitespace-nowrap')}>{label}</span>
        <div className="flex min-w-0 items-center gap-1.5">{value}</div>
        {content && fold === 'right' ? caret : null}
      </div>
      {content && open ? <div>{content}</div> : null}
    </div>
  );
}
