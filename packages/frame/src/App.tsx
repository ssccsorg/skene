import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomBar } from './components/BottomBar';
import { EdgePeek } from './components/EdgePeek';
import { Header } from './components/Header';
import { Panes } from './components/Panes';
import { useRoom } from './hooks/useRoom';
import { host } from './lib/host';
import { useKtema } from './hooks/useKtema';
import { declaredIn, declaredPanels } from './lib/panels';
import { useReadings } from './lib/readings';
import { Space } from './views/Space';
import { useChat } from './stores/chat';
import { useScenario } from './stores/scenario';
import { useSelection } from './stores/selection';

/**
 * The shell: the frame's panels around the middle, and the middle is the space.
 *
 * There is one thing on screen and it is the space. An address names which reading of it the board draws, which is a
 * choice of picture and not a page: the panels and the frame's own words stay where they are, and what changes is what
 * stands in the middle. A reading that covered the cockpit would be a reading that took the pilot out of it.
 *
 * The panels are asked for by place rather than drawn here, so the frame's row is three boxes and no panel: what stands
 * at the left, what the space is, and what stands at the right. Which panels those are is the register's answer.
 */
export function App() {
  useKtema();
  // Once, for the frame: the work a deployment does when a window opens, which is the subscription and the bootstrap
  // behind whatever the panels read. The host declares it, so a window with no server does nothing here.
  const start = host().start;
  useEffect(() => start?.(), [start]);
  const status = useScenario((state) => state.status);
  const error = useScenario((state) => state.error);
  const projectId = useScenario((state) => state.projectId);
  // The arrangement the open project declares, taken as the bundle's own object rather than rebuilt, so a render
  // that changed nothing else does not read as a project that asked for a different arrangement.
  const layout = useScenario((state) => state.projects.find((each) => each.id === state.projectId)?.layout);
  // The reading a project opens on is the project's own declaration, and the frame's first is what answers for one that
  // names none. A pack that brings a reading and calls it the main one changes where the window lands without the frame
  // knowing which pack it is.
  const views = useScenario((state) => state.projects.find((each) => each.id === state.projectId)?.views);
  const arrange = useSelection((state) => state.arrange);
  const remembered = useSelection((state) => state.reading);
  const remember = useSelection((state) => state.remember);
  const load = useChat((state) => state.load);
  // The address the cockpit opens on, asked of the register rather than written here, and where the frame comes back to:
  // an address that names a reading is the pilot asking for that one, and the window opened from the dock names none, so
  // it comes back to the reading they were last in rather than to the register's first.
  const readings = useReadings();
  const { pathname } = useLocation();
  const home = readings.find((reading) => reading.key === remembered) ?? readings.find((reading) => reading.key === views?.main) ?? readings[0] ?? null;
  // The frame's bottom edge reaches the width of the window or stops between the columns. What spans is drawn here and
  // not by the space, because a bar wider than the middle of the frame is not the middle's to draw.
  const spanning = useSelection((state) => state.bottom === 'full');

  useEffect(() => {
    const named = readings.find((reading) => reading.path === pathname);
    if (named) remember(named.key);
  }, [readings, pathname, remember]);

  // The room is per project, like the record: another project is another volume and another conversation, so
  // what is held belongs to the one that was left.
  useRoom(projectId);
  useEffect(() => {
    if (projectId) void load(projectId);
  }, [projectId, load]);

  // A project declares where the frame starts for it, because what is on screen follows from what the project
  // is: the fields the demonstration runs are read from a record the board draws, and a project whose work is a
  // conversation is read from the console, where the console is the work rather than the way to reach it.
  //
  // What it declares is applied over the arrangement that stands, and a panel it says nothing about keeps the place the
  // pilot left it in. The frame's arrangement is the pilot's: opening the console is a thing done once rather than once
  // a project, and a project that declares nothing changes nothing about where the frame is.
  //
  // The declaration is resolved against the register before the store is told, because the register is what knows which
  // names are this frame's panels: a name no panel answers to is dropped, and the store never has to be told what the
  // panels are.
  //
  // The register is asked without subscribing, and that is load-bearing rather than tidy. The effect writes the map the
  // panels are read from, so a panels value in these dependencies would change with every write and the declaration
  // would be applied again on each render: the frame would never settle, which is what React reports as a depth the
  // update loop ran past.
  useEffect(() => {
    arrange(declaredIn(layout ?? {}, declaredPanels()));
  }, [layout, arrange]);

  return (
    <div className="relative flex h-full flex-col">
      <Header />
      {error ? <p className="shrink-0 px-3 py-2 text-[11.5px] text-destructive">{error}</p> : null}
      <div className="flex min-h-0 flex-1">
        <Panes at="left" />
        <main data-region="view" className="flex min-h-0 min-w-0 flex-1 flex-col">
          {status === 'ready' ? (
            <Routes>
              {/* One route and not one per reading: every reading is drawn by the same board, and which reading that is
                  is read from the address by the board itself. So a reading's address is its own declaration and not a
                  line here, and the only thing the frame states is where the cockpit opens. */}
              {home ? <Route index element={<Navigate to={home.path} replace />} /> : null}
              <Route path="*" element={<Space />} />
            </Routes>
          ) : (
            <p className="p-4 text-[11.5px] text-muted-foreground">
              {status === 'error' ? 'the board did not load' : 'reading the board'}
            </p>
          )}
        </main>
        <Panes at="right" />
      </div>
      {spanning ? <BottomBar /> : null}
      {/* An edge that is away is looked at by resting the pointer on it: nothing is drawn there until it is asked. */}
      <EdgePeek />
    </div>
  );
}
