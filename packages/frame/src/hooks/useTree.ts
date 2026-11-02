import { useEffect, useMemo } from 'react';
import { HELD_DEPTH, HELD_ELEMENTS, withinOf } from '../lib/holds';
import { sourceFor } from '../lib/sources';
import { useScenario } from '../stores/scenario';
import { useTreeStore } from '../stores/tree';
import type { Root } from './useHolds';

// The space's whole tree, read once so that naming something shows what is under it on the first `@`.
//
// What bounds the walk is the pair that bounds a drawn tree (`HELD_DEPTH`, `HELD_ELEMENTS`), because it is the same tree:
// an offer that stopped somewhere else than the space would be two answers to what a member holds. The depth alone is not
// a bound, because a directory of directories is unbounded in elements, so the walk is spent as well as bounded and it
// stops at the far end of a level rather than inside the first branch of it.
//
// The walk is level by level with a few requests in flight at a time. A level asked whole at once is a burst, and one at a
// time is a walk that takes as long as the tree is wide; a window of a few is neither.
//
// A member the room refuses to answer about is a member nothing is read under, and the refusal is swallowed here rather
// than reported: what a member holds is drawn where the member is opened (`properties/Holds`), which is where a pilot can
// read why it was refused. The offer only asks whether there is anything to name.

/** How many levels are asked at once. */
const WIDTH = 6;

/** One level still to be walked: the member it belongs to, the address of the level, and how deep it stands. */
interface Node {
  root: Root;
  address: string;
  depth: number;
}

export function useTree(roots: Root[]): string[] {
  const project = useScenario((state) => state.projectId);
  const sources = useScenario(
    (state) => state.projects.find((each) => each.id === state.projectId)?.sources,
  );
  const room = useTreeStore((state) => state.room);
  const addresses = useTreeStore((state) => state.addresses);
  // The roots are read whole as one key: they are rebuilt on every render from the world, and an effect that depended on
  // the array itself would walk the space again on every cursor step of a replay.
  const key = useMemo(
    () => roots.map((root) => `${root.member}\u0000${root.at}`).join('\u0001'),
    [roots],
  );

  useEffect(() => {
    if (!project || !roots.length) return;
    if (useTreeStore.getState().room === project) return;
    useTreeStore.getState().clear(project);
    const lower = lowerOf(project, sources);

    void (async () => {
      const out = roots.map((root) => root.member);
      useTreeStore.getState().found(out);

      let level: Node[] = roots.map((root) => ({ root, address: root.member, depth: 1 }));
      while (level.length && out.length < HELD_ELEMENTS) {
        const next: Node[] = [];
        for (let at = 0; at < level.length; at += WIDTH) {
          const batch = level.slice(at, at + WIDTH);
          const answers = await Promise.all(
            batch.map((node) =>
              lower({ member: node.root.member, at: node.root.at, dir: withinOf(node.root.member, node.address) }).catch(
                () => [],
              ),
            ),
          );
          // A room left while the walk was in flight has another room's addresses now, and this one's waits are not its.
          if (useTreeStore.getState().room !== project) return;
          const read: string[] = [];
          batch.forEach((node, index) => {
            for (const each of answers[index] ?? []) {
              read.push(each.name);
              // The room names an element under the member, so the address is the room's own and the level under it is
              // asked about by the part within the member, which is the same spelling a drawn tree asks by.
              if (each.dir && node.depth < HELD_DEPTH) {
                next.push({ root: node.root, address: each.name, depth: node.depth + 1 });
              }
            }
          });
          useTreeStore.getState().found(read);
          out.push(...read);
        }
        level = next;
      }
    })();
    // The key is what the walk is over and not what it is: the members are read from the world once, so the walk goes when
    // the key changes rather than on every render that rebuilds the same list.
  }, [project, key, roots, sources]);

  return room === project ? addresses : [];
}

/** The source's answer about one level of one member, or null when this project has no source that keeps a tree. */
function lowerOf(project: string, sources: Parameters<typeof sourceFor>[2]) {
  return (ask: { member: string; at: string; dir: string }) => {
    const source = sourceFor(project, ask.member, sources);
    if (!source) return Promise.reject(new Error(`${ask.member} has no source that keeps a tree`));
    return source.list(ask);
  };
}
