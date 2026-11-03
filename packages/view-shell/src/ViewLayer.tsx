import { useEffect, useRef } from 'react';
import { ChevronDown, MoveDiagonal2, X } from 'lucide-react';
import { aimAt, shellAt, type View as Look } from '@ssccsorg/skene-board';
import { standing, viewsOf } from '@ssccsorg/skene-frame/lib/carried';
import { kindOf } from '@ssccsorg/skene-frame/lib/windows';
import { UNKNOWN_KIND, viewKindOf } from '@ssccsorg/skene-frame/lib/view-kinds';
import type { CarriedView } from '@ssccsorg/skene-kernel';
import { MARK, clipped, dragged, gripOf, sized } from '@ssccsorg/skene-board';
import { useSelection } from '@ssccsorg/skene-frame/stores/selection';
import { useView } from '@ssccsorg/skene-frame/stores/view';
import { useViews } from '@ssccsorg/skene-frame/stores/views';
import type { ViewPlace } from './useViewPlaces';
import { EdgeMark } from './EdgeMark';
import { ViewHandle } from './ViewHandle';

// The page's half of every window the space carries: the target its picture is pressed by, the pin a window on the
// frame is carried by, the grip it is sized from, and the icon it becomes when its picture is not on the frame.
//
// The picture is painted by the canvas, on the shell (`components/ViewPatch.tsx`), so nothing here draws a frame of
// it. What the page has to provide is what a texture cannot: something to press. A browser hands a pointer to an
// element and not to a texture, so each of these is a box of the page standing where its own part of the window
// falls, and all of them are read from one place (`hooks/useViewPlaces.ts`), so none can be anywhere but on the
// window it belongs to.
//
// What the pilot can take hold of is the picture where it is drawn, which is the part of the window the frame holds
// (`clipped`). It is that part and not the whole box, so a target cannot reach over a panel; and it is any part at all,
// so a window standing half over an edge is still a window the pilot drags where they can see it. Everything reached by
// hand that stands *on* the window, which is its pin, its close and its grip, is a question of the window being clear
// of the edge (`held`): those are set at the window's own rim, so a rim past the frame's edge is a control past it too.
//
// A window the pilot cannot see is an icon and not a bar. A folded window has no picture for a bar to sit on, and a
// window the frame does not hold has no place on the frame for one either, so both are the same thing: a small control
// carrying the window's own glyph, standing where the window's own place falls, with its whole label and its own
// controls one hover away (`components/EdgeMark.tsx`). That is the same object a unit the frame does not hold is read
// by, which is what makes the frame's edge one row of things rather than two kinds of thing sharing an edge. A window
// the frame does not hold is read by its icon alone, and then its icon is also the only part of it there is to take
// hold of, so a drag from the icon moves the window the way a drag from its picture does.
//
// A gesture belongs to the hand and not to the element it started on, so it is advanced from the page and not from the
// control that took it. A window the pilot is carrying is a window that leaves the frame while they carry it, and one
// that is put away or drawn past the edge is read by an icon instead of a picture, so the element under the pointer
// changes while the gesture is going on and the element the press landed on can be taken off the page entirely: an
// element taken off the page takes whatever was attached to it, which is how a drag used to end at the frame's own edge.
// What the controls here carry is therefore the press alone, from which the layer reads the whole of a gesture.
//
// Moving a window is dragging it, by the picture, by its pin, or by its icon once it is off the frame, and sizing it is
// dragging its own corner. Both go through `lib/views.ts`: the pointer's travel is read out at the shell's radius, so
// the window follows the hand across the surface by the angle the pointer went rather than by a count of pixels. A move
// is anchored on the place the window stands at (`ViewPlace.at`), so the window goes exactly where the hand went
// however far from the middle of the frame it is carried; a size is anchored on the window's own box, because a size is
// a count of pixels to the cell where the window is drawn. A press that never moved is the window's own action, which
// is picking the entity whose camera it is on a window the frame holds, and putting the picture back in front of the
// pilot on an icon. What the two have in common is that neither travels: a gesture that did is a drag, and a drag is
// not a press.
//
// The stack is the pilot's, and the pictures are drawn in it too: a window is one window whether it is read as a
// picture, a pin or an icon, and the patch's own `renderOrder` is the number this layer stacks by. A press therefore takes
// the picture under it and brings that window forward, rather than a control that happens to be higher in the page.

/** How far a pointer travels before a press on a window becomes a drag of it. */
const DRAG = 4;
/** How large the grip is, in the frame's pixels. A corner a hand can find without looking for it. */
const GRIP = 16;

/** One gesture over one window: which window, what it fell on, and where it stood when the gesture began. */
interface Grip {
  id: string;
  pointer: number;
  /** Where the pointer went down, in the page's own pixels. A gesture's travel is read from this and nothing else. */
  at: [number, number];
  /**
   * The same press in the frame's own pixels, which is what a resize is read from.
   *
   * It is the frame's own and not the page's because `sized` measures the window's own box, and the pointer arrives
   * in the page's coordinates: the two differ by wherever the board happens to stand in the layout. A travel is the
   * same number in either frame, which is why the two are kept apart rather than converted.
   */
  corner: [number, number];
  /** What the press is on: a resize of the window, or a drag of it. */
  resize: boolean;
  place: ViewPlace;
  moved: boolean;
}

export function ViewLayer({
  places,
  views,
  tints,
  onPick,
  size,
}: {
  places: ViewPlace[];
  /** Every view the open project's place declares, by the unit that carries it. */
  views: CarriedView[];
  /**
   * The ink every unit of the open project is drawn in, which is what a window's icon is drawn in.
   *
   * A window is the eye of the entity its camera is carried by, so its mark wears that entity's own reading and
   * not a colour of its own: one thing drawn twice would otherwise be two colours, and a pilot reading the edge
   * would have to learn which grey is a window and which is a mark. A camera whose entity is not in this space
   * has no ink here, and the icon then falls back to the frame's own, which is what a reading the frame does not
   * hold looks like.
   */
  tints: Record<string, string | null>;
  /** The one pick every surface makes: a window is a handle on the entity its camera is carried by. */
  onPick: (unitId: string) => void;
  /** The board's own size in pixels, which is the frame a drag is read in. */
  size: [number, number];
}) {
  const open = useViews((state) => state.open);
  const raise = useViews((state) => state.raise);
  const fold = useViews((state) => state.fold);
  const close = useViews((state) => state.close);
  const running = useViews((state) => state.running);
  const picked = useSelection((state) => state.unit);
  const grip = useRef<Grip | null>(null);
  // A press that never moved is an action on the window, and it is read on the click after the gesture: the two
  // readings outlive the grip for the one event between them.
  const moved = useRef(false);
  /**
   * The frame the open gesture is read in.
   *
   * The listener that advances a gesture is attached once for the life of the layer, because a gesture is the pilot's
   * hand and not the element it began on, so the frame is carried to it here rather than captured in it: a layer whose
   * frame changed shape while a window was being carried would otherwise go on dragging by the frame it used to be.
   */
  const frame = useRef(size);
  useEffect(() => {
    frame.current = size;
  }, [size]);

  useEffect(() => {
    for (const view of views) open(view.id, kindOf(view.kind));
  }, [views, open]);

  useEffect(() => {
    // Every view the picked entity carries, because an entity and a window are not one thing: picking a robot with
    // two views is asking about both of them.
    for (const view of viewsOf(views, picked ?? '')) open(view.id, kindOf(view.kind));
  }, [views, picked, open]);

  const begin =
    (place: ViewPlace, resize_: boolean, origin: [number, number]) =>
    (event: React.PointerEvent<HTMLElement>) => {
      // The board turns on a drag of its own wrapper, and a press on a window is a press on the window: without this
      // the space would come round while the pilot was dragging a window across it.
      event.stopPropagation();
      raise(place.id);
      // No pointer is taken here on purpose. Taking one would keep the move events coming to this one element, which the
      // page already does for every move, and it would take the click with it: a press that never travelled is the
      // window's own action, and a click is delivered to the control the press was made on only while nothing holds the
      // pointer.
      //
      // The press in the frame's own pixels, which is what a resize is read from. Each control is its own element, so the
      // press is read against the frame position that element is drawn at: a pin and a grip are not the size of the window
      // they belong to, and a press measured against the box it happened to land on would be a press at the window's own
      // middle.
      const box = event.currentTarget.getBoundingClientRect();
      const corner: [number, number] = [
        origin[0] + (event.clientX - box.left),
        origin[1] + (event.clientY - box.top),
      ];
      moved.current = false;
      grip.current = {
        id: place.id,
        pointer: event.pointerId,
        at: [event.clientX, event.clientY],
        corner,
        resize: resize_,
        place,
        moved: false,
      };
    };

  // The one place a gesture is advanced from, and the one it is ended from. The first move past the threshold takes the
  // window off the search, which is a move of nothing: a window left in the search is a window it re-places at every
  // size it passes through, so it would slide across the surface while the hand sizing it stayed put, and the corner
  // being dragged would stop being the corner under the pointer.
  useEffect(() => {
    const advance = (event: PointerEvent) => {
      const held = grip.current;
      if (!held || held.pointer !== event.pointerId) return;
      // A release the page never saw, which is what a hand that let go outside the window gives: the pointer comes back
      // with no button down. A gesture that went on from there would carry the window with every move over the app, and
      // the window would follow the pointer wherever the pilot meant to press.
      if (event.buttons === 0) {
        grip.current = null;
        return;
      }
      const delta: [number, number] = [event.clientX - held.at[0], event.clientY - held.at[1]];
      if (!held.moved && Math.hypot(delta[0], delta[1]) < DRAG) return;
      const first = !held.moved;
      held.moved = true;
      moved.current = true;
      const view = useView.getState();
      const look: Look = { yaw: view.yaw, pitch: view.pitch, fov: view.fov };
      const views = useViews.getState();
      const frameSize = frame.current;
      if (held.resize) {
        if (first) {
          views.move(held.id, [
            held.place.place[0] - held.place.origin[0],
            held.place.place[1] - held.place.origin[1],
          ]);
        }
        // A size is read from the middle of the window's own box, because a size is a count of pixels to the cell at
        // the place the window is drawn and the box is what it is drawn in.
        const box = held.place.box;
        const middle: [number, number] = box ? [box.left + box.width / 2, box.top + box.height / 2] : held.place.at;
        const pointer: [number, number] = [held.corner[0] + delta[0], held.corner[1] + delta[1]];
        views.resize(held.id, sized(middle, pointer, frameSize, look));
        return;
      }
      // A move is read from where the window's own place is on the frame, so the window goes exactly where the hand
      // went: a window a hundred pixels under the frame travels with a hand that travels a hundred pixels, which is not
      // true of an anchor anywhere else on the window.
      views.move(held.id, dragged(held.place.at, delta, frameSize, look, held.place.origin));
    };
    const finish = (event: PointerEvent) => {
      if (grip.current?.pointer !== event.pointerId) return;
      grip.current = null;
    };
    // A window that loses the focus ends the gesture it was carrying. The release that happened while another window was
    // in front is delivered to that window and not to this one, so the press would otherwise stay in the hand here.
    const lost = () => {
      grip.current = null;
    };
    window.addEventListener('pointermove', advance);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    window.addEventListener('blur', lost);
    return () => {
      window.removeEventListener('pointermove', advance);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      window.removeEventListener('blur', lost);
    };
  }, []);

  const settle = (place: ViewPlace) => () => {
    if (moved.current) return;
    onPick(place.originId);
  };

  // What a press on the icon of a window the pilot cannot see does: it puts the picture back in front of them, and it
  // takes the pilot to the member the window belongs to. A folded window is unfolded where it stands, and selecting the
  // member is what opens its row: the icon is a handle on the member and not only on the picture.
  const show = (place: ViewPlace) => {
    if (place.view.folded) fold(place.id);
    const where = aimAt(shellAt(place.place));
    useView.getState().aim(where.yaw, where.pitch);
  };

  // The icon of a window the frame does not hold is the only part of it there is to take hold of, so it is a control
  // like the picture and its own press is read the same way: a gesture that travelled is the window being moved, and one
  // that did not is the window's own action.
  const settleMark = (place: ViewPlace) => () => {
    if (moved.current) return;
    onPick(place.originId);
    show(place);
  };

  // A press on the bar is a press on the member, unless the hand was moving the window: the bar is the window's handle
  // and the window is the member's, so the two readings of one press are the same member.
  const settleHandle = (place: ViewPlace) => () => {
    if (moved.current) return;
    onPick(place.originId);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-[80]">
      {/* Every window is connected to the entity it belongs to. A folded window is an icon on the edge and a window on
          the frame is a pin, and either one is the window's visible end: a hairline from it to where the entity stands
          keeps one window's two readings one thing. A media window that is open is left to its own lead on the shell
          (`ViewPatch`), so one window has one line and not two. The line is drawn before the marks so it runs under both
          ends rather than over the glyphs. */}
      <svg data-region="view-leads" aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-hidden">
        {places.map((place) => {
          // A media window and a map with a geography are painted on the shell, and their lead is the shell's own
          // (`ViewPatch`, `MapPatch3D`): the frame draws the line only for what the shell does not draw, which is a
          // folded window's icon and a kind this build cannot paint. One window has one line.
          const from = place.mark
            ? place.mark.at
            : place.handle && place.source.kind === 'unknown'
              ? [
                  place.handle.left + place.handle.width / 2,
                  place.handle.top + place.handle.height / 2,
                ]
              : null;
          // The board measures itself after the first paint, so the frame can be a size of nothing for a frame: a line
          // read there is a line of NaNs. What is not on the frame is not drawn, and the next render draws it.
          const finite = (point: number[]) => Number.isFinite(point[0]) && Number.isFinite(point[1]);
          if (!from || !finite(from) || !finite(place.originAt)) return null;
          return (
            <line
              key={`lead-${place.id}`}
              data-region="view-lead"
              data-view={place.id}
              x1={from[0]}
              y1={from[1]}
              x2={place.originAt[0]}
              y2={place.originAt[1]}
              stroke="currentColor"
              className="text-muted-foreground"
              strokeWidth={1}
              opacity={0.4}
            />
          );
        })}
      </svg>
      {places.map((place) => {
        const box = place.box;
        const handle = place.handle;
        const mark = place.mark;
        const KindGlyph = (viewKindOf(kindOf(place.view.kind)) ?? UNKNOWN_KIND).Icon;
        // What of the window the frame draws, which is what the pilot can press: any part of it at all, so that a window
        // standing half over an edge is still a window they take hold of where they can see it. A window entirely past the
        // frame is drawn nowhere and is pressed nowhere either: its icon is the whole of it, so the target is drawn only
        // for a window read as a window and not for the icon a folded, behind, or off-frame one becomes.
        const target = !mark && box ? clipped(box, size) : null;
        // The press is cut to the picture's own patch, not to its bounding box: a patch off the middle of the frame is seen
        // obliquely, and the corner of its box is a place the pilot pressing another window would hit.
        const clip =
          target && place.rim && place.rim.length > 2
            ? `polygon(${place.rim
                .map(([x, y]) => `${(x - target.left).toFixed(1)}px ${(y - target.top).toFixed(1)}px`)
                .join(', ')})`
            : undefined;
        // The grip stands on the window's own corner, half of it over the picture and half of it beside it: an icon
        // hung on the corner reads as the corner, where one parked inside the picture reads as something lying on the
        // thing the pilot is looking at. It is also the only reading that makes the resize exact: a press at the
        // grip's own middle is a pointer at the window's own corner, which is the point a size is measured to. A
        // window at the rim keeps its grip (`gripOf`), because a wide view's place follows its entity and one flush
        // with the edge is a window the pilot has not moved anywhere.
        const gripAt = !mark && box ? gripOf(box, size, GRIP) : null;
        // A folded window has no picture to drag, and it has a place all the same: the one it kept when it was put away.
        // So its icon is a control that is both pressed and dragged, like every other control of a window, and a window
        // can be put somewhere else without being brought out first.
        const markGrip = mark ? begin(place, false, [mark.at[0] - MARK / 2, mark.at[1] - MARK / 2]) : undefined;
        return (
          <div
            key={place.id}
            // The stack is the pilot's own order and it is the order the pictures are drawn in too (`renderOrder` on the
            // patch), so the control that takes a press and the picture under it are the same window.
            style={{ zIndex: 10 + place.view.z }}
          >
            {/* The picture's own target: a press on a camera's picture is asking about the camera's entity, and a drag
                from it moves its window across the surface. It is the part of the window the frame draws, so a window
                the pilot is carrying over an edge keeps the hand that is carrying it. */}
            {target ? (
              <div
                data-view={place.id}
                aria-label={place.source.id}
                title={`${place.source.id}: press to ask about it, drag to move its view`}
                className="pointer-events-auto absolute touch-none cursor-grab active:cursor-grabbing"
                style={{
                  left: target.left,
                  top: target.top,
                  width: target.width,
                  height: target.height,
                  clipPath: clip,
                }}
                onPointerDown={begin(place, false, [target.left, target.top])}
                onClick={settle(place)}
              />
            ) : null}
            {handle ? (
              <>
                <ViewHandle
                  view={place.view}
                  source={place.source}
                  at={handle}
                  onGrip={begin(place, false, [handle.left, handle.top])}
                  onPick={settleHandle(place)}
                />
                {/* The corner the window is sized from. The grip carries an icon because nothing about a corner says
                    it can be dragged: a window's own corner is a place the eye reads as an edge, and the one thing a
                    control has to do is say that it is one. The icon runs down the same diagonal the cursor does, so
                    the two say the same thing, and it is drawn on the corner the size is read from. */}
                {gripAt ? (
                  <div
                    data-grip={place.id}
                    title="drag to size the view"
                    className="pointer-events-auto absolute flex touch-none cursor-nwse-resize items-center justify-center text-muted-foreground/70 hover:text-muted-foreground"
                    style={{ left: gripAt[0], top: gripAt[1], width: GRIP, height: GRIP }}
                    onPointerDown={begin(place, true, gripAt)}
                  >
                    <MoveDiagonal2 className="size-3.5" />
                  </div>
                ) : null}
              </>
            ) : null}
            {/* The window the pilot cannot see, as the icon it is read by: its own glyph, the pulse of a picture with
                something running, and the whole of its label with its own two controls on the side of it the frame has
                room for. It is also the only part of such a window there is to take hold of, so a drag from it moves
                the window. Both of its own controls stop the press from reaching the board, because a control is not the
                space and a press on one that travelled would come round the room instead of pressing it. */}
            {mark ? (
              <EdgeMark
                at={mark.at}
                size={size}
                // A folded window is still a window of somebody's: the label names the member that carries it and the
                // camera is what the member is showing, so a pin on the edge says whose view it is while it is away.
                label={standing(place.source) ? place.source.id : place.source.origin}
                detail={standing(place.source) ? undefined : place.source.id}
                glyph={<KindGlyph className="size-3.5" />}
                tint={tints[place.originId] ?? undefined}
                ringed={place.originId === picked}
                running={running[place.id] ?? false}
                onPick={settleMark(place)}
                onGrip={markGrip}
              >
                <button
                  type="button"
                  title={mark.out ? `bring ${place.source.id} in front of the pilot` : `unfold ${place.source.id}`}
                  className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => show(place)}
                >
                  <ChevronDown
                    className="size-3.5"
                    // The chevron points the way the window went when it was held on the frame's edge, and down when it
                    // was not: down is a quarter turn round from nought, which is what the subtraction holds, and a
                    // window whose icon stands where the window does has no direction for a chevron to point.
                    style={mark.out ? { transform: `rotate(${(mark.turned * 180) / Math.PI - 90}deg)` } : undefined}
                  />
                </button>
                <button
                  type="button"
                  title="close the view"
                  className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => close(place.id)}
                >
                  <X className="size-3.5" />
                </button>
              </EdgeMark>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
