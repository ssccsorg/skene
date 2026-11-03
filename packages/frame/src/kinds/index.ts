// The window kinds the frame ships, listed where a kind is registered.
//
// The one here is a first-party library rather than a core: a map brings MapLibre. It registers through the same call a
// deployment's kind would, and this file is the whole of what the frame does on its behalf. Footage is the other one and
// it is a package of its own (`@ssccsorg/skene-view-media`), so a deployment that has none does not install it.
import './map';
