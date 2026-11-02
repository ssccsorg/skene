import { useCallback, useMemo, useRef, type HTMLAttributes, type KeyboardEvent, type PointerEvent } from 'react';
import { keyOf } from '../lib/address';
import { tracksOf, type RunBranch } from '../lib/tracks';
import { acrossOf, atOf, readingOf, shownIn } from '../lib/zoom';
import type { Entry, NodeKind } from '../lib/types';
import { cn } from '../lib/utils';

// The run as one axis: the track is what the transport in the panel's own row walks.
//
// The track is a tick for every record the feed has delivered in the colour of its kind, a divider
// where each scene starts, and a playhead where the frame stands. The record that is picked is marked as
// well, on the other side of the axis from the ticks, because a pick made in the space is a place in the
// run and the transport is where a run is read. Nothing plays by itself: the run rests on its newest
// record, the play button walks the cursor forward from wherever it stands, and Latest puts the cursor
// back on the newest and hands it to the feed again.
//
// A change a pilot saved is a branch, and a branch is drawn the way a graph of one is drawn: it leaves the
// run at the record it was taken from, runs below the run to the right, and ends in a tip named after the
// participants it changes. The track makes room for it, so the branch is never a line with nowhere to go.
// Clicking the lane takes the branch from that record, which is the one gesture the lane exists for; the
// track's own click is still a look at the run and nothing else.
//
// The same run can be read split by the entity that wrote it. That view is the run's own rows and not a
// second reading: every tick is at its record's place in the run, so the rows line up with the single
// track and the playhead crosses all of them. It is the view that answers which hand wrote what, which
// one line cannot.

const INK: Record<NodeKind, string> = {
  fact: 'bg-fact',
  intent: 'bg-intent',
  hint: 'bg-hint',
  claim: 'bg-claim',
};

const TICKS = 280;
/** How much of the track's width a branch reserves to the right of the run. */
const BRANCH_ROOM = 0.08;
/** How tall one row of the split view is. A writer's row is a row of the frame, so its label is set at the frame's
 * own type and the row is tall enough to hold it rather than the label being shrunk to fit the row. */
export const TRACK_ROW = 28;
/**
 * The depths the run is read at, from the whole of it to a window of a few records.
 *
 * A run of a thousand records drawn across a frame is a texture, and the question a pilot asks of it is where one thing
 * happened, which is a window rather than a whole. The steps are powers of two because that is what a reader can follow:
 * each press doubles the resolution around the cursor and the picture stays the same picture.
 */
export const ZOOMS = [1, 2, 4, 8, 16, 32];

export function Timeline({
  records,
  boundaries,
  shown,
  following,
  depth,
  picked,
  branch,
  branches,
  expanded,
  onSeek,
  onFollow,
  onBranch,
}: {
  records: Entry[];
  boundaries: { title: string; at: number }[];
  shown: number;
  following: boolean;
  /** How far into the run the window is read, as an index into `ZOOMS`. */
  depth: number;
  /** The record that is picked, by the reader's key, which the track marks as well as the playhead. */
  picked: string | null;
  /** The change the pilot saved, and the record it is taken from. */
  branch: { fork: number; units: string[] } | null;
  /** The project's runs, one branch each, drawn above the run the board is walking. */
  branches: RunBranch[];
  /** Whether the run is read as one line or as one row per writer. */
  expanded: boolean;
  onSeek: (shown: number) => void;
  /** Put the cursor back on the newest record and hand it to the feed again. */
  onFollow: () => void;
  /** Take the branch from a record rather than from the end of the run. */
  onBranch: (after: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const total = records.length;
  // A branch runs past the end of the run, so the track keeps a fraction of itself for it: without the
  // room, a branch taken from the newest record is a fork at the edge with nowhere to run.
  const span = Math.max(total + (branch ? Math.max(4, Math.round(total * BRANCH_ROOM)) : 0), 1);
  // The window the run is read through. It is the whole run until the pilot asks for less of it, and it is
  // kept around the cursor, so walking the run at any depth keeps the record being read in the middle.
  const zoom = ZOOMS[Math.min(depth, ZOOMS.length - 1)];
  const reading = readingOf(shown, span, zoom);
  const { start, view } = reading;
  /** Where a place in the run stands in the window, as the percentage the track's own children are drawn at. */
  const left = (at: number) => acrossOf(at, reading);
  const within = (at: number) => shownIn(at, reading);
  const playhead = left(shown);
  const pickedAt = picked ? records.findIndex((entry) => keyOf(entry) === picked) : -1;

  const ticks = useMemo(() => {
    const step = Math.max(1, Math.ceil(view / TICKS));
    const out: { left: number; kind: NodeKind }[] = [];
    const from = Math.max(0, Math.floor(start));
    for (let index = from; index < Math.min(total, start + view); index += step) {
      out.push({ left: acrossOf(index, reading), kind: records[index].kind });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, total, start, view]);

  // The run's rows. They are all of it and not only what the cursor has reached, for the same reason the single track
  // is: the transport is where the run is read, and the playhead is what says how much of it has happened.
  const tracks = useMemo(() => tracksOf(records), [records]);

  const seekFromPointer = useCallback(
    (clientX: number) => {
      const box = track.current?.getBoundingClientRect();
      if (!box || box.width === 0) return;
      const fraction = Math.min(Math.max((clientX - box.left) / box.width, 0), 1);
      onSeek(Math.round(atOf(fraction * 100, reading)));
    },
    [onSeek, reading],
  );

  const slider = {
    role: 'slider',
    tabIndex: 0,
    'aria-label': 'the record, as a run',
    'aria-valuemin': 0,
    'aria-valuemax': total,
    'aria-valuenow': shown,
    className:
      'relative min-h-4 flex-1 cursor-pointer rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      seekFromPointer(event.clientX);
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) seekFromPointer(event.clientX);
    },
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onSeek(shown - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onSeek(shown + 1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        onSeek(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        onFollow();
      }
    },
  } satisfies HTMLAttributes<HTMLDivElement>;

  const seams = boundaries.map((boundary) =>
    within(boundary.at) ? (
      <span
        key={boundary.title}
        title={boundary.title}
        className="absolute inset-y-0 w-px bg-foreground/50"
        style={{ left: `${left(boundary.at)}%` }}
      />
    ) : null,
  );

  return (
    <div data-region="timeline" className="flex min-h-0 flex-1 flex-col gap-0.5 px-3 py-0.5">
      {/* The project's runs as a branch strip: one line per campaign in its own colour, each drawn over its own length,
          so two runs of different sizes are two branches of one picture. The open run is the bright one, and it is also
          the track below. The strip is the project and not the axis: it keeps every run whole at any depth, which is what
          says where in the project the window the track is reading stands. */}
      {branches.length > 1 ? (
        <div data-region="campaigns" className="flex flex-col gap-px">
          {branches.map((each) => (
            <div
              key={each.id}
              data-branch={each.id}
              data-active={each.active}
              title={`${each.title}${each.active ? ', open' : ''}`}
              className="relative h-1"
            >
              <span
                className="absolute left-0 top-1/2 h-px -translate-y-1/2"
                style={{
                  right: `${(1 - (each.marks[each.marks.length - 1] ?? 0)) * 100}%`,
                  background: each.ink,
                  opacity: each.active ? 1 : 0.5,
                }}
              />
              {each.marks.map((mark, at) => (
                <span
                  key={at}
                  className="absolute top-1/2 size-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ left: `${mark * 100}%`, background: each.ink, opacity: each.active ? 1 : 0.6 }}
                />
              ))}
            </div>
          ))}
        </div>
      ) : null}
      {expanded ? (
        <div className="flex min-h-0 flex-1 gap-2 overflow-y-auto">
          <div className="flex w-24 shrink-0 flex-col">
            {tracks.map((each) => (
              <span
                key={each.id}
                title={`${each.id}: ${each.ticks.length} records`}
                style={{ height: TRACK_ROW }}
                className="flex shrink-0 items-center justify-end truncate text-[11.5px] text-muted-foreground"
              >
                {each.id}
              </span>
            ))}
          </div>
          <div ref={track} {...slider}>
            <div className="flex flex-col">
              {tracks.map((each) => (
                <div
                  key={each.id}
                  style={{ height: TRACK_ROW }}
                  className="relative shrink-0 border-t border-border/40"
                >
                  {each.ticks.map((tick) => {
                    if (!within(tick.at)) return null;
                    const entry = records[tick.at];
                    return (
                      <span
                        key={tick.at}
                        title={`${entry.kind}${entry.origin ? ` ${entry.origin}` : ''} at ${entry.at}s`}
                        className={cn(
                          'absolute top-1/2 h-[55%] w-px -translate-y-1/2',
                          INK[tick.kind],
                        )}
                        style={{ left: `${left(tick.at)}%` }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            {seams}
            {pickedAt >= 0 && within(pickedAt) ? (
              <span
                title="the record that is picked"
                className="absolute inset-y-0 w-px bg-foreground/60"
                style={{ left: `${left(pickedAt)}%` }}
              />
            ) : null}
            <span
              className={cn('absolute inset-y-0 w-[2px]', following ? 'bg-claim' : 'bg-foreground')}
              style={{ left: `${playhead}%` }}
            />
          </div>
        </div>
      ) : (
        <div ref={track} {...slider}>
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
          {pickedAt >= 0 && within(pickedAt) ? (
            <span
              title="the record that is picked"
              className="absolute top-1/2 h-[42%] w-[2px] -translate-x-1/2 bg-foreground"
              style={{ left: `${left(pickedAt)}%` }}
            />
          ) : null}
          {ticks.map((tick, index) => (
            <span
              key={index}
              className={cn('absolute bottom-1/2 h-[42%] w-px', INK[tick.kind])}
              style={{ left: `${tick.left}%` }}
            />
          ))}
          {seams}
          <span
            className={cn('absolute inset-y-0 w-[2px]', following ? 'bg-claim' : 'bg-foreground')}
            style={{ left: `${playhead}%` }}
          />
        </div>
      )}

      {/* The branch: it leaves the run where it was taken, runs below it, and ends in a tip named after
          the participants it changes. The lane is the one control it has, and taking the branch somewhere
          else is the only thing clicking it does. */}
      {branch ? (
        <div
          data-region="branch"
          title="click to take the branch from this record"
          className="relative h-5 cursor-pointer"
          onPointerDown={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            if (box.width === 0) return;
            const fraction = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1);
            onBranch(Math.round(atOf(fraction * 100, reading)));
          }}
        >
          <span
            className="absolute top-0 h-2 w-px -translate-x-1/2 bg-claim"
            style={{ left: `${Math.min(Math.max(left(branch.fork), 0), 100)}%` }}
          />
          <span
            className="absolute top-2 h-px bg-claim"
            style={{ left: `${Math.min(Math.max(left(branch.fork), 0), 100)}%`, right: 0 }}
          />
          <span className="absolute top-[3px] right-0 size-1.5 -translate-y-1/2 rounded-full bg-claim" />
          <span className="absolute right-0 top-3 max-w-[70%] truncate text-[11.5px] text-claim">
            {branch.units.slice(0, 3).join(', ')}
            {branch.units.length > 3 ? ` +${branch.units.length - 3}` : ''}
          </span>
        </div>
      ) : null}
    </div>
  );
}
