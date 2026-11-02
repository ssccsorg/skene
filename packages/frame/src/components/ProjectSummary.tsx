import type { World } from '../lib/types';
import { LABEL } from '../lib/chrome';
import { useScenario } from '../stores/scenario';

// What the space is, when nothing in it is picked.
//
// The detail of a pick opens in the row it was picked, so with nothing picked the feed says nothing about
// the space at all, and a panel that answers only when a row is clicked is a panel that is dark until it
// is used. This is the standing answer: the project the space is of, how much of it there is, the clock it
// runs on, and the one thing to do next. It is a menu and closes like one, hung off the control that opens it on the
// projects row: a reading about the project in force is a control's own answer, and drawing it over the column's own
// foot made everything under it unreadable while a reader passed over the members to reach something else.
//
// It is the space's own reading and not the bundle's, so the numbers move with the run: the records are
// what the feed delivered, the members are every member the place stands, and the working count is the
// same reading the marks on the board are drawn from.

export function ProjectSummary({
  world,
  state,
}: {
  world: World;
  /** The state each participant is in, read once by the panel this summary belongs to. */
  state: Record<string, 'working' | 'idle' | 'offline'>;
}) {
  const model = useScenario((store) => store.model);
  if (!model) return null;

  const members = world.standing;
  const working = members.filter((unit) => state[unit.id] === 'working').length;
  const clock = (index: number) => model.scenes[index]?.clock ?? '';

  return (
    <div
      data-region="project-summary"
      className="absolute top-full left-0 z-[100] mt-1 flex w-[272px] flex-col gap-0.5 rounded-md border border-border/70 bg-card/95 p-2 shadow-lg backdrop-blur-sm"
    >
      <span className={LABEL}>Project</span>
      <span className="truncate text-[11.5px] text-foreground">{model.title}</span>
      <span className="text-[11.5px] text-muted-foreground tabular-nums">
        {world.entries} records · {members.length} members · {working} working ·{' '}
        {model.project.status ?? 'unknown'}
      </span>
      <span className="truncate text-[11.5px] text-muted-foreground">
        clock: {clock(0)} → {clock(model.scenes.length - 1)}
      </span>
      <span className="text-[11.5px] text-muted-foreground">
        click a record in the feed to open its envelope
      </span>
    </div>
  );
}
