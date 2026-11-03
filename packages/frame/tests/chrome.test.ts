// The one row, and the type on it.
//
// A control is drawn at the size of the row it stands on, and so is every label and every value: this holds the
// standard to one size and the row to stating it, which is the half that is easy to lose. A row that left the size to
// the document drew a bare span at sixteen points, half again the height of the row, and it did so silently because
// nothing in the markup was wrong.
//
// The control's three states are here for the same reason: which ink a control rests in, what the pointer puts under
// it, and how it reads when it is on are one decision about every control in the frame, and a control that decided its
// own would be a control that disagreed with the one beside it.
//
// The inset is the third standard. It is measured to the ink, so a control that pads itself takes off exactly its own
// padding at the row's edge and the glyph lands on the label's vertical. The sum is held here because it is the whole
// geometry: change the control's size and the row's edge has to change with it, or the header reads as shifted.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

import { BOARD_NAME, buttonVariants } from '@ssccsorg/skene-ui';
import {
  CONTROL,
  LABEL,
  PROJECT_STATE,
  ROW,
  ROW_CONTROL_EDGE,
  TITLE,
  type RowControlSize,
} from '@ssccsorg/skene-ui';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const source = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

/** The size a class string states, in points. */
const sizeOf = (classes: string): string | null => classes.match(/text-\[([^\]]+)\]/)?.[1] ?? null;

/** A spacing unit in points, which is four points a unit. */
const points = (unit: string | undefined): number => Number(unit) * 4;

/** What a single negative margin takes off one side, in points. */
const takes = (classes: string, side: 'l' | 'r'): number => {
  const unit = classes.match(new RegExp(`-m${side}-([0-9.]+)`))?.[1];
  return unit === undefined ? 0 : points(unit);
};

/** The inset a control states for itself, read from the size it is built at. */
const paddingOf = (size: RowControlSize): number => {
  const classes = buttonVariants({ size });
  if (!size.startsWith('icon')) return points(classes.match(/(?:^|\s)px-([0-9.]+)/)?.[1]);
  const box = points(classes.match(/(?:^|\s)size-([0-9.]+)\b/)?.[1]);
  const glyphs = [...classes.matchAll(/:size-([0-9.]+)/g)];
  return (box - points(glyphs[glyphs.length - 1]?.[1])) / 2;
};

test('the row states the standard size, so a bare span on it is the standard', () => {
  expect(sizeOf(ROW), 'the row names a size').not.toBeNull();
});

test('a label and a title are the size the row is', () => {
  expect(sizeOf(LABEL)).toBe(sizeOf(ROW));
  expect(sizeOf(TITLE)).toBe(sizeOf(ROW));
});

test('a title stands out by ink and not by weight', () => {
  expect(TITLE, 'a title is the bright ink').toContain('text-foreground');
  expect(TITLE, 'and it is not bold').not.toMatch(/font-(bold|semibold|medium)/);
  expect(LABEL, 'a label is the muted ink').toContain('text-muted-foreground');
  expect(LABEL, 'and it is not bold').not.toMatch(/font-(bold|semibold|medium)/);
});

test('the space states its name type once, so a held element is the same type as its member', () => {
  // A folder's own rows are member items too, and they used to be drawn smaller than the member they belong to: the
  // depth of a name is where it stands, and what it is is the kind's own ink. The size is stated once and both the
  // member label and the held tree take it, so a level cannot drift into a type of its own.
  expect(sizeOf(BOARD_NAME), 'a name states its size').not.toBeNull();
  expect(sizeOf(BOARD_NAME), "and it is the frame's own size, so a name on the space is a name in the rail").toBe(
    sizeOf(ROW),
  );
  expect(BOARD_NAME, 'a name stands out by ink and not by weight').not.toMatch(/font-(bold|semibold|medium)/);
});

test('the row is one line high, which is what a row of the chrome is', () => {
  expect(ROW, 'the height is stated').toMatch(/\bh-\d/);
  expect(ROW, 'and it is a flex row').toContain('flex');
});

test('a label and a control stand on one inset, at every size a row carries', () => {
  // The row's inset is measured to the ink. A control draws its own padding, so at the edge the row takes off exactly
  // that: the ink lands where the label does and the surface keeps the least margin it can. The control's padding is
  // read from the button it is built on, so the two cannot drift apart when either size changes.
  const inset = points(ROW.match(/\bpx-([0-9.]+)/)?.[1]);

  for (const [size, edge] of Object.entries(ROW_CONTROL_EDGE)) {
    const padding = paddingOf(size as RowControlSize);
    expect(padding, `${size} pads itself`).toBeGreaterThan(0);
    expect(takes(edge.start, 'l'), `${size} takes back its own padding`).toBe(padding);
    expect(takes(edge.end, 'r'), `${size} takes back the same on the other end`).toBe(padding);
    expect(takes(edge.start, 'r'), `${size} between two others keeps its whole box`).toBe(0);
    expect(takes(edge.end, 'l')).toBe(0);
    expect(takes(edge.end, 'r'), `${size} keeps its surface inside the row`).toBeLessThan(inset);
  }
});

test('a control at the edge of a row takes its edge from the frame and not from a margin of its own', () => {
  // The kit's own half of this is held where the kit is, because the control is a package now. What is here is every row
  // that places one, which is the frame's side of the same answer.
  const rows = [
    'src/components/Header.tsx',
    'src/components/SpacePanel.tsx',
    'src/components/panels/Intents.tsx',
    'src/components/panels/TimelinePane.tsx',
    'src/components/RecordDetail.tsx',
    'src/components/EntityPanel.tsx',
    'src/views/RecordsView.tsx',
  ];
  for (const path of rows) {
    const text = source(path);
    expect(text, `${path} places its control through the frame`).toMatch(/RowControl|ROW_CONTROL_EDGE/);
    expect(text, `${path} carries no margin of its own`).not.toMatch(/-m[lr]-[0-9.]+/);
  }
});

test('a control rests quiet, takes a surface under the pointer, and is drawn brightest when it is on', () => {
  expect(CONTROL, 'it rests in the quiet ink').toContain('text-control');
  expect(CONTROL, 'the pointer puts a surface under it').toContain('hover:bg-control-hover');
  expect(CONTROL, 'and it is the brightest ink when it is on').toContain('data-[on=true]:text-control-on');
  expect(CONTROL, 'on is an ink and not a fill').not.toMatch(/data-\[on=true\]:bg-/);
});

test('the control scheme is the theme tokens, so a theme restyles the frame without touching a control', () => {
  expect(CONTROL, 'no state is a text token').not.toMatch(/\btext-(foreground|muted-foreground)\b/);
  expect(CONTROL, 'no state is a surface token but the pointer`s').not.toMatch(/\bhover:bg-(accent|secondary)\b/);
});

test('a project state is a mark, a glyph and a word, and the three are told apart', () => {
  const states = Object.values(PROJECT_STATE);
  expect(states, 'every state a project declares is drawn').toHaveLength(3);
  expect(new Set(states.map((state) => state.word)).size, 'each has its own word').toBe(3);
  expect(new Set(states.map((state) => state.mark)).size, 'each has its own mark').toBe(3);
  // The status bar reads a state as a glyph in the state's own ink, where the list reads it as a mark: the two surfaces
  // draw one reading, so the table carries both drawings and neither surface keeps an answer of its own.
  expect(new Set(states.map((state) => state.Icon)).size, 'each has its own glyph').toBe(3);
  for (const state of states) {
    expect(state.ink, `${state.word} is drawn in the token a drawn thing takes`).toMatch(/\btext-/);
    expect(state.mark, `${state.word} is filled or outlined where it is a mark`).toMatch(/\b(bg|border)-/);
  }
});
