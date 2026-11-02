import { useMemo } from 'react';
import { PanelRight } from 'lucide-react';
import { SpacePanel } from '../SpacePanel';
import { Splitter } from '../Splitter';
import { useWorld } from '../../hooks/useWorld';
import { registerPanel } from '../../lib/panels';
import { neighboursOf } from '../../lib/world';
import { useScenario } from '../../stores/scenario';
import { useSelection } from '../../stores/selection';
import { useSizes } from '../../stores/sizes';

/**
 * The space read at every scale, on the frame's right edge.
 *
 * It is the panel whose body is the map, the projects, the people and the devices, and it draws its own box and its own
 * edge. The places of the other projects are read here rather than handed in, because the panel reads the bundles for
 * itself: what is not drawn is what is not asked for, and a panel that is away asks for nothing.
 */
function PlanPane() {
  const { model, world, lastOf } = useWorld();
  const projects = useScenario((state) => state.projects);
  const projectId = useScenario((state) => state.projectId);
  const openProject = useScenario((state) => state.open);
  const selectUnit = useSelection((state) => state.selectUnit);
  const pickedId = useSelection((state) => state.unit);
  const width = useSizes((state) => state.plan);
  const setSize = useSizes((state) => state.set);

  // The shell holds every project at its own bearing, so what the panel draws beside the open one is the places of the
  // rest. They are read from the bundles rather than from the runs: a project that is not open has no record to draw.
  const neighbours = useMemo(() => neighboursOf(projects, projectId), [projects, projectId]);

  if (!world || !model) return null;

  return (
    <div data-region="plan" style={{ width }} className="relative flex min-h-0 shrink-0 flex-col">
      <Splitter
        axis="x"
        invert
        value={width}
        onChange={(value) => setSize('plan', value)}
        className="inset-y-0 -left-[3px] w-1.5"
      />
      <SpacePanel
        world={world}
        neighbours={neighbours}
        place={model.project.place}
        lastOf={lastOf}
        pickedId={pickedId}
        onPick={(id) => selectUnit(id, lastOf[id] ?? null)}
        onOpenProject={openProject}
      />
    </div>
  );
}

registerPanel({
  key: 'plan',
  at: 'right',
  order: 10,
  side: 'right',
  label: 'Space',
  title: 'the map, the projects and the devices',
  starts: true,
  Icon: PanelRight,
  View: PlanPane,
});
