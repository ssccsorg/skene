import { useMemo } from 'react';
import { tintOf } from '@ssccsorg/skene-board';
import { workingSet, writerOf } from '@ssccsorg/skene-frame/lib/world';
import type { Entry, NodeKind, World } from '@ssccsorg/skene-kernel';

/**
 * What the board says about each unit, derived once and read by both halves of it: the mark the camera
 * draws and the name the page draws beside it.
 *
 * The three readings are one pass because they answer one question, "what is this unit doing", and a
 * second derivation would be a second place for the mark and the name to disagree. It is not state and
 * nothing is stored: it is a read of the world, recomputed when the world changes.
 */
export function useUnitMarks(
  world: World,
  pickedId: string | null,
  ink: Record<NodeKind, string>,
): {
  lastOf: Map<string, Entry>;
  working: Set<string>;
  tints: Record<string, string | null>;
} {
  const lastOf = useMemo(() => {
    const out = new Map<string, Entry>();
    for (const point of world.records) out.set(writerOf(point.event), point.event);
    return out;
  }, [world]);

  const working = useMemo(() => workingSet(world.records.map((point) => point.event)), [world]);

  const tints = useMemo(() => {
    const out: Record<string, string | null> = {};
    for (const unit of world.standing) {
      const last = lastOf.get(unit.id) ?? null;
      const ringed = unit.id === world.claimedBy || unit.id === pickedId;
      out[unit.id] = tintOf((last?.kind as NodeKind | undefined) ?? null, ringed, ink);
    }
    return out;
  }, [world, lastOf, ink, pickedId]);

  return { lastOf, working, tints };
}
