// The pieces of a deployment's build that are the same in every deployment.
//
// A board is read at run time, so a build carries it beside the assets. The chunks are the two engines and the frame,
// which change on their own schedule and are cached on their own: the renderer is large and rarely rebuilt, the map is
// larger still, and the frame sits between them. Splitting them is not tuning, it is what keeps a deploy from making a
// reader fetch a renderer that did not change.
//
// It is plain ESM rather than TypeScript because a `vite.config.ts` is loaded by Node, and Node does not load a `.ts`
// file out of `node_modules`.

/**
 * The packages that must resolve to one copy.
 *
 * React is a peer of the frame, so a second copy is a second set of hooks and a tree that renders twice. Three arrives
 * from the shell view and from a deployment's own 3D work, and two copies of it are two contexts and a screenshot that
 * is blank where a picture should be.
 */
export const SKENE_DEDUPE = ['react', 'react-dom', 'three', 'zustand'];

/**
 * The size above which a build warns.
 *
 * The number is a fact about the engines rather than about an application: the map is the largest of them, and a chunk
 * that grows past this one is the application's own weight and should be said so.
 */
export const SKENE_CHUNK_LIMIT = 1200;

/**
 * Which file a module is emitted into.
 *
 * `@react-three` travels with the frame because those bindings are how the frame's shell reading is drawn; separating
 * the two produced a chunk cycle of three, the frame, and three's React bindings.
 *
 * @param {string} id the module's resolved path
 * @returns {string | undefined} the chunk's name, or undefined for the application's own chunks
 */
export function skeneChunks(id) {
  if (id.includes('node_modules/maplibre-gl')) return 'maplibre';
  if (id.includes('node_modules/three/')) return 'three';
  if (id.includes('node_modules/@react-three')) return 'skene';
  if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
  if (id.includes('node_modules/@ssccsorg/')) return 'skene';
  // This repository's own example builds against the checkout rather than an installed copy, so its packages resolve to
  // `packages/<name>`. Naming them is what lets the example be built the way a deployment is.
  if (/(^|\/)packages\/(board|frame|kernel|ui|view-[a-z]+)\//.test(id)) return 'skene';
  return undefined;
}
