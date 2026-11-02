import { useMemo } from 'react';
import { sceneStep, worldOf, writerOf, type Model } from '../lib/world';
import type { Entry, Scene, World } from '../lib/types';
import { useEdits, type Change } from '../stores/edits';
import { useVolume } from './useVolume';
import { useScenario } from '../stores/scenario';
import { NO_STATES, useLive } from '../stores/live';

// The space as the surfaces read it, derived once and shared.
//
// The board, the transport and the record panel are one instrument, so they read one derivation: what the
// feed delivered, how far the cursor has walked, and the changes a pilot saved. Each surface deriving its
// own would be the same reading kept in two places, and a frame the board holds would be free to disagree
// with the frame the transport stands on.
//
// A change is applied from the record the branch is taken at, which is the end of the run until the pilot
// takes it somewhere else. Everything before that point is the run as the record wrote it, so winding the
// transport back shows the space the change has not reached yet.

export interface Space {
  model: Model | null;
  received: Entry[];
  shown: number;
  /** What the feed has delivered up to the cursor. */
  revealed: Entry[];
  /** The newest records of that, which is what the space and the feed hold at once. */
  inView: Entry[];
  /** The scene the cursor is in, as the step a frame would name. */
  step: number;
  /** The record a saved change is applied from, which is the end of the run until the pilot moves it. */
  at: number;
  world: World | null;
  /** The branch the saved changes draw, or null while nothing is changed. */
  branch: { fork: number; units: string[] } | null;
  scene: Scene | null;
  /** What each participant wrote last, over what has arrived. */
  lastOf: Record<string, Entry | null>;
}

/**
 * How many records the space and the feed hold at once.
 *
 * A run is longer than any view of it: the feed is a fixed panel and the board is one frame of marks, so what
 * is drawn is the newest of what the cursor has reached and the rest rolls off behind it. The count is held
 * here rather than at either surface because it is one number for one space, and a feed that rolled at a
 * different count from the board would be two accounts of one run.
 *
 * What it does not bound is the reading: the run the cursor stands on is computed from every record the
 * volume has delivered, and its counts are the volume's own. This is how much of it is on screen.
 */
export const IN_VIEW = 120;

/**
 * The last derivation, so that the surfaces asking for the same reading are answered once.
 *
 * Every panel of the frame is a surface of this one reading, and the frame has five of them once the console is out,
 * so a derivation made per caller would walk the whole run five times a frame. What makes one answer enough is that the
 * reading is a function of five things and every one of them is stable while the run does not move: the model, the step
 * the cursor is in, how far it has reached, the records the volume delivered, and the changes a pilot saved. Two callers
 * handing over those five equal are asking one question, and the answer is the same objects rather than the same values.
 */
const KEY = (
  model: Model | null,
  received: Entry[],
  shown: number,
  changes: Change[],
  fork: number | null,
  live: Record<string, [number, number]>,
) => [model, received, shown, changes, fork, live];
let last: { key: unknown[]; value: Space } | null = null;

function derive(
  model: Model | null,
  received: Entry[],
  shown: number,
  changes: Change[],
  fork: number | null,
  live: Record<string, [number, number]>,
): Space {
  const key = KEY(model, received, shown, changes, fork, live);
  if (last && last.key.length === key.length && last.key.every((each, index) => each === key[index])) {
    return last.value;
  }

  const revealed = received.slice(0, shown);
  const step = model ? sceneStep(model.scenes, shown) : 0;
  const at = fork ?? received.length;
  const applied = shown >= at ? changes : [];
  const world = model ? worldOf(model, step, shown, received, applied, live) : null;

  const lastOf: Record<string, Entry | null> = {};
  for (const unit of world?.standing ?? []) {
    lastOf[unit.id] = [...revealed].reverse().find((entry) => writerOf(entry) === unit.id) ?? null;
  }

  const value: Space = {
    model,
    received,
    shown,
    revealed,
    inView: revealed.slice(-IN_VIEW),
    step,
    at,
    world,
    branch: changes.length ? { fork: at, units: changes.map((change) => change.unit) } : null,
    scene: model?.scenes[step - 1] ?? null,
    lastOf,
  };
  last = { key, value };
  return value;
}

export function useWorld(): Space {
  const model = useScenario((state) => state.model);
  const projectId = useScenario((state) => state.projectId);
  const received = useVolume().received;
  const shown = useVolume().shown;
  const changes = useEdits((state) => state.changes);
  const fork = useEdits((state) => state.fork);
  const live = useLive((state) => (state.project === projectId ? state.states : NO_STATES));

  return useMemo(
    () => derive(model, received, shown, changes, fork, live),
    [model, received, shown, changes, fork, live],
  );
}
