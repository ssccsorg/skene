import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { Hint } from './ui/hint';
import { RowControl } from './ui/row-control';
import { LABEL, ROW, TITLE } from '../lib/chrome';
import { chargeOf } from '@ssccsorg/skene-kernel';
import { useAsks } from '../hooks/useAsks';
import { wordsOf } from '../lib/interface';
import { memberOf, partsOf } from '../lib/kinds';
import { lineOf, ownView } from '../lib/world';
import type { Entry, MediaView, Place, World } from '@ssccsorg/skene-kernel';
import { cn } from '../lib/utils';
import { Battery } from './Battery';
import { Glyph } from './Glyph';
import { MediaThumb } from './MediaThumb';

// The members the space stands, read whole: what each of them is, whether it is at work, where the place stands
// it, how much its own store holds, what it can be asked to do and which of the three it is.
//
// One list and not two. The people named with the space were a section of their own under this one, and the two
// were the same members read twice: a person is a member of the space as much as a machine is, and the difference
// between them is what a member is rather than which list it stands in. What tells them apart is the row's own
// word (`memberOf`), so a reader walks one list and learns the same three words wherever a member is named.
//
// The row is two lines and no more, because a space of thirty is walked rather than read: the record a unit
// wrote last is the panel's own subject when the unit is opened, and a row that repeated it would be a
// column of the same three words down the list.
//
// The picked member's row opens into what it holds. A member is read whole here, so the tree of its lower elements
// stands under the row it belongs to rather than in the record's own detail: what a member holds is the room's answer
// about a path, and a path is not a field of the record the member wrote. The space draws the same tree at the
// member's own place, from the same reading.
//
// The filter is a line of the panel rather than a field that is always there: the space is read by name
// and by kind, and a field that is open all the time is a field that takes a row from a list of thirty.
// What it matches is a unit's own words, its name and what it is, and every word typed has to match, so
// "camera 3" finds the third camera and "pump" finds the pumps.
//
// What a row says a member can be asked is the room's answer and not the place's declaration of it (`lib/interface`), so
// the row of controls under a picked member and the words the list is filtered by are one reading: a member the room
// answers nothing about is a member drawn with no control rather than one with three the room would refuse. That is why
// the panel asks the room about every member it lists, and not only about the one that is open: the filter is a picture of
// the whole space, and a filter half drawn is a list of members the pilot has to open one at a time to trust.

/**
 * How much of the column the list keeps whatever the projects above it ask for.
 *
 * It is the floor the projects may be dragged down to the whole of, and it is exported because the drag is clamped by
 * whoever holds the column: a floor written at one place and used at another is the drift this avoids.
 */
export const MEMBERS_MIN = 80;

const STATE = {
  working: 'animate-pulse bg-working',
  idle: 'bg-idle',
  offline: 'border-[1.5px] border-offline',
} as const;

/** Whether a unit answers to what has been typed: every word has to match one of the unit's own words. */
export function matches(unit: string, words: string[], query: string): boolean {
  const haystack = [unit, ...words].join(' ').toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export function EntityPanel({
  world,
  place,
  state,
  lastOf,
  pickedId,
  onPick,
}: {
  world: World;
  place: Place;
  state: Record<string, 'working' | 'idle' | 'offline'>;
  lastOf: Record<string, Entry | null>;
  pickedId: string | null;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [filtering, setFiltering] = useState(false);
  // A member the reader has folded shut stays shut while it is the pick: the toggle is about the detail under the row,
  // and folding it does not deselect the member the board and the console are still addressed to.
  const [folded, setFolded] = useState<string | null>(null);
  const { asks, ensure } = useAsks();

  // Every member the place stands, people included: the two lists were the same members and the difference between a
  // person and a machine is the row's own word rather than which list it stands in.
  const members = useMemo(() => world.standing, [world.standing]);

  // The room is asked about every member the list draws, and not only about the one that is open: the row says what each of
  // them can be asked, so a row drawn from what the open member happened to teach it would read the rest of the space as
  // members with nothing to offer.
  useEffect(() => {
    for (const unit of members) ensure(unit.id);
  }, [ensure, members]);

  const shown = useMemo(
    () => members.filter((unit) => matches(unit.id, wordsOf(unit, asks(unit.id)), query)),
    [asks, members, query],
  );

  const counts = useMemo(() => {
    const working = members.filter((unit) => state[unit.id] === 'working').length;
    const idle = members.filter((unit) => state[unit.id] === 'idle').length;
    return { working, idle, offline: members.length - working - idle };
  }, [members, state]);

  const kinds = useMemo(() => {
    const byIcon = new Map<string, { icon: string; total: number; working: number }>();
    for (const unit of members) {
      const icon = unit.icon ?? 'sensor';
      const row = byIcon.get(icon) ?? { icon, total: 0, working: 0 };
      row.total += 1;
      if (state[unit.id] === 'working') row.working += 1;
      byIcon.set(icon, row);
    }
    return [...byIcon.values()].sort(
      (left, right) => right.total - left.total || left.icon.localeCompare(right.icon),
    );
  }, [members, state]);

  return (
    <div data-region="members" className="flex min-h-0 flex-1 flex-col">
      <div className={cn(ROW, 'gap-2 border-b')}>
        <h2 className={LABEL}>Members</h2>
        <p className="ml-auto text-[11.5px] text-muted-foreground">
          <span className="text-working">{counts.working} working</span>
          {' \u00b7 '}
          <span className="text-idle">{counts.idle} idle</span>
          {' \u00b7 '}
          <span className="text-offline">{counts.offline} offline</span>
        </p>
        <Hint label={filtering ? 'close filter' : 'filter'}>
          <RowControl
            at="end"
            data-on={filtering}
            onClick={() => {
              setFiltering((open) => !open);
              if (filtering) setQuery('');
            }}
          >
            {filtering ? <X /> : <Search />}
          </RowControl>
        </Hint>
      </div>

      {filtering ? (
        <div className={cn(ROW, 'border-b')}>
          <input
            data-region="entity-filter"
            autoFocus
            value={query}
            spellCheck={false}
            placeholder="a name or a kind: camera, pump, person"
            className="w-full bg-transparent text-[11.5px] outline-none placeholder:text-muted-foreground/70"
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="shrink-0 text-[11.5px] text-muted-foreground tabular-nums">
            {shown.length}/{members.length}
          </span>
        </div>
      ) : null}

      {kinds.length > 1 ? (
        <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-0.5 border-b px-3 py-1 text-[11.5px] text-muted-foreground">
          {kinds.map((kind) => (
            <span
              key={kind.icon}
              className="flex items-center gap-1"
              title={`${kind.working} of the ${kind.total} ${kind.icon} units are working`}
            >
              <Glyph icon={kind.icon} className="size-3" />
              <span className="tabular-nums">
                <span className={kind.working ? 'text-working' : ''}>{kind.working}</span>/{kind.total}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      {/* The list is the column's own scroll area, so a space of thirty keeps the map and the projects
          above it where they are instead of pushing them off the panel. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col">
          {shown.map((unit) => {
          const last = lastOf[unit.id] ?? null;
          const [x, y] = unit.ground;
          // The member's own eye, when it carries one: the row says that this member is looking at something. A member
          // with two cameras stands the first of them here, and both are rows of its own panel.
          const eye = ownView(place, unit).views.find((view): view is MediaView => view.kind === 'media');
          // What the member says about itself beyond its kind, read from its own declaration.
          const charge = chargeOf(place, unit);
          return (
            <li key={unit.id}>
              <div className={cn('flex items-stretch', unit.id === pickedId ? 'bg-accent/60' : 'hover:bg-accent/40')}>
                <button
                  type="button"
                  title={`${unit.id}\n${last ? `${last.kind.toUpperCase()}: ${lineOf(last)}` : 'nothing yet'}`}
                  onClick={() => {
                    setFolded(null);
                    onPick(unit.id);
                  }}
                  className="flex min-w-0 flex-1 flex-col gap-y-0.5 px-3 py-1.5 text-left text-[11.5px] leading-snug"
                >
                <span className="flex flex-wrap items-center gap-x-2">
                  <span className={cn('size-2 shrink-0 rounded-full', STATE[state[unit.id] ?? 'offline'])} />
                  <Glyph
                    icon={unit.icon}
                    role={unit.role}
                    className={unit.id === pickedId ? 'text-claim' : 'text-muted-foreground'}
                  />
                  <span className={cn(TITLE, 'min-w-0 flex-1 truncate')}>{unit.id}</span>
                  {unit.title ? (
                    <span className="shrink-0 text-muted-foreground">{unit.title}</span>
                  ) : null}
                  <span
                    className="shrink-0 text-muted-foreground tabular-nums"
                    title="where the place stands it, in the place's own coordinates"
                  >
                    at {Math.round(x)}, {Math.round(y)}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-x-2 pl-[16px] text-muted-foreground">
                  {/* What the member is, which is the one word that tells a user from an agent from an entity: it is the
                      row's own reading of the same atoms the console asks, so a list of members and the addresses a line
                      may be said to cannot disagree about which is which. */}
                  <span className={cn(LABEL, 'text-[10px]')}>{memberOf(unit.properties)}</span>
                  <span>{unit.written ? `${unit.written} written` : 'empty'}</span>
                  {charge ? <Battery charge={charge} /> : null}
                </span>
              </button>
                {eye ? <MediaThumb id={eye.id} src={eye.src} className="mr-1" /> : null}
                <Hint label={unit.id === pickedId && folded !== unit.id ? 'fold' : 'open'}>
                  <button
                    type="button"
                    data-region="member-fold"
                    data-on={unit.id === pickedId && folded !== unit.id}
                    aria-expanded={unit.id === pickedId && folded !== unit.id}
                    onClick={() => {
                      if (unit.id === pickedId) {
                        setFolded(folded === unit.id ? null : unit.id);
                        return;
                      }
                      setFolded(null);
                      onPick(unit.id);
                    }}
                    className="flex w-6 shrink-0 items-center justify-center text-muted-foreground"
                  >
                    {unit.id === pickedId && folded !== unit.id ? (
                      <ChevronDown className="size-3" />
                    ) : (
                      <ChevronRight className="size-3" />
                    )}
                  </button>
                </Hint>
              </div>
              {/* What the member can be asked and what its kind is assembled from stand under the row, which is what
                  opening it means: a space of thirty is walked by name, and the abilities are the answer to a question
                  about one member rather than a column down every row. The row of controls is drawn once by the atom
                  that is the member's first direction (`components/Abilities`), so a member with two directions does
                  not draw the same chips twice. */}
              {unit.id === pickedId && folded !== unit.id ? (
                <div className="border-t border-border/60">
                  {partsOf(unit.properties).map(({ key, View }) => (
                    <View key={key} member={unit} place={place} />
                  ))}
                </div>
              ) : null}
            </li>
          );
          })}
        </ul>
      </div>
    </div>
  );
}
