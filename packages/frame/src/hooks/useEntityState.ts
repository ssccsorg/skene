import { useMemo } from 'react';
import { workingSet, writerOf } from '../lib/world';
import { useVolume } from './useVolume';
import { useScenario } from '../stores/scenario';

// The state of every participant, by name, for the views that draw a mark rather than a row.
//
// It is a reading of the two stores and not a third thing to keep in step: a unit's state is what the
// received records and the place say about one writer. A participant the place names is in the map whether
// or not it has written, so a place of thirty never shows a unit as missing; a writer the place does not
// name is added, so nothing that wrote is left out. The state a unit is in is the same reading the board
// draws its ring from and the transport walks its window by, so the three agree by construction.

export type UnitState = 'working' | 'idle' | 'offline';

/**
 * The ink a unit's state is drawn in, which is the token a drawn thing takes.
 *
 * It is written once because three surfaces read it: the disc in the column, the ground read as a lattice and the shell
 * read from outside it. The type is what the two are keyed by, so a state the reading grows is a missing entry here that
 * the compiler names, where a copy for each view would draw the new state in whatever that copy happened to fall back to.
 */
export const UNIT_STATE: Record<UnitState, string> = {
  working: 'text-working',
  idle: 'text-idle',
  offline: 'text-offline',
};

export function useEntityState(): Record<string, UnitState> {
  const received = useVolume().received;
  const shown = useVolume().shown;
  const model = useScenario((state) => state.model);

  return useMemo(() => {
    const records = received.slice(0, shown).filter((entry) => entry.kind !== 'claim');
    const recent = workingSet(records);
    const wrote = new Set<string>();
    for (const entry of records) {
      const who = writerOf(entry);
      if (who) wrote.add(who);
    }

    const ids = new Set<string>(Object.keys(model?.project.place?.units ?? {}));
    for (const id of wrote) ids.add(id);

    const out: Record<string, UnitState> = {};
    for (const id of ids) out[id] = !wrote.has(id) ? 'offline' : recent.has(id) ? 'working' : 'idle';
    return out;
  }, [received, shown, model]);
}
