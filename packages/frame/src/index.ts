/// <reference path="./r3f.d.ts" />
// The reference above is the frame's own typing contract: a patch it draws uses three's JSX elements, and a deployment
// that installs no 3D view must still be able to compile the frame. Leaving it to whichever view package a deployment
// happens to import made the frame's types depend on an extension it does not own.

// What a deployment reaches for: the frame, the brand it is drawn under, and the registers a domain plugs into.

export { Frame } from './Frame';
export { BrandMark, BrandProvider, useBrand } from './lib/brand';
export type { Brand } from './lib/brand';
export { deviceViews, feed, frontUrl, host, NO_SHELL } from './lib/host';
export { registerRoom } from './lib/channel';
export type { Host, Screen } from './lib/host';
// The room is the second seam a deployment supplies, and a deployment that writes one reads these: exporting the
// register without the shape it takes would send every deployment below the contract for the type of its own room.
export type {
  Agent,
  Message,
  PendingCall,
  Progress,
  Role,
  Room,
  ThreadSummary,
  Watchers,
} from './lib/channel';

export { NATIVE, registerPack, registerReading, standing } from './lib/readings';
export type { Board, Pack, Reading, Want } from './lib/readings';
export { bundleOf, PROJECT_FORMAT, registerResource } from './lib/project';
export type { BoardDocument, ProjectDocument } from './lib/project';
export { actors, chainFor, entityOf, INTENT, parseScenario, titleOf } from '@ssccsorg/skene-kernel';
export { registerPanel } from './lib/panels';
export { registerInstrument } from './lib/instruments';
// A kind is the format's own vocabulary, and its mark is the frame's: a deployment that draws a record reads the mark
// here rather than choosing a colour and a letter of its own, which is a second vocabulary free to disagree with it.
export { KindTag } from './components/KindTag';
export { useScenario } from './stores/scenario';
export { useRecords } from './stores/records';

// The readings the frame ships register themselves when their modules are imported, which is the whole of the native
// pack. A window kind is a package: a deployment that draws one imports it, and that import is what installs it.
import './views';
