import { useCallback, useEffect, useMemo } from 'react';
import type { Asked } from '../lib/channel';
import { roomOf } from '../stores/chat';
import { useAskStore } from '../stores/asks';
import { useScenario } from '../stores/scenario';

// The one place the frame asks a room what a member can be asked, and the answer every control is drawn from.
//
// The question is the room's and not the declaration's, because only the member's side knows what a line to it would run:
// a room that answers nothing is a deployment with no executor-side path, and what the caller gets back is the absence
// rather than an empty row, which is how a panel tells "nothing to draw" from "not known yet".
//
// It is the same shape as the reading over what a member holds, because it is the same question about another member of
// the room's contract, and the room is resolved here once rather than reached for by each control.

export interface Asks {
  /** What the room answered about a member, or null when nothing has been asked or the room does not answer this. */
  asks: (member: string) => Asked[] | null;
  /** Ask the room about a member, once. */
  ensure: (member: string) => void;
}

export function useAsks(): Asks {
  const project = useScenario((state) => state.projectId);
  const rows = useAskStore((state) => state.rows);
  const answered = useAskStore((state) => state.answered);

  // Another project is another room, so what the last one answered is not an answer about this one: two projects may both
  // stand a member under the same name, and an answer left standing would be the other project's.
  //
  // What is reconciled is the store's own room and not this instance's memory of it, because the store outlives every
  // instance: a panel that is put away while the project changes mounts again against a store it never saw change, and a
  // memory of its own would leave the last room's answers drawn as this one's. The first instance to mount after such a gap
  // is what takes the store over, and any instance standing is that first one.
  useEffect(() => {
    if (!project) return;
    if (useAskStore.getState().room === project) return;
    useAskStore.getState().clear(project);
  }, [project]);

  /**
   * The room's own answer about a member, or null when the room this project is read from answers nothing here.
   *
   * A room without this member is the one case a capability is really asked for, and its absence is what the caller reads
   * as "there is nothing to draw" rather than as a member with no abilities.
   */
  const lower = useMemo(() => {
    if (!project) return null;
    const room = roomOf(project);
    const asks = room.asks?.bind(room);
    return asks ? (member: string) => asks(project, member) : null;
  }, [project]);

  const ensure = useCallback(
    (member: string) => {
      if (useAskStore.getState().asked[member]) return;
      if (!lower) return;
      // The member is claimed before the answer arrives, which is what stops a row drawn every frame from being asked
      // once a frame. A failed read leaves the claim standing, because the room is what failed and asking again on every
      // frame would turn one failure into a request per frame.
      answered(member, null);
      void lower(member).then(
        (found) => answered(member, found),
        () => answered(member, null),
      );
    },
    [lower, answered],
  );

  return { asks: useCallback((member: string) => rows[member] ?? null, [rows]), ensure };
}
