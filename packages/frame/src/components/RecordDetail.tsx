import { useState } from 'react';
import { Info } from 'lucide-react';
import { Hint } from '@ssccsorg/skene-ui';
import { RowControl } from '@ssccsorg/skene-ui';
import { InspectorPanel } from './InspectorPanel';
import type { Place, Standing } from '@ssccsorg/skene-kernel';
import { useSelection } from '../stores/selection';
import { EntityDetail } from './EntityDetail';
import { LABEL, ROW, TITLE } from '@ssccsorg/skene-ui';
import { cn } from '@ssccsorg/skene-ui';

// What is picked, opened where it was picked: the row of the feed the pick landed on opens and the detail
// stands in its own place in the list.
//
// It was a panel of the column on the right, under the space, and the same record was in two places at
// once: the row in the feed that holds it and a panel somewhere else. One record, one place, and the place
// is the row it belongs to.
//
// A participant opens its own fields, which are what a pilot changes, and the record it stands for under them; a
// record opens the envelope the format gives it. The pick is one pick, so the detail cannot show two different things.
//
// What a participant holds is not here. Lower elements are the room's answer about a path rather than fields of the
// member, and they are read where a member is read whole: the Members panel walks them and the space draws them.
//
// How to read it is behind the mark beside its name rather than written under it: a paragraph in the
// detail is a paragraph that takes the room from what it is describing, and a reader needs it once.
//
// What is not here is a way out. A mark that opened the act reading stood beside the name, and the whole of a run read
// from outside the column is the column's own reading rather than this record's: the press belongs on the row that names
// the reading, which is where it stands now, and a detail drawn inside a row of the feed is about that record alone.

const HOW_TO = [
  'Pick a participant in the space, on the map or in the list, or a record in the feed. The row that holds the pick opens here.',
  'A participant opens its own fields: where the place stands it, and what it can be asked to do. Saving them is a change, and a change is applied from the record the branch is taken at.',
  'A record opens the envelope the format gives it: its kind, its origin, what it came from and what it led to.',
];

export function RecordDetail({
  unit,
  place,
  fork,
  shown,
}: {
  /** The participant the pick landed on, as the world stands it, or null while nothing is picked. */
  unit: Standing | null;
  place: Place;
  fork: number | null;
  shown: number;
}) {
  const selected = useSelection((state) => state.selected);
  const [open, setOpen] = useState(false);

  const heading = selected?.label ?? selected?.origin ?? unit?.id ?? null;

  return (
    <div data-region="record-detail" className="relative flex flex-col bg-card/40">
      <div className={cn(ROW, 'gap-2 border-b')}>
        <span className={LABEL}>Record</span>
        <span className={cn(TITLE, 'min-w-0 flex-1 truncate')}>
          {heading ?? 'nothing is picked'}
        </span>
        <Hint label="help">
          <RowControl data-on={open} onClick={() => setOpen((was) => !was)}>
            <Info />
          </RowControl>
        </Hint>
      </div>

      {open ? (
        <div
          data-region="record-help"
          className="absolute top-8 right-2 z-10 flex max-w-[320px] flex-col gap-1.5 rounded-md border bg-popover p-2.5 text-[11.5px] text-popover-foreground shadow-md"
        >
          {HOW_TO.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}

      {/* The detail takes the width of the list it stands in and no border of its own, because it is the
          body of the row and not a card floating in it. */}
      <div className="flex min-w-0 flex-col">
        {unit ? (
          <EntityDetail key={unit.id} unit={unit} place={place} fork={fork} shown={shown} />
        ) : null}
        <InspectorPanel selected={selected} />
      </div>
    </div>
  );
}
