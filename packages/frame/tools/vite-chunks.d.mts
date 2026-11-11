// The declarations for `vite-chunks.mjs`, which is plain ESM so that a `vite.config.ts` can load it.

/** The packages that must resolve to one copy: React, the renderer, and the store. */
export const SKENE_DEDUPE: string[];

/** Which file a module is emitted into, or undefined for the application's own chunks. */
export function skeneChunks(id: string): string | undefined;
