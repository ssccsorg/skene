// The cockpit's claim on the bar.
//
// The frame's readings are read first, so this is the one place the cockpit's claim is compared with them: the seat is the
// pilot's own view of the space and no other reading claims it, and the frame comes up on the reading that declares it
// because that reading stands first.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import '@ssccsorg/skene-frame/views/index';
import '../src/index';
import { declaredReadings } from '@ssccsorg/skene-frame/lib/readings';
import { SHELL_READING } from '../src/index';

test('the package registers the cockpit as the one seat, and it is where the frame comes up', () => {
  const readings = declaredReadings();
  expect(readings.length, 'the frame readings and this one').toBeGreaterThan(1);
  expect(readings.filter((reading) => reading.seat).map((reading) => reading.key)).toEqual(['shell']);
  expect(readings[0]?.key, 'and the frame opens on it').toBe('shell');
  expect(SHELL_READING.path).toBe('/space');
  expect(SHELL_READING.button?.order).toBe(10);
});

test('the wires control stands with the pictures and is about this one', () => {
  const source = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
  expect(source('../src/Wires.tsx'), 'the wires stand with the pictures').toMatch(/band: 0/);
  expect(source('../src/Wires.tsx'), 'and it speaks to the reading this package installs').toMatch(
    /SHELL_READING\.key/,
  );
  // The sphere's own controls are drawn over the board rather than added to the frame's bar.
  expect(source('../src/SceneBoard.tsx'), 'the fit and the notches stand in the sphere').toMatch(
    /data-region="view-controls"/,
  );
});
