// What the kernel is, and what a module above it may take from here.
//
// The kernel is the frame's contracts and the logic that is answerable without a browser: a record and its kinds, a place
// and the coordinates it gives, a scenario and the campaign over it, and the pack rule that says which readings stand for
// a project. Nothing here holds React, a store, a canvas or a renderer, so the same modules serve a test, a node tool and
// the frame, and a package above this one depends on the contract rather than on another package's implementation.
//
// One entry rather than a subpath per module: a package that reached for `@ssccsorg/skene-kernel/scenario` would be
// naming the file a declaration lives in, and moving that declaration would then be a breaking change for a reason that
// has nothing to do with the contract. What is exported here is the contract, and the list is the whole of it.
export * from './types';
export * from './address';
export * from './hex';
export * from './campaign';
export * from './causes';
export * from './intents';
export * from './round';
export * from './scenario';
export * from './tracks';
export * from './offer';
export * from './live';
export * from './source';
export * from './attributes';
