// The volume as the board's run, through the two binaries that stand on either side of it.
//
// This is the one test that crosses the process boundary, and it crosses it twice: the Kleis CLI writes a real
// volume, and the shell prints it in the shape a room sends. What is being held is that a window over a volume is
// the same answer as a window over a socket, which is why the linking below is the app's own.
//
// It runs only when KLET_BIN and KLEIS_BIN both name built binaries, so a checkout without them skips it rather than
// failing the suite; `npm run test:records` builds both and sets the two variables.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { entriesOf, recordsSource, type Records } from '@/lib/records-source';
import type { WireRecord } from '@/lib/record-client';

const klet = process.env.KLET_BIN ?? '';
const kleis = process.env.KLEIS_BIN ?? '';
const ready = Boolean(klet && kleis);

const write = (volume: string, args: string[]): void => {
  execFileSync(kleis, ['--path', volume, ...args], { encoding: 'utf8' });
};

const read = (volume: string): Records =>
  JSON.parse(execFileSync(klet, ['records', '--volume', volume], { encoding: 'utf8' })) as Records;

const volumeIn = async (body: (volume: string) => void | Promise<void>): Promise<void> => {
  const volume = mkdtempSync(join(tmpdir(), 'record-volume-'));
  try {
    await body(volume);
  } finally {
    rmSync(volume, { recursive: true, force: true });
  }
};

test.skipIf(!ready)('a volume written by the Kleis CLI reads as one run', async () => {
  await volumeIn((volume) => {
    write(volume, ['write', 'the patient collapsed', '--origin', 'villa/patient']);
    write(volume, ['intent', 'evacuate the patient', '--id', 'evacuate']);
    write(volume, ['hint', 'the wind is rising']);

    const entries = entriesOf(read(volume).records);
    const fact = entries.find((entry) => entry.kind === 'fact');
    const intent = entries.find((entry) => entry.kind === 'intent');
    const hint = entries.find((entry) => entry.kind === 'hint');

    expect(entries).toHaveLength(3);
    expect(fact?.origin).toBe('villa/patient');
    expect(fact?.content).toBe('the patient collapsed');
    expect(intent?.description).toBe('evacuate the patient');
    expect(intent?.from?.origin, 'the intent starts from the fact it was written over').toBe(
      'villa/patient',
    );
    expect(hint?.content).toBe('the wind is rising');
  });
});

test.skipIf(!ready)('a window of the volume is a range, and the run reports its length', async () => {
  await volumeIn(async (volume) => {
    write(volume, ['write', 'one', '--origin', 'villa/one']);
    write(volume, ['write', 'two', '--origin', 'villa/two']);
    const source = recordsSource(async () => read(volume));

    const first = await source.window('villa', 0, 1);
    expect(first.entries.map((entry) => entry.content)).toEqual(['one']);
    expect(first.total).toBe(2);

    const last = await source.window('villa', 1, 5);
    expect(last.entries.map((entry) => entry.content)).toEqual(['two']);
    expect(last.total).toBe(2);

    const end = await source.window('villa', 2, 1);
    expect(end.entries).toEqual([]);
    expect(end.total).toBe(2);
  });
});

test.skipIf(!ready)('an empty volume is an empty run and not a failure', async () => {
  await volumeIn(async (volume) => {
    const source = recordsSource(async () => read(volume));
    expect(await source.window('villa', 0, 10)).toEqual({ entries: [], total: 0 });
  });
});

// The wire shape is the socket's, so a record this reading cannot place is refused the way the socket refuses it.
test('a conclusion that names no intent it has seen is not placed', () => {
  const orphan: WireRecord = { seq: 0, kind: 'fact', at: 1, label: 'f_1', producedByLabel: 'i_gone' };
  expect(entriesOf([orphan])).toEqual([]);
});
