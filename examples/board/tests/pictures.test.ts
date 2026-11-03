// The pictures this deployment draws.
//
// A deployment installs a picture by importing its package in its entry, and its board names the reading it opens on.
// This holds the two together: the entry imports every picture the board asks for, so a board that names a reading the
// deployment stopped importing is caught here rather than in a blank window.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

// What the entry imports, imported again here: the test runs without a DOM, so the entry's render is not executed. The
// frame's own readings register when the frame's entry is imported, which is what the entry does for `Frame`.
import '@ssccsorg/skene-frame';
import '@ssccsorg/skene-view-media';
import '@ssccsorg/skene-view-map';
import '@ssccsorg/skene-view-shell';
import '@ssccsorg/skene-view-graph';

import { declaredReadings } from '@ssccsorg/skene-frame/lib/readings';
import { viewKinds } from '@ssccsorg/skene-frame/lib/view-kinds';

const HERE = fileURLToPath(new URL('../', import.meta.url));

/** The board this deployment serves, read the way the frame reads it. */
const board = JSON.parse(readFileSync(`${HERE}projects.json`, 'utf8')) as {
  projects: { resources: { kind: string; at: unknown }[] }[];
};

const declared = (kind: string) =>
  board.projects[0]?.resources.find((resource) => resource.kind === kind)?.at as Record<string, unknown> | undefined;

test('the board opens on a reading the deployment installs', () => {
  const views = declared('views') as { pack?: string; main?: string } | undefined;
  expect(views?.main, 'the board opens on the space').toBe('space');

  const readings = declaredReadings();
  expect(readings.find((reading) => reading.key === 'shell')?.path).toBe('/space');
  expect(readings.find((reading) => reading.key === 'shell')?.seat, 'and it is the pilot seat').toBe(true);
  expect(readings.map((reading) => reading.key)).toEqual(
    expect.arrayContaining(['graph', 'map', 'shell', 'records', 'hex', 'intents', 'outside', 'act']),
  );
});

test('the entry imports every picture the test installs', () => {
  const entry = readFileSync(`${HERE}src/main.tsx`, 'utf8');
  for (const picture of ['view-media', 'view-map', 'view-shell', 'view-graph']) {
    expect(entry, `the entry imports ${picture}`).toContain(`@ssccsorg/skene-${picture}`);
  }
  expect(viewKinds().map((kind) => kind.kind).sort()).toEqual(['map', 'media']);
});
