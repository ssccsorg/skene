// A run read from the shell, in the shape a room sends.
//
// A room streams flat records: a record names its neighbours by label, and the reader keeps a table of what it has
// seen. The shell prints a volume in that same shape, so a window over a volume and a window over a socket are one
// answer and one linking function. What is not here is the engine's envelope: the volume's path, its binary and its
// line format belong to the shell, which answers `/records` with records and a length.

import { linkRecord, links, type WireRecord } from './record-client';
import { windowOf, type RunSource } from './source';
import type { Entry } from './types';

/** One run as the shell prints it: the records in order, and how many the run holds in all. */
export interface Records {
  records: WireRecord[];
  total: number;
}

/** The records an answer carries, linked against each other in the order they arrived. */
export function entriesOf(records: WireRecord[]): Entry[] {
  const reading = links();
  const entries: Entry[] = [];
  // A record whose conclusion names an intent that has not arrived is not a record this reading can place, which is
  // the same refusal the stream makes: the two paths hold to one linking rule rather than one each.
  for (const record of records) {
    const entry = linkRecord(reading, record);
    if (entry) entries.push(entry);
  }
  return entries;
}

/** A source over one run, read through a caller that answers the shell's records. */
export function recordsSource(read: () => Promise<Records>): RunSource {
  return {
    window: async (_project, from, limit) => {
      const { records, total } = await read();
      return { entries: windowOf(entriesOf(records), from, limit).entries, total };
    },
  };
}

/** The volume this host was given, read through the endpoint the dev server answers it from. */
export const volumeSource: RunSource = recordsSource(async () => {
  const answer = await fetch('/records');
  if (!answer.ok) {
    const detail = await answer.text().catch(() => '');
    throw new Error(`the record volume did not answer (${answer.status})${detail ? `: ${detail}` : ''}`);
  }
  const body = (await answer.json()) as Partial<Records>;
  return { records: body.records ?? [], total: body.total ?? 0 };
});
