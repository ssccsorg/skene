import { EntityGraph } from '../components/EntityGraph';
import { ROW } from '@ssccsorg/skene-ui';
import { registerReading } from '../lib/readings';
import { cn } from '@ssccsorg/skene-ui';
import { useVolume } from '../hooks/useVolume';
import { useScenario } from '../stores/scenario';
import { Network } from 'lucide-react';

/**
 * The space as a graph: the participants and the work one declared and another took. It is drawn from what
 * the stream delivered, so it grows with the run rather than being a diagram of a file.
 */
export function GraphView() {
  const model = useScenario((state) => state.model);
  const received = useVolume().received;
  const shown = useVolume().shown;

  if (!model) {
    return <p className="p-4 text-[11.5px] text-muted-foreground">The board is still loading.</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn(ROW, 'gap-2 border-b')}>
        <span className="min-w-0 truncate text-muted-foreground">
          {model.title} · every participant, and how much its own store holds. An edge is a piece of work one
          participant declared and another took.
        </span>
      </div>
      <EntityGraph received={received.slice(0, shown)} units={model.project.place.units ?? {}} />
    </div>
  );
}

registerReading({
  key: 'graph',
  path: '/graph',
  View: GraphView,
  button: { order: 12, title: 'graph', Icon: Network },
});
