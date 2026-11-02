import { CampaignLine } from './CampaignLine';
import { Panes } from './Panes';
import { SceneLine } from './SceneLine';
import { Trace } from './Trace';
import { useWorld } from '../hooks/useWorld';
import { usePanels } from '../lib/panels';
import { useScenario } from '../stores/scenario';
import { useSelection } from '../stores/selection';

/**
 * The frame's bottom edge: the campaigns, the transport, the scene and the trace.
 *
 * It is one component because it has two places to stand and must be the same there. Standing between the two columns it
 * is drawn by the space, under the board; spanning the frame it is drawn by the shell, under the columns, so the strip
 * has the window's width and the columns stop above it. Which one it is, is the arrangement rather than a property of
 * the bar.
 *
 * It draws nothing when the edge is away, in either sense: the pilot folded it, or every panel is put away. What is
 * hidden is hidden, and the way back to it is the pointer on the edge (`components/EdgePeek`), which draws this bar for
 * as long as it rests there. A folded edge that kept a row on screen would be a row taken from the board for a reading
 * the pilot has just said they do not want.
 */
export function BottomBar() {
  const { model, revealed, scene } = useWorld();
  const projects = useScenario((state) => state.projects);
  const projectId = useScenario((state) => state.projectId);
  const campaign = projects.find((each) => each.id === projectId)?.campaigns?.[0] ?? null;
  const panels = usePanels();
  const bar = useSelection((state) => state.bar);
  const peeking = useSelection((state) => state.peek === 'bottom');
  const folded = panels.every((each) => !each.open);
  if (!peeking && (!bar || folded)) return null;

  return (
    <>
      {/* The campaign is a reading of the run the board walks, so it stands between the board and the transport: the
          line says which sub-missions the records have finished, and the transport underneath is how the reader moves
          through the same run. */}
      <CampaignLine />

      {/* The panels of the bottom edge, in the order the register puts them. The transport stands between the board
          and the scene's own line because that is where a run is read: under the space it walks and above the line
          that names the scene it has reached. A look at an edge whose panels are away draws the panels that are away,
          because those are what the edge holds. */}
      <Panes at="bottom" only={folded ? 'closed' : 'open'} />

      <SceneLine scene={scene} />

      {/* The trace is the work as one line, under the transport that walks it. It reads what the feed delivered and not the
          project's file, because the line a pilot is watching is the one the room just ran: the file is the run as it was
          written about, and a chain drawn from it would stand still while the space moved. A narrow frame gives the space
          its height instead, because a space squeezed to a strip puts every name over another. */}
      <div className="hidden md:block">{model ? <Trace records={revealed} campaign={campaign} /> : null}</div>
    </>
  );
}
