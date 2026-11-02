import { useEffect, useRef, type ReactNode } from 'react';
import type { GeoJSONSource, Map as MapLibreMap, Marker } from 'maplibre-gl';
import { DARK_MAP, MAP_STYLE, MAP_WORKER } from '../lib/geo-map';
import type { Place, UnitView, World } from '../lib/types';
import { EarthMap, PlaneMap } from '../components/GroundMap';
import { MAP_SPAN_METRES, nearBounds, type GeoPoint, type OwnView } from '../lib/world';

/**
 * What each kind of view looks like where a member's own attributes are read.
 *
 * A view is one shape with one name, one size and one status (`lib/types`), and what changes between kinds is only the
 * body drawn under its row. The table is the whole of that difference: a kind added to `UnitView` is one entry here and
 * one line in `WINDOW_KINDS`, and every panel that draws a view reads the same two tables.
 *
 * A kind this build has no renderer for is not dropped: `readView` keeps the name the place wrote, and the body below
 * says which kind it was. A place newer than this build is therefore named rather than silently missing.
 *
 * The map is in the table for the same reason a picture is. A member's own place is a view of the `map` kind that the
 * place does not have to declare, so a place that declares one draws it through the same body and the panel does not
 * need a second kind of row.
 */
export interface ViewContentProps {
  /** The view being drawn. */
  view: UnitView;
  /** The member the view belongs to, which the picture names and the map reads the place for. */
  member: string;
  /** The member's own reading of where it stands and where it has been, which the map draws. */
  own: OwnView;
  /** The place the view stands in, which is what the map draws the ground from. */
  place: Place;
  /**
   * The space the map reads when the view presents the whole place.
   *
   * A map of `scope: place` is one window over many units, so its content is the world's standing rather than the one
   * member's own reading. A map of the carrier does not read this and is drawn from `own` as before.
   */
  world: World | null;
  /** The unit whose path a place map highlights. */
  pickedId: string | null;
  /** The pick a mark on a place map makes. */
  onPick: (id: string) => void;
  /** Whether the view's own medium is running, or undefined while it has said nothing. */
  running: boolean | undefined;
  /** The panel writing back what a medium's own element reports. */
  setRunning: (id: string, running: boolean) => void;
}

type Content<K extends UnitView['kind']> = (
  view: Extract<UnitView, { kind: K }>,
  props: ViewContentProps,
) => ReactNode;

type ContentTable = { [K in UnitView['kind']]: Content<K> };

export const VIEW_CONTENT: ContentTable = {
  media: (view, { setRunning }) => (
    <video
      data-region="shows-view"
      src={view.src}
      autoPlay
      muted
      loop
      playsInline
      onPlay={() => setRunning(view.id, true)}
      onPause={() => setRunning(view.id, false)}
      onEnded={() => setRunning(view.id, false)}
      className="aspect-video w-full rounded-sm border border-border/70 bg-black object-cover"
    />
  ),

  map: (view, { own, place, member, world, pickedId, onPick }) =>
    view.scope === 'place' && world ? (
      // A map preview is the same box a footage preview is, so a member with both shows two windows of one size. The
      // window's own map is the whole ground at that size; the panel is not a second scale of it.
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
    ) : (
      <PlaceMap
        own={own}
        place={place}
        label={`${member} at ${Math.round(own.at[0])}, ${Math.round(own.at[1])}`}
      />
    ),

  unknown: (view) => (
    <p data-region="shows-undrawable" className="text-[11.5px] text-muted-foreground">
      this build does not draw a {view.declared} view
    </p>
  ),
};

/** The body of one view, which is the table's entry for its kind. */
export function ViewContent(props: ViewContentProps) {
  // The entry is selected by the view's own kind, so it is handed the variant it narrows to; the cast is only what
  // tells the compiler that the pair the table stores together is still together at the call.
  const draw = VIEW_CONTENT[props.view.kind] as (view: UnitView, props: ViewContentProps) => ReactNode;
  return <>{draw(props.view, props)}</>;
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
      // The panel is still settling when the map is constructed, so the window is fitted again on the next frame with the
      // aspect the box has then: a camera fitted to the width it had at construction would show a wider ground.
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
