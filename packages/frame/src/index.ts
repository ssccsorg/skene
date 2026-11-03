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
export { useScenario } from './stores/scenario';
export { useRecords } from './stores/records';

// The frame's own readings register themselves when their modules are imported, which is the whole of the native pack.
import './views';
