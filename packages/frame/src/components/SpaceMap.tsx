import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Crosshair, Minus, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Hint } from './ui/hint';
import { bearingOf, capRim, glyphPath, placed, ringOf, zoneOf } from '../lib/board';
import { DISC, insideDisc, onDisc, onEdge, onMap, outlineOfPoints, viewRegion, visible, type Turn } from '../lib/map';
import { useMapDrag } from '../hooks/useMapDrag';
import { UNIT_STATE } from '../hooks/useEntityState';
import { useFrame } from '../stores/frame';
import { useScenario } from '../stores/scenario';
import { useView } from '../stores/view';
import type { World } from '../lib/types';
import type { Neighbour } from '../lib/world';
import { cn } from '../lib/utils';

// The space as a disc, filling the width the column gives it: the shell the pilot stands inside, seen from outside
// it, with every project's patch on it and the frame's own region painted over the part it holds.
//
// The disc is turned to the pilot's bearing, so what they face is the middle of the map and the frame's region stands
// there. The half of the sphere behind them is not drawn: a solid sphere seen from outside shows one half, and a far
// place folded onto the front would be the picture a sphere seen from the seat gives.
//
// The region is a claim about what the board holds of the shell, so it is painted for the readings drawn from the
// pilot's own seat and for no other (`lib/readings`): a board drawing the run as a table holds no part of the shell, and
// a region painted over those readings would say the frame is pointed at something it is not showing. Everything else on
// the disc is a fact about the space and stands whichever reading is in force.
//
// It is the same sphere the board draws, read from outside the seat rather than from it, so a unit's place
// on the disc and its place on the board are one projection read twice. What the board cannot say is where
// the pilot is looking, because the board is what they are looking at; this says it.
//
// The disc is also a map. A hand inside the frame has taken the part of the shell the board is showing, so the press
// belongs to whatever is under it; a hand outside the frame has taken the map, and pushing it turns the sphere. The
// plus, the minus and the reset are the map's own zoom, so the panel can be read at the size of the whole sphere or at
// the size of the frame without the frame being the only place the pilot can look. The reset is the map's reading of
// the whole: the magnification goes back to one and the view the disc turned goes back to the one the space fits, so a
// pilot who brought the frame round with the map is looking at the place's own seat again.
//
// The map is also the way back to the sphere. When the map alone is standing, a press or a wheel on the disc is a pilot
// reaching for the space again, so the frame returns to the two-pane arrangement before the press is read. A map that
// kept the sphere hidden while the pilot turned it would be the one reading of the space that cannot leave itself.
//
// The disc carries no words. A name drawn on it is a name at the size of a patch, which is a name too small
// to read and too wide for the ground under it, and the column below the map is where a project and a
// participant are named and read. What the disc is for is where: the shell, the patches, the frame's own
// region, and the unit marks themselves, which are the same glyphs the lists use so a mark is recognisable
// on the disc without a word beside it.
//
// The whole disc is drawn. A disc scaled to cover its box loses whichever side the box is short on, and the
// column this map stands in is taller than it is wide: covering the box would cut the left and right of the
// shell, which is where the places beside the open one stand. The box keeps the strip that is left instead.

/** How tall a unit's glyph is on the disc, in disc radii. The map is read for where things are. */
const GLYPH = 0.075;
/** The shell's own web, at every thirty degrees. It is what makes the disc read as a sphere. */
const WEB = [-60, -30, 0, 30, 60];

/** The samples on one line of the web. Enough that the curve the projection gives is the curve drawn. */
const WEB_STEPS = 48;

/** How far one press of the map's own plus or minus magnifies it, and the range it may reach. */
const ZOOM_STEP = 1.3;
const ZOOM_MOST = 4;

/** A parallel at one elevation, from the left rim to the right. */
function parallelPath(elevation: number): string {
  const points: string[] = [];
  for (let step = 0; step <= WEB_STEPS; step += 1) {
    const azimuth = -Math.PI / 2 + (step / WEB_STEPS) * Math.PI;
    const [x, y] = onDisc(azimuth, elevation);
    points.push(`${x.toFixed(4)} ${y.toFixed(4)}`);
  }
  return `M${points.join('L')}`;
}

/** A meridian at one azimuth, from the south pole to the north. */
function meridianPath(azimuth: number): string {
  const points: string[] = [];
  for (let step = 0; step <= WEB_STEPS; step += 1) {
    const elevation = -Math.PI / 2 + (step / WEB_STEPS) * Math.PI;
    const [x, y] = onDisc(azimuth, elevation);
    points.push(`${x.toFixed(4)} ${y.toFixed(4)}`);
  }
  return `M${points.join('L')}`;
}

/**
 * How much of the column the disc keeps whatever the sections under it ask for.
 *
 * It is the floor the projects are dragged down to, and it is here rather than at the column because it is a fact about
 * the disc: a disc shallower than this is a disc with no middle band in it, and the middle band is where every patch and
 * every mark stands. It is exported because the drag is clamped where the column is drawn and the floor is the disc's.
 */
export const MAP_MIN = 150;

export function SpaceMap({
  world,
  neighbours,
  state,
  pickedId,
  seat,
  onPick,
  onOpenProject,
}: {
  world: World;
  neighbours: Neighbour[];
  state: Record<string, 'working' | 'idle' | 'offline'>;
  pickedId: string | null;
  /**
   * Whether the board is drawing this space from the pilot's own seat.
   *
   * It is the one thing the frame's own region is a claim about. The four corners of the frame are the part of the shell
   * the board holds, and a board drawing the run as a table or a queue holds no part of the shell: painting the region
   * over those readings would say the frame is pointed at something it is not showing. The reading declares it
   * (`lib/readings`) and this draws the answer, so a reading added later brings its own.
   */
  seat: boolean;
  onPick: (id: string) => void;
  /** Enter the project whose patch was pressed, which is the map's own way between places. */
  onOpenProject: (id: string) => void;
}) {
  const yaw = useView((store) => store.yaw);
  const pitch = useView((store) => store.pitch);
  const fov = useView((store) => store.fov);
  const frame = useView((store) => store.frame);
  const releaseView = useView((store) => store.release);
  const projectId = useScenario((store) => store.projectId);
  const returnToTogether = useFrame((store) => store.returnToTogether);
  const aspect = world.aspect;
  const sector = world.sector;
  // The pilot's own bearing, which the disc is centred on: the map shows the half of the shell they face.
  const turn = useMemo<Turn>(() => [yaw, pitch], [yaw, pitch]);
  // The map's own magnification, which is the panel's and not the camera's: the globe can be read whole or the frame
  // can be read at the size of the panel, and the camera's field is still the frame's.
  const [zoom, setZoom] = useState(1);
  // Whether the pointer is outside the frame, which is what says the press will turn the map rather than take what
  // stands inside the frame.
  const [outside, setOutside] = useState(false);
  // The disc's own element, which is what its pixels are measured against, and the gesture that turns the view by
  // them: the same one the map read whole is drawn with, so the two readings of the view cannot disagree about which
  // way the space went.
  const disc = useRef<SVGSVGElement>(null);

  // The frame's own region, recomputed from the view rather than tracked beside it, so the paint and the
  // camera cannot drift apart.
  const region = useMemo(
    () => viewRegion({ yaw, pitch, fov }, frame[0] / Math.max(frame[1], 1)),
    [yaw, pitch, fov, frame],
  );

  /** A pointer as a point of the disc, in the disc's own units and not the panel's. */
  const atDisc = (event: ReactPointerEvent<Element>): [number, number] | null => {
    const svg = disc.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const place = svg.createSVGPoint();
    place.x = event.clientX;
    place.y = event.clientY;
    const point = place.matrixTransform(matrix.inverse());
    return [point.x / zoom, point.y / zoom];
  };

  /** Whether a press is on the frame, which is the part of the map that turns nothing. */
  const onFrame = (event: ReactPointerEvent<Element>): boolean => {
    const point = atDisc(event);
    return point ? insideDisc(point, region) : false;
  };

  const drag = useMapDrag(disc, {
    turnable: (event) => !onFrame(event),
    scale: zoom,
    // The map draws the pilot's own bearing at its middle, so a hand that pushes the disc turns the space the other way
    // from the hand: the sphere moves under the marker rather than the marker under the sphere.
    sense: -1,
  });

  // The wheel is the map's own zoom, at the same range the buttons hold. It is a listener of its own because a wheel
  // over a map must not scroll the column underneath it, and React's own wheel handler is passive.
  useEffect(() => {
    const svg = disc.current;
    if (!svg) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      returnToTogether(projectId);
      const next = Math.exp(-event.deltaY * 0.0015);
      setZoom((value) => Math.min(ZOOM_MOST, Math.max(1, value * next)));
    };
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  }, [projectId, returnToTogether]);

  const here = onDisc(yaw, pitch, turn);
  const store = world.store ? onMap(world.store, aspect, sector, turn) : null;

  // The zone of the open field, and of every field the shell holds, by the one rule the board draws them
  // with: a cap its own members reach from its bearing. The map and the board therefore cannot draw two
  // different grounds for one field, and a field's ground is the same size in both readings.
  const mine = useMemo(() => {
    const zone = zoneOf(
      world.standing.map((unit) => placed(unit.at, aspect, sector)),
      sector,
    );
    return { d: outlineOfPoints(capRim(zone.centre, zone.radius), turn), at: onDisc(...sector, turn) };
  }, [world.standing, aspect, sector, turn]);
  const theirs = useMemo(() => {
    const list = neighbours.map((neighbour) => {
      const zone = zoneOf(
        neighbour.units.map((unit) => placed(unit.at, neighbour.aspect, neighbour.sector)),
        neighbour.sector,
      );
      const near = visible(neighbour.sector, turn);
      return {
        id: neighbour.id,
        near,
        at: onEdge(zone.centre, turn),
        mark: null as [number, number] | null,
        // Every place keeps a patch, and a place behind the pilot is held at the rim: the map is how a pilot crosses the
        // shell, so the way into a place that is behind them is still on the map. Only the marks of a far place are left
        // out, because a mark is where a machine is and a machine on the far side is not being looked at.
        d: outlineOfPoints(capRim(zone.centre, zone.radius), turn),
        units: near
          ? neighbour.units
              .filter((unit) => visible(bearingOf(placed(unit.at, neighbour.aspect, neighbour.sector)), turn))
              .map((unit) => onMap(unit.at, neighbour.aspect, neighbour.sector, turn))
          : [],
      };
    });
    // A far place is a rim marker rather than a patch: a patch clamped onto the rim is a sliver of itself and cannot be
    // pressed. The markers are spread along the rim of their own side, so the places behind the pilot are all reachable.
    for (const side of [-1, 1]) {
      const far = list.filter((each) => !each.near && Math.sign(each.at[0]) === side);
      far.sort((left, right) => left.id.localeCompare(right.id));
      far.forEach((each, index) => {
        const y = Math.max(-0.86, Math.min(0.86, (index - (far.length - 1) / 2) * 0.18));
        each.mark = [side * Math.sqrt(Math.max(0, 1 - y * y)), y];
      });
    }
    return list;
  }, [neighbours, turn]);

  const mark = (unit: World['present'][number]) => {
    const bearing = bearingOf(placed(unit.at, aspect, sector));
    if (!visible(bearing, turn)) return null;
    const [x, y] = onMap(unit.at, aspect, sector, turn);
    const picked = unit.id === pickedId;
    const ring = ringOf(unit);
    return (
      <g
        key={unit.id}
        transform={`translate(${x - GLYPH / 2} ${y - GLYPH / 2}) scale(${GLYPH / 16})`}
        onClick={() => {
          if (!drag.turned.current) onPick(unit.id);
        }}
        className={cn(
          'cursor-pointer stroke-current [stroke-width:1.7]',
          picked ? 'text-claim' : UNIT_STATE[state[unit.id] ?? 'offline'],
        )}
      >
        {/* A unit above the ground carries its altitude as the width of a ring, which is the one way the disc can show a
            height: the sphere seen from outside keeps every unit on one circle, and the lift itself is depth. */}
        {ring > 0 ? (
          <circle
            cx={8}
            cy={8}
            r={ring * (16 / GLYPH)}
            className="fill-none stroke-current"
            opacity={0.55}
            strokeWidth={1.2}
          />
        ) : null}
        <path d={glyphPath(unit.icon, unit.role)} className="fill-none" />
      </g>
    );
  };

  return (
    <div
      style={{ minHeight: MAP_MIN }}
      className="relative flex shrink basis-[300px] flex-col overflow-hidden border-b bg-background/60 p-1"
    >
      <svg
        ref={disc}
        data-region="space-map"
        viewBox={`${-DISC / 2} ${-DISC / 2} ${DISC} ${DISC}`}
        preserveAspectRatio="xMidYMid meet"
        className={cn('min-h-0 w-full flex-1 touch-none', outside ? 'cursor-move' : 'cursor-default')}
        onPointerDown={(event) => {
          returnToTogether(projectId);
          drag.onPointerDown(event);
        }}
        onPointerMove={(event) => {
          const point = atDisc(event);
          const now = point ? !insideDisc(point, region) : false;
          if (now !== outside) setOutside(now);
          drag.onPointerMove(event);
        }}
        onPointerUp={drag.onPointerUp}
        onPointerCancel={drag.onPointerCancel}
      >
        <g transform={`scale(${zoom})`}>
          <circle r="1" className="fill-background stroke-border" />

          {/* The shell's own web, so the disc reads as a sphere and the patch the place takes is read as
              a patch rather than as the whole of what there is. It is the disc's own grid and not the space's, so it
              stays with the sphere while the places turn over it. */}
          <g className="stroke-border" strokeWidth={0.003} fill="none">
            {WEB.map((degrees) => (
              <path
                key={`meridian-${degrees}`}
                d={meridianPath((degrees * Math.PI) / 180)}
                className={degrees === 0 ? 'stroke-muted-foreground/70' : ''}
              />
            ))}
            {WEB.map((degrees) => (
              <path key={`parallel-${degrees}`} d={parallelPath((degrees * Math.PI) / 180)} />
            ))}
          </g>

          {/* The rest of the shell: which other places are held, and where. Named nowhere: the disc says
              where a place is, and the column under it is where a place is read. A patch is also the way
              into it, because the whole shell is one space and a map is how a pilot crosses one: the
              board's own group marks are reached by turning, and this is the reading that holds them all. */}
          {theirs.map((theirs) => (
            <g key={theirs.id}>
              <path
                d={theirs.d}
                fill="none"
                pointerEvents="all"
                className="cursor-pointer stroke-border hover:stroke-foreground"
                strokeWidth={0.004}
                onClick={() => {
                  if (!drag.turned.current) onOpenProject(theirs.id);
                }}
              >
                <title>enter {theirs.id}</title>
              </path>
              {theirs.mark ? (
                <circle
                  cx={theirs.mark[0]}
                  cy={theirs.mark[1]}
                  r={0.026}
                  pointerEvents="all"
                  className="cursor-pointer fill-background stroke-muted-foreground hover:stroke-foreground"
                  strokeWidth={0.006}
                  onClick={() => {
                    if (!drag.turned.current) onOpenProject(theirs.id);
                  }}
                >
                  <title>enter {theirs.id}</title>
                </circle>
              ) : null}
              {theirs.units.map((at, index) => (
                <circle key={index} cx={at[0]} cy={at[1]} r={0.008} className="fill-muted-foreground/50" />
              ))}
            </g>
          ))}

          {/* The patch of shell the open place takes, and the ground it names inside it. */}
          <path d={mine.d} fill="none" className="stroke-foreground/60" strokeWidth={0.006} />

          {/* Where the frame is pointed: the view's own four corners, which is what the board holds. It is the map's
              own viewport, so a hand inside it takes what the board is showing and a hand outside it turns the map. It
              is drawn for the reading that is the pilot's own view and for no other, and not before the frame has been
              measured: a frame of no pixels is a region of no corners, and a degenerate polygon is a mark on the disc
              that says nothing. */}
          {seat && frame[0] > 0 && frame[1] > 0 ? (
            <polygon
              data-region="map-view"
              points={region.map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`).join(' ')}
              fill="rgba(255,255,255,0.07)"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth={0.005}
              // The frame is a reading, not a control: a press inside it belongs to the mark under the pointer, and a
              // press outside it is the map's own turn.
              pointerEvents="none"
            />
          ) : null}

          {store ? (
            <circle
              cx={store[0]}
              cy={store[1]}
              r={0.016}
              className="fill-none stroke-ktema"
              strokeWidth={0.01}
            />
          ) : null}

          {world.present.map(mark)}

          <circle cx={here[0]} cy={here[1]} r={0.022} className="fill-claim" />
        </g>
      </svg>

      {/* The map's own controls, at the size of a map control: the globe is read whole at the reset and closer at the
          plus, and the frame is still the camera's. */}
      <div
        data-region="space-map-controls"
        className="absolute right-1.5 bottom-1.5 z-10 flex flex-col gap-0.5 rounded-sm border bg-background/90 p-0.5"
      >
        <Hint label="zoom in">
          <Button
            size="icon-xs"
            variant="ghost"
            className="size-6"
            onClick={() => setZoom((value) => Math.min(ZOOM_MOST, value * ZOOM_STEP))}
          >
            <Plus />
          </Button>
        </Hint>
        <Hint label="zoom out">
          <Button
            size="icon-xs"
            variant="ghost"
            className="size-6"
            onClick={() => setZoom((value) => Math.max(1, value / ZOOM_STEP))}
          >
            <Minus />
          </Button>
        </Hint>
        <Hint label="reset">
          <Button
            size="icon-xs"
            variant="ghost"
            className="size-6"
            onClick={() => {
              // A reset is the whole reading and not only its size: the disc turned the view, so the view goes back to
              // the one the space fits. Resetting the magnification alone leaves a turned globe at the size it was
              // already at, which is a press that looks like it did nothing.
              releaseView();
              setZoom(1);
            }}
          >
            <Crosshair />
          </Button>
        </Hint>
      </div>
    </div>
  );
}
