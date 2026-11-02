import type { Part } from '../lib/kinds';
import type { Property } from '../lib/types';

import { emits } from './Emits';
import { holds } from './Holds';
import { person } from './Person';
import { reads } from './Reads';
import { shows } from './Shows';
import { writes } from './Writes';

// The frame's own parts, one file an atom and this file the table they are read through.
//
// It is pinned to the atom list, so an atom the frame knows and has no part for is a compile error here rather than a
// member that silently draws nothing. A part is a component or null, and null is the whole of what a flag is: the atom
// still answers a question a panel asks, and there is nothing of it to draw.
export const PARTS: Record<Property, Part | null> = {
  reads,
  writes,
  emits,
  shows,
  holds,
  person,
};
