// What a project's deployment can do beside drawing its run.
//
// The frame holds no list of features: a capability is a name a project states, and a place that needs one asks the open
// project whether it holds it. That is what keeps a control from promising a surface the deployment never shipped, and it
// is the same shape as a pack's name: the deployment declares, the frame reads.

import { useMemo } from 'react';
import { useScenario } from '../stores/scenario';
import type { Bundle } from './types';

/** The capability a project states to have a console over a room that answers it. */
export const CONSOLE = 'console';

/** The capabilities a project declares, in the order it declared them. */
export function abilitiesOf(bundle: Bundle | null | undefined): string[] {
  return bundle?.abilities ?? [];
}

/** Whether a project holds one. */
export function holds(abilities: string[], name: string): boolean {
  return abilities.includes(name);
}

/** The open project's capabilities, which is what a panel or a control is drawn against. */
export function useAbilities(): string[] {
  const abilities = useScenario(
    (state) => state.projects.find((each) => each.id === state.projectId)?.abilities,
  );
  return useMemo(() => abilities ?? [], [abilities]);
}

/**
 * Whether the open project holds one.
 *
 * A control that opens the console is drawn where the console stands, so the row of controls and the panel are one answer
 * rather than a control that presses into nothing.
 */
export function useCapability(name: string): boolean {
  return useAbilities().includes(name);
}
