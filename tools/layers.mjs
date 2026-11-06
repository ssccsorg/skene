// The README's Layers table, as data.
//
// Two rules hold the table. A package imports a package that stands above it in the table, and a picture imports
// another picture nowhere. A bare import that its own package.json does not declare is the third rule, because a
// package that only resolves because a sibling happens to be installed is the thing the boundaries exist to prevent.
//
// A directory under `packages/` this file does not name is a failure. A new picture is one entry in a list, and no
// rule is written beside it.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PACKAGES = join(ROOT, 'packages');

// Ordered foundation to pane: a row imports the rows above it and nothing below.
const LAYERS = ['kernel', 'ui', 'board', 'frame'];

// One perspective each: a picture imports any layer and no other picture.
const PICTURES = ['view-media', 'view-map', 'view-shell', 'view-graph'];

const EXTENSIONS = ['.ts', '.tsx'];
const SOURCE = 'src';

/** The package a bare specifier names, or null when it is relative, rooted, or a node builtin. */
function packageOf(spec) {
  if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('node:')) return null;
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/** The layer or picture a skene package name stands for, or null for anything outside this repository. */
function ofSkene(name) {
  const prefix = '@ssccsorg/skene-';
  return name.startsWith(prefix) ? name.slice(prefix.length) : null;
}

/** Every import specifier in one file, in the `from 'x'` form and the side-effect `import 'x'` form. */
function specifiersIn(text) {
  // A line that begins a comment is dropped first: prose names a package too, and a specifier is always code. A
  // multi-line import keeps its `} from 'x'` line, which does not begin a comment.
  const code = text
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n');
  const out = [];
  for (const pattern of [/from\s+['"]([^'"]+)['"]/g, /import\s+['"]([^'"]+)['"]/g]) {
    for (const match of code.matchAll(pattern)) out.push(match[1]);
  }
  return out;
}

function filesIn(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const at = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesIn(at));
    else if (EXTENSIONS.some((extension) => entry.name.endsWith(extension))) out.push(at);
  }
  return out;
}

/** The rows a package may import. */
function allowedFor(pkg) {
  const layer = LAYERS.indexOf(pkg);
  if (layer !== -1) return new Set(LAYERS.slice(0, layer));
  if (PICTURES.includes(pkg)) return new Set(LAYERS);
  return null;
}

const failures = [];
let checked = 0;

const declared = (pkg) => {
  const manifest = JSON.parse(readFileSync(join(PACKAGES, pkg, 'package.json'), 'utf8'));
  return new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ]);
};

for (const pkg of readdirSync(PACKAGES).sort()) {
  const allowed = allowedFor(pkg);
  if (!allowed) {
    failures.push(`${pkg}: is a package the layer table does not name`);
    continue;
  }

  const known = declared(pkg);
  for (const file of filesIn(join(PACKAGES, pkg, SOURCE))) {
    for (const spec of specifiersIn(readFileSync(file, 'utf8'))) {
      const name = packageOf(spec);
      if (!name) continue;
      const at = relative(ROOT, file);

      const target = ofSkene(name);
      if (target === pkg) continue;
      checked += 1;

      if (!known.has(name)) {
        failures.push(`${pkg}: imports ${name}, which its package.json does not declare (${at})`);
      }
      if (target === null) continue;
      if (!allowed.has(target)) {
        failures.push(`${pkg}: imports ${target}, which the layer table does not put above it (${at})`);
      }
    }
  }
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  console.error(`\nlayer table: ${failures.length} failure(s), ${checked} imports checked`);
  process.exit(1);
}

console.log(`layer table: ${LAYERS.join(' < ')} | pictures: ${PICTURES.join(' ')}`);
console.log(`${checked} imports checked, every one declared and above its importer`);
