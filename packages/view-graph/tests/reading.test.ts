// The graph is a reading, and the package is what installs it.
//
// The frame holds the readings that are pictures of the run itself; the graph is one of them, and it stands for every
// project because a graph of a run is a claim the run can always support.

import { expect, test } from 'vitest';
import '@ssccsorg/skene-frame/views/index';
import '../src/index';
import { declaredReadings } from '@ssccsorg/skene-frame/lib/readings';
import { GRAPH_READING } from '../src/index';

test('the package installs the graph at its own address, in the reading run', () => {
  const readings = declaredReadings();
  expect(readings.find((reading) => reading.key === 'graph')).toBe(GRAPH_READING);
  expect(GRAPH_READING.path).toBe('/graph');
  expect(GRAPH_READING.button?.order).toBe(12);
  expect(GRAPH_READING.asked, 'the graph stands for every project').toBeUndefined();
});
