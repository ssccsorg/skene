// The reader's key for a record.
//
// It is the reader's and not the engine's address: the engine derives a record's address from the
// payload, the origin and the creator, and nothing outside the engine can recompute it. What this
// function gives is a stable name for a record across the file and the wire, which is what lets a
// pick survive a frame and what an address can carry so a screenshot is reproducible.

import type { Entry } from './types';

export function keyOf(record: Entry): string {
  if (record.label) return `${record.kind}:${record.label}`;
  return `${record.kind}:${record.origin ?? ''}#${record.cycle ?? record.at}`;
}
