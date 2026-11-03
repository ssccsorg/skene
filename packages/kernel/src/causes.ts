// What a record came from and what it led to.
//
// These are the links the record holds, read as the two directions a player moves in: Next asks what
// an act produced, Back asks what produced it. A declaration holds both of its own links (the fact it
// started from, the fact it produced) and the claim that took it; a fact holds the declaration it was
// produced by, and the only link that runs the other way is a declaration that started from it, which
// a reader can only find by looking at the run.

import { keyOf } from './address';
import type { Entry } from './types';

export interface Neighbour {
  /** How the record relates, in the record's own vocabulary. */
  role: string;
  record: Entry;
}

/** What a record came from. */
export function causesOf(record: Entry): Neighbour[] {
  const out: Neighbour[] = [];
  if (record.from) out.push({ role: 'from_facts', record: record.from });
  if (record.producedBy) out.push({ role: 'produced_by', record: record.producedBy });
  return out;
}

/** What a record led to, which needs the run for the one link that is not stored on the record. */
export function effectsOf(record: Entry, records: Entry[]): Neighbour[] {
  const out: Neighbour[] = [];
  if (record.kind === 'intent') {
    if (record.claim) out.push({ role: 'claimed_by', record: record.claim });
    if (record.produced) out.push({ role: 'to_fact', record: record.produced });
    return out;
  }
  const key = keyOf(record);
  for (const each of records) {
    if (each.kind === 'intent' && each.from && keyOf(each.from) === key) {
      out.push({ role: 'declared', record: each });
    }
  }
  return out;
}
