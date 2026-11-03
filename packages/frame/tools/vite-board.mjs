// The board a deployment's build carries.
//
// A board is read at run time, so the record the engine made stays the file the engine made rather than a copy baked
// into a bundle: the app fetches `projects.json` and the runs it names. A production build therefore has to put them
// beside the assets, and every deployment did the same two copies. It is four lines that were written three times,
// which is the kind of duplicate that drifts silently when one product changes where its board lives.
//
// It is plain ESM rather than TypeScript because a `vite.config.ts` is loaded by Node, and Node does not load a `.ts`
// file out of `node_modules`.

import { copyFile, cp } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Copy a deployment's board and its runs into the build.
 *
 * @param {{ board?: string, runs?: string }} [options] the board's file and the directory its runs are in, relative to
 *   the project root
 * @returns {import('vite').Plugin}
 */
export function boardIntoBuild(options = {}) {
  const board = options.board ?? 'projects.json';
  const runs = options.runs ?? 'scenario';
  let root = process.cwd();
  let outDir = 'dist';
  return {
    name: 'the-board-into-the-build',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = config.build.outDir;
    },
    async closeBundle() {
      await copyFile(join(root, board), join(root, outDir, board));
      await cp(join(root, runs), join(root, outDir, runs), { recursive: true });
    },
  };
}
