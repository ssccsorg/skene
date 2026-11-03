// Ground, as a window kind.
//
// The map is a first-party library rather than a core: it brings MapLibre, it draws on the shell when the place declares
// a geography, and it keeps a page toolbar because a button cannot be a texture. It registers itself the way a
// deployment's kind would, so the frame's board, its panel and its window layer reach it through the register.

import { useEffect, useRef } from 'react';
import { LocateFixed, MapPin, Minus, Plus } from 'lucide-react';
import type { GeoJSONSource, Map as MapLibreMap, Marker } from 'maplibre-gl';
import { DARK_MAP, MAP_STYLE, MAP_WORKER } from './geo-map';
import { EarthMap, PlaneMap } from './GroundMap';
import { MapPatch3D } from './MapPatch3D';
import { mapWindowOf } from './map-windows';
import { registerViewKind, type WindowPage, type WindowPaint, type WindowRow } from '@ssccsorg/skene-frame/lib/view-kinds';
import { statusOf } from '@ssccsorg/skene-frame/lib/windows';
import type { FrameBox } from '@ssccsorg/skene-board';
import { MAP_SPAN_METRES, nearBounds, type GeoPoint, type OwnView } from '@ssccsorg/skene-frame/lib/world';
import type { DeclaredView, MapView, Place, UnitView, World } from '@ssccsorg/skene-kernel';

/** A declared map view as this build holds it. */
function readMap(declared: DeclaredView): UnitView {
  return {
    id: declared.id,
    kind: 'map',
    cells: declared.cells,
    status: statusOf(declared),
    ...(declared.scope === 'place' ? { scope: 'place' as const } : {}),
    from: declared.from,
    to: declared.to,
  };
}

/** The ground under a member's row: the whole place at the window's shape, or the carrier's own place. */
function MapBody({ view, own, place, member, world, pickedId, onPick }: WindowRow) {
  // The kind is the map's own, so its shape is read here rather than by the frame: a register that holds a kind by name
  // cannot ask the compiler to prove the name, and a body that trusted any view handed to it would draw a camera's row.
  const map = view.kind === 'map' ? (view as MapView) : null;
  if (!map) return null;
  if (map.scope === 'place' && world) {
    // A map preview is the same box a footage preview is, so a member with both shows two windows of one size. The
    // window's own map is the whole ground at that size; the panel is not a second scale of it.
    return (
      <div
        data-region="shows-frame"
        className="aspect-video w-full overflow-hidden rounded-sm border border-border/70"
      >
        {place.geo ? (
          <EarthMap world={world} place={place} pickedId={pickedId} onPick={onPick} preview />
        ) : (
          <PlaneMap world={world} place={place} pickedId={pickedId} onPick={onPick} preview />
        )}
      </div>
    );
  }
  return (
    <PlaceMap
      own={own}
      place={place}
      label={`${member} at ${Math.round(own.at[0])}, ${Math.round(own.at[1])}`}
    />
  );
}

/** The picture on the shell, which a place with no geography does not have. */
function MapPaint({ id, bearing, cells, lead, hidden, world, place, pickedId, tone, order }: WindowPaint) {
  if (!place.geo) return null;
  return (
    <MapPatch3D
      id={id}
      bearing={bearing}
      cells={cells}
      lead={lead}
      hidden={hidden}
      world={world}
      place={place}
      pickedId={pickedId}
      tone={tone}
      order={order}
    />
  );
}

/**
 * What the page owes a map window: its toolbar when the ground is on the shell, and the whole picture when the place
 * declares no geography.
 *
 * A place with a geography is painted on the shell, so all the page owes it is its toolbar. A place that declares none
 * keeps the page's own plane, which is not on the shell and so is drawn here.
 */
function MapPage({ id, at, world, place, pickedId, onPick }: WindowPage) {
  if (place.geo) return <MapTools id={id} at={at} />;
  return <MapPatch at={at} world={world} place={place} pickedId={pickedId} onPick={onPick} />;
}

export const MAP = registerViewKind({
  kind: 'map',
  label: 'map',
  // A map here is ground the place declares and not the minimap the frame draws around the pilot, so its mark is a pin on
  // that ground rather than a folded sheet.
  Icon: MapPin,
  read: readMap,
  Paint: MapPaint,
  Page: MapPage,
  Row: MapBody,
  anchor: 'place',
  place: true,
});

/**
 * A map window's toolbar, which is a thing of the page because a button cannot be a texture.
 *
 * The map itself is painted on the shell (`MapPatch3D`), so its camera belongs to that component; this asks for it by
 * the window's own name. The buttons stand at the window's own corner, over the ground they change, and a press on one
 * is not a press on the space.
 */
function MapTools({ id, at }: { id: string; at: FrameBox }) {
  const act = (run: (controls: { zoomIn: () => void; zoomOut: () => void; home: () => void }) => void) =>
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      const controls = mapWindowOf(id);
      if (controls) run(controls);
    };
  const tool =
    'pointer-events-auto flex size-6 items-center justify-center rounded-sm border border-border/70 bg-card/85 ' +
    'text-muted-foreground transition-colors hover:text-foreground';
  return (
    <div
      data-region="map-tools"
      className="absolute z-[75] flex flex-col gap-1"
      style={{ left: at.left + at.width - 30, top: at.top + 6 }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button type="button" title="zoom in" className={tool} onClick={act((controls) => controls.zoomIn())}>
        <Plus className="size-3.5" />
      </button>
      <button type="button" title="zoom out" className={tool} onClick={act((controls) => controls.zoomOut())}>
        <Minus className="size-3.5" />
      </button>
      <button type="button" title="fit the place" className={tool} onClick={act((controls) => controls.home())}>
        <LocateFixed className="size-3.5" />
      </button>
    </div>
  );
}

/**
 * The plane a map window carries for a place that declares no geography.
 *
 * This is the fallback and not the map: a place with a geography is painted on the shell. A place with no box keeps its
 * own plane, which is the picture every project had before a place could have a location, so the window is still a
 * picture of where things stand rather than a control that does nothing.
 */
function MapPatch({
  at,
  world,
  place,
  pickedId,
  onPick,
}: {
  at: FrameBox;
  world: World;
  place: Place;
  pickedId: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <div
      data-region="map-patch"
      className="pointer-events-none absolute z-[70] overflow-hidden rounded-[2px]"
      style={{ left: at.left, top: at.top, width: at.width, height: at.height }}
    >
      <PlaneMap world={world} place={place} pickedId={pickedId} onPick={onPick} preview />
    </div>
  );
}

/**
 * The member's place, on the earth when the place anchors its coordinates and on the place's own plane when it does not.
 *
 * The plane is what every project drew before a place had a location: the graticule of the place's own view, its areas,
 * the route the unit took and the pin it stands at. The earth is the same reading with the box declared by the place
 * under it, so a project that says where it is gets a real map and one that says nothing keeps its own ground.
 */
function PlaceMap({ own, place, label }: { own: OwnView; place: Place; label: string }) {
  if (own.bounds) return <GeoMap own={own} label={label} />;

  const [vx, vy, vw, vh] = place.view ?? [0, 0, 1, 1];
  const step = Math.max(20, Math.round(vw / 13));
  const vertical: number[] = [];
  for (let x = Math.ceil(vx / step) * step; x <= vx + vw; x += step) vertical.push(x);
  const horizontal: number[] = [];
  for (let y = Math.ceil(vy / step) * step; y <= vy + vh; y += step) horizontal.push(y);
  const route = own.path.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <svg
      data-region="shows-map"
      viewBox={`${vx} ${vy} ${vw} ${vh}`}
      role="img"
      aria-label={label}
      className="aspect-video w-full rounded-sm border border-border/70 bg-card/60"
    >
      {vertical.map((x) => (
        <line key={`x${x}`} x1={x} y1={vy} x2={x} y2={vy + vh} className="stroke-border/50" strokeWidth="0.9" />
      ))}
      {horizontal.map((y) => (
        <line key={`y${y}`} x1={vx} y1={y} x2={vx + vw} y2={y} className="stroke-border/50" strokeWidth="0.9" />
      ))}

      {own.path.length > 1 ? (
        <polyline points={route} className="fill-none stroke-claim/60" strokeWidth="2" strokeLinejoin="round" />
      ) : null}
      <g data-region="shows-pin" transform={`translate(${own.at[0]} ${own.at[1]})`}>
        <path d="M0 0 L-7 -14 A8 8 0 1 1 7 -14 Z" className="fill-claim" />
        <circle cy="-19" r="3" className="fill-background" />
      </g>
    </svg>
  );
}

/** The route as a GeoJSON line, which is the shape MapLibre's source speaks. */
function routeOf(points: GeoPoint[]) {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: points.map((point) => [point.lng, point.lat]) },
  } as never;
}

/**
 * A real map of the place's box, with the unit on it.
 *
 * MapLibre is loaded when the map is drawn rather than with the frame: the library is large, most panels never show a
 * map, and a module that imported it statically would make every test that reads a kind load it too. The style is the
 * OpenStreetMap raster tiles because it needs no key and no style service, so a deployment that has never been
 * configured still draws the ground under the pin.
 *
 * The tiles are light and the frame is dark, so the canvas is inverted rather than the panel being given a bright
 * hole. The filter is on the map's own canvas, which leaves the pin and the attribution in their own colours: a
 * filter on the container would turn the pin's ink into a colour the frame never chose.
 */
function GeoMap({ own, label }: { own: OwnView; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pinRef = useRef<Marker | null>(null);
  // What the map should show, read by the async load and the update effect: both run outside this render's closure.
  const latest = useRef(own);
  const boundsKey = own.bounds?.join(',') ?? '';
  /** The map's own width over height, which is what keeps a wide panel from showing more ground across than up. */
  const aspectOf = (): number => {
    const element = box.current;
    return element && element.clientHeight ? element.clientWidth / element.clientHeight : 1;
  };

  useEffect(() => {
    latest.current = own;
  });

  useEffect(() => {
    const element = box.current;
    const bounds = latest.current.bounds;
    if (!element || !bounds) return;
    let live = true;
    let stop: (() => void) | null = null;
    void import('maplibre-gl').then((maplibregl) => {
      if (!live || !box.current) return;
      // The worker is Vite's own asset URL rather than the path MapLibre resolves at run time: a bundled build would
      // otherwise point at a worker file the build never emitted, and the map would draw tiles while every GeoJSON
      // source stayed unloaded.
      maplibregl.setWorkerUrl(MAP_WORKER);
      // The place's box can be kilometres wide, and a step of the machine on it would be a pixel. The map opens on the
      // unit's own ground with a step's worth of room, and follows only when the unit leaves that window.
      const [west, south, east, north] = nearBounds(
        bounds,
        latest.current.geoPath,
        latest.current.geo,
        MAP_SPAN_METRES,
        aspectOf(),
      );
      const map = new maplibregl.Map({
        container: box.current,
        style: MAP_STYLE,
        bounds: [
          [west, south],
          [east, north],
        ],
        fitBoundsOptions: { padding: 18 },
        attributionControl: { compact: true },
      });
      // The panel is still settling when the map is constructed, so the window is fitted again on the next frame with
      // the aspect the box has then: a camera fitted to the width it had at construction would show a wider ground.
      requestAnimationFrame(() => {
        const [w, s, e, n] = nearBounds(
          bounds,
          latest.current.geoPath,
          latest.current.geo,
          MAP_SPAN_METRES,
          aspectOf(),
        );
        map.resize();
        map.fitBounds(
          [
            [w, s],
            [e, n],
          ],
          { padding: 18, duration: 0 },
        );
      });
      map.getCanvas().style.filter = DARK_MAP;
      // The list scrolls, and a map that took the wheel would trap the reader inside it: a map in a panel is a reading
      // first and a map second.
      map.scrollZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoomRotate.disable();

      const pin = document.createElement('div');
      pin.dataset.region = 'shows-pin';
      pin.style.cssText =
        'width:12px;height:12px;border-radius:9999px;background:var(--claim,#6fbf9f);' +
        'border:2px solid var(--background,#0b0f0e);box-shadow:0 0 0 3px rgba(111,191,159,.25)';
      const placed = latest.current.geo;
      const mark = new maplibregl.Marker({ element: pin, anchor: 'center' });
      if (placed) mark.setLngLat([placed.lng, placed.lat]);
      mark.addTo(map);

      map.on('load', () => {
        map.addSource('route', { type: 'geojson', data: routeOf(latest.current.geoPath) });
        // The canvas is inverted so the light tiles read as a dark map, and the route is drawn inside that canvas: the
        // colours here are the ones that come out bright after the filter, not the ones the frame uses above it.
        map.addLayer({
          id: 'route-casing',
          type: 'line',
          source: 'route',
          paint: { 'line-color': '#d0d0d0', 'line-width': 7, 'line-opacity': 0.9 },
        });
        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          paint: { 'line-color': '#000000', 'line-width': 3, 'line-opacity': 1 },
        });
        map.resize();
      });

      // A panel is dragged as wide as the reader wants it, and the map has no window event that says so.
      const resize = new ResizeObserver(() => map.resize());
      resize.observe(box.current);
      mapRef.current = map;
      pinRef.current = mark;
      stop = () => {
        resize.disconnect();
        mark.remove();
        map.remove();
      };
    });
    return () => {
      live = false;
      stop?.();
      pinRef.current = null;
      mapRef.current = null;
    };
  }, [boundsKey]);

  // The pin follows the record after the map is up; the route follows the unit's path. The map is not re-fitted on every
  // step, because a window that panned under a moving pin would make the pin look still. It follows when the unit reaches
  // the window's edge, which is the one moment the ground has to move instead.
  const lng = own.geo?.lng;
  const lat = own.geo?.lat;
  const trail = own.geoPath.length;
  useEffect(() => {
    if (lng === undefined || lat === undefined) return;
    pinRef.current?.setLngLat([lng, lat]);
    const map = mapRef.current;
    const bounds = latest.current.bounds;
    if (!map || !bounds) return;
    const view = map.getBounds();
    const insetLng = (view.getEast() - view.getWest()) * 0.1;
    const insetLat = (view.getNorth() - view.getSouth()) * 0.1;
    const inside =
      lng >= view.getWest() + insetLng &&
      lng <= view.getEast() - insetLng &&
      lat >= view.getSouth() + insetLat &&
      lat <= view.getNorth() - insetLat;
    if (inside) return;
    const [west, south, east, north] = nearBounds(
      bounds,
      latest.current.geoPath,
      latest.current.geo,
      MAP_SPAN_METRES,
      aspectOf(),
    );
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 18, duration: 240 },
    );
  }, [lng, lat]);
  useEffect(() => {
    const source = mapRef.current?.getSource('route') as GeoJSONSource | undefined;
    if (source) void source.setData(routeOf(latest.current.geoPath));
  }, [trail]);

  return (
    <div
      ref={box}
      data-region="shows-map"
      role="img"
      aria-label={label}
      className="aspect-video w-full overflow-hidden rounded-sm border border-border/70"
    />
  );
}
