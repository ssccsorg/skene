# Skene

The open frame. A record written as facts, intents and hints is drawn as one space: a place, the
members standing in it, the run they wrote, and the readings of it. A deployment brings a brand and
a board; it does not bring a frame.

The name is the Greek stage building: the structure the scene is hung on, which stays while the
scene changes.

## The contract

A deployment supplies three things.

| Thing | What it is |
|:---|:---|
| a brand | the name in the bar, the version, the layers it stands on, and the mark |
| a board | `projects.json` and one run per project, read at run time |
| a pack | optionally, readings and resource kinds the frame has never heard of |

The frame supplies everything else: the address, the record model, the panels, the transport, the
place, the native readings, and the router.

```tsx
import { createRoot } from 'react-dom/client';
import { Frame, type Brand } from '@ssccs/skene-frame';
import './styles.css';

const brand: Brand = { title: 'SKENE', name: 'Skene', version: 'v0.1.0', layers: [], Mark, mark };

createRoot(document.getElementById('root')!).render(<Frame brand={brand} />);
```

### A domain's views

A reading declares the pack it belongs to. The frame's own readings are the `native` pack, which
every project stands, so a native view is a packed view and not a privileged one.

```ts
registerPack({ id: 'spec', readings: [{ key: 'field', path: '/field', View: FieldWall }] });
registerResource('fieldspace', (at) => at as FieldSpace);
```

A project names what it wants in its bundle:

```json
{ "kind": "views", "at": { "pack": "spec", "main": "field" } }
```

The board hands every reading the open project's whole bundle, so a pack's reading reads what its
project declared and the frame never learns what it is called.

## Running the example

```bash
npm install
npm run dev          # http://localhost:5290
```

The example is one project, one run, one place: a blackboard, two workers, a reader, and the chain
from a reading to the work it produced.

```bash
npm run build        # typecheck and a production bundle
```

## Layout

```text
packages/frame/      the frame: src/, tokens.css, index.ts
examples/board/      the smallest deployment: a brand, a board, one run
tools/shot.mjs       a screenshot at a named size and frame
tools/relative-imports.mjs   the one-off that made the package resolvable without the app's alias
```

## Consuming it before it is published

A deployment quotes the local path and dedupes React, because the frame resolves its own
dependencies from this checkout and the deployment has its own copy:

```json
"@ssccs/skene-frame": "file:../../skene/packages/frame"
```

```ts
// vite.config.ts
resolve: { dedupe: ['react', 'react-dom'] }
```

A published package replaces the path with a version and the dedupe becomes unnecessary.

## Status

The frame and its example run, and two deployments consume it rather than carrying a copy. The
surface is versioned from here: the pack registry and the host are the stable API, and `index.ts` is
the whole of it.

The package publishes TypeScript source rather than a build, so a consumer's bundler compiles it.
That is deliberate while the API moves; a build step comes with the first release that has to be
consumed by something other than Vite.

## Tests

```bash
npm test --workspace @ssccs/skene-frame              # the frame's 45 suites
npm test --workspace @ssccs/skene-frame -- --coverage # the same, with the coverage gate
```

The tests cover the record model, the address, the scenario reader, the room contract, the pack
registry and the host. There are no DOM tests: the components are drawn by the example rather than
asserted, and the coverage gate is set where the tests actually reach rather than where they do not.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports go to the address in [SECURITY.md](SECURITY.md).

## Licence

Apache-2.0. See [LICENSE](LICENSE).
