import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Lower } from '../lib/channel';
import { withinOf } from '../lib/holds';
import { sourceFor } from '../lib/sources';
import { useHoldStore } from '../stores/holds';
import { useScenario } from '../stores/scenario';

// The one place the frame asks a room what a member holds, and the answer every surface reads.
//
// The room belongs to the frame, so it is resolved here once and handed on as answers rather than as a room: a part
// or a mark that reached for the room itself would be a second opinion about which room answers this project. The
// pick and the open set are not here, because a tree's own shape is the store's; what is here is the ask.
//
// A level is asked about by the address it is keyed under, which leads with the member, and what the room is handed is the
// part under that member: the root and the name are the same for every level of one tree, so they are settled once, where
// the tree is drawn, rather than at each row.

export interface Holds {
  /** What the room answered about each path. */
  rows: Record<string, Lower[]>;
  /** Why a path could not be read, by path. */
  why: Record<string, string>;
  /** Which paths are open. */
  open: string[];
  isOpen: (path: string) => boolean;
  /** Open a path, or close it and everything under it. */
  toggle: (path: string) => void;
  /** Ask the room about a path, once. */
  ensure: (path: string) => void;
}

/** The member a tree belongs to, as the room needs it: the name it states under, and where its elements live. */
export interface Root {
  member: string;
  at: string;
}

export function useHolds(root: Root | null): Holds {
  const project = useScenario((state) => state.projectId);
  const sources = useScenario(
    (state) => state.projects.find((each) => each.id === state.projectId)?.sources,
  );
  const rows = useHoldStore((state) => state.rows);
  const why = useHoldStore((state) => state.why);
  const open = useHoldStore((state) => state.open);
  const answered = useHoldStore((state) => state.answered);
  const toggle = useHoldStore((state) => state.toggle);
  const clear = useHoldStore((state) => state.clear);

  // Another project is another room, so what the last one answered is not an answer about this one: two projects may
  // both stand a member under the same name, and a tree left standing would be the other project's. What is remembered
  // is the project rather than the fact of mounting, because a level mounting is a folder opening in the same room.
  const room = useRef(project);
  useEffect(() => {
    if (room.current === project) return;
    room.current = project;
    clear();
  }, [clear, project]);

  const member = root?.member ?? null;
  const at = root?.at ?? null;

  /**
   * The source's answer about a level, or null when this member has no source that keeps a tree.
   *
   * A source without this member is the one case a capability is really asked for: the panel that asked says so rather
   * than drawing an empty list. The source is the member's own declaration first and the room's answer otherwise.
   */
  const lower = useMemo(() => {
    const source = sourceFor(project, member, sources);
    return source ? (ask: { member: string; at: string; dir: string }) => source.list(ask) : null;
  }, [project, member, sources]);
  const ensure = useCallback(
    (path: string) => {
      if (member === null || at === null) return;
      if (useHoldStore.getState().asked[path]) return;
      if (!lower) return;
      // The path is claimed before the answer arrives, which is what stops a level drawn every frame from being asked
      // once a frame. The claim carries no answer, so it cannot be read as one.
      answered(path, null, null);
      void lower({ member, at, dir: withinOf(member, path) }).then(
        (found) => answered(path, found, null),
        (error) =>
          // Read as a sentence and not as a stack: the reason a listing failed is what a person can act on, and the
          // room's own words are what says whether it is the tree, the credential or the window that is missing.
          answered(path, null, error instanceof Error ? error.message : String(error)),
      );
    },
    [lower, answered, member, at],
  );

  const isOpen = useCallback((path: string) => open.includes(path), [open]);

  return { rows, why, open, isOpen, toggle, ensure };
}
