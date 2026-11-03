import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Crosshair, Minus, Plus } from 'lucide-react';
import * as THREE from 'three';
import { DIM, GRATICULE, LEVEL, aimAt, blackboardInk, fitView, forwardOf, liftOf, orbitalAt, placed, ringOf, SHELL, kindInk, stateInk, unfold, zoneOf } from '../lib/board';
import { dashes, dotTexture, line, ring, segments } from '../lib/board-geometry';
import { routeOf, writerOf } from '../lib/world';
import { graphOf } from '../lib/graph';
import { useUnitMarks } from '../hooks/useUnitMarks';
import { useViewPlaces } from '../hooks/useViewPlaces';
import { useDrawing } from '../stores/drawing';
import { useFrame as useFrameStore } from '../stores/frame';
import { useScenario } from '../stores/scenario';
import { useSelection } from '../stores/selection';
import { useView } from '../stores/view';
import type { NodeKind, Place, World } from '@ssccsorg/skene-kernel';
import { clipped } from '../lib/views';
import type { Neighbour } from '../lib/world';
import { viewKindOf, viewKinds } from '../lib/view-kinds';
import { Hint } from './ui/hint';
import { BoardOverlay } from './BoardOverlay';
import { CockpitFrame } from './CockpitFrame';
import { FieldRegion } from './FieldRegion';
import { GroupMark } from './GroupMark';
import { Unit } from './Unit';
import { ViewLayer } from './ViewLayer';

// The cockpit. The pilot stands at the centre of a shell and the space is laid out around them: what is in
// front is what they are looking at, and the rest is reached by turning or by widening the frame. The
// store is the place's own centre, straight ahead.
//
// Nothing is drawn from a unit to the middle. Every unit keeps its own store and the middle is those
// stores read together, which is a query and not a topology: a line from each unit to one point said the
// middle was a store they write into, and that is the one thing the record model does not do.
//
// The space opens fitted: the board computes the field that holds all of it and hands it to the view, so
// the pilot's first sight is the whole space rather than the part of it they happen to be facing. The first
// turn, the first zoom or a pick hands the view over to the pilot, and the header's own control hands it
// back.
//
// Each unit is a ring facing the pilot whose colour is the last record it wrote, so a thing on the board
// that stands for a record reads as that record's kind; a unit that has written nothing is dim. The four
// kinds are one size and one colour each, read from the page's own tokens. The space does not turn on its
// own: the camera is aimed when the view changes rather than sixty times a second, which is the difference
// between a view and a moving picture.
//
// The names are drawn over the canvas by `BoardOverlay`, at the projection of their marks, because the
// pilot's own arithmetic is the honest way to place a name and a canvas portal is not. A name behind the
// pilot or outside the frame is not drawn: reaching it is what turning and zooming are for.

// The shell's own cage, as the graticule a globe is read by: the horizon the pilot stands on, a parallel
// every cell above and below it, and a meridian every cell round it. The step is chosen against what the frame
// holds: a grid wider than the pilot's own field draws one line through the middle and reads as an axis, which
// is how this came to look like a crosshair. At a cell the width the window is drawn at, a few cells stand in
// the frame and the rest turn through it, which is the room the flat frame was missing.
//
// A parallel is a closed circle because it has no end. A meridian is an open run from one pole to the other,
// and its two ends are the poles themselves: closing it would join the poles with a straight segment through
// the middle of the sphere, which is a line through the room and not an edge of it.
//
// The cage is a light ink at a low weight rather than the dark one the records are drawn in: a dark line on
// a dark ground is a line nobody sees, which is how the space came to read as empty. The horizon is the one
// line the pilot stands on and is drawn the strongest, the poles the faintest. None of it is data.
const INK = { cage: '#a8b6c8' };
const STEP = GRATICULE;
/** The parallel inks, from the horizon outward. A ring the pilot stands nearer to is drawn the stronger. */
const RING_INK = [0.13, 0.09, 0.065, 0.05, 0.04];
const HORIZONS = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((ring) => ({
  elevation: ring * STEP,
  ink: RING_INK[Math.abs(ring)],
}));
const MERIDIANS = Array.from({ length: 36 }, (_, index) => ({
  azimuth: -Math.PI + index * STEP,
  ink: 0.06,
}));
/** How far a pointer travels before the board decides the pilot is turning the space and not pressing it. */
const DRAG = 4;

/**
 * How far outside the shell the cage is drawn.
 *
 * The cage and a window both stand at the shell's radius, and a line and a picture at the same distance fight for the
 * pixel: the graticule crossed the picture instead of passing behind it. The shell is read from its own middle, so a
 * hair of extra radius puts the cage behind everything drawn on the surface and moves no line off the place it marks.
 */
const CAGE_LIFT = 1.004;

/**
 * How long a publication stays hot, in the run's own clock.
 *
 * A record steps the clock by tens of units and a chain of three machines lands within a few hundred, so this is the span of
 * one command's reach: the machines a line touched glow together and fade together, and the next line starts the sweep
 * again. It is a reading of the clock and not of wall time, so a replay shows the same sweep at the pace the pilot walks.
 */
const HEAT_WINDOW = 600;

/** A point of the shell at an azimuth and an elevation, which is where the cage's own circles are drawn. */
function shellPoint(azimuth: number, elevation: number): [number, number, number] {
  const radius = SHELL * CAGE_LIFT;
  const flat = Math.cos(elevation);
  return [radius * flat * Math.sin(azimuth), radius * Math.sin(elevation), -radius * flat * Math.cos(azimuth)];
}

/** A closed circle of the shell at one elevation: a parallel, which has no end to start from. */
function shellCircle(at: (step: number) => [number, number], steps: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let index = 0; index < steps; index += 1) {
    const [azimuth, elevation] = at(index / steps);
    out.push(shellPoint(azimuth, elevation));
  }
  return out;
}

/** A meridian: the run at one azimuth from the south pole to the north, both poles its own ends. */
function shellMeridian(azimuth: number): [number, number, number][] {
  const steps = 48;
  const out: [number, number, number][] = [];
  for (let index = 0; index <= steps; index += 1) {
    out.push(shellPoint(azimuth, (index / steps) * Math.PI - Math.PI / 2));
  }
  return out;
}

/**
 * The pilot's own camera, kept in step with the one view every frame. The names are placed with `project` and
 * the marks are drawn by this camera, so the two must be the same projection or a name stands beside a mark
 * that is not its own: the field kept here and the field the names are laid out with have to be one number.
 *
 * It is written every frame rather than when the view changes because the field is the picture's size, and a
 * size set once is a size the picture drifts away from: what the drag changes is where the pilot is looking,
 * and the camera following the view it is handed is not the camera moving on its own.
 */
function Pilot({ camera }: { camera: React.RefObject<THREE.PerspectiveCamera | null> }) {
  useFrame(() => {
    const view = useView.getState();
    const made = camera.current;
    if (!made) return;
    made.fov = view.fov;
    made.updateProjectionMatrix();
    made.lookAt(...forwardOf(view));
  });
  return null;
}

/** The room's own edges, built once: they are the same sphere whatever space the pilot is standing in. */
const CAGE = [
  ...HORIZONS.map((horizon) => ({
    geometry: ring(shellCircle((step) => [step * Math.PI * 2, horizon.elevation], 96)),
    ink: horizon.ink,
  })),
  ...MERIDIANS.map((meridian) => ({
    geometry: line(shellMeridian(meridian.azimuth)),
    ink: meridian.ink,
  })),
];

export function SceneBoard({
  world,
  place,
  neighbours,
  pickedId,
  onPick,
  onOpenProject,
}: {
  world: World;
  /** The open project's place, which is what a map window draws its ground from. */
  place: Place;
  /** The other projects the shell holds, drawn as the places they are and not as the runs they are not. */
  neighbours: Neighbour[];
  pickedId: string | null;
  onPick: (id: string) => void;
  /**
   * Enter another project, which is what its group mark is for: a group is reached from the space and the
   * column's list is the other way in, and both are the same move.
   */
  onOpenProject: (id: string) => void;
}) {
  const ink = useMemo(kindInk, []);
  const board = useMemo(blackboardInk, []);
  const states = useMemo(stateInk, []);
  // How the wires are laid, which is the pilot's own choice and not this board's: the store is read here so that a press
  // on the control redraws the wires and nothing else about the space.
  const wires = useDrawing((store) => store.wires);
  const tone = useFrameStore((store) => store.tone);
  // The state the open field declares, which is what its own zone is tinted with. A field that is not open is
  // a place rather than a run, so its own zone is tinted by what it declares about itself.
  const declared = useScenario((store) => store.model?.project.status ?? null);
  const state = states[declared ?? 'offline'];
  const look = useSelection((state) => state.look);
  const dot = useMemo(dotTexture, []);
  const turn = useView((state) => state.turn);
  const zoom = useView((state) => state.zoom);
  const fit = useView((state) => state.fit);
  const spin = useView((state) => state.spin);
  const setFrame = useView((state) => state.setFrame);
  const held = useView((state) => state.held);
  const arrival = useView((state) => state.arrival);
  const box = useRef<HTMLDivElement>(null);
  const camera = useRef<THREE.PerspectiveCamera | null>(null);
  // A pointer that has turned the space is not a press on a name: the two arrive as one gesture, and the
  // click that follows a turn would pick whatever the turn happened to end on.
  const dragging = useRef<{ id: number; at: [number, number] } | null>(null);
  const turned = useRef(false);
  // The size of the frame, which the overlay needs to place a name. It is the element's own measure
  // and nothing else in the page reads it, so it is the panel's local state and not the store's.
  const [size, setSize] = useState<[number, number]>([0, 0]);

  const aspect = world.aspect;
  const sector = world.sector;
  // The place the open project's group is: the middle of its own patch, which is where its marks come out
  // from while it opens and where a group mark stands for any project the pilot is not inside.
  const centre = useMemo(() => placed([0, 0, 0], aspect, sector), [aspect, sector]);
  // Every unit the place declares, which is the field's own ground and not only the part of it that is drawn:
  // the frame opens holding it and the zone is fitted to it, and a zone is the field's whether or not the
  // field is the one being read.
  const ground = useMemo(
    () => world.standing.map((unit) => placed(unit.at, aspect, sector)),
    [world.standing, aspect, sector],
  );
  const mine = useMemo(() => zoneOf(ground, sector), [ground, sector]);
  const theirs = useMemo(
    () =>
      neighbours.map((neighbour) => ({
        id: neighbour.id,
        tint: states[neighbour.status ?? 'offline'],
        zone: zoneOf(
          neighbour.units.map((unit) => placed(unit.at, neighbour.aspect, neighbour.sector)),
          neighbour.sector,
        ),
      })),
    [neighbours, states],
  );

  useEffect(() => {
    const element = box.current;
    if (!element) return undefined;
    const measure = () => {
      const next: [number, number] = [element.clientWidth, element.clientHeight];
      // The frame's own shape is the pilot's, so the minimap can paint the region the frame holds. One
      // reading of the element drives the canvas's own size and that paint both.
      setFrame(next);
      // The array is kept when the numbers are the same, because it is what the fit is asked for and a new array of
      // the same numbers would be a second question with the same answer: a board that measured itself again would
      // fit itself again, and a turn in flight would be cut off by its own frame being remeasured.
      setSize((was) => (next[0] === was[0] && next[1] === was[1] ? was : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [setFrame]);

  // The camera is aimed by `Pilot` inside the canvas, from the same store the names are laid out with. Anything
  // that wanted to aim it from here would be a second writer of one projection.

  // The space opens fitted, and stays fitted until the pilot takes the view over. It is recomputed on every
  // space and every resize while it is the space's, so a window that changes shape is a space the pilot can
  // still see all of; once the pilot has turned it or zoomed it, it is theirs.
  // Choosing another project is a turn and not a cut: the shell holds every project at its own bearing, so
  // the next one is already there and the pilot's own patch comes round to the middle. A resize or a run
  // arriving is the same patch seen again, so that is the view being fitted rather than turned.
  const lastSector = useRef<string | null>(null);
  useEffect(() => {
    if (held || !ground.length || size[0] === 0) return;
    const view = fitView(ground, size[0], size[1], 1.45, world.sector);
    const bearing = world.sector.join(',');
    if (lastSector.current !== null && lastSector.current !== bearing) spin(view);
    else fit(view);
    lastSector.current = bearing;
  }, [fit, spin, held, ground, size, world.sector]);

  // The picked unit comes to the middle of the frame. A pick made anywhere in the interface ends up here,
  // because `pickedId` is the one choice the views share, and looking at what you picked is what a pick is.
  //
  // It is the count of picks and not only the pick that brings it here: a press on a mark held on the frame's edge
  // is a press on the unit already picked as often as on one that is not, and what the pilot asked for by pressing
  // it is the look.
  useEffect(() => {
    const unit = world.present.find((entry) => entry.id === pickedId);
    if (!unit) return;
    const where = aimAt(placed(unit.at, aspect, sector));
    useView.getState().aim(where.yaw, where.pitch);
  }, [look, pickedId, world, aspect, sector]);

  useEffect(() => {
    const element = box.current;
    if (!element) return undefined;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoom(event.deltaY);
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [zoom]);

  const geometry = useMemo(() => {
    const scales: Record<NodeKind, THREE.Color> = {
      fact: new THREE.Color(ink.fact),
      intent: new THREE.Color(ink.intent),
      hint: new THREE.Color(ink.hint),
      claim: new THREE.Color(ink.claim),
    };
    // Everything the open project draws is placed through this, so its members come out of its group while
    // it opens rather than appearing where they will be. The marks the pilot is not inside are placed
    // directly: a group stands where it stands, and only the place being entered moves.
    const out = (point: [number, number, number]) => unfold(point, centre, arrival);


    // The projects that are not open: their units, on their own patches, as one cloud of dim points. A
    // place is a declaration and the run is the open one's, so what the rest of the shell says is where
    // the other places are, not what they did. The cloud is drawn spread and not gathered onto the
    // project's group mark, because the projects do share the one space: what the mark summarises is the
    // members that are already there, and not a pile the board has swept up.
    const elsewhere: number[] = [];
    for (const neighbour of neighbours) {
      for (const unit of neighbour.units) elsewhere.push(...placed(unit.at, aspect, neighbour.sector));
    }
    const rest = new THREE.BufferGeometry();
    rest.setAttribute('position', new THREE.Float32BufferAttribute(elsewhere, 3));

    // The wires are the declarations, drawn on the shell: one line for each piece of work, from the participant whose
    // reading it started from to the one that took it. The graph draws the same edges, so a pilot who switches between
    // the two readings reads the same topology twice rather than two pictures that happen to look alike.
    //
    // How a wire is laid is the pilot's own choice (`stores/drawing`): along the ground's cells, which crosses each
    // border at its middle and turns by sixty degrees so wires toward one side run as one trunk, or the straight line
    // each of those routes replaces. Both are the same claim about the same declaration, so both are drawn from one
    // list of runs here, and a mode that changed what is joined would be a mode changing the record.
    const lastKind = new Map<string, NodeKind>();
    const lastAt = new Map<string, number>();
    let newest = 0;
    for (const record of world.records) {
      const who = writerOf(record.event);
      newest = Math.max(newest, record.event.at);
      if (who) {
        lastKind.set(who, record.kind);
        lastAt.set(who, record.event.at);
      }
    }
    // The middle is where the place says it is, at once. A project's blackboard is its own and is already there
    // when the pilot arrives, so it takes no part in the entry motion that unfolds the members: a middle that grew
    // out of the frame's centre would read as a store carried in from the project before this one.
    const blackboard = placed(world.store ?? [0, 0, 0], aspect, sector);
    // A declaration joins two units the place stands, and both have to be on the board: a worker whose mark is not drawn
    // is a place the pilot is not reading, and a line to it would leave the frame.
    const here = new Map(world.present.map((unit) => [unit.id, unit]));
    const graph = graphOf(
      world.records.map((record) => record.event),
      Object.fromEntries(world.standing.map((unit) => [unit.id, unit])),
    );
    const pairs: [[number, number, number], [number, number, number]][] = [];
    const inks: THREE.Color[] = [];
    for (const edge of graph.edges) {
      const from = here.get(edge.from);
      const to = here.get(edge.to);
      if (!from || !to) continue;
      const run =
        wires === 'cells'
          ? routeOf(aspect, from.at, to.at).map((point) => out(placed(point, aspect, sector)))
          : [out(placed(from.at, aspect, sector)), out(placed(to.at, aspect, sector))];
      // How hot a declaration is follows the unit that took it: a line said in the console runs a turn per machine, and
      // the machines it reaches write in order, so the wires brighten one after another as the work moves through them.
      const age = newest - (lastAt.get(to.id) ?? Number.NEGATIVE_INFINITY);
      const heat = Math.max(0, 1 - age / HEAT_WINDOW);
      const ink = (scales[lastKind.get(to.id) ?? 'fact'] as THREE.Color).clone().multiplyScalar(0.35 + 0.65 * heat);
      for (let step = 1; step < run.length; step += 1) {
        // A wire of many steps is one declaration, so every step of it carries the same colour.
        pairs.push([run[step - 1] as [number, number, number], run[step] as [number, number, number]]);
        inks.push(ink);
      }
    }
    const radials = segments(pairs, inks);

    // An orbital unit is above the shell, and a line joins it to the ground it watches. The line is drawn from the lifted
    // mark to the sub-point when the place declares one, and straight down to its own bearing otherwise: either way the
    // mark is not a thing standing beside the machines. How far it is lifted is the altitude the place declares.
    const tethers: [[number, number, number], [number, number, number]][] = [];
    for (const unit of world.present) {
      if (!unit.orbital) continue;
      const base = out(placed(unit.at, aspect, sector));
      const watch = unit.watch ? out(placed(unit.watch, aspect, sector)) : base;
      tethers.push([orbitalAt(base, liftOf(unit)), watch]);
    }
    const orbits = dashes(segments(tethers));

    return {
      rest,
      radials,
      orbits,
      blackboard,
    };
  }, [world, neighbours, ink, aspect, sector, centre, arrival, wires]);

  const { lastOf, working, tints } = useUnitMarks(world, pickedId, ink);
  // The kind that fills the room, when this build holds one. Which picture the surface is, and which views fill it, is
  // that kind's declaration: the board hands over the space and the observer and draws what comes back.
  const Surface = viewKinds().find((kind) => kind.Surface)?.Surface;
  const SurfaceControl = viewKinds().find((kind) => kind.SurfaceControl)?.SurfaceControl;
  // Where the views stand, read once for both of their renderers: the canvas draws the pictures and the page
  // over it draws the bars and the press targets.
  const places = useViewPlaces(world, size);

  return (
    <div
      ref={box}
      className="relative h-full w-full touch-none"
      onPointerDown={(event) => {
        dragging.current = { id: event.pointerId, at: [event.clientX, event.clientY] };
        turned.current = false;
      }}
      onPointerMove={(event) => {
        const was = dragging.current;
        if (!was || was.id !== event.pointerId) return;
        const [dx, dy] = [event.clientX - was.at[0], event.clientY - was.at[1]];
        if (!turned.current && Math.hypot(dx, dy) < DRAG) return;
        // The pointer is taken only once the space is being turned. A pointer taken on the press is a
        // pointer the name under it never hears from again: the browser sends the click to whatever holds
        // the capture, so a press on a unit's name was a press on nothing at all. Taking it here keeps the
        // turn alive past the board's own edge, which is the only reason to take it.
        if (!turned.current) event.currentTarget.setPointerCapture(event.pointerId);
        turned.current = true;
        dragging.current = { id: was.id, at: [event.clientX, event.clientY] };
        if (dx || dy) turn(dx, dy);
      }}
      onPointerUp={(event) => {
        if (dragging.current?.id === event.pointerId) dragging.current = null;
      }}
      onPointerCancel={() => {
        dragging.current = null;
      }}
    >
      <Canvas
        dpr={[1, 2]}
        flat
        gl={{ powerPreference: 'high-performance' }}
        camera={{ fov: LEVEL.fov, position: [0, 0, 0] }}
        onCreated={({ camera: made }) => {
          camera.current = made as THREE.PerspectiveCamera;
        }}
      >
        {/* The space has a floor of its own rather than showing the page through: it is the page's own
            surface, and the marks on it add their light to it, which is what a light does and what a
            transparent canvas cannot do. */}
        <color attach="background" args={['#0f1216']} />
        <ambientLight intensity={1.1} />
        {/* The bodies are lit from the pilot's seat, so the face a model turns inward is the one that catches it. */}
        <pointLight position={[0, 0, 0]} intensity={2.2} distance={3} decay={0} />
        <Pilot camera={camera} />

        {/* The room's own media, painted on the inside of the shell under the cage and every mark. The layout is the
            surface's and the media are the place's, so a drone's cameras can be the room without a second reading. */}
        {Surface ? <Surface world={world} pickedId={pickedId} /> : null}

        {/* The fields themselves, as the zones their places take on the shell: the open one lit and the
            others at the weight of context. Drawn first, under everything, because they are the ground the
            marks stand on. */}
        <FieldRegion centre={mine.centre} radius={mine.radius} tint={state} lit />
        {theirs.map((theirs) => (
          <FieldRegion
            key={`region-${theirs.id}`}
            centre={theirs.zone.centre}
            radius={theirs.zone.radius}
            tint={theirs.tint}
            lit={false}
          />
        ))}

        {/* The shell the pilot stands inside, drawn as the graticule a globe is read by: a horizon at the
            pilot's own eye level, parallels above and below it, and a meridian at every bearing. It is the
            one part of the picture that is not data, which is why it is drawn at a weight nothing else is.

            It is drawn before the room's own media and not merely outside it: the media is painted with its
            depth unwritten, so a line drawn after it would lie over every picture the room carries whatever
            the two stood at. The order is what puts the cage behind them. */}
        {CAGE.map((line, index) => (
          <lineSegments key={index} geometry={line.geometry} renderOrder={-4}>
            <lineBasicMaterial color={INK.cage} transparent opacity={line.ink} />
          </lineSegments>
        ))}

        {/* What each unit says, published to the one place it is read from. It is the faintest line on the
            board because it is the model's own topology and not a reading: a dozen of them converging is a
            statement about where observations go, and anything louder would be a reading of its own. */}
        <lineSegments geometry={geometry.radials}>
          <lineBasicMaterial vertexColors transparent opacity={0.55} depthWrite={false} />
        </lineSegments>
        {/* The tethers of the units above the shell. Kept under the marks so the ground point is read as where the line
            lands rather than as another unit. */}
        <lineSegments geometry={geometry.orbits}>
          <lineDashedMaterial color="#c6d4e2" dashSize={0.03} gapSize={0.02} transparent opacity={0.5} depthWrite={false} />
        </lineSegments>
        {/* Every other project the shell holds, as its own patch of dim points. It is drawn under the
            open one and at a weight the open one never is, because a place that is not being read is
            context and not content: choosing a project is what makes the patch the bright one. */}
        <points geometry={geometry.rest}>
          <pointsMaterial
            size={0.017}
            sizeAttenuation
            color="#46525f"
            transparent
            opacity={0.6}
            map={dot}
            depthWrite={false}
          />
        </points>

        {/* The composition itself, drawn as the participant it is: the blackboard every unit publishes to is
            one of the things standing in the space and not the place they stand around, so it carries the same
            point as a unit and is drawn in the ink the records themselves are drawn in. What makes it the
            middle is that the publications reach it, and not that it is drawn larger than they are. */}
        <Unit
          id="store"
          at={geometry.blackboard}
          tint={board}
          working={false}
          ringed={false}
          written
          still
        />

        {world.present.map((unit) => {
          const ringed = unit.id === world.claimedBy || unit.id === pickedId;
          const base = unfold(placed(unit.at, aspect, sector), centre, arrival);
          const lift = liftOf(unit);
          return (
            <Unit
              key={unit.id}
              id={unit.id}
              model={unit.model}
              at={lift ? orbitalAt(base, lift) : base}
              orbit={ringOf(unit) || undefined}
              tint={tints[unit.id] ?? DIM}
              working={working.has(unit.id)}
              ringed={ringed}
              written={lastOf.has(unit.id)}
            />
          );
        })}

        {/* The windows the space carries, painted on the shell at the place their own entity stands: a window is a
            patch of the surface, so it goes round with the space and one behind the pilot is off the frame rather
            than folded onto it. Drawn over the marks, because a thing whose view is on the screen is a thing that has
            been asked about.

            What is painted is the kind's own, and the frame paints whatever the kind it was declared as supplied. A
            folded window keeps its picture running with nothing of it drawn. What the pilot put away is the view and
            not the camera, so the camera carries on watching, and a camera that stopped the moment its window was
            folded would be the interface deciding what the space is doing. It is also the only thing that knows
            whether its own medium is running, which is what the icon it becomes says. Nothing is uploaded for a
            picture nothing is drawn with, so what a folded window costs is the decode. */}
        {places.map((each) => {
          const Paint = viewKindOf(each.source.kind)?.Paint;
          if (!Paint) return null;
          return (
            <Paint
              key={each.id}
              id={each.id}
              source={each.source}
              bearing={each.place}
              cells={each.cells}
              lead={each.lead}
              hidden={each.view.folded}
              order={each.view.z}
              world={world}
              place={place}
              pickedId={pickedId}
              tone={tone}
            />
          );
        })}

        {/* The projects the pilot is not inside, each as the one mark that summarises it. Drawn over the
            open project's records and under its units, because a group is a place the pilot can enter and
            the place they are in is the one being read. */}
        {neighbours.map((neighbour) => (
          <GroupMark
            key={neighbour.id}
            at={placed([0, 0, 0], aspect, neighbour.sector)}
            tint={states[neighbour.status ?? 'offline']}
            members={neighbour.units.length}
          />
        ))}
      </Canvas>

      {/* The frame is over the space and under the names: it darkens the space's own edges, and the names
          stand where they are so that a name near a corner is still read at full strength. */}
      <CockpitFrame />
      <BoardOverlay
        world={world}
        neighbours={neighbours}
        size={size}
        pickedId={pickedId}
        tints={tints}
        arrival={arrival}
        onPick={(id) => {
          if (!turned.current) onPick(id);
        }}
        onOpenProject={(id) => {
          if (!turned.current) onOpenProject(id);
        }}
      />
      {/* What the page owes a window that the shell cannot draw: a toolbar for a picture painted on the shell, or the
          whole picture for a place whose ground is not. The kind decides which, because it is the kind that knows
          whether its picture is a texture and where its ground comes from. A window the frame holds none of is not
          drawn: its icon is the whole of it that is on the board, and a screen at the whole box would stand over the
          panels beside it. */}
      {places.map((each) => {
        const Layer = viewKindOf(each.source.kind)?.Page;
        if (!Layer || each.view.folded || !each.box) return null;
        const at = clipped(each.box, size);
        if (!at) return null;
        return (
          <Layer
            key={`page-${each.id}`}
            id={each.id}
            at={at}
            world={world}
            place={place}
            pickedId={pickedId}
            onPick={onPick}
            tone={tone}
          />
        );
      })}
      <ViewLayer places={places} views={world.views} tints={tints} onPick={onPick} size={size} />
      <ViewControls surface={SurfaceControl ? <SurfaceControl world={world} pickedId={pickedId} /> : null} />
    </div>
  );
}

/**
 * The sphere's own controls, over the sphere.
 *
 * The fit and the two notches are about the sphere's projection, so they stand in the picture they change rather than in
 * the bar: a control about what is inside the board is read with the board. A press here is not a press on the space, so
 * it does not reach the board's own drag.
 */
function ViewControls({ surface }: { surface?: ReactNode }) {
  const release = useView((state) => state.release);
  const zoom = useView((state) => state.zoom);
  const held = useView((state) => state.held);
  const tool =
    'pointer-events-auto flex size-6 items-center justify-center rounded-sm border border-border/70 bg-card/85 ' +
    'text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-40';
  return (
    <div
      data-region="view-controls"
      className="absolute right-2 bottom-2 z-[80] flex flex-col gap-1"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Hint label="zoom in">
        <button type="button" className={tool} onClick={() => zoom(-120)}>
          <Plus className="size-3.5" />
        </button>
      </Hint>
      <Hint label="zoom out">
        <button type="button" className={tool} onClick={() => zoom(120)}>
          <Minus className="size-3.5" />
        </button>
      </Hint>
      <Hint label="center">
        <button type="button" className={tool} disabled={!held} onClick={release}>
          <Crosshair className="size-3.5" />
        </button>
      </Hint>
      {surface}
    </div>
  );
}
