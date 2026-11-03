// The space as a graph: the participants, and the work one declared and another took.
//
// There is no store node. Every unit keeps its own store, so one node that every participant runs into
// would be a drawing of a central store, and a central store is the one thing the record model does not
// have: the middle of the board is the space's stores read together, which is a query and not a place.
// What each unit's own store holds is said on that unit's own node instead, so the graph reads as the
// participants and their work and never as a sink they share.
//
// A participant the place declares is a node whether or not the run has reached it, because the space is
// the place's own list; a writer the place forgot is appended, so nothing that wrote is missing. The only
// edges are declarations, from the participant whose reading it started from to the one that took it.

import { chainFor, entityOf } from '@ssccsorg/skene-kernel';
import type { Entry } from '@ssccsorg/skene-kernel';
import { writerOf } from './world';

export interface GraphNode {
  id: string;
  /** How many records this participant's own store holds, over what the run has delivered. */
  written: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  /** The declaration the work was, which is what the edge stands for. */
  label: string;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * The graph of a run: the participants, each with its own store, and the declarations passed between
 * them. A claim writes no record and so is not counted; it is the edge's own label, read from the
 * declaration it belongs to.
 */
export function graphOf(received: Entry[], units: Record<string, unknown>): Graph {
  const spent = received.filter((entry) => entry.kind !== 'claim');

  const written = new Map<string, number>();
  for (const entry of spent) {
    const who = writerOf(entry);
    if (who) written.set(who, (written.get(who) ?? 0) + 1);
  }

  const ids = Object.keys(units);
  for (const id of written.keys()) if (!ids.includes(id)) ids.push(id);
  const known = new Set(ids);

  const edges: GraphEdge[] = [];
  for (const chain of chainFor(spent)) {
    if (!chain.worker) continue;
    const from = entityOf(chain.from?.origin ?? '');
    if (!from || from === chain.worker || !known.has(from) || !known.has(chain.worker)) continue;
    const label = chain.label ?? 'a piece of work';
    edges.push({ id: `intent-${label}-${edges.length}`, from, to: chain.worker, label });
  }

  return {
    nodes: ids.map((id) => ({ id, written: written.get(id) ?? 0 })),
    edges,
  };
}
