import { CircleOff, CirclePause, CirclePlay, type LucideIcon } from 'lucide-react';
import type { ProjectStatus } from './types';

/**
 * The one row of the chrome, and the two inks a thing is named in.
 *
 * A cockpit reads as one instrument when its rows are one size: the bar at the top, the header of every
 * panel, and the title line of every item are the same line, so the eye learns one height once and finds the
 * same reading wherever it lands. They were five heights and four sizes, which is what made a panel's title
 * and an item's title look like two kinds of thing rather than two places on one instrument.
 *
 * The row is the height, the arrangement, the inset and the type. The type is the row's because everything standing
 * on a row is the same size as the row: a span that named none of its own inherited the document's sixteen points,
 * which is a label half again the height of the row it stood on, and it did so silently. A row that says the size
 * is a row where a bare span is right by default rather than by everyone remembering.
 *
 * The inset is the standard too, because a line of rows that start at different distances from the frame's edge is a
 * column that is not a column: the mark in the bar, a panel's own name, and an item in a list are the same left
 * edge, and a label therefore carries no padding of its own. A control is that same edge measured to its ink: it
 * draws its own padding around a glyph, so at the edge the row gives it only what the padding has not, and the glyph
 * stands where the label does. The caller brings the surface and the rule it stands on: the bar is the sidebar's
 * colour and a panel's header is the card's, and neither is the standard.
 *
 * Emphasis is brightness and not weight. A title is the brightest ink on the row and a label is the muted one, and
 * the two are the same size, so what tells a name from its surroundings is how much light it is drawn in. Weight is a
 * difference the eye reads as a change of kind, and a name is not a different kind of thing from the row it sits on.
 *
 * This is the chrome around the space and not the space. What is drawn inside the board states its own sizes,
 * because a name over a moving surface is a legibility question and not a question of the frame: the names of
 * the space and the rows they are laid out on are `lib/labels.ts`, which is a different problem with a
 * different answer.
 */
/**
 * The row without its inset: the height, the arrangement and the type, which every row of the chrome shares.
 *
 * It is separate from `ROW` because exactly one row in the frame is not a panel's row. A single `ROW` carrying the inset
 * would put the bar's own padding on every panel and every item, and the frame would have one value where it has two:
 * the two are separate here so that neither can damage the other, which a shared constant is free to do silently.
 */
export const ROW_SHAPE = 'flex h-7 shrink-0 items-center gap-1.5 text-[11.5px]';

export const ROW = `${ROW_SHAPE} px-3`;

/**
 * The edge of a row, at every size a control stands on it.
 *
 * The row's inset is measured to the ink, and a control draws a surface around its glyph or its word, so at the edge the
 * row gives the control only the difference. The surface then sits at the least it can and the ink lands on the label's
 * vertical, which is what keeps a header one line rather than a line shifted at one end. Each value is the control's own
 * inset read back: `icon-xs` is a twenty-four point box around a twelve point glyph, `icon-sm` thirty-two around sixteen,
 * and a control of words pads two units. The two directions are separate because a control standing between two others
 * keeps its whole box.
 */
export const ROW_CONTROL_EDGE = {
  'icon-xs': { start: '-ml-1.5', end: '-mr-1.5' },
  'icon-sm': { start: '-ml-2', end: '-mr-2' },
  xs: { start: '-ml-2', end: '-mr-2' },
} as const;

export type RowControlSize = keyof typeof ROW_CONTROL_EDGE;

/**
 * The inset of the frame's own top bar, which is tighter than a panel's.
 *
 * The bar that names the project and carries every control about the frame is not a panel's row: its controls stand
 * against the edges of the columns beside it rather than against a panel's own padding, and the row itself is the same
 * height, arrangement and type as every other. It is taken with `ROW_SHAPE` and not with `ROW`, so the bar's inset is
 * the bar's and the panels' inset is the panels': one value overriding the other in a class list is a separation only
 * as long as whoever reads it knows which of the two wins.
 */
export const BAR_INSET = 'px-1';

/**
 * How close to the end of a stream still counts as at it, in pixels.
 *
 * A body that is being written grows while the reader watches it, and its box follows the end. A scroll position is a
 * float and a line is a few pixels, so the comparison is a slack rather than an equality: whoever is at the end is at
 * it, and whoever scrolled up is reading and stays where they are. The console and a reasoning block are the same rule,
 * because they are the same situation at two sizes.
 */
export const END_SLACK = 32;

/** The name of a thing on a row: small, spaced, and quiet, because it labels rather than speaks. */
export const LABEL = 'text-[11.5px] tracking-wide text-muted-foreground uppercase';

/** A thing named on a row, in the brightest ink the surface has, which is what standing out is here. */
export const TITLE = 'text-[11.5px] text-foreground';

/**
 * A control on a row, in its three states.
 *
 * It rests in the quiet ink, the pointer puts a surface under it, and it is drawn in the brightest ink when it is on,
 * which the element says by setting `data-on`. A control that is on is not a second kind of thing on the row: it is the
 * same control read brighter, the same difference this row already spends between a title and a label. A control that
 * filled itself with a colour when it was on would change kind at the moment it took effect, and a bar that did that
 * would carry two kinds of thing; what the surface belongs to instead is the pointer, which is a state the pilot is in
 * rather than a state the frame is in.
 *
 * The three are the theme's own tokens (`--control`, `--control-hover`, `--control-on`) and not the text tokens, so a
 * theme that restyles the frame's words leaves its controls alone, and one that wants its controls read another way
 * restyles three values. This is the single place the scheme is written: a control takes it by naming one class, which
 * is why no control in the frame decides its own ink.
 *
 * The surface under the pointer is stated twice, for `hover` and for `dark:hover`, because the frame is drawn dark and
 * the button it is built on carries a dark-mode surface of its own: the two are the same declaration and the second is
 * the one that stands under this document's own class, so a control that named only the first would hover in someone
 * else's colour.
 */
export const CONTROL =
  'text-control transition-colors hover:bg-control-hover hover:text-control-on data-[on=true]:text-control-on dark:hover:bg-control-hover';

/**
 * What a project is doing, as the mark and the word the chrome reads it in.
 *
 * The mark is the one the agent's own app puts before a working thread: filled and moving while the project is
 * running, solid while it is idle, hollow while it is offline. It is what the list that chooses a project draws, where
 * the state is the one reading the list exists to show.
 *
 * The glyph and the ink are the same state drawn on a bar that has no room for a word: the status bar reads the project
 * in force with a control's own size, and the two readings of a state have to be one reading. A state's ink is the same
 * colour as its mark, in the token a drawn thing takes, so a running project is the one green wherever it is named.
 *
 * The word is the label, and it is what a surface says on rollover rather than beside the mark: a bar of one line spends
 * it on the readings, and a reader who wants the word asks the thing they are looking at for it.
 *
 * It is written once because two surfaces read it: the list that chooses a project and the status bar, where the state of
 * the project in force belongs. Two copies of a mark would be two answers to what a running project looks like.
 */
export const PROJECT_STATE: Record<
  ProjectStatus,
  { mark: string; ink: string; word: string; Icon: LucideIcon }
> = {
  running: { mark: 'animate-pulse bg-working', ink: 'animate-pulse text-working', word: 'running', Icon: CirclePlay },
  idle: { mark: 'bg-idle', ink: 'text-idle', word: 'idle', Icon: CirclePause },
  offline: { mark: 'border-[1.5px] border-offline', ink: 'text-offline', word: 'offline', Icon: CircleOff },
};
