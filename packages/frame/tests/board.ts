// The board the frame's own tests stand on.
//
// A deployment brings its own projects, so a frame assertion made against one product's board is an assertion a
// deployment can move out from under. What stands here is the example's board: the smallest one that draws, committed
// for the demonstration, and owned by nobody. A test that reads it exercises the example on the way past, which is the
// other reason it is the one to read.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { bundleOf, type ProjectDocument } from '@/lib/project';
import { titleOf } from '@/lib/scenario';
import { buildModel, type Model } from '@/lib/world';
import type { Bundle } from '@/lib/types';

const ROOT = fileURLToPath(new URL('../../../examples/board/', import.meta.url));

/** Every project the example board declares. */
export function documents(): ProjectDocument[] {
  const board = JSON.parse(readFileSync(`${ROOT}projects.json`, 'utf8')) as {
    projects: ProjectDocument[];
  };
  return board.projects;
}

/** The record text a bundle names, read from the board the bundle came from. */
export function recordOf(bundle: Bundle): string {
  return readFileSync(`${ROOT}${bundle.record}`, 'utf8');
}

/**
 * The example project as a bundle and the model built from its run.
 *
 * The two are separate because most of what the frame decides is asked of one or the other: the bundle is the
 * declaration, the model is the record read over it.
 */
export function example(): { bundle: Bundle; model: Model } {
  const projects = documents();
  const document = projects.find((entry) => entry.id === 'example');
  if (!document) throw new Error('the example board declares no example project');
  const bundle = bundleOf(document, projects);
  bundle.text = recordOf(bundle);
  bundle.title = titleOf(bundle.text) || bundle.id;
  return { bundle, model: buildModel(bundle.text ?? '', bundle) };
}

/** The example's run, as the text the engine executes. */
export function scenario(): string {
  return readFileSync(`${ROOT}scenario/example.txt`, 'utf8');
}
