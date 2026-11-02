// The registers, held to the one line each of them costs.
//
// A register knows only what has been imported, so each kind of member is one file and one line in that kind's own
// barrel. The line is invisible when it is missing: a panel, a reading or a control that is not loaded is one the frame
// never draws and never complains about. That is what this holds, by reading the kind's directory and the barrel that
// is supposed to load it, so a member added as a file and not added to the barrel is a failing test rather than a
// member nobody sees.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { declaredPanels } from '@/lib/panels';
// The barrels are what load the members, so importing them is what the frame does when it draws.
import '@/components/instruments';
import '@/components/panels';
import '@/views';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** The modules in one kind's directory: one member a file, and `index.ts` is the barrel that lists them. */
function modules(dir: string): string[] {
  return readdirSync(here(`../src/${dir}`)).filter((name) => name !== 'index.ts' && /\.tsx?$/.test(name));
}

/** What a barrel lists, by the module names it imports. */
function loaded(barrel: string): string[] {
  return [...barrel.matchAll(/from\s+'\.\/([^']+)'|import\s+'\.\/([^']+)'/g)].map((match) => match[1] ?? match[2]);
}

const KINDS = [
  { kind: 'a panel', dir: 'components/panels', barrel: 'components/panels/index.ts', declares: /registerPanel\(/ },
  { kind: 'a reading', dir: 'views', barrel: 'views/index.ts', declares: /registerReading\(/ },
  {
    kind: 'a control',
    dir: 'components/instruments',
    barrel: 'components/instruments/index.ts',
    declares: /registerInstrument\(/,
  },
];

test('a module that declares itself is loaded by its kind own barrel', () => {
  for (const { kind, dir, barrel, declares } of KINDS) {
    const listed = loaded(readFileSync(here(`../src/${barrel}`), 'utf8'));
    const declaring = modules(dir).filter((name) => declares.test(readFileSync(here(`../src/${dir}/${name}`), 'utf8')));
    expect(declaring.length, `${dir} declares ${kind}`).toBeGreaterThan(0);
    for (const name of declaring) {
      const stem = name.replace(/\.tsx?$/, '');
      expect(listed, `${kind} declared in ${name} and the barrel does not load it`).toContain(stem);
    }
  }
});

test('the panels the frame draws are the ones the panel modules declare', () => {
  // The register's own answer, so the barrel is held twice: that it lists the modules, and that listing them is what
  // puts their keys in the register. A module whose key never arrives would otherwise pass the test above.
  const declared = new Set<string>();
  for (const name of modules('components/panels')) {
    const source = readFileSync(here(`../src/components/panels/${name}`), 'utf8');
    for (const match of source.matchAll(/registerPanel\(\{\s*key:\s*'([^']+)'/g)) declared.add(match[1] as string);
  }
  expect([...declared].sort()).toEqual(declaredPanels().map((panel) => panel.key).sort());
});
