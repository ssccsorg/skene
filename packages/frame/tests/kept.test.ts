// What the frame keeps between visits, and what it deliberately does not.
//
// The pilot chose the project the frame reads and which ones stand open beside it, and a window that came back to the
// board's first project every time threw that choice away: a cockpit opens where it was left, the same way its panels
// do. What is not kept is the run, because a cursor and a pick name a moment in a run and a reload has no moment to put
// them back in.
//
// Two rules are held here. Which project the frame reads is the address, then the pilot's own last one, then the
// board's first, and the order is what lets a link land where it says while the window that names nothing comes back to
// where it was. And the address reaching a name the board does not hold is the ordinary case rather than a failure: a
// link from another deployment is a link whose project this board does not carry, and the board's own answer beats an
// empty frame.

import { expect, test } from 'vitest';
import { openedFrom, wantedProject } from '@/stores/scenario';
import type { Model } from '@/lib/world';

/** The board's own map, of which only what it holds matters here: this asks which project, not what is in one. */
const held = (...ids: string[]) => Object.fromEntries(ids.map((id) => [id, {} as Model])) as Record<string, Model>;

test('the frame comes back to the project the pilot last read', () => {
  const models = held('drive', 'game');
  expect(wantedProject(models, null, 'game')).toBe('game');
  expect(wantedProject(models, null, null), 'and to the board first when nothing was kept').toBe('drive');
});

test('an address wins over what was kept, so a link lands where it says', () => {
  const models = held('drive', 'game');
  expect(wantedProject(models, 'drive', 'game')).toBe('drive');
});

test('a name the board does not hold falls through rather than leaving an empty frame', () => {
  const models = held('drive', 'game');
  expect(wantedProject(models, 'gone', 'game'), 'a link from another deployment').toBe('game');
  expect(wantedProject(models, 'gone', 'also-gone'), 'and a kept project this board dropped').toBe('drive');
  expect(wantedProject({}, 'gone', 'also-gone'), 'a board that holds nothing leaves nothing open').toBeNull();
});

test('the projects that stand open are kept, and the ones this board dropped are not', () => {
  const models = held('drive', 'game');
  expect(openedFrom(['drive', 'pump'], models, 'drive'), 'this board carries no pump').toEqual(['drive']);
  expect(openedFrom(['drive'], models, 'game'), 'and the one being read stands open among them').toEqual([
    'drive',
    'game',
  ]);
  expect(openedFrom(['game'], models, 'game'), 'without being written twice').toEqual(['game']);
  expect(openedFrom([], models, null), 'a frame with no project open keeps none').toEqual([]);
});
