import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowDownUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Hint } from '../components/ui/hint';
import { RowControl } from '../components/ui/row-control';
import { RecordTable } from '../components/RecordTable';
import { keyOf } from '@ssccsorg/skene-kernel';
import { CONTROL, ROW } from '../lib/chrome';
import { registerReading } from '../lib/readings';
import type { Entry } from '@ssccsorg/skene-kernel';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useVolume } from '../hooks/useVolume';
import { useSelection } from '../stores/selection';

/**
 * The account, a page at a time.
 *
 * A run is longer than a frame, and reading the whole of it used to mean scrolling a table that grew with the run.
 * A page is a bound on what is drawn and a number that says where in the run the reader is, and the number is a field
 * rather than a label because the reader who knows which record they want should be able to say so.
 *
 * The arrows move a page at a time in the reading in force and the flip chooses the reading, which is what the two
 * words they replace were: a reader who wants the run as it was written and one who wants it from its end are not
 * choosing a different account, and neither of them should have to scroll to the other end of it.
 *
 * One control of the row is a text field, so the row is a row of the chrome like any other and the field is drawn at
 * the size of the row it stands on. A page nobody can type into is a page a reader has to walk to.
 *
 * The number it counts is the same number the rail's own list and the summary beside the space count, down to
 * `world.entries`: one run, one count, so a reader comparing two panels is never comparing two questions.
 */
const PAGE = 16;

export function RecordsView() {
  const received = useVolume().received;
  const shown = useVolume().shown;
  const selected = useSelection((state) => state.selected);
  const select = useSelection((state) => state.select);
  const order = useSelection((state) => state.order);
  const setOrder = useSelection((state) => state.setOrder);
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState('1');

  const ordered = useMemo(() => {
    const read = received.slice(0, shown);
    return order === 'newest' ? [...read].reverse() : read;
  }, [received, shown, order]);

  const pages = Math.max(1, Math.ceil(ordered.length / PAGE));
  const at = Math.min(Math.max(page, 1), pages);
  const from = (at - 1) * PAGE;
  const rows = ordered.slice(from, from + PAGE);

  const jump = (value: number) => {
    // A field is not a guarantee: anything that is not a page is the first one, and a page past the end is the last.
    const to = Math.min(Math.max(Math.trunc(value) || 1, 1), pages);
    setPage(to);
    setDraft(String(to));
  };

  const pick = (entry: Entry) => {
    select(entry);
    navigate('/act');
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className={cn(ROW, 'gap-2 border-b')}>
        <span className="min-w-0 truncate text-muted-foreground">
          {ordered.length ? `${from + 1}–${from + rows.length} of ${ordered.length}` : 'nothing yet'}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <Hint label="order">
            <Button
              size="icon-xs"
              variant="ghost"
              className={cn(CONTROL)}
              onClick={() => setOrder(order === 'newest' ? 'oldest' : 'newest')}
            >
              <ArrowDownUp />
            </Button>
          </Hint>
          <Hint label="back">
            <Button
              size="icon-xs"
              variant="ghost"
              className={cn(CONTROL)}
              disabled={at <= 1}
              onClick={() => jump(at - 1)}
            >
              <ChevronLeft />
            </Button>
          </Hint>
          <span className="flex items-center gap-1" title="the page, or a page to jump to">
            <input
              data-region="records-page"
              value={draft}
              inputMode="numeric"
              spellCheck={false}
              aria-label="page"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') jump(Number(draft));
                if (event.key === 'Escape') setDraft(String(at));
              }}
              onBlur={() => jump(Number(draft))}
              className="w-7 rounded-sm border bg-transparent px-1 py-0 text-center font-mono tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <span className="tabular-nums text-muted-foreground">/ {pages}</span>
          </span>
          <Hint label="forward">
            <RowControl at="end" disabled={at >= pages} onClick={() => jump(at + 1)}>
              <ChevronRight />
            </RowControl>
          </Hint>
        </span>
      </div>
      <RecordTable
        events={rows}
        picked={selected ? keyOf(selected) : null}
        onPick={pick}
      />
    </div>
  );
}

/** The account's reading, held by name because the rail's own half speaks to it. It declares no button for the reason the
 * queue's does: the whole account is the rail's own subject at another size, so its way in stands on the row that names it. */
export const RECORDS = registerReading({
  key: 'records',
  path: '/records',
  View: RecordsView,
});
