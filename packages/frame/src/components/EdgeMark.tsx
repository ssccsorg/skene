import type { ReactNode } from 'react';
import { MARK, roomOf } from '../lib/views';
import { cn } from '../lib/utils';

// What a thing the frame does not hold is read by: a small round control carrying its own glyph, and the whole of its
// label on the side of it the frame has room for.
//
// It is one object for a unit and for a window, because it is one reading: a mark the pilot has turned away from is
// somewhere in the room, where its icon stands on the edge is which way to turn, and its glyph is what is there. The
// name is one hover away rather than written beside every one of them, which is what lets eighteen of them stand along
// one edge without becoming a column of names: the space is read by its shape, and a name is asked for.
//
// The label is inside the control's own element, so moving the pointer onto the label keeps it open and whatever the
// label carries can be pressed: a label that closed the moment the pointer left the glyph would be a label nothing can
// be done from. For the same reason the label's own box starts at the glyph's edge and its padding is the bridge, since
// a gap between the two would be a gap the pointer falls through.
//
// A thing at work says so on its own icon, because an icon is all the pilot has of it: the whole of the mark takes the
// colour of the work and blinks, which is a reading the pilot catches without looking at it. Who knows it is the caller,
// which for a window is the picture itself reporting whether its own medium is running; a mark passed nothing is quiet.
// The work's colour is the one reading that beats the thing's own ink, because what a thing is doing is this minute's and
// its own colour is its last record's: the two are written on one property, so the inline ink steps aside while it runs.
//
// A mark is sometimes the only part of its own thing there is to take hold of, which is when the caller hands in a grip:
// the icon then carries the drag the thing itself would have taken, because a thing the frame does not hold has nothing
// else on the board to be dragged by. The two are one gesture, as they are on a thing the frame does hold: a press that
// travelled is the thing being moved, and one that did not is the thing's own action, which the caller reads on the same
// click and guards the same way. The grip is on the glyph and not on the whole control, because the glyph is what the
// thing is: a drag taken from the label would be a drag taken from a thing the pilot is reading.
// click and guards the same way. The grip is on the glyph and not on the whole control, because the glyph is what the
// thing is: a drag taken from the label would be a drag taken from a thing the pilot is reading.

/** Where the label stands, from the side of the control the frame has room for. */
const SIDES = {
  right: 'top-1/2 left-full -translate-y-1/2 pl-1',
  left: 'top-1/2 right-full -translate-y-1/2 pr-1',
  bottom: 'top-full left-1/2 -translate-x-1/2 pt-1',
  top: 'bottom-full left-1/2 -translate-x-1/2 pb-1',
} as const;

export function EdgeMark({
  at,
  size,
  label,
  glyph,
  tint,
  ringed,
  running,
  detail,
  onPick,
  onGrip,
  children,
}: {
  /** Where the control stands on the frame, which is the point its own middle is on. */
  at: [number, number];
  /** The frame's own size, which is what says which side of the control has room for its label. */
  size: [number, number];
  /** What the control says when the pilot asks: the name of the thing it stands for. */
  label: string;
  /** What the thing is, drawn rather than typed, so the frame's edge and the space read alike. */
  glyph: ReactNode;
  /**
   * The ink of the thing's own last record, which is the ink its mark in the space is drawn in.
   *
   * It is absent for a thing that has nothing to say, and then the glyph and the name are the control's own ink: a
   * mark is a control, and a control drawn in the ink the space draws a bare point in is one the pilot cannot find.
   */
  tint?: string;
  /** Whether the thing is the one picked, which is what the frame's own ring says. */
  ringed?: boolean;
  /** Whether the thing is at work, which its own icon wears as the colour of the work, blinking. */
  running?: boolean;
  /** What the thing did last, on the label of the one the pilot asked about. */
  detail?: string;
  /** Put the thing back in front of the pilot, which is what pressing a thing they cannot see does. */
  onPick: () => void;
  /**
   * The press that opens a drag of the thing the mark stands for, for a thing that has nothing else on the board to be
   * dragged by.
   *
   * It is handed in rather than made here for the same reason `ViewHandle`'s is: the mark, and the thing it stands for,
   * are handles on one thing and the layer above owns the one gesture that moves it, which it advances from the page. A
   * mark without one is a control that is only pressed.
   */
  onGrip?: (event: React.PointerEvent<HTMLElement>) => void;
  /** What the label carries beyond the name, for a thing that has controls of its own. */
  children?: ReactNode;
}) {
  return (
    <div
      data-mark={label}
      className="group pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: at[0], top: at[1] }}
    >
      <button
        type="button"
        aria-label={label}
        onClick={onPick}
        className={cn(
          'relative flex cursor-pointer items-center justify-center rounded-full border bg-card/90 text-muted-foreground shadow-sm',
          // The work's own colour and a blink, on the mark itself rather than on a dot beside it: the mark is small and a
          // second thing beside it is a second thing to read, where the whole of it taking the colour is one reading.
          running
            ? 'animate-pulse border-working text-working'
            : ringed
              ? 'border-claim'
              : 'border-border/70',
          onGrip && 'touch-none cursor-grab active:cursor-grabbing',
        )}
        style={{ width: MARK, height: MARK, color: running ? undefined : tint }}
        onPointerDown={onGrip}
      >
        {glyph}
      </button>
      <span className={cn('absolute z-20 hidden group-hover:flex group-focus-within:flex', SIDES[roomOf(at, size)])}>
        <span
          className={cn(
            'flex items-center gap-1 rounded-sm border bg-card/95 px-2 py-0.5 text-[13.5px] whitespace-nowrap',
            ringed ? 'border-claim text-claim' : 'border-border text-foreground/90',
          )}
        >
          {glyph}
          <span className="font-medium" style={tint ? { color: tint } : undefined}>
            {label}
          </span>
          {detail ? <span className="text-muted-foreground">{detail}</span> : null}
          {children}
        </span>
      </span>
    </div>
  );
}
