// The place drawn as a map, with a unit on it or every unit whose kind presents its location.
//
// The member's own location and the array window are one drawing with two scopes: the first is the carrier's pin and
// route over a close window, and the second is every unit over the whole place. The component is here rather than in a
// reading because a member's panel and a window on the shell both draw it, and a reading imports the frame's register:
// importing the reading to draw a map would make the register depend on the panel that depends on the register.
//
// MapLibre is loaded when a map is drawn: the library is large, and a frame that reads the account should not pay for it.
// The worker is Vite's own asset URL, because the path MapLibre resolves at run time is not emitted by a bundled build.

import { useEffect, useRef } from 'react';
import type { GeoJSONSource, Map as MapLibreMap, Marker } from 'maplibre-gl';
import { altitudeOf, spaceLift } from '../lib/board';
import { DARK_MAP, MAP_STYLE, MAP_WORKER, NOTHING, pathOf } from '../lib/geo-map';
import { OVERLAY_PAINT, overlaysOf } from '../lib/map-overlays';
import type { Place, Standing, World } from '../lib/types';
import type { MapTone } from '../stores/frame';
import { located, ownView } from '../lib/world';

/**
 * Put the map's tone on the ground it draws.
 *
 * The flat map is a raster of light tiles, so the page's dark tone is the canvas filter. The orbit is a body in space, and
 * inverting its canvas would invert the space around it; the same tone is therefore a property of the ground layer alone.
 */
function paintTone(map: MapLibreMap, tone: MapTone, orbit: boolean): void {
  const dark = tone === 'dark';
  map.getCanvas().style.filter = orbit ? '' : dark ? DARK_MAP : 'none';
  if (!orbit || !map.isStyleLoaded() || !map.getLayer('ground')) return;
  map.setPaintProperty('ground', 'raster-brightness-max', dark ? 0.55 : 1);
  map.setPaintProperty('ground', 'raster-contrast', dark ? 1.15 : 0);
  map.setPaintProperty('ground', 'raster-saturation', dark ? -0.4 : 0);
}

/**
 * A mark grows on hover, which is how a small ground marker is read without leaving the map.
 *
 * The scale is on the mark's own contents and never on the element MapLibre places. MapLibre writes that element's
 * transform on every frame of a pan or a zoom, so a transition there would animate the map's own motion and leave the mark
 * behind the ground it names. The contents are a box of their own, so the name grows out of the point.
 */
function hoverable(element: HTMLElement, content: HTMLElement): void {
  element.addEventListener('pointerenter', () => {
    element.dataset.hover = 'true';
    content.style.transform = 'scale(1.5)';
  });
  element.addEventListener('pointerleave', () => {
    delete element.dataset.hover;
    content.style.transform = '';
  });
}

/** A unit's mark: a dot on the ground and the name beside it. */
function unitElement(unit: Standing, picked: boolean, click: () => void): HTMLDivElement {
  const element = document.createElement('div');
  element.dataset.region = 'map-unit';
  element.dataset.unit = unit.id;
  const height = unit.altitude != null ? ` ${altitudeOf(unit.altitude)}` : '';
  element.title = [unit.id, unit.title].filter(Boolean).join(' \u00b7 ') + height;
  // Absolute, which is what the marker class gives it: a mark left in the canvas container's flow is placed by its own
  // order in the list, so each one stands a marker's height below the one before it, and that offset stays a pixel
  // count while the ground scales under it. MapLibre's own transform places the element; nothing here may keep it in flow.
  element.style.cssText = 'width:12px;height:12px;cursor:pointer;pointer-events:auto;';

  const content = document.createElement('div');
  content.dataset.content = '';
  content.style.cssText =
    'position:relative;display:block;width:12px;height:12px;transition:transform .12s ease;';

  const dot = document.createElement('span');
  dot.dataset.dot = '';
  const label = document.createElement('span');
  label.dataset.label = '';
  label.textContent = `${unit.id}${height}`;
  label.style.cssText =
    'position:absolute;left:16px;top:50%;transform:translateY(-50%);white-space:nowrap;' +
    'font:11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--foreground,#e6ece9);' +
    'background:rgba(11,15,14,.72);padding:1px 4px;border-radius:3px;pointer-events:none;';

  content.append(dot, label);
  element.append(content);
  paintUnit(element, unit, picked);
  hoverable(element, content);
  element.addEventListener('click', (event) => {
    event.stopPropagation();
    click();
  });
  return element;
}

/** The SVG namespace the space layer's lines and nadirs are made in. */
const SVG_NS = 'http://www.w3.org/2000/svg';

/** How far above its sub-point a space entity is drawn even over the middle of the globe, in pixels. */
const SPACE_MIN = 26;

/** The part of MapLibre's transform the space layer reads: whether a pixel lands on the near side of the globe. */
interface GlobeSurface {
  cameraToCenterDistance: number;
  center: { lng: number; lat: number };
  isPointOnMapSurface(point: { x: number; y: number }): boolean;
}

/**
 * A unit above the globe, as the map draws it in orbit: the same mark and name, with a ring that says it is in space.
 *
 * It is placed by the layer rather than by a `Marker`, because a marker names a longitude and latitude and this point is
 * above the ground. The ring is the orbit, and the dashed line the layer draws joins it to the sub-point it watches.
 */
function spaceUnitElement(unit: Standing, picked: boolean, click: () => void): HTMLDivElement {
  const element = unitElement(unit, picked, click);
  element.dataset.region = 'space-unit';
  element.style.cssText =
    'position:absolute;width:12px;height:12px;cursor:pointer;pointer-events:auto;transform:translate(-50%,-50%);';
  const ring = document.createElement('span');
  ring.style.cssText =
    'position:absolute;left:50%;top:50%;width:30px;height:30px;transform:translate(-50%,-50%);' +
    'border:1px solid rgba(111,191,159,.45);border-radius:9999px;pointer-events:none;';
  element.prepend(ring);
  return element;
}

/** The dot's ink and halo, which is the only thing a pick changes on a mark already on the map. */
function paintUnit(element: HTMLElement, unit: Standing, picked: boolean): void {
  const dot = element.querySelector('[data-dot]') as HTMLElement | null;
  const label = element.querySelector('[data-label]') as HTMLElement | null;
  if (!dot || !label) return;

  const ink = unit.properties.person ? 'var(--muted-foreground,#8a9690)' : 'var(--claim,#6fbf9f)';
  dot.style.cssText =
    'display:block;width:12px;height:12px;border-radius:9999px;' +
    `background:${picked ? 'var(--claim,#6fbf9f)' : ink};` +
    'border:2px solid var(--background,#0b0f0e);' +
    `box-shadow:0 0 0 ${picked ? 4 : 3}px ${picked ? 'rgba(111,191,159,.38)' : 'rgba(111,191,159,.16)'};`;
  label.style.color = picked ? 'var(--foreground,#e6ece9)' : 'var(--muted-foreground,#a8b6c8)';
  element.dataset.picked = String(picked);
}

/** Draw the layers the register was given, adding each source and layer once and updating its data after. */
function drawOverlays(map: MapLibreMap, place: Place): void {
  for (const overlay of overlaysOf(place)) {
    const source = `overlay:${overlay.id}`;
    const held = map.getSource(source) as GeoJSONSource | undefined;
    if (held) void held.setData(overlay.data as never);
    else map.addSource(source, { type: 'geojson', data: overlay.data as never });
    const paint = OVERLAY_PAINT[overlay.kind];
    if (!map.getLayer(`${source}:line`)) {
      map.addLayer({
        id: `${source}:line`,
        type: 'line',
        source,
        paint: {
          'line-color': paint.color,
          'line-width': paint.width,
          ...(paint.dash ? { 'line-dasharray': paint.dash as [number, number] } : {}),
        },
      });
    }
    if (!map.getLayer(`${source}:point`)) {
      map.addLayer({
        id: `${source}:point`,
        type: 'circle',
        source,
        paint: { 'circle-color': paint.color, 'circle-radius': 3 },
      });
    }
  }
}

/**
 * The place on the earth, with a unit on it or every unit whose kind presents its location.
 *
 * `preview` is a map drawn as a window rather than as a reading: the window's own target takes the drag and its grip the
 * size, so the map is silent to the pointer. The full map is the reading at `/map`.
 *
 * `orbit` draws the same ground on the earth itself rather than on the page's flat plane: the map is projected onto a
 * globe and the camera stands outside it, which is the view a mission above the ground is briefed from. It keeps the
 * map's own natural colour instead of the frame's inverted ground, because the globe is the subject of the picture and
 * the page around it is space. The two are the same component because they are one map: the projection is a mode of the
 * camera, and a second map would be a second set of marks, routes, and overlays to keep in step.
 *
 * A window on the shell is not drawn here: it is painted on the shell by `MapPatch3D`, with the footage and by the same
 * patch. This component is the page's own drawing, for the panel and for the reading.
 */
export function EarthMap({
  world,
  place,
  pickedId,
  onPick,
  preview = false,
  orbit = false,
  tone = 'dark',
}: {
  world: World;
  place: Place;
  pickedId: string | null;
  onPick: (id: string) => void;
  preview?: boolean;
  orbit?: boolean;
  /** The map's own tone, which is the frame's setting and not a property of this ground. */
  tone?: MapTone;
}) {
  const box = useRef<HTMLDivElement>(null);
  const toneRef = useRef(tone);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef(new Map<string, Marker>());
  // The units above the globe, drawn by their own layer rather than as markers: a marker is placed at a longitude and
  // latitude, and one of these is a point above the ground.
  const space = useRef(
    new Map<
      string,
      { element: HTMLDivElement; halo: SVGLineElement; line: SVGLineElement; dot: SVGCircleElement }
    >(),
  );
  // Where each mark is drawn and where the record has put it. A fact arrives every few tens of milliseconds, and a
  // marker set straight to its new ground is a unit that blinks forward; the gap is closed over the frames in between.
  const motion = useRef(new Map<string, { current: [number, number]; target: [number, number] }>());
  const frame = useRef(0);
  const drawRef = useRef<((world: World, place: Place, picked: string | null) => void) | null>(null);
  const pickRef = useRef(onPick);
  const latest = useRef({ world, place, pickedId });

  useEffect(() => {
    pickRef.current = onPick;
  }, [onPick]);

  // A theme is a property of the picture, not of the ground: the map is not rebuilt when it changes, and the one canvas
  // keeps its camera, markers and route.
  useEffect(() => {
    toneRef.current = tone;
    if (mapRef.current) paintTone(mapRef.current, tone, orbit);
  }, [tone, orbit]);

  useEffect(() => {
    latest.current = { world, place, pickedId };
    drawRef.current?.(world, place, pickedId);
  }, [world, place, pickedId]);


  useEffect(() => {
    const element = box.current;
    const bounds = latest.current.place.geo?.bounds;
    if (!element || !bounds) return;
    let live = true;
    let stop: (() => void) | null = null;

    void import('maplibre-gl').then((maplibregl) => {
      if (!live || !box.current) return;
      maplibregl.setWorkerUrl(MAP_WORKER);
      const [west, south, east, north] = bounds;
      const placeBounds = [[west, south], [east, north]] as [[number, number], [number, number]];
      const worldBounds = [[-180, -85], [180, 85]] as [[number, number], [number, number]];
      // A place with nothing above it opens on its own ground; a place with a satellite opens on the body, because the
      // whole reason to read it as a globe is the mark that is off the surface. The fit is decided once, at the opening.
      const hasSatellites = latest.current.world.standing.some((unit) => unit.orbital && located(unit));
      const framed = orbit && hasSatellites ? worldBounds : placeBounds;
      // The orbit and the flat map are one place read through two projections, so they open on the same ground: the
      // toggle changes the shape of the world and not the place the pilot is looking at.
      const camera = {
        bounds: framed,
        fitBoundsOptions: { padding: 40 },
      };
      const map = new maplibregl.Map({
        container: box.current,
        style: MAP_STYLE,
        ...camera,
        attributionControl: { compact: true },
        interactive: !preview,
      });
      mapRef.current = map;
      // The flat map is inverted to the frame's dark ground. An orbit is the earth as it is, with the page's dark around
      // it, so the same filter would invert the subject.
      map.getCanvas().style.filter = orbit ? '' : toneRef.current === 'dark' ? DARK_MAP : 'none';
      // MapLibre's compact attribution opens itself whenever the container is narrower than its own breakpoint, and a
      // window on the shell always is. It is closed once the style has said what the ground is owed, so a map opens as
      // ground rather than as a notice: the credit is still on the map, one press of its button away.
      const closeCredit = () => {
        const credit = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
        if (!credit) return;
        credit.classList.remove('maplibregl-compact-show');
        credit.removeAttribute('open');
      };
      if (!preview) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      /**
       * The orbit's own opening: the whole globe, with the band the satellites stand in left inside the frame.
       *
       * A sphere seen through a perspective camera has a silhouette larger than its Mercator radius, so the radius the
       * fit asks for is solved from the projection rather than guessed from the place's own box. The band is the top of
       * `spaceLift`, because a geostationary mark is the furthest one the layer can draw.
       */
      const fitGlobe = (): void => {
        const transform = (map as unknown as { _camera: { transform: GlobeSurface } })._camera.transform;
        const side = Math.min(map.getCanvas().clientWidth, map.getCanvas().clientHeight);
        if (side <= 0) return;
        const room = 1 + spaceLift(36_000_000);
        const silhouette = Math.max(24, side / 2 - 40) / room;
        const distance = Math.max(transform.cameraToCenterDistance, 1);
        const squared = silhouette * silhouette;
        const radius = squared / distance + Math.sqrt((squared / distance) ** 2 + squared);
        const zoom = Math.log2((radius * Math.PI * 2) / 512);
        map.easeTo({ center: [0, 0], zoom, duration: 0 });
      };
      // The drawing is mounted inside a frame that is still settling, so the place is fitted again on the next frame: a
      // camera fitted to the box's width at construction would show a wider ground than the place declares.
      const fitCanvas = () => {
        // The drawing fills the box even while the box is between sizes, so a stretch of a few pixels is the
        // stylesheet's own work rather than a canvas cleared and redrawn at every move.
        const canvas = map.getCanvas();
        canvas.style.width = '100%';
        canvas.style.height = '100%';
      };
      requestAnimationFrame(() => {
        if (!box.current) return;
        map.resize();
        fitCanvas();
        if (orbit && hasSatellites) fitGlobe();
        else map.fitBounds(framed, { padding: 40, duration: 0 });
      });

      // What the map draws on top of the ground: the layers the register was given, the picked unit's route, and a mark a
      // unit. The lines are black because the flat canvas is inverted and they read as white on the dark ground; on the
      // orbit the same black reads on the earth's own colour.
      map.on('load', () => {
        // The credit is drawn when the source's attribution is read, which is after the control is added and after the
        // first layout, so this is the first moment the closed state is a state the control has.
        closeCredit();
        if (orbit) {
          // The projection is a property of the loaded style, so it is set here rather than at construction, where it would
          // be read before the style had a map to apply it to.
          map.setProjection({ type: 'globe' });
          // The fit is asked again once the projection is the globe's: the first one was the flat map's, and the globe
          // is a body that has to be fitted as one.
          if (hasSatellites) fitGlobe();
          else map.fitBounds(placeBounds, { padding: 40, duration: 0 });
          // The globe's own page is space, and the atmosphere is what makes a sphere read as a body rather than as a disc.
          map.addLayer(
            { id: 'space', type: 'background', paint: { 'background-color': '#05080c' } },
            'ground',
          );
          map.setSky({
            'sky-color': '#05080c',
            'horizon-color': '#162430',
            'fog-color': '#05080c',
            'atmosphere-blend': 1,
          });
        }
        paintTone(map, toneRef.current, orbit);
        drawOverlays(map, latest.current.place);
        map.addSource('path', { type: 'geojson', data: NOTHING });
        map.addLayer({
          id: 'path-casing',
          type: 'line',
          source: 'path',
          paint: { 'line-color': '#d0d0d0', 'line-width': 7, 'line-opacity': 0.85 },
        });
        map.addLayer({
          id: 'path',
          type: 'line',
          source: 'path',
          paint: { 'line-color': '#000000', 'line-width': 3, 'line-opacity': 1 },
        });
        map.resize();
        fitCanvas();
        drawRef.current?.(latest.current.world, latest.current.place, latest.current.pickedId);
      });

      const glide = (): void => {
        frame.current = 0;
        let moving = false;
        for (const [id, held] of motion.current) {
          const mark = markers.current.get(id);
          if (!mark) continue;
          const dx = held.target[0] - held.current[0];
          const dy = held.target[1] - held.current[1];
          if (Math.abs(dx) < 1e-7 && Math.abs(dy) < 1e-7) continue;
          // A fixed share of what is left, so a longer step crosses more ground in the same frames and the mark never
          // runs past the place the record put it.
          held.current = [held.current[0] + dx * 0.28, held.current[1] + dy * 0.28];
          mark.setLngLat(held.current);
          moving = true;
        }
        if (moving) frame.current = requestAnimationFrame(glide);
      };
      const chase = (): void => {
        if (!frame.current) frame.current = requestAnimationFrame(glide);
      };

      // The units above the globe. An orbit is a body seen from outside, so an altitude is a radial distance: the mark is
      // moved outward along the line from the globe's middle through its sub-point, and a dashed line joins it to the
      // ground it watches. It is the one reading of the map that a marker cannot place, because a marker names a longitude
      // and a latitude and this point is above both.
      let layer: HTMLDivElement | null = null;
      let placeSpace: ((current: World, ground: Place, picked: string | null) => void) | null = null;
      if (orbit) {
        const surface = document.createElement('div');
        surface.dataset.region = 'space-layer';
        surface.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1;';
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
        surface.appendChild(svg);
        map.getCanvasContainer().appendChild(surface);
        layer = surface;
        // The public map type omits the transform; its own marker code asks the same question of it.
        const globe = (map as unknown as { _camera: { transform: GlobeSurface } })._camera.transform;

        const placedSpace = (current: World, ground: Place, picked: string | null): void => {
          const centre = map.project(map.getCenter());
          const seen = new Set<string>();
          for (const unit of current.standing.filter(located)) {
            if (!unit.orbital) continue;
            const own = ownView(ground, unit);
            if (!own.geo) continue;
            seen.add(unit.id);
            const base = map.project([own.geo.lng, own.geo.lat]);
            // The globe hides its far side, so a sub-point the planet stands between is not on the map.
            const shown = globe.isPointOnMapSurface(base);
            const reach = Math.hypot(base.x - centre.x, base.y - centre.y);
            const lift = spaceLift(unit.altitude);
            // A satellite over the middle of the disc is on the line of sight and has no radial room to stand in, so it is
            // lifted up the page instead: the height is read however the globe is turned.
            const offset = Math.max(SPACE_MIN, reach * lift);
            const [ux, uy] = reach > 0.5 ? [(base.x - centre.x) / reach, (base.y - centre.y) / reach] : [0, -1];
            const x = base.x + ux * offset;
            const y = base.y + uy * offset;
            let mark = space.current.get(unit.id);
            if (!mark) {
              const element = spaceUnitElement(unit, unit.id === picked, () => pickRef.current(unit.id));
              // A casing under the line: the leader runs from the lit globe into the dark space above it, and one ink
              // cannot be read on both. The light casing carries the dark line over the space and the dark line carries it
              // over the ground.
              const halo = document.createElementNS(SVG_NS, 'line');
              halo.setAttribute('stroke', 'rgba(240,245,248,0.65)');
              halo.setAttribute('stroke-width', '4.5');
              halo.setAttribute('stroke-dasharray', '5 3');
              const line = document.createElementNS(SVG_NS, 'line');
              line.setAttribute('stroke', 'rgba(24,86,68,0.95)');
              line.setAttribute('stroke-width', '1.8');
              line.setAttribute('stroke-dasharray', '5 3');
              const dot = document.createElementNS(SVG_NS, 'circle');
              dot.setAttribute('r', '2.5');
              dot.setAttribute('fill', 'none');
              dot.setAttribute('stroke', 'rgba(24,86,68,0.95)');
              svg.append(halo, line, dot);
              surface.appendChild(element);
              mark = { element, halo, line, dot };
              space.current.set(unit.id, mark);
            }
            mark.element.style.display = shown ? '' : 'none';
            mark.halo.setAttribute('visibility', shown ? 'visible' : 'hidden');
            mark.line.setAttribute('visibility', shown ? 'visible' : 'hidden');
            mark.dot.setAttribute('visibility', shown ? 'visible' : 'hidden');
            if (!shown) continue;
            mark.halo.setAttribute('x1', String(base.x));
            mark.halo.setAttribute('y1', String(base.y));
            mark.halo.setAttribute('x2', String(x));
            mark.halo.setAttribute('y2', String(y));
            mark.line.setAttribute('x1', String(base.x));
            mark.line.setAttribute('y1', String(base.y));
            mark.line.setAttribute('x2', String(x));
            mark.line.setAttribute('y2', String(y));
            mark.dot.setAttribute('cx', String(base.x));
            mark.dot.setAttribute('cy', String(base.y));
            mark.element.style.left = `${x}px`;
            mark.element.style.top = `${y}px`;
            // A mark nearer the camera is drawn larger, which is the one cue an overhead satellite has: it is on the line
            // of sight and has no sideways room to stand in.
            mark.element.style.transform = `translate(-50%,-50%) scale(${1 + lift})`;
            paintUnit(mark.element, unit, unit.id === picked);
          }
          for (const [id, mark] of space.current) {
            if (seen.has(id)) continue;
            mark.element.remove();
            mark.halo.remove();
            mark.line.remove();
            mark.dot.remove();
            space.current.delete(id);
          }
        };
        placeSpace = placedSpace;
        // The globe turns under the marks, so the layer is placed again whenever the camera moves.
        const refresh = () => placedSpace(latest.current.world, latest.current.place, latest.current.pickedId);
        map.on('move', refresh);
        map.on('moveend', refresh);
        map.on('resize', refresh);
        map.on('projectiontransition', refresh);
        map.on('idle', refresh);
      }

      const paint = (current: World, ground: Place, picked: string | null): void => {
        drawOverlays(map, ground);
        const seen = new Set<string>();
        for (const unit of current.standing.filter(located)) {
          if (orbit && unit.orbital) continue;
          const own = ownView(ground, unit);
          if (!own.geo) continue;
          seen.add(unit.id);
          const at: [number, number] = [own.geo.lng, own.geo.lat];
          const held = markers.current.get(unit.id);
          if (held) {
            const reach = motion.current.get(unit.id);
            if (reach) reach.target = at;
            else motion.current.set(unit.id, { current: at, target: at });
            paintUnit(held.getElement(), unit, unit.id === picked);
            chase();
          } else {
            const element = unitElement(unit, unit.id === picked, () => pickRef.current(unit.id));
            const mark = new maplibregl.Marker({ element, anchor: 'center' }).setLngLat(at).addTo(map);
            markers.current.set(unit.id, mark);
            motion.current.set(unit.id, { current: at, target: at });
          }
        }
        for (const [id, mark] of markers.current) {
          if (seen.has(id)) continue;
          mark.remove();
          markers.current.delete(id);
          motion.current.delete(id);
        }

        placeSpace?.(current, ground, picked);

        const chosen = picked ? current.standing.find((unit) => unit.id === picked && located(unit)) : null;
        const route = chosen ? ownView(ground, chosen).geoPath : [];
        const source = map.getSource('path') as GeoJSONSource | undefined;
        if (source) void source.setData(pathOf(route));
      };
      drawRef.current = paint;
      paint(latest.current.world, latest.current.place, latest.current.pickedId);

      // A window carried across the shell changes its own box by a few pixels at every pointer move. Resizing the
      // drawing at each of those is a canvas cleared and redrawn thirty times a second, which reads as a flash; the
      // drawing is stretched to the box instead and is drawn again once the hand has stopped.
      let settle = 0;
      const resize = new ResizeObserver(() => {
        fitCanvas();
        window.clearTimeout(settle);
        settle = window.setTimeout(() => {
          map.resize();
          fitCanvas();
        }, 140);
      });
      resize.observe(box.current);
      stop = () => {
        window.clearTimeout(settle);
        resize.disconnect();
        cancelAnimationFrame(frame.current);
        frame.current = 0;
        for (const mark of markers.current.values()) mark.remove();
        markers.current.clear();
        motion.current.clear();
        for (const mark of space.current.values()) {
          mark.element.remove();
          mark.halo.remove();
          mark.line.remove();
          mark.dot.remove();
        }
        space.current.clear();
        layer?.remove();
        drawRef.current = null;
        mapRef.current = null;
        map.remove();
      };
    });

    return () => {
      live = false;
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      stop?.();
    };
  }, [preview, orbit]);

  return (
    <div
      ref={box}
      data-region="map-reading"
      role="region"
      aria-label="the place on the earth"
      className="h-full w-full"
    />
  );
}

/**
 * The place's own plane, for a place that declares no geography.
 *
 * A map is a claim about where a place is on the earth. A place that says nothing keeps its own plane, which is the
 * picture every project had before a place could have a location, so the reading is still a picture of where things
 * stand rather than a control that does nothing. Only a unit whose kind presents its location stands on it, the same
 * rule the earth map follows: the middle the records are read from is not a place on the ground.
 */
export function PlaneMap({
  world,
  place,
  pickedId,
  onPick,
}: {
  world: World;
  place: Place;
  pickedId: string | null;
  onPick: (id: string) => void;
  /** A map drawn as a window rather than as the reading; the window's own target handles the pointer. */
  preview?: boolean;
}) {
  const [vx, vy, vw, vh] = place.view ?? [0, 0, 1, 1];
  const chosen = pickedId ? world.standing.find((unit) => unit.id === pickedId && located(unit)) : null;
  const route = chosen ? ownView(place, chosen).path : [];
  const shown = world.standing.filter(located);

  return (
    <div className="flex h-full w-full items-center justify-center bg-card/30 p-3">
      <svg
        data-region="map-plane"
        viewBox={`${vx} ${vy} ${vw} ${vh}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label={`the ground of ${place.store?.label ?? 'the place'}`}
        className="h-full w-full rounded-sm border border-border/60 bg-card/60"
      >

        {route.length > 1 ? (
          <polyline
            points={route.map(([x, y]) => `${x},${y}`).join(' ')}
            className="fill-none stroke-claim/50"
            strokeWidth={2}
          />
        ) : null}
        {shown.map((unit) => {
          const [x, y] = ownView(place, unit).at;
          const picked = unit.id === pickedId;
          return (
            <g
              key={unit.id}
              data-region="map-unit"
              data-unit={unit.id}
              data-picked={picked}
              role="button"
              tabIndex={0}
              aria-label={`pick ${unit.id}`}
              onClick={() => onPick(unit.id)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onPick(unit.id);
              }}
              className="cursor-pointer"
            >
              <circle
                cx={x}
                cy={y}
                r={picked ? 6 : 4}
                className={picked ? 'fill-claim' : unit.properties.person ? 'fill-muted-foreground' : 'fill-claim/70'}
              />
              <text x={x + 8} y={y + 3.5} fontSize={10} className="fill-foreground">
                {unit.id}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
