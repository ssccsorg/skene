import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { keyOf } from '../lib/address';
import { ROW } from '../lib/chrome';
import { lineOf, whoOf } from '../lib/world';
import type { Entry } from '../lib/types';
import { cn } from '../lib/utils';
import { KindTag } from './KindTag';

/**
 * The record as it arrives, newest last. It is the feed and not a list: a row appears when its record
 * does, and the view is put at the end on the frame after the rows are laid out, because a screenshot of
 * this screen must not leave the newest record below the fold.
 *
 * A row is a row of the panel and not a card in it: it runs the panel's whole width, edge to edge, and it
 * carries no rounding of its own, so the feed reads as the panel's own body rather than as a stack of
 * chips floating inside it.
 *
 * The row that is picked is the one whose key is picked and not the one that is the same object, because a
 * record is rebuilt from the wire and the file both and the pick has to survive the frame. That row is the
 * one place the picked thing is opened: it draws the detail the caller hands it, under its own line, so
 * the record and its envelope are one row rather than two places on the screen.
 *
 * A pick made anywhere in the interface is a row in this feed, so a pick brings its row into view: a detail
 * opened below the fold is a detail nobody reads.
 */
export function EventStream({
  events,
  picked,
  onPick,
  detail,
  className,
}: {
  events: Entry[];
  picked: string | null;
  onPick: (entry: Entry) => void;
  /** What the picked row opens under itself, or nothing while the row is not the picked one. */
  detail?: (entry: Entry) => ReactNode;
  className?: string;
}) {
  const end = useRef<HTMLDivElement>(null);
  const opened = useRef<HTMLLIElement>(null);
  // A record the reader has folded shut stays shut while it is the pick, so the toggle is a reading of the row and not
  // a second pick: the row keeps its selection and the detail under it is what goes away.
  const [folded, setFolded] = useState<string | null>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [events.length]);

  useEffect(() => {
    if (!picked) return;
    opened.current?.scrollIntoView({ block: 'nearest' });
  }, [picked]);

  return (
    <ScrollArea data-region="stream" className={cn('min-h-0', className)}>
      <ul className="flex flex-col">
        {events.map((event, index) => {
          const key = keyOf(event);
          const isPicked = picked === key;
          const open = isPicked && folded !== key;
          return (
            <li key={index} ref={isPicked ? opened : undefined}>
              <div className={cn('flex items-stretch', isPicked && 'bg-accent/60')}>
                <button
                  type="button"
                  onClick={() => {
                    setFolded(null);
                    onPick(event);
                  }}
                  className={cn(ROW, 'min-w-0 flex-1 gap-2 text-left', 'hover:bg-accent/40')}
                >
                  <KindTag kind={event.kind} />
                  <span className="w-[130px] shrink-0 truncate">{whoOf(event)}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{lineOf(event)}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">{event.at}s</span>
                </button>
                {detail ? (
                  <button
                    type="button"
                    data-region="record-fold"
                    data-on={open}
                    aria-expanded={open}
                    title={open ? 'fold this record' : 'open this record'}
                    onClick={() => {
                      if (isPicked) {
                        setFolded(open ? key : null);
                        return;
                      }
                      setFolded(null);
                      onPick(event);
                    }}
                    className="flex w-6 shrink-0 items-center justify-center text-muted-foreground hover:bg-accent/40"
                  >
                    {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                  </button>
                ) : null}
              </div>
              {open && detail ? detail(event) : null}
            </li>
          );
        })}
      </ul>
      <div ref={end} />
    </ScrollArea>
  );
}
