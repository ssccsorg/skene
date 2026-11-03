import { useMemo, useRef } from 'react';
import { capRim, glyphPath, placed, zoneOf } from '@ssccsorg/skene-board';
import { ROW } from '@ssccsorg/skene-ui';
import { DISC, onDisc, onEdge, onMap, outlineOfPoints } from '@ssccsorg/skene-board';
import { UNIT_STATE, useEntityState } from '../hooks/useEntityState';
import { useMapDrag } from '../hooks/useMapDrag';
import { MinimapMark } from '../components/MinimapMark';
import { registerReading, type Board } from '../lib/readings';
import { useScenario } from '../stores/scenario';
import { useView } from '../stores/view';
import { cn } from '@ssccsorg/skene-ui';

/**
 * The shell seen from outside it: every place as the patch of ground it takes, named.
 *
 * The board draws the space the pilot stands inside, and the one thing it cannot say is where the pilot is, because the
 * board is what they are looking at. The disc in the column says it, at the size a column is, and it refuses names: a
 * name at the size of a patch is too small to read and too wide for the ground under it, and the column under the disc is
 * where a place is read. This is that picture at the size of the board, which is the size at which a name fits, so the
 * standpoint a pilot has on the whole shell is a reading and not only a control standing in a column.
 *
 * It is the disc the column draws, read at another scale, and it is the same geometry rather than a second answer to what
 * the shell holds: a place is a cap its own members reach from its bearing, the outline of a cap is the shell's own
 * six-sided cell, a unit and a store are points of the disc through the place's own aspect and bearing, and the pilot's
 * own bearing is the one marker. Nothing here works out anything `lib/map` and `lib/board` do not already answer, and the
 * two readings cannot come to different conclusions about a shell they read through the same functions.
 *
 * What it adds is names and addresses. A patch stands where its own bundle declares the place stands, so a cell is
 * addressed by the bearing the place gives itself and not by a lattice drawn over anyone's ground, and a press on a patch
 * enters the place that takes it. It is drawn from outside every space, so it stands for every project: it is a picture of
 * the shell and not a claim about a ground, and it asks for nothing from a bundle.
 *
 * It is the disc read whole, which is the one thing a section cannot be: at the size of a board a name fits inside the
 * ground it names, so the map's own reading is where a place is entered by name, a member is picked, and the pilot turns
 * the shell by taking it in the hand. The turn is the column's own gesture (`hooks/useMapDrag`), so a pilot who turned
 * the disc here and found it pointing elsewhere there would be reading two maps, which is a defect this cannot have.
 */
export function OutsideView({ world, neighbours, pickedId, onPick, onOpenProject }: Board) {
  const model = useScenario((state) => state.model);
  const yaw = useView((state) => state.yaw);
  const pitch = useView((state) => state.pitch);
  const state = useEntityState();
  // The disc's own box, which is what a drag on it is worth, and the one gesture both readings of the map turn by.
  const disc = useRef<SVGSVGElement>(null);
  // The pilot's own bearing is the marker at the middle, so the surface moves under it the other way from the hand.
  const drag = useMapDrag(disc, { sense: -1 });

  // One place is one patch, outlined as the cell it is, with the middle of it as the point its name stands on. A place is
  // named where the disc draws its ground, which is the edge of the disc for a place behind the pilot: a name is written
  // inward from that edge rather than through it, and it is moved in by its own length so that it stands whole.
  const places = useMemo(() => {
    if (!world) return [];
    const patch = (centre: [number, number, number], radius: number) => ({
      d: outlineOfPoints(capRim(centre, radius)),
      label: onEdge(centre),
    });
    const here = zoneOf(world.standing.map((unit) => placed(unit.at, world.aspect, world.sector)), world.sector);
    return [
      {
        id: model?.project.id ?? '',
        title: model?.title ?? '',
        mine: true,
        ...patch(here.centre, here.radius),
        units: world.present.map((unit) => ({
          unit,
          at: onMap(unit.at, world.aspect, world.sector),
        })),
      },
      ...neighbours.map((each) => {
        const zone = zoneOf(each.units.map((unit) => placed(unit.at, each.aspect, each.sector)), each.sector);
        return {
          id: each.id,
          title: each.title,
          mine: false,
          ...patch(zone.centre, zone.radius),
          units: [],
        };
      }),
    ];
  }, [world, neighbours, model]);

  const here = onDisc(yaw, pitch);
  if (!world || !model) return null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className={cn(ROW, 'gap-2 border-b')}>
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {model.title} · the shell from outside it: {places.length}{' '}
          {places.length === 1 ? 'place' : 'places'}, each as the ground its own members reach
        </span>
        <span className="shrink-0 tabular-nums text-muted-foreground" title="where the pilot's own bearing falls on the shell">
          {Math.round((yaw * 180) / Math.PI)}° {Math.round((pitch * 180) / Math.PI)}°
        </span>
      </div>
      <svg
        ref={disc}
        data-region="outside"
        viewBox={`${-DISC / 2} ${-DISC / 2} ${DISC} ${DISC}`}
        preserveAspectRatio="xMidYMid meet"
        className="min-h-0 min-w-0 flex-1 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerCancel={drag.onPointerCancel}
      >
        <defs>
          <clipPath id="outside-disc">
            <circle r="1" />
          </clipPath>
        </defs>
        <circle r="1" className="fill-background stroke-border" />
        <g clipPath="url(#outside-disc)">
          {places.map((place) => (
            <g key={place.id}>
              <path
                d={place.d}
                onClick={
                  // The press is read when it happens and not when this was drawn: whether the hand turned the map is a
                  // fact about the gesture in flight, and a decision taken at render time would be the last gesture's.
                  place.mine
                    ? undefined
                    : () => {
                        if (!drag.turned.current) onOpenProject(place.id);
                      }
                }
                className={cn(
                  place.mine ? 'fill-foreground/[0.05] stroke-border' : 'fill-foreground/[0.02] stroke-border hover:fill-foreground/[0.08]',
                  place.mine ? '' : 'cursor-pointer',
                )}
                strokeWidth={place.mine ? 0.006 : 0.004}
              >
                {/* A cell is asked for its name and its address by pointing at it: the place's own id, and the bearing
                    its own bundle gives it, which is what a place is named by wherever else it is read. */}
                <title>{place.mine ? `${place.title} · the place the frame is in` : `enter ${place.title}`}</title>
              </path>
              {/* A name stands over the ground it names and is written inward from the edge of the disc by its own length, so
                  a place whose ground reaches the edge is still read whole. */}
              <text
                x={nameAt(place.label[0], place.title || place.id)}
                y={place.label[1]}
                textAnchor="middle"
                fontSize={FONT}
                className={cn('fill-current', place.mine ? 'text-foreground/90' : 'text-muted-foreground')}
              >
                {place.title || place.id}
              </text>
            </g>
          ))}

          {/* What stands in the place the frame is in, as the same glyphs the board draws: a patch read from outside says
              how much ground a place takes and who is on it. */}
          {places
            .filter((place) => place.mine)
            .flatMap((place) =>
              place.units.map(({ unit, at }) => (
                <g
                  key={unit.id}
                  transform={`translate(${at[0] - 0.022} ${at[1] - 0.022}) scale(0.00275)`}
                  className={cn(
                    'cursor-pointer stroke-current [stroke-width:1.7]',
                    unit.id === pickedId ? 'text-claim' : UNIT_STATE[state[unit.id] ?? 'offline'],
                  )}
                  onClick={() => {
                    if (!drag.turned.current) onPick(unit.id);
                  }}
                >
                  <title>{unit.id}</title>
                  <path d={glyphPath(unit.icon, unit.role)} className="fill-none" />
                </g>
              )),
            )}

          {/* Where the pilot's own bearing falls, which is the one thing on the shell that is the pilot rather than the
              space: the same marker the disc in the column draws, from the same reading of the view. */}
          <circle cx={here[0]} cy={here[1]} r={0.022} className="fill-claim" />
        </g>
      </svg>
    </div>
  );
}

/**
 * How large a place's name is written on the disc, in disc radii of text, and how wide one character of it is taken to be.
 *
 * The disc is drawn across a box and a name has to sit inside the ground it names: the size is a fraction of the shell and
 * not a size in points, so a name reads the same whatever the frame is, and the width is an estimate for the same reason
 * `lib/labels` estimates one, which is that a name is placed before it can be measured.
 */
const FONT = 0.022;
const PER_CHAR = FONT * 0.55;

/** A name's own x, held inside the disc by half of what it is estimated to be wide. */
const nameAt = (x: number, title: string): number => {
  const half = (title.length * PER_CHAR) / 2;
  return Math.min(Math.max(x, -1 + half), 1 - half);
};

registerReading({
  key: 'outside',
  path: '/outside',
  View: OutsideView,
  button: { order: 13, title: 'outside', Icon: MinimapMark },
  // The shell read from outside it is a claim about the space it is a reading of, and it is not a picture the frame has
  // decided on yet: it is carried where the project in force asks for it and nowhere else, which today is the one project
  // whose own bundle names it.
  asked: true,
});
