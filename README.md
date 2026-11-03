# Skene

Universal control surface for FIH state chains.

A single open layer where every fact, intent, and hint is made visible, verifiable, and
controllable. It sits beneath your products, adapting to any domain through modular packs.

![The example board: eight members, three chains, and the record they are read from](docs/skene-example.png)

A deployment supplies a brand and a board and does not supply a frame, which is what lets one surface
serve a fleet, a verification corpus or a codebase without any of them forking it.

## Where it sits

The record this surface draws is the substrate's own vocabulary, not a format invented for a screen.
The three kinds are a chain: a fact is observed, an intent is declared over it, and a hint bounds the
judgement that took it. That chain is what the surface controls, and FIH is its short name.

| The substrate | The record | The surface |
|:---|:---|:---|
| a Segment is a coordinate with an identity derived from it | the address of a fact | the coordinate a reading is asked for |
| an Observation projects a Field and produces a projection | a **fact** | a row, a mark, a point |
| a Field is the predicate that says what is admissible | a **hint**, the bound a judgement was made under | what a member was not allowed to do |
| an act is a declaration that binds an observation to work | an **intent**, taken by one member and concluded in a fact | the chain, and the queue of work not yet taken |

So the three kinds are not decoration. A hint *bounds*, and a panel can say what a machine was kept
from doing because of it. An intent is *taken*, and the record shows who took it and what came of it.
An observation is *addressed*, and the address is computed from its fields rather than found through
an index. A surface that gave those three up would be a log viewer, which is the commodity this
exists against.

A domain may rename the three in its own bundle. It may not change what they mean.

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

## What a deployment may reach

Three entries are the contract, and they are what a product's own code uses:

| Entry | What it is |
|:---|:---|
| `@ssccs/skene-frame` | the frame, the brand, the registers, the host, and the room a deployment supplies |
| `@ssccs/skene-frame/ui` | the buttons, the row and label tokens and `cn`, for the one form a deployment draws itself |
| `@ssccs/skene-frame/tokens.css` | the palette, with `--mark` and `--board` as the tokens a product overrides |
| `skene-shot` | the screenshot tool, at a viewport and a frame named on the command line |

The layers below them (`lib/*`, `stores/*`, `hooks/*`, `views/*`, `components/*`) are exported on purpose and are
not the frame's whole point of contact. They exist for a deployment's tests and tools, which read that deployment's
board and parse its runs, and they carry the same compatibility promise as the module in them. A product's runtime
code that reaches into `stores/*` is reaching past the contract, and it is the change that will be asked to move.

What the frame remembers between visits is kept under `skene.*`, through `storageName`. A deployment that installs a
store of its own adds its name to that namespace rather than opening a second one, because two builds that share an
origin would otherwise read each other's arrangement.

## Running the example

```bash
npm install
npm run dev          # http://localhost:5290
```

The example is one project, one run, one place: a blackboard, two workers, a machine, a sensor, a
rover, a camera and a reader. It carries three chains, which is what a queue can be in: one closed,
one taken and not yet concluded, and one nobody has taken. The screenshot above is that board, taken
with the frame's own tool against a dev server:

```bash
npx skene-shot 1600 1000 http://localhost:5290/ out.png
```

```bash
npm run build        # typecheck and a production bundle
```

## Layout

```text
packages/frame/      the frame: src/, tokens.css, index.ts
packages/frame/tools/shot.mjs   the screenshot tool, installed as `skene-shot`
examples/board/      the smallest deployment: a brand, a board, one run
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
