// What a project's deployment can do beside drawing its run.
//
// The frame holds no list of features: a capability is a name a project states, and a place that needs one asks the open
// project whether it holds it. That is what keeps a control from promising a surface the deployment never shipped, and it
// is the same shape as a pack's name: the deployment declares, the frame reads.

import { useMemo } from 'react';
import { useScenario } from '../stores/scenario';
import type { Bundle } from '@ssccsorg/skene-kernel';

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
 * A surface is drawn where the project says the deployment has it, and the control that reaches it is drawn by the same
 * answer: the console's room and the three controls that compose a line into it are one question, so neither promises a
 * surface the other does not have. What is not gated is the board text the console draws beside the room, which is the
 * frame's own reading of the run and stands for every project.
 */
export function useCapability(name: string): boolean {
  return useAbilities().includes(name);
}
