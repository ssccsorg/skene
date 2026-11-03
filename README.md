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
import { Frame, type Brand } from '@ssccsorg/skene-frame';
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
| `@ssccsorg/skene-frame` | the frame, the brand, the registers, the host, the room a deployment supplies, and the board's store |
| `@ssccsorg/skene-frame/ui` | the buttons, the row and label tokens and `cn`, for the one form a deployment draws itself |
| `@ssccsorg/skene-frame/tokens.css` | the palette, with `--mark` and `--board` as the tokens a product overrides |

The layers below them (`lib/*`, `stores/*`, `hooks/*`, `views/*`, `components/*`) are exported on purpose and are
not the frame's whole point of contact. They exist for a deployment's tests and tools, which read that deployment's
board and parse its runs, and they carry the same compatibility promise as the module in them.

Two stores are the exception, and they are exported from the root: `useScenario` and `useRecords`. Adding a project to
the board while the surface is running is built in, not a pack's privilege, so a deployment with an import form writes
through `useScenario` and reads a project's records through `useRecords` without reaching past the contract. Any other
runtime reach into `stores/*` is the change that will be asked to move.

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
one taken and not yet concluded, and one nobody has taken. The screenshot above is that board.

```bash
npm run build        # typecheck and a production bundle
```

## Layout

```text
packages/kernel/      the contracts and the logic that answers without a browser: records, places,
                      scenarios, campaigns, and the pack rule. No React, no DOM, no renderer
packages/board/       the space's geometry: bearings, the projection onto the shell, the patch a window
                      covers, the disc a place is read as, and the glyphs a member is drawn by
packages/ui/          the kit: primitives, chrome vocabulary, colour, and the palette (tokens.css)
packages/frame/       the frame: src/, tokens.css, index.ts, built on the kernel and the kit
packages/frame/tools/ the board-carrying build plugin a deployment's vite config imports
packages/view-media/  footage as a window kind: the picture, the surface it fills, the member's row and the
                      control that fills the surface
packages/view-map/    ground as a window kind and a reading: the picture on the shell, the page's toolbar, and
                      the place drawn as a map
packages/view-shell/  the cockpit as a reading: the space drawn on the shell, the windows standing on it, and the
                      wires control
packages/view-graph/  the run as a graph, as a reading: the nodes, the edges and the layout they are drawn in
examples/board/       the smallest deployment: a brand, a board, one run, and its own tests
```

The kernel is a package of its own because its consumers are not all the frame: a deployment's node tools read a
record, a place and a scenario without a browser, and a test asserts that nothing above it has reached down into it.

The kit is a package because its consumers are not only the frame: a deployment's own form takes the same primitives,
and the palette is the kit's, so a deployment that draws one control does not carry a second design system.

The space's geometry is a package because everything that draws on the shell places things the same way: the cockpit,
the two kind packages and the readings the frame keeps. It holds no run and no store, so it answers a bearing without a
project being open.

A window kind is a package of its own, and so is every picture the bar offers. The frame ships none of them: footage,
ground, the space drawn on the shell and the run as a graph are packages, and a deployment imports the pictures it draws.
Importing one is what installs it, so a deployment with no footage carries neither a video element nor its sampler, one
with no map carries no map library, one that opens on a table carries no three.js scene, and one with no graph carries no
graph layout engine.

## Consuming it

A deployment clones this repository beside its own and quotes a path into it, which needs no registry:

```bash
git clone --depth 1 https://github.com/ssccsorg/skene ../skene
```

```json
"@ssccsorg/skene-frame": "file:../skene/packages/frame"
```

The path is relative to the deployment's own manifest, so it gains a `../` for every directory the
manifest sits below its repository root: a manifest one directory down writes `../../skene`, and one two
directories down writes `../../../skene`.

A deployment that draws footage or a map declares the packages that install them:

```json
"@ssccsorg/skene-view-media": "file:../skene/packages/view-media",
"@ssccsorg/skene-view-map": "file:../skene/packages/view-map",
"@ssccsorg/skene-view-shell": "file:../skene/packages/view-shell",
"@ssccsorg/skene-view-graph": "file:../skene/packages/view-graph"
```

A deployment that reads the kernel directly, in a node tool or in its own tests, declares it beside the frame:

```json
"@ssccsorg/skene-kernel": "file:../skene/packages/kernel"
```

The frame brings it as a dependency, so a deployment that only draws the board needs the one line.

A deployment installs the frame packed rather than linked, which is one line in its `.npmrc`:

```text
install-links=true
```

That is what lets a deployment declare only what it imports: the frame's own dependencies arrive with it, there is one
React in the tree, and no bundler needs a symlink flag. The cost is that an edit here is picked up by the next
`npm install` in the deployment rather than on the next render. A published package replaces the path with a version
range and the `.npmrc` with nothing.

## Status

The frame and its example run, and two deployments consume it rather than carrying a copy. The
surface is versioned from here: the pack registry and the host are the stable API, and `index.ts` is
the whole of it.

The package publishes TypeScript source rather than a build, so a consumer's bundler compiles it.
That is deliberate while the API moves; a build step comes with the first release that has to be
consumed by something other than Vite.

## Tests

```bash
npm test --workspace @ssccsorg/skene-frame              # the frame's 45 suites
npm test --workspace @ssccsorg/skene-frame -- --coverage # the same, with the coverage gate
```

The tests cover the record model, the address, the scenario reader, the room contract, the pack
registry and the host. There are no DOM tests: the components are drawn by the example rather than
asserted, and the coverage gate is set where the tests actually reach rather than where they do not.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports go to the address in [SECURITY.md](SECURITY.md).

## Licence

Apache-2.0. See [LICENSE](LICENSE).
