// The scenario's own language, read by the dashboard.
//
// The file this parses is the one the engine runs. `ktema-sim <scenario> <volume>` executes it on a
// host, and the same file runs on riscv32imac with no operating system. So the dashboard holds no
// second model of the work that could drift from the first: what a screen shows is read out of the
// file the record was actually made from.
//
// A `count` step in the file is the engine's own assertion about how many facts the volume holds at
// that point, so a scenario this reader misreads is a scenario whose counts disagree.

import type { Actor, Chain, Check, Entry, Kind } from './types';

export const FACT: Kind = 'fact';
export const INTENT: Kind = 'intent';
export const HINT: Kind = 'hint';

/** The verbs that write nothing this reader models, kept so an unmodelled one is visible. */
const QUIET = new Set([
  'seed',
  'tick',
  'count',
  'flush',
  'query',
  'list',
  'read',
  'read-fact',
  'heap',
  'buffered',
  'fail',
  'try-write',
  'axis',
  'order',
  'medium',
  'exit',
]);

export interface Parsed {
  records: Entry[];
  events: Entry[];
  checks: Check[];
  unknown: string[];
}

/** A point the scenario writes in the place's own coordinates. */
function pointOf(text: string | undefined, where: string): [number, number] {
  const [x, y] = String(text ?? '').split(',').map(Number);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`${where} is not a pair of coordinates`);
  return [x, y];
}

export function parseScenario(text: string): Parsed {
  const records: Entry[] = [];
  const events: Entry[] = [];
  const checks: Check[] = [];
  const unknown: string[] = [];
  /** The facts a later step names, so an intent reaches the fact it starts from. */
  const named = new Map<string, Entry>();
  let clock = 0;
  let facts = 0;

  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [verb, ...args] = line.split(/\s+/);

    if (verb === 'seed') continue;
    if (verb === 'tick') {
      clock += Number(args[0] ?? 0);
      continue;
    }
    if (verb === 'time') {
      // An absolute time, which is what a generated mission uses to place concurrent events without pretending
      // they happened one after another.
      clock = Number(args[0] ?? 0);
      continue;
    }
    if (verb === 'write' || verb === 'try-write') {
      // `count bytes key interval`: the engine places the readings `interval` apart starting where
      // the clock stands and leaves the clock on the last of them.
      const count = Number(args[0] ?? 0);
      const bytes = Number(args[1] ?? 0);
      const origin = args[2] ?? '';
      const interval = Number(args[3] ?? 0);
      for (let index = 0; index < count; index += 1) {
        const entry: Entry = { kind: FACT, origin, bytes, at: clock + index * interval, cycle: index };
        records.push(entry);
        events.push(entry);
        facts += 1;
      }
      clock += Math.max(0, count - 1) * interval;
      continue;
    }
    if (verb === 'fact') {
      const [name, bytes, origin] = args;
      const entry: Entry = { kind: FACT, label: name, origin, bytes: Number(bytes ?? 0), at: clock };
      records.push(entry);
      events.push(entry);
      named.set(name, entry);
      facts += 1;
      continue;
    }
    if (verb === 'position') {
      const [unit, at] = args;
      const [x, y] = pointOf(at, 'a position');
      const entry: Entry = {
        kind: FACT,
        origin: `${unit}/position`,
        content: `${x},${y}`,
        bytes: 16,
        at: clock,
      };
      records.push(entry);
      events.push(entry);
      facts += 1;
      continue;
    }
    if (verb === 'path') {
      const [unit, from, to, stepsRaw, intervalRaw] = args;
      const [x1, y1] = pointOf(from, 'a path start');
      const [x2, y2] = pointOf(to, 'a path end');
      const steps = Math.max(2, Math.trunc(Number(stepsRaw ?? 2)) || 2);
      const interval = Number(intervalRaw ?? 0) || 0;
      for (let index = 0; index < steps; index += 1) {
        const reach = index / (steps - 1);
        const x = Math.round((x1 + (x2 - x1) * reach) * 10) / 10;
        const y = Math.round((y1 + (y2 - y1) * reach) * 10) / 10;
        const entry: Entry = {
          kind: FACT,
          origin: `${unit}/position`,
          content: `${x},${y}`,
          bytes: 16,
          at: clock + index * interval,
          cycle: index,
        };
        records.push(entry);
        events.push(entry);
        facts += 1;
      }
      clock += (steps - 1) * interval;
      continue;
    }
    if (verb === 'hint') {
      const [name, content] = args;
      const entry: Entry = { kind: HINT, label: name, content, at: clock };
      records.push(entry);
      events.push(entry);
      named.set(name, entry);
      continue;
    }
    if (verb === 'intent') {
      const [name, from, description] = args;
      const entry: Entry = {
        kind: INTENT,
        label: name,
        from: named.get(from) ?? null,
        fromLabel: from,
        description,
        at: clock,
      };
      records.push(entry);
      events.push(entry);
      named.set(name, entry);
      continue;
    }
    if (verb === 'claim' || verb === 'conclude') {
      const [name, value] = args;
      const intent = named.get(name);
      if (intent && intent.kind === INTENT) {
        if (verb === 'claim') {
          intent.worker = value;
          // A claim writes no record: it is a step the declaration takes, so it belongs on the
          // timeline and not in the volume.
          const claim: Entry = { kind: 'claim', label: name, worker: value, at: clock };
          intent.claim = claim;
          events.push(claim);
        } else {
          const produced: Entry = { kind: FACT, label: value, content: value, at: clock, producedBy: intent };
          intent.produced = produced;
          records.push(produced);
          events.push(produced);
          named.set(value, produced);
          facts += 1;
        }
      }
      continue;
    }
    if (verb === 'count') {
      const expected = args[0] === '-' ? null : Number(args[0]);
      checks.push({ at: clock, expected, derived: facts });
      continue;
    }
    if (!QUIET.has(verb)) unknown.push(verb);
  }

  return { records, events, checks, unknown };
}

/**
 * The title a record carries, which is how a project is named. A file that opens with no title has
 * no name of its own, and the app falls back to the project's address rather than inventing one.
 */
export function titleOf(text: string): string {
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (!line.startsWith('#')) return '';
    return line.replace(/^#\s*/, '').trim();
  }
  return '';
}

/** The entity an origin belongs to: the part before the first slash. */
export function entityOf(origin: string | undefined): string {
  if (!origin) return '';
  return origin.split('/')[0];
}

/** The actors a scenario names: the writer of an observation, and the worker a declaration was taken by. */
export function actors(records: Entry[]): Actor[] {
  const named = new Map<string, Actor>();
  const remember = (id: string, role: Actor['role']) => {
    if (!id) return;
    if (!named.has(id)) named.set(id, { id, role, records: 0 });
    (named.get(id) as Actor).records += 1;
  };
  for (const record of records) {
    if (record.kind === INTENT) continue;
    remember(entityOf(record.origin), 'writes');
  }
  for (const record of records) {
    if (record.kind === INTENT && record.worker) {
      if (!named.has(record.worker)) named.set(record.worker, { id: record.worker, role: 'acts', records: 0 });
      (named.get(record.worker) as Actor).role = 'acts';
    }
  }
  return [...named.values()];
}

/** The chain one declaration makes: what it started from, the declaration, the taker, the outcome. */
export function chainFor(records: Entry[]): Chain[] {
  return records
    .filter((record) => record.kind === INTENT)
    .map((intent) => ({
      label: intent.label,
      from: intent.from,
      worker: intent.worker ?? null,
      claim: intent.claim ?? null,
      produced: intent.produced ?? null,
      description: intent.description,
      at: intent.at,
    }));
}
