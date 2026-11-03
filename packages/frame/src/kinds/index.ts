// The window kinds the frame ships, listed where a kind is registered.
//
// The two here are first-party libraries rather than cores: footage brings a video element and the surface, a map brings
// MapLibre. They register through the same call a deployment's kind would, and this file is the whole of what the frame
// does on their behalf. A deployment that wants neither installs neither.
import './media';
import './map';
