# @ssccsorg/skene-frame

Universal control surface for FIH state chains: a single open layer where every fact, intent, and hint is made
visible, verifiable, and controllable, beneath the products it serves.

A deployment supplies a brand, a board (`projects.json` and one run per project), and optionally a host and a room.
The frame supplies everything else: the address, the record model, the panels, the transport, the place, the native
readings, and the router.

```tsx
import { createRoot } from 'react-dom/client';
import { Frame, type Brand } from '@ssccsorg/skene-frame';
import '@ssccsorg/skene-frame/tokens.css';

createRoot(document.getElementById('root')!).render(<Frame brand={brand} />);
```

The entries that are the contract are `@ssccsorg/skene-frame`, `@ssccsorg/skene-frame/ui`, and
`@ssccsorg/skene-frame/tokens.css`. `@ssccsorg/skene-frame/tools/vite-board.mjs` is the build plugin that copies a
deployment's board into its bundle. The layers under them (`lib/*`, `stores/*`, `hooks/*`, `views/*`, `components/*`) are
exported for a deployment's tests and tools.

The package ships TypeScript source, so the consumer's bundler compiles it. See the repository for the example board,
how to supply a host, and how to plug a domain in as a pack:

https://github.com/ssccsorg/skene

Apache-2.0.
