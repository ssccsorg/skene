import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { Neighbour } from '@ssccsorg/skene-kernel';
import { lineOf } from '../lib/world';
import { LABEL, ROW } from '../lib/chrome';
import type { Entry } from '@ssccsorg/skene-kernel';
import { cn } from '../lib/utils';
import { KindTag } from './KindTag';

// The two directions a record runs in: what it came from, and what it led to. Every row is a jump, so
// the chain can be walked without leaving the view, and a record the frame has not reached yet says so
// rather than being hidden, because the run's shape is the record's and not the feed's.

export function CausalNeighbours({
  title,
  links,
  reached,
  empty,
  onPick,
}: {
  title: string;
  links: Neighbour[];
  reached: (record: Entry) => boolean;
  empty: string;
  onPick: (link: Neighbour) => void;
}) {
  return (
    <Card className="mx-3 mt-0 mb-3 gap-2 py-3">
      <CardHeader className="px-3">
        <CardTitle className={LABEL}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-1">
        {links.length === 0 ? (
          <p className="px-2 text-[11.5px] text-muted-foreground">{empty}</p>
        ) : (
          links.map((link, index) => {
            const arrives = reached(link.record);
            return (
              <button
                key={`${link.role}-${index}`}
                type="button"
                onClick={() => onPick(link)}
                className={cn(ROW, 'w-full gap-2 rounded-md text-left hover:bg-accent/40')}
              >
                <span className="w-[86px] shrink-0 text-muted-foreground">
                  {link.role}
                </span>
                <KindTag kind={link.record.kind} />
                <span className="min-w-0 flex-1 truncate">{lineOf(link.record)}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'shrink-0 rounded-full px-1.5 py-0 font-normal',
                    arrives ? 'border-claim text-claim' : 'text-muted-foreground',
                  )}
                >
                  {arrives ? 'reached' : 'ahead'}
                </Badge>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
