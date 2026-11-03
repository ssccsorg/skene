// Ground, as a deployment takes it.
//
// Importing the package is what installs the map: the window kind, with the picture on the shell and the page's own
// ground, and the reading that shows the place as a map. The stylesheet is imported here because it belongs to the
// library that draws the ground, and a deployment that has no map should not carry it.
import 'maplibre-gl/dist/maplibre-gl.css';
import './kind';
import './MapView';
export { MAP } from './kind';
export { MAP_VIEW } from './MapView';
export { bindMapWindow, mapWindowOf } from './map-windows';
