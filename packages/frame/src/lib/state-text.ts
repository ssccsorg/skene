// The space as raw text, and the same text read back as an edit.
//
// The dashboard draws the space and the record. This is the space written out, so that the thing which
// reads the board and the thing which drives it are one interface: a person edits a line, an agent
// writes one, and neither has to learn the drawing. The text is the board, and the console in the space
// is where a person types.
//
// The shape is one directive a line, in the order the board reads them:
//
//   board <project> <shown>/<total>
//   scene <what the frame is in>
//   picked <a unit, or ->
//   unit <id> <x> <y> <working|idle|offline> <the last record, or ->
//     abilities <one or more, or none>
//     store <n> records
//
// A unit's two indented lines belong to the unit above them, the way a record's fields belong to the
// record. The coordinates are the place's own, which are the numbers the plan draws and the numbers a
// person can read off it, so an edit to a line is an edit to where a thing stands.
//
// `parseState` reads any of those lines and nothing else, and a line it does not know is reported rather
// than dropped: a text that silently ignored half of itself would be a text that lied about the board.
// A `unit` line with only its id and its place is a complete edit on its own, which is what makes the
// short form the one a person types.

/** One unit of the space, as the text carries it. */
export interface UnitState {
  id: string;
  /** The place's own coordinate, not the scene's. */
  at: [number, number];
  state: 'working' | 'idle' | 'offline';
  /** The last record the unit wrote, as one line, or null when it has written nothing. */
  last: string | null;
  written: number;
  abilities: string[];
}

/** The whole board, as the text carries it. */
export interface BoardState {
  project: string;
  shown: number;
  total: number;
  scene: string;
  picked: string | null;
  units: UnitState[];
}

/**
 * What a text says. Every field is optional: a text is read as an edit and an edit names what it changes.
 *
 * It carries the edits and not the whole text, because the text is two languages at once. What the board draws (the
 * cursor's total, the scene it has reached, a unit's state, the record it wrote last, how many its own store holds) is a
 * reading: it follows from the record and a person cannot tell the board to be somewhere else by naming it. What the
 * board can be told is here: which project, where the cursor stands, what is picked, and where a unit stands with what
 * it can be asked. A display line is still read rather than reported as unknown, because the text has to round-trip, and
 * it is simply not an edit.
 */
export interface StatePatch {
  project?: string;
  shown?: number;
  scene?: string;
  picked?: string | null;
  units: Map<string, { at?: [number, number]; abilities?: string[] }>;
  /** The lines that are not a directive, so that a text which says something else says so. */
  unknown: string[];
}

/**
 * Whether a text asks the board for anything, which is the question the console asks before it answers in the board's
 * own words.
 *
 * It is here because it is a fact about the grammar: it used to be a list of field names written out at the console,
 * where the next editable directive would have been added to the reader and not to the list, and a line the board could
 * act on would have been read as one it could not. A patch that only says what the board already draws asks for
 * nothing, and is a thing said to the room rather than a change to the space.
 */
export function isEdit(patch: StatePatch): boolean {
  return patch.units.size > 0 || patch.picked !== undefined || patch.project !== undefined || patch.shown !== undefined;
}

export function writeState(state: BoardState): string {
  const lines = [`board ${state.project} ${state.shown}/${state.total}`, `scene ${state.scene}`];
  lines.push(`picked ${state.picked ?? '-'}`);
  for (const unit of state.units) {
    const [x, y] = unit.at;
    lines.push(`unit ${unit.id} ${Math.round(x)} ${Math.round(y)} ${unit.state} ${unit.last ?? '-'}`);
    lines.push(`  abilities ${unit.abilities.length ? unit.abilities.join(' ') : 'none'}`);
    lines.push(`  store ${unit.written} ${unit.written === 1 ? 'record' : 'records'}`);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * Read a text as an edit of the board. A unit is named by a `unit` line, which carries its place at
 * least; the lines under it carry the rest. A unit the text names twice is the later naming, because a
 * text is read front to back like any other.
 */
export function parseState(text: string): StatePatch {
  const patch: StatePatch = { units: new Map(), unknown: [] };
  let under: string | null = null;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const indented = /^\s/.test(raw);
    const [head, ...rest] = line.split(/\s+/);

    if (indented) {
      if (!under) {
        patch.unknown.push(line);
        continue;
      }
      const unit = patch.units.get(under) as NonNullable<ReturnType<StatePatch['units']['get']>>;
      if (head === 'abilities') {
        unit.abilities = rest[0] === 'none' || rest.length === 0 ? [] : rest;
      } else if (head === 'store') {
        // What the unit's own store holds is a reading of the record, so a line for it is consumed and not recorded:
        // a person cannot tell the board how many records a machine has written.
        if (!Number.isInteger(Number(rest[0]))) patch.unknown.push(line);
      } else {
        patch.unknown.push(line);
      }
      continue;
    }

    under = null;
    if (head === 'board') {
      const cursor = rest[1]?.match(/^(\d+)\/(\d+)$/);
      if (rest[0]) patch.project = rest[0];
      if (cursor) patch.shown = Number(cursor[1]);
      else patch.unknown.push(line);
    } else if (head === 'scene') {
      patch.scene = rest.join(' ');
    } else if (head === 'picked') {
      patch.picked = rest[0] === '-' || !rest[0] ? null : rest[0];
    } else if (head === 'unit') {
      const x = Number(rest[1]);
      const y = Number(rest[2]);
      if (!rest[0] || !Number.isFinite(x) || !Number.isFinite(y)) {
        patch.unknown.push(line);
        continue;
      }
      const existing = patch.units.get(rest[0]) ?? {};
      existing.at = [x, y];
      // The words after the place are the unit's state and the record it wrote last, which are readings of the record
      // and belong to the drawn text: the line is a directive for where the unit stands and nothing else.
      under = rest[0];
      patch.units.set(rest[0], existing);
    } else {
      patch.unknown.push(line);
    }
  }

  return patch;
}

/** The board an edit asks for, given the board it is an edit of. Nothing the edit does not name moves. */
export function applyPatch(before: BoardState, patch: StatePatch): BoardState {
  const units = before.units.map((unit) => {
    const edit = patch.units.get(unit.id);
    return edit ? { ...unit, ...edit } : unit;
  });
  return {
    project: patch.project ?? before.project,
    shown: patch.shown ?? before.shown,
    total: before.total,
    scene: patch.scene ?? before.scene,
    picked: patch.picked === undefined ? before.picked : patch.picked,
    units,
  };
}

/**
 * What one board says to the next, in the words a person reads. It is the console's half of the
 * exchange: an edit is applied by the stores and the reply is this, so what the board answers is what
 * actually changed rather than what was typed.
 */
export function changesBetween(before: BoardState, after: BoardState): string[] {
  const said: string[] = [];
  const was = new Map(before.units.map((unit) => [unit.id, unit]));
  if (before.project !== after.project) said.push(`opened ${after.project}`);
  if (before.shown !== after.shown) said.push(`cursor ${after.shown} / ${after.total}`);
  if (before.picked !== after.picked) {
    said.push(after.picked ? `picked ${after.picked}` : 'picked nothing');
  }
  for (const unit of after.units) {
    const previous = was.get(unit.id);
    if (!previous) {
      said.push(`added ${unit.id} at ${unit.at[0]}, ${unit.at[1]}`);
      continue;
    }
    if (previous.at[0] !== unit.at[0] || previous.at[1] !== unit.at[1]) {
      said.push(`moved ${unit.id} to ${unit.at[0]}, ${unit.at[1]}`);
    }
    const wasAbilities = previous.abilities.join(' ');
    const isAbilities = unit.abilities.join(' ');
    if (wasAbilities !== isAbilities) {
      said.push(`${unit.id} abilities ${isAbilities || 'none'}`);
    }
  }
  return said;
}
