import { useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { GRATICULE, bearingOf, dragTurn, project } from '@ssccsorg/skene-board';
import { cn } from '@ssccsorg/skene-ui';

// The minimap a sphere view stands beside: the picture the pilot is looking through, drawn inside the sphere it looks
// into.
//
// A sphere view owns its camera, so this is handed one rather than reading a store. Two pictures of one space are two
// pilots, and a drag in one must not turn the other, so the angles, the field and the size are the caller's, and so are
// the two verbs a hand uses here: turning the view, and facing a unit. What this decides is the policy every sphere
// view's minimap follows.
//
// The disc is the frame. Its field is derived from the pane's so that the rectangle the pane looks through has its
// corners on the rim, which makes the frame as large as the disc holds, keeps the pane's proportions, and leaves it the
// one thing on the map that does not move: a turn carries the units and the cage under it, and a zoom spreads them
// inside it. A frame that resized with the zoom said the frame was the disc, and a frame drawn as a rim said nothing.
//
// The cage is drawn through the same camera as the units, which is what makes the disc a place being turned rather than
// a plan being read. Its lines are the world's, so they move under the marks instead of with them.

/** The disc's own side, in the units a mark is placed in. */
const MINI = 2.02;

/** How many steps a cage line is drawn with: enough that a curve on this disc reads as one. */
const STEPS = 32;

/** The disc's side on the screen, in pixels, unless the caller says otherwise. */
const SIZE = 160;

/** How far a pointer travels before the disc is read as turned rather than pressed, in pixels. */
const DRAG = 4;

/** A unit the reading draws, at the point on the sphere it stands at. */
export interface SphereMark {
  id: string;
  label: string;
  at: [number, number, number];
}

/** The camera a sphere view looks through: what the minimap needs to place the frame and draw the cage. */
export interface SphereView {
  yaw: number;
  pitch: number;
  /** The vertical field in degrees, as the board's own projection states it. */
  fov: number;
  /** The pane's box in pixels, whose proportions the frame keeps. */
  frame: [number, number];
}

/** A direction on the sphere as a point on the unit sphere, in the board's own axes. */
function onSphere(azimuth: number, elevation: number): [number, number, number] {
  const flat = Math.cos(elevation);
  return [flat * Math.sin(azimuth), Math.sin(elevation), -flat * Math.cos(azimuth)];
}

export function SphereMinimap({
  view,
  marks,
  current,
  size = SIZE,
  onTurn,
  onFace,
  className,
}: {
  view: SphereView;
  marks: SphereMark[];
  /** The unit the pilot has picked, drawn as the mark they are standing on. */
  current?: string | null;
  /** The disc's side in pixels. */
  size?: number;
  /**
   * Turn the view by a drag on the disc, in the pixels the hand moved.
   *
   * The rate is handed over as the third argument, because the surface moved under the hand and not the hand under the
   * surface: a disc turned at the pane's own rate is a drag that does not follow the pointer.
   */
  onTurn: (dx: number, dy: number, per?: number) => void;
  /** Face a bearing, which is what a press on a unit is. */
  onFace: (bearing: [number, number]) => void;
  className?: string;
}) {
  const disc = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; at: [number, number] } | null>(null);
  const turned = useRef(false);

  const { yaw, pitch, fov } = view;
  // The pane's field and shape as the rectangle it looks through. The disc's field is whatever puts that rectangle's
  // corners on the rim, so the frame is as large as the disc holds and never changes size.
  const aspect = view.frame[0] / Math.max(view.frame[1], 1);
  const corner = Math.hypot(1, aspect);
  const span = (2 * Math.atan(Math.tan((fov * Math.PI) / 360) * corner) * 180) / Math.PI;
  const field = [aspect / corner, 1 / corner] as const;

  // A line that runs behind the camera is broken there rather than joined across it.
  const cage = useMemo(() => {
    const view = { yaw, pitch, fov: span };
    const half = MINI / 2;
    const lines: string[] = [];
    const trace = (at: (t: number) => [number, number, number]) => {
      let run: string[] = [];
      const flush = () => {
        if (run.length > 1) lines.push(run.join(' '));
        run = [];
      };
      for (let step = 0; step <= STEPS; step += 1) {
        const [px, py, depth] = project(at(step / STEPS), MINI, MINI, view);
        if (depth <= 0) {
          flush();
          continue;
        }
        run.push(`${run.length ? 'L' : 'M'}${(px - half).toFixed(3)} ${(py - half).toFixed(3)}`);
      }
      flush();
    };
    for (let ring = -2; ring <= 2; ring += 1) {
      const elevation = ring * GRATICULE;
      trace((t) => onSphere(t * Math.PI * 2, elevation));
    }
    for (let index = 0; index < 12; index += 1) {
      const azimuth = (index / 12) * Math.PI * 2;
      trace((t) => onSphere(azimuth, (t - 0.5) * Math.PI));
    }
    return lines;
  }, [yaw, pitch, span]);

  const down = (event: ReactPointerEvent<SVGSVGElement>) => {
    // The pane turns the view on its own drag, so a hand that took the disc has taken the map and not the space behind it.
    event.stopPropagation();
    drag.current = { id: event.pointerId, at: [event.clientX, event.clientY] };
    turned.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    event.stopPropagation();
    const from = drag.current;
    if (!from || from.id !== event.pointerId) return;
    const [dx, dy] = [event.clientX - from.at[0], event.clientY - from.at[1]];
    if (!turned.current && Math.hypot(dx, dy) < DRAG) return;
    turned.current = true;
    drag.current = { id: from.id, at: [event.clientX, event.clientY] };
    if (!dx && !dy) return;
    // The sphere is drawn from outside the seat, so a hand that pushes its surface turns the space the other way.
    const step = dragTurn(dx, dy, disc.current?.getBoundingClientRect() ?? null);
    onTurn(-step.dx, -step.dy, step.per);
  };
  const up = (event: ReactPointerEvent<SVGSVGElement>) => {
    event.stopPropagation();
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (turned.current) return;
    // The disc held the pointer for its drag, so the release and the click after it land on the disc rather than on the
    // mark the press began on: the mark under the hand is read here, and a press without a turn is a pick of it.
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const id = under?.closest?.('circle[data-mark-id]')?.getAttribute('data-mark-id') ?? null;
    const found = id ? marks.find((mark) => mark.id === id) : undefined;
    if (found) onFace(bearingOf(found.at));
  };
  const cancel = (event: ReactPointerEvent<SVGSVGElement>) => {
    event.stopPropagation();
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (!marks.length) return null;

  return (
    <div
      className={cn(
        'pointer-events-auto absolute bottom-3 left-3 overflow-hidden rounded-full border border-border/70 bg-card/85 shadow-lg backdrop-blur-sm',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        ref={disc}
        data-region="sphere-minimap"
        viewBox="-1.01 -1.01 2.02 2.02"
        preserveAspectRatio="xMidYMid meet"
        className="size-full cursor-move touch-none"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
      >
        <circle r="1" className="fill-background/40" />
        {cage.map((line, index) => (
          <path
            key={index}
            d={line}
            className="fill-none stroke-foreground/15"
            strokeWidth={0.004}
            pointerEvents="none"
          />
        ))}
        <path d="M-1 0H1M0 -1V1" className="stroke-border/60" strokeWidth={0.004} />

        {/* The pane's field, as large as the disc holds it. */}
        <rect
          x={-field[0]}
          y={-field[1]}
          width={field[0] * 2}
          height={field[1] * 2}
          className="fill-foreground/5 stroke-foreground/40"
          strokeWidth={0.006}
          pointerEvents="none"
        />

        {marks.map((mark) => {
          const [px, py, depth] = project(mark.at, MINI, MINI, { yaw, pitch, fov: span });
          if (depth <= 0) return null;
          const [x, y] = [px - MINI / 2, py - MINI / 2];
          const here = mark.id === current;
          return (
            <g key={mark.id}>
              {here ? (
                <circle cx={x} cy={y} r={0.07} className="fill-none stroke-foreground/40" strokeWidth={0.01} />
              ) : null}
              <circle
                data-mark-id={mark.id}
                cx={x}
                cy={y}
                r={here ? 0.05 : 0.028}
                className={cn(
                  'cursor-pointer',
                  here ? 'fill-foreground' : 'fill-muted-foreground/60 hover:fill-foreground',
                )}
              >
                <title>{mark.label}</title>
              </circle>
            </g>
          );
        })}

        <circle r={0.03} className="fill-claim" />
      </svg>
    </div>
  );
}
