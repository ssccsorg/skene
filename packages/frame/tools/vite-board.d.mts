// The declaration for `vite-board.mjs`, which is plain ESM so that a `vite.config.ts` can load it.

import type { Plugin } from 'vite';

export interface BoardOptions {
  /** The board's file, relative to the project root. */
  board?: string;
  /** The directory the board's runs are in, relative to the project root. */
  runs?: string;
}

/** Copy a deployment's board and its runs into the build. */
export function boardIntoBuild(options?: BoardOptions): Plugin;
