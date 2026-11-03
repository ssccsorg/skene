import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { GeoJSONSource } from 'maplibre-gl';
import { DARK_MAP, MAP_STYLE, MAP_WORKER, NOTHING, pathOf } from '../lib/geo-map';
import type { Bearing } from '../lib/board';
import type { Place, World } from '@ssccsorg/skene-kernel';
import type { MapTone } from '../stores/frame';
import { located, ownView } from '../lib/world';
import { bindMapWindow } from '../lib/map-windows';
import { ShellPatch } from './ShellPatch';

// A map window drawn on the shell, by the patch a video window is drawn by.
//
// The map used to be a page: MapLibre's canvas laid over the board at the window's projected box, flat, while the
// footage beside it curved with the room. One window was a decal and the other a card. The map is now rendered to an
// offscreen canvas and painted as a texture on the same patch, so it foreshortens, curves and turns with the shell in
// exactly the way the picture does.
//
// The offscreen map is drawn once at a fixed size and the patch scales it, which is the same rule the window's size
// follows: resizing magnifies the ground rather than re-fitting it. The window's own toolbar stays a page control and
// asks the map by name (`lib/map-windows`), because a button cannot be a texture.
//
// The unit marks are drawn into the same canvas rather than left as DOM markers: a DOM marker would stand flat over a
// curved patch. They are drawn after the ground and outside its inversion, so their ink is their own, and the credit is
// drawn with them, which is where a map that is a texture can still say what its ground is owed.

/** The size the offscreen map draws at. The patch scales this drawing; it does not re-render it. */
const RENDER: [number, number] = [560, 350];

export function MapPatch3D({
  id,
  bearing,
  cells,
  lead,
  hidden,
  world,
  place,
  pickedId,
  tone,
  order,
}: {
  id: string;
  bearing: Bearing;
  cells: Bearing;
  lead: [Bearing, Bearing] | null;
  hidden: boolean;
  world: World;
  place: Place;
  pickedId: string | null;
  /** The map's own tone, which is the frame's setting and not this window's. */
  tone: MapTone;
  /** The pilot's stack, which is the order the picture is drawn in. */
  order: number;
}) {
  const canvas = useMemo(() => {
    const made = document.createElement('canvas');
    made.width = RENDER[0];
    made.height = RENDER[1];
    return made;
  }, []);
  const texture = useMemo(() => {
    const made = new THREE.CanvasTexture(canvas);
    made.colorSpace = THREE.SRGBColorSpace;
    made.minFilter = THREE.LinearFilter;
    return made;
  }, [canvas]);
  useEffect(() => () => texture.dispose(), [texture]);

  const latest = useRef({ world, place, pickedId, tone });
  const draw = useRef<(() => void) | null>(null);
  const route = useRef<((current: World, ground: Place, picked: string | null) => void) | null>(null);

  useEffect(() => {
    latest.current = { world, place, pickedId, tone };
    route.current?.(world, place, pickedId);
    draw.current?.();
  }, [world, place, pickedId, tone]);

  const bounds = place.geo?.bounds;
  const boundsKey = bounds?.join(',') ?? '';

  useEffect(() => {
    if (!bounds) return undefined;
    const holder = document.createElement('div');
    // Off the page and not hidden: a WebGL canvas that is `display:none` is a canvas the driver may stop drawing, and
    // this one has to keep its ground while the window is folded.
    holder.style.cssText = `position:fixed;left:-20000px;top:0;width:${RENDER[0]}px;height:${RENDER[1]}px;pointer-events:none;`;
    document.body.append(holder);
    let live = true;
    let stop: (() => void) | null = null;

    void import('maplibre-gl').then((maplibregl) => {
      if (!live) {
        holder.remove();
        return;
      }
      const context = canvas.getContext('2d');
      if (!context) return;
      maplibregl.setWorkerUrl(MAP_WORKER);
      const [west, south, east, north] = bounds;
      const map = new maplibregl.Map({
        container: holder,
        style: MAP_STYLE,
        bounds: [
          [west, south],
          [east, north],
        ],
        fitBoundsOptions: { padding: 40 },
        attributionControl: false,
        interactive: false,
      });
      let ready = false;

      const paint = () => {
        const { world: current, place: ground, pickedId: picked, tone: drawn } = latest.current;
        context.clearRect(0, 0, RENDER[0], RENDER[1]);
        // The ground follows the frame's map tone, and the marks are drawn after the filter so their ink is chosen for
        // what the pilot reads rather than for the filter.
        context.save();
        context.filter = drawn === 'dark' ? DARK_MAP : 'none';
        context.drawImage(map.getCanvas(), 0, 0, RENDER[0], RENDER[1]);
        context.restore();

        context.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
        context.textBaseline = 'middle';
        for (const unit of current.standing.filter(located)) {
          const own = ownView(ground, unit);
          if (!own.geo) continue;
          const point = map.project([own.geo.lng, own.geo.lat]);
          if (point.x < -20 || point.y < -20 || point.x > RENDER[0] + 20 || point.y > RENDER[1] + 20) continue;
          const pickedHere = unit.id === picked;
          context.beginPath();
          context.arc(point.x, point.y, pickedHere ? 6 : 5, 0, Math.PI * 2);
          context.fillStyle = 'rgba(11,15,14,.9)';
          context.fill();
          context.beginPath();
          context.arc(point.x, point.y, pickedHere ? 4 : 3, 0, Math.PI * 2);
          context.fillStyle = pickedHere ? '#e6ece9' : '#6fbf9f';
          context.fill();

          const width = context.measureText(unit.id).width;
          context.fillStyle = 'rgba(11,15,14,.72)';
          context.fillRect(point.x + 8, point.y - 8, width + 6, 15);
          context.fillStyle = pickedHere ? '#e6ece9' : '#a8b6c8';
          context.fillText(unit.id, point.x + 11, point.y + 1);
        }

        // The map is a texture now, so its credit is drawn into it rather than left in a control the page no longer
        // draws. It is one small line, which is what the ground is owed.
        context.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
        context.textAlign = 'right';
        context.fillStyle = 'rgba(168,182,200,.55)';
        context.fillText('© OpenStreetMap', RENDER[0] - 7, RENDER[1] - 8);
        context.textAlign = 'left';
        texture.needsUpdate = true;
      };

      const syncRoute = (current: World, ground: Place, picked: string | null) => {
        if (!ready) return;
        const chosen = picked ? current.standing.find((unit) => unit.id === picked && located(unit)) : null;
        const path = chosen ? ownView(ground, chosen).geoPath : [];
        const source = map.getSource('path') as GeoJSONSource | undefined;
        if (source) void source.setData(pathOf(path));
      };

      route.current = syncRoute;
      draw.current = paint;
      const release = bindMapWindow(id, {
        zoomIn: () => map.easeTo({ zoom: map.getZoom() + 1, duration: 180 }),
        zoomOut: () => map.easeTo({ zoom: map.getZoom() - 1, duration: 180 }),
        home: () =>
          map.fitBounds(
            [
              [west, south],
              [east, north],
            ],
            { padding: 40, duration: 300 },
          ),
      });

      map.on('render', paint);
      map.on('load', () => {
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
        ready = true;
        syncRoute(latest.current.world, latest.current.place, latest.current.pickedId);
        paint();
      });

      stop = () => {
        release();
        map.off('render', paint);
        route.current = null;
        draw.current = null;
        map.remove();
        holder.remove();
      };
    });

    return () => {
      live = false;
      stop?.();
      holder.remove();
    };
  }, [id, boundsKey, canvas, texture]);

  return (
    <ShellPatch
      bearing={bearing}
      cells={cells}
      lead={lead}
      hidden={hidden}
      texture={texture}
      medium={RENDER[0] / RENDER[1]}
      order={order}
    />
  );
}
