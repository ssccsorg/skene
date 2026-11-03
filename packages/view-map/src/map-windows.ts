// The controls of a map window, kept where the page's toolbar can reach them.
//
// The map is drawn on the shell now, so its camera belongs to the component inside the canvas and not to the page. The
// toolbar is still a thing of the page, because a button has to be read and pressed, so it asks for the map by the name
// of the window it belongs to. One registry, keyed by the window's own id, is the whole of the relation: a toolbar with
// no map bound to it is a toolbar for a window the frame is not drawing, and it answers nothing.

export interface MapWindowControls {
  zoomIn: () => void;
  zoomOut: () => void;
  /** Fit the place again, which is what a pilot reaches for after losing it. */
  home: () => void;
}

const windows = new Map<string, MapWindowControls>();

/** Bind a window's map to its toolbar; the answer forgets it, so a map that went away leaves no stale control. */
export function bindMapWindow(id: string, controls: MapWindowControls): () => void {
  windows.set(id, controls);
  return () => {
    if (windows.get(id) === controls) windows.delete(id);
  };
}

/** The controls of a map window, or null while its map is not mounted. */
export function mapWindowOf(id: string): MapWindowControls | null {
  return windows.get(id) ?? null;
}
