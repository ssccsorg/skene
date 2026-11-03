import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DisplayButtons } from '../components/DisplayButtons';
import { BottomBar } from '../components/BottomBar';
import { MoveContext } from '../components/MoveContext';
import { PanelOverlay } from '../components/PanelOverlay';
import { FloatingPanels } from '../components/FloatingPanels';
import { useWorld } from '../hooks/useWorld';
import { BAR_INSET, ROW_SHAPE, TITLE } from '@ssccsorg/skene-ui';
import { useReadingAt, useReadings, type Board } from '../lib/readings';
import { mappable, neighboursOf, toPlace } from '../lib/world';
import { cn } from '@ssccsorg/skene-ui';
import { useRecords } from '../stores/records';
import { useScenario } from '../stores/scenario';
import { useEdits } from '../stores/edits';
import { useSelection } from '../stores/selection';
import { useFrame } from '../stores/frame';
// The readings that declare themselves, loaded where the board is drawn: a register knows only what has been imported.
import '.';

/**
 * The board's own box for a reading: taken out of the flow so the shell's drawing underneath is not what decides the
 * height, and a column so the reading's own rows and scroll fill it. A reading that draws its picture itself fills it the
 * same way, so this is the frame's and not a thing a reading declares.
 */
const PICTURE = 'absolute inset-0 flex flex-col';

/**
 * The space: the record being written in it, the transport under it, and the record as it arrives.
 *
 * The middle of the frame is the space and nothing else. The panels that stand beside it are the frame's, drawn by place
 * and not named here, so what is left in the middle is what the address says: the shell or one of the readings of it.
 * Picking is a look and not a journey, so a record picked in the feed or a unit picked in the space stays here, and the
 * detail opens in the feed's own row rather than in a panel of its own.
 *
 * What the middle holds besides the board is what is about the frame rather than about a reading: the bar that says what
 * the space is, the transport, the scene's own line and the trace. The transport is a panel and stands among them because
 * it is about how much of the frame the pilot is looking at; the rest of these are the space's own reading and are not
 * panels of the frame at all.
 */
export function Space() {
  const { model, shown, world, lastOf } = useWorld();
  const { pathname } = useLocation();
  const reading = useReadingAt(pathname);
  // A reading that declares itself a pane is held beside the reading in force rather than navigated to. The split is
  // the pilot's, so the address keeps naming the picture and the map is how much of the frame it is drawn with.
  const readings = useReadings();
  const pane = readings.find((each) => each.pane) ?? null;
  const navigate = useNavigate();
  const pathOf = useFrame((state) => state.pathOf);
  const rememberPath = useFrame((state) => state.rememberPath);
  // A place with no ground or no located member has no map to offer, so the stored split is not drawn there even if the
  // pilot left the pane open on another project.
  const mapAvailable = mappable(model?.project.place ?? null, world);
  const seek = useRecords((state) => state.seek);
  const unit = useSelection((state) => state.unit);
  const moving = useSelection((state) => state.moving);
  const selectUnit = useSelection((state) => state.selectUnit);
  const setMoving = useSelection((state) => state.setMoving);
  const save = useEdits((state) => state.set);
  // Where the frame's bottom edge reaches. Between the columns it is drawn here, under the board; spanning the frame it
  // is the shell's, below the columns, because a bar wider than the space cannot be drawn by the space.
  const spanning = useSelection((state) => state.bottom === 'full');

  const projectId = useScenario((state) => state.projectId);
  const projects = useScenario((state) => state.projects);
  const openProject = useScenario((state) => state.open);
  // The map's arrangement is the project's own, so the frame draws the one this place was left with. The selector asks
  // the store for the mode rather than for its function, because a function is the same value when the modes move and the
  // board would keep the arrangement it first drew.
  const split = useFrame((state) => state.splitOf(projectId));
  // The map taking the frame is one picture of the place, in whichever projection the map is read through.
  const mapOnly = split === 'full';
  // A move belongs to the place it was opened in, so another project closes the context rather than carrying it over.
  useEffect(() => setMoving(null), [projectId, setMoving]);

  // The reading in force is also the project's own. A project remembers where it was left, and a reading the new project
  // does not stand is not restored: the address would name a picture this place has no answer for.
  const restored = useRef<string | null>(null);
  useEffect(() => {
    if (!projectId || restored.current === projectId) return;
    restored.current = projectId;
    const saved = pathOf(projectId);
    if (saved && saved !== pathname && readings.some((reading) => reading.path === saved)) navigate(saved);
    else rememberPath(projectId, pathname);
  }, [projectId, pathname, readings, pathOf, rememberPath, navigate]);
  // The path is remembered as it changes. The project is read through a ref so a switch does not write the previous
  // project's address to the new one before the restore above has run.
  const current = useRef(projectId);
  current.current = projectId;
  useEffect(() => {
    if (current.current) rememberPath(current.current, pathname);
  }, [pathname, rememberPath]);

  // The shell holds every project at its own bearing, so what the board draws when one is open is that one
  // plus the places of the rest. They are read from the bundles rather than from the runs: a project that is
  // not open has no record for the board to draw and does not need one.
  const neighbours = useMemo(() => neighboursOf(projects, projectId), [projects, projectId]);

  // One pick, and the store keeps it whole: a record picked anywhere carries the entity that wrote it and
  // an entity picked carries its last record, so the rail, the map, the board and the console all read
  // the same choice out of this one name.
  const pickedId = unit;

  // What a reading is handed. The frame gathers the board's resources once and a reading takes what it wants from them,
  // so a reading added later adds no requirement the frame has to be told about.
  const board: Board = {
    world,
    project: model?.project ?? null,
    place: model?.project.place ?? null,
    neighbours,
    pickedId,
    onPick: (id) => selectUnit(id, lastOf[id] ?? null),
    onOpenProject: openProject,
    // Where a member was put on the ground, in the place's own numbers: a reading that draws a cell answers in the units
    // its own projection works in and this turns that into the place's numbers. The board's own move is its context
    // (`components/MoveContext`), and this remains for the reading that places a member by pressing a cell.
    onMove: (id, point) => {
      const place = model?.project.place;
      if (!place) return;
      const [x, y] = toPlace(point, place);
      save({ unit: id, at: [Math.round(x), Math.round(y)], abilities: null });
    },
  };

  // The arrow keys walk the run, which is the one control a player is expected to have without being
  // looked for. A field that is being typed in keeps its own arrows.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        seek(shown + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        seek(shown - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [seek, shown]);

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <div className={cn(ROW_SHAPE, BAR_INSET, 'flex items-center border-b')}>
        {/* The bar reads from its two ends inward: the panels of the left edge are named at the left, what the board
            draws and the rest of the frame's controls at the right, and the space's name takes the room between them.
            The ends keep the width their own controls need, so a narrow frame truncates the name rather than clipping
            a control out of reach, which is what a grid of equal tracks did once the map added four buttons. */}
        <DisplayButtons side="left" />
        <span
          data-region="project-title"
          className={cn(TITLE, BAR_INSET, 'min-w-0 flex-1 truncate text-center')}
        >
          {model?.title ?? 'the board'}
        </span>
        <DisplayButtons side="right" />
      </div>

      <div
        data-region="board"
        data-standing={world ? world.standing.map((unit) => unit.id).join(',') : ''}
        data-split={pane && mapAvailable && reading?.key !== pane.key ? split : undefined}
        className="relative min-h-[30vh] min-w-0 flex-1 md:min-h-0"
      >
        {/* One thing stands here and it is a reading of the space: the shell itself, the participants as a graph, the
            account as a table, or the picked act and what it runs into. An address names which, and the rest of
            the cockpit is not this drawing's to move: the panels, the transport and the bar are where they are
            whichever of them is up, so a reading is a picture the board draws rather than a page the pilot leaves the
            cockpit for.

            What stands in it is asked of the register rather than switched on here. The frame does not hold the list
            of readings and does not know one from another: it has the address, it asks which reading that is, and it
            hands that reading the board. */}
        {pane && mapAvailable && reading?.key !== pane.key && split !== 'globe' ? (
          <div className={cn('absolute inset-0 flex', split === 'vertical' ? 'flex-row' : 'flex-col')}>
            {mapOnly ? null : (
              <div className="relative min-h-0 min-w-0 flex-1">
                {reading ? (
                  <div className={PICTURE}>
                    <reading.View {...board} />
                  </div>
                ) : null}
              </div>
            )}
            <div
              className={cn(
                'relative min-h-0 min-w-0 flex-1',
                !mapOnly && (split === 'vertical' ? 'border-l' : 'border-t'),
              )}
            >
              <div className={PICTURE}>
                <pane.View {...board} />
              </div>
            </div>
          </div>
        ) : reading ? (
          <div className={PICTURE}>
            <reading.View {...board} />
          </div>
        ) : null}
      </div>

      {/* The frame's bottom edge: the campaigns, the transport, the scene and the trace. It stands here while the
          bottom is inset between the columns, and the shell draws it under them when it spans the frame. */}
      {spanning ? null : <BottomBar />}

      {/* The frame's answer for a window that cannot hold its own row: the panels are the pilot's, so they are drawn
          over the space rather than dropped, and the bar above stays where it is to switch between them. */}
      <PanelOverlay />

      {/* A place is chosen in a context of its own, over the space it belongs to: the board underneath keeps its one
          press, and nothing about the pilot's look or pick is disturbed by placing a member. */}
      {moving && model && world ? <MoveContext id={moving} place={model.project.place} world={world} /> : null}

      {/* And the same frame's answer for finding them: a bar read as a title at this width is a bar whose controls are
          not found by looking, so the panels stand as one control at the foot of the space as well. */}
      <FloatingPanels />
    </div>
  );
}
