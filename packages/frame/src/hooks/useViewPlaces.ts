import { useMemo } from 'react';
import {
  RIM_PER_CELL,
  bearingAt,
  bearingGap,
  bearingOf,
  patchOf,
  patchRim,
  placed,
  project,
  shellAt,
  unfold,
  type Bearing,
  type View as Look,
} from '../lib/board';
import type { CarriedView } from '../lib/types';
import {
  MARGIN,
  anchorOf,
  handleOf,
  held,
  patchBox,
  patchHalf,
  readingOf,
  shifted,
  viewBearing,
  type FrameBox,
  type Mark,
} from '../lib/views';
import { useView } from '../stores/view';
import { useViews, type WindowView } from '../stores/views';
import type { World } from '../lib/types';

// Where each window the space carries stands, as one reading both of its renderers use.
//
// A window is drawn twice: its picture on the shell by the canvas, and its pin, its press target and its icon over the
// canvas by the page. All of them are the same place, so all of them are computed here, once, and handed to the two
// renderers: a pin that computed its own place could stand over a window that is not its own, and a press target
// anywhere but on its own window is a press that picks something else.
//
// What the pilot has not moved is placed by `lib/views.ts`, which is where a place on the shell is defined. This
// only reads the space, hands over the bearings of the things a window should not stand over, and writes down where
// the answer falls on the frame.
//
// A folded window is read here too, because a folded window keeps the place it stood at. It has no picture and no pin,
// and what it has instead is a place that may have gone past the frame's edge, which is what its icon answers: a place
// on a sphere has no edge, so a window that has gone behind the pilot is a window its icon has to point at.
//
// Which of the two a window is read by is one decision and it is not taken here: `readingOf` in `lib/views.ts` holds
// it, so that the layer which turns a press into a pick or into a turn reads the same answer this one places.

export interface ViewPlace {
  id: string;
  /** The window itself, which is what a press on it acts on. */
  view: WindowView;
  /** The view this window is the view of, which is what it is labelled with. */
  source: CarriedView;
  /** The entity the camera is carried by, which is the entity a press on the window picks. */
  originId: string;
  /**
   * The base a drag is measured from, which is the window's own anchor: the entity for a view of the entity, and the
   * place's centre for a view of the whole place.
   */
  origin: Bearing;
  /**
   * The entity's own bearing, which is where the line back to it lands and which side its pin is set on.
   *
   * It is not the anchor of a whole-place window: a map of the place stands over the place, and the entity that carries
   * it is still what the window belongs to and what the lead points at.
   */
  carried: Bearing;
  /** Where the entity falls on the frame, which is what a folded window's pin is joined back to. */
  originAt: [number, number];
  /** Where the window stands: the entity's bearing plus whatever the pilot has done to it. */
  place: Bearing;
  /**
   * Where the window's own place falls on the frame, which is the anchor of every drag of it.
   *
   * It is the projection of the window's place and not the middle of its box. The box is the projection of the patch's
   * own rim, and a patch off the middle of the frame is seen obliquely, so the middle of its box is a little toward the
   * frame's own middle from the place the window stands at: a drag anchored there would carry the window by the travel
   * plus that offset, which grows the further the window is taken from the middle. Anchored on its own place the window
   * lands exactly where the hand went, because the projection is read back out by the same arithmetic it was written
   * with.
   */
  at: [number, number];
  /** The window's own patch on the frame as a closed polygon, or null while it has no picture. */
  rim: [number, number][] | null;
  /** How large the window is, in cells of the graticule: the pilot's own size once they have given it one. */
  cells: Bearing;
  /** The window's own box on the frame, or null when it is folded and there is no picture. */
  box: FrameBox | null;
  /**
   * Where the pin stands, or null when the window is not carried by one: a folded window has no picture to be a pin on,
   * and a window the frame does not hold has an icon on the edge instead. The pin is where the line back to the entity
   * starts from, so a window with none has no line.
   */
  handle: FrameBox | null;
  /**
   * Where the icon of a window whose picture the board draws nowhere stands, or null when it is read as a window. A
   * folded window and a window carried wholly past the frame are the same reading: a thing somewhere in the room,
   * reached by turning to where its icon is.
   */
  mark: Mark | null;
  /**
   * Whether the window's own bar is past the frame, which is what its grip is drawn by: a grip is a corner and its own
   * place is the window's rim, so a rim past the edge is a grip the pilot cannot reach.
   */
  off: boolean;
  /** The two bearings of the line back to the entity, or null while the window stands on its own entity. */
  lead: [Bearing, Bearing] | null;
  /** Whether the pilot has moved it, which is whether there is a line back to the entity to draw. */
  moved: boolean;
}

export function useViewPlaces(world: World, size: [number, number]): ViewPlace[] {
  const yaw = useView((state) => state.yaw);
  const pitch = useView((state) => state.pitch);
  const fov = useView((state) => state.fov);
  const arrival = useView((state) => state.arrival);
  const views = useViews((state) => state.views);

  // The bearings a window should not stand over: the field's own members, the composition, which is a participant
  // like the rest, and the entity of every other window, so that opening the space again is a picture rather than a
  // pile of windows on one clear place.
  const marks = useMemo(() => {
    const out = world.standing.map((unit) => bearingOf(placed(unit.at, world.aspect, world.sector)));
    if (world.store) out.push(bearingOf(placed(world.store, world.aspect, world.sector)));
    return out;
  }, [world]);

  return useMemo(() => {
    const look: Look = { yaw, pitch, fov };
    const centre = placed([0, 0, 0], world.aspect, world.sector);
    const origins = views.flatMap((view) => {
      const source = world.views.find((each) => each.id === view.id);
      const unit = world.present.find((each) => each.id === source?.origin);
      return unit ? [bearingOf(unfold(placed(unit.at, world.aspect, world.sector), centre, arrival))] : [];
    });
    const out: ViewPlace[] = [];
    for (const view of views) {
      const source = world.views.find((each) => each.id === view.id);
      const unit = world.present.find((each) => each.id === source?.origin);
      if (!source || source.kind === 'unknown' || !unit) continue;
      // The bearing comes from the entity's own place as the space unfolds it, so a window comes out of its group
      // with the entity it belongs to rather than appearing where it will be.
      const carried = bearingOf(unfold(placed(unit.at, world.aspect, world.sector), centre, arrival));
      const own = anchorOf(source, carried, bearingOf(centre));
      // Where that entity falls on the frame, which is the side the window's pin is set on. It is the entity's
      // direction and not its distance, so the same reading stands as the mark the pilot reads in the space.
      const [originX, originY] = project(shellAt(carried), size[0], size[1], look);
      // The cells the window covers: the pilot's own size once they have given it one, and the camera's until then.
      const cells = view.size ?? source.cells;
      const half = patchHalf(cells);
      // The box a window's own patch of the surface is read in, which is what its press target, its pin and its grip are
      // laid on. It is read from the patch rather than from a count of pixels to the cell, so the controls stand on the
      // picture's own edge however the surface foreshortens as the pilot turns.
      const box = (place: Bearing): FrameBox => patchBox(patchOf(place, cells, RIM_PER_CELL), size, look);
      // Where a window is allowed to stand: the whole of it inside the frame, and its pin with it. A window whose
      // own edge hangs past the frame is a window whose pin, grip and close are pressed on whatever the layout put
      // beside the board, so the controls it draws are controls the pilot cannot reach. The frame is asked for the
      // pin and not only the window because the pin is the control, and a window too large for the frame at all is
      // placed by the fallback `clearOffset` keeps rather than by this.
      const holds = (place: Bearing): boolean => {
        const window = box(place);
        if (!held(window, size, MARGIN)) return false;
        // A folded window has no pin to reach, and the pin it does have is smaller than the window's own box. The pin is
        // asked for through `handleOf` and not through the reading, because the reading needs to know whether the frame
        // holds the window at all, which is the question this is answering.
        return view.folded || held(handleOf(window, [originX, originY]), size, MARGIN);
      };
      const others = origins.filter((bearing) => bearingGap(bearing, own) > 1e-6);
      // A map of the whole place stands over the place. The search for a clear place is what keeps a camera's window off
      // the marks it is not about, and a map of the ground is about all of them: moving it to the limb to keep it clear
      // of the units it draws would shrink the map to read the units. It is where the place is centred, and the pilot
      // moves it like any other window.
      const place =
        source.kind === 'map' && source.scope === 'place'
          ? shifted(own, view.offset ?? [0, 0])
          : viewBearing(view.offset, own, half, [...marks, ...others], view.id, holds);
      const [x, y, depth] = project(shellAt(place), size[0], size[1], look);
      const window = box(place);
      // The picture's own edge on the frame, which is what its press is clipped to: a bounding box is wider than the patch
      // wherever the surface foreshortens, and a press in that corner belongs to whatever is under it.
      const rim = view.folded
        ? null
        : patchRim(patchOf(place, cells, RIM_PER_CELL)).map((point) => {
            const [px, py] = project(point, size[0], size[1], look);
            return [px, py] as [number, number];
          });
      // Whether the window stands off the frame at all. A window the pilot has moved is placed by the pilot and not
      // by the search, so it can be taken past an edge, and what it takes past the edge is its own controls. A window
      // behind the pilot stands off the frame whatever its mirror lands on, for the same reason a mark does: the picture
      // of a thing behind the eye is not drawn on the frame, so its icon is all the pilot has of it.
      const behind = depth <= 0;
      const off = behind || !held(window, size, 0);
      // What the pilot reads this window by: the picture it is drawn by and the bar that carries it, or the icon it
      // becomes when the board draws nothing of it. Any part of the picture at all makes it a window.
      const read = readingOf({
        folded: view.folded,
        behind,
        at: [x, y],
        box: window,
        originAt: [originX, originY],
        size,
      });
      out.push({
        id: view.id,
        view,
        source,
        originId: unit.id,
        origin: own,
        carried,
        originAt: [originX, originY],
        place,
        at: [x, y],
        rim,
        cells,
        box: read.box,
        handle: read.handle,
        mark: read.mark,
        off,
        // The line back to the entity starts at the pin, which is the window's own end of it. It lands on the entity,
        // which for a whole-place map is not the place the window stands over. A media window is drawn on the shell, and
        // its lead is the shell's own (`ViewPatch`): it is handed the same two bearings, so the two drawings are one
        // answer.
        lead: read.handle
          ? [
              bearingAt(
                [
                  read.handle.left + read.handle.width / 2,
                  read.handle.top + read.handle.height / 2,
                ],
                size,
                look,
              ),
              carried,
            ]
          : null,
        moved: view.offset !== null,
      });
    }
    return out;
  }, [views, world, size, yaw, pitch, fov, arrival, marks]);
}
