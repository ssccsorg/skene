// The bar the frame draws, held to the declarations it is composed from.
//
// A reading says what it is: the seat is the pilot's own view of the space and no other reading claims it, a pane stands
// beside the reading in force instead of being a place the cockpit goes, and a reading a project has to ask for waits
// for that project. The bar is those declarations read in order, so what is held here is the order and the claims, and
// where each control says its band.
//
// The band assertions read the components' own source because the band is declared beside the control it belongs to,
// and a table kept here would be a second place the same number is written.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

import { declaredReadings, standing } from '@/lib/readings';
import type { Layout } from '@ssccsorg/skene-kernel';
// The readings that declare themselves register when their modules are imported, which is what the frame's own entry does.
import '@/views/index';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const source = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

test('the frame ships readings and claims no seat of its own', () => {
  const readings = declaredReadings();
  expect(readings.length, 'there are readings to hold this over').toBeGreaterThan(1);
  // The seat is the cockpit's claim, and the cockpit is a package. A frame that declared it would be a frame that came
  // up on a picture it does not draw.
  expect(readings.filter((reading) => reading.seat)).toEqual([]);
});

test('the sphere, the graph, and the wires share a band, and the map control opens its own', () => {
  expect(source('src/components/instruments/Readings.tsx'), 'the sphere is a picture in the pictures run').toMatch(
    /key: 'sphere-view',\s*order: 10,\s*band: 0,/,
  );
  expect(source('src/components/instruments/Readings.tsx'), 'the other pictures stand beside it').toMatch(
    /key: 'readings',\s*order: 30,\s*band: 0,/,
  );
  expect(source('src/components/instruments/MapSplit.tsx'), 'the map opens its own band').toMatch(/band: 1/);
  for (const path of ['src/components/instruments/FoldPanels.tsx', 'src/components/instruments/FillScreen.tsx']) {
    expect(source(path), `${path} stands with the frame's own controls`).toMatch(/band: 2/);
  }
  // The sphere's own controls stand in the cockpit, and the bar does not carry a second set.
  expect(source('src/components/instruments/index.ts'), 'the fit and the notches are not in the bar').not.toMatch(
    /FitToSpace/,
  );
  // The pin is the one control that closes the pane, so the arrangements do not carry a second globe that would be the
  // same state under another icon.
  expect(source('src/components/instruments/MapSplit.tsx')).not.toMatch(/mode: 'globe'/);
});

test('every reading is reached at an address of its own', () => {
  const readings = declaredReadings();
  const paths = readings.map((reading) => reading.path);
  expect(new Set(paths).size, 'two readings at one address are one reading nobody can reach').toBe(paths.length);
  for (const reading of readings) {
    expect(reading.path.startsWith('/'), `${reading.key} is reached at an address`).toBe(true);
  }
});

test('a reading a project has to ask for is carried where it asks and nowhere else', () => {
  const readings = declaredReadings();
  const layouts: (Layout | undefined)[] = [undefined, {}, { console: true }, { hex: false }];
  for (const layout of layouts) {
    expect(
      standing(readings, { layout }).map((reading) => reading.key),
      `a layout of ${JSON.stringify(layout)} leaves the frame's own pictures as they are`,
    ).toEqual(readings.filter((reading) => !reading.asked).map((reading) => reading.key));
  }

  const asked = readings.filter((reading) => reading.asked).map((reading) => reading.key);
  expect(asked.length, 'there is one to hold this over').toBeGreaterThan(0);
  for (const key of asked) {
    expect(standing(readings, { layout: { [key]: true } }).map((reading) => reading.key), `${key} asked for`).toContain(
      key,
    );
    expect(
      standing(readings, { layout: { [key]: true } }),
      'and everything the frame always has is still there',
    ).toHaveLength(standing(readings, {}).length + 1);
  }

  // A project puts a picture away with the same declaration it asks for one with: the two are one list of a bundle's names.
  const own = readings.filter((reading) => !reading.asked);
  const put = standing(readings, { layout: { [own[own.length - 1]?.key ?? '']: false } }).map((reading) => reading.key);
  expect(put, 'a picture a project puts away is not carried').toHaveLength(own.length - 1);
  expect(put, 'and the reading the frame comes up in is not the one it put away').toEqual(own.slice(0, -1).map((reading) => reading.key));
});

test('a view the frame has not settled waits to be asked for', () => {
  // The two the frame is still working out are the ground read as a lattice and the shell read from outside it. A reading
  // that claims something about a space waits for the project that names it, so neither stands for every project.
  const readings = declaredReadings();
  for (const key of ['hex', 'outside']) {
    const reading = readings.find((each) => each.key === key);
    expect(reading, `${key} is a reading the frame holds`).toBeDefined();
    expect(reading?.asked, `${key} is a view a project has to ask for`).toBe(true);
  }
});
