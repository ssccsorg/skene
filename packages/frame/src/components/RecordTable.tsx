import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { keyOf } from '@ssccsorg/skene-kernel';
import { LABEL } from '../lib/chrome';
import { lineOf, whoOf } from '../lib/world';
import type { Entry } from '@ssccsorg/skene-kernel';
import { cn } from '../lib/utils';
import { KindTag } from './KindTag';

/**
 * The records it is handed, as a table.
 *
 * It draws the page and not the run: which records and in what order is the reader's question and the page above
 * answers it, so the table has one job and cannot disagree with the count beside it about how many rows there are.
 *
 * Its columns are labelled the way every other label in the frame is, and the writer of a record is the brightest ink
 * on its row while what it said is the quiet one, which is the same reading a row in the rail gives.
 */
export function RecordTable({
  events,
  picked,
  onPick,
}: {
  events: Entry[];
  picked: string | null;
  onPick: (entry: Entry) => void;
}) {
  return (
    <div data-region="records" className="min-h-0 flex-1 overflow-auto py-3">
      <Table className="text-[11.5px]">
        <TableHeader>
          <TableRow>
            <TableHead className={cn(LABEL, 'h-7 w-24 px-3')}>kind</TableHead>
            <TableHead className={cn(LABEL, 'h-7 w-48 px-3')}>entity</TableHead>
            <TableHead className={cn(LABEL, 'h-7 px-3')}>what</TableHead>
            <TableHead className={cn(LABEL, 'h-7 w-24 px-3 text-right')}>at</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event, index) => (
            <TableRow
              // The index leads, so that a key ending in a digit and the index cannot run together
              // into the key of another row: it did, and a row was drawn eleven times.
              key={`${index}:${keyOf(event)}`}
              onClick={() => onPick(event)}
              className={cn('h-7 cursor-pointer', picked === keyOf(event) && 'bg-accent/60')}
            >
              <TableCell className="px-3 py-0">
                <KindTag kind={event.kind} />
              </TableCell>
              <TableCell className="max-w-0 truncate px-3 py-0">{whoOf(event)}</TableCell>
              <TableCell className="truncate px-3 py-0 text-muted-foreground">{lineOf(event)}</TableCell>
              <TableCell className="px-3 py-0 text-right tabular-nums">{event.at}s</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
