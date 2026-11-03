import type { Bundle } from '@ssccsorg/skene-kernel';
import { PROJECT_STATE, ROW } from '@ssccsorg/skene-ui';
import { cn } from '@ssccsorg/skene-ui';

/**
 * The contexts this board holds, each named by its own record and each in its own state, as one line
 * apiece: the column on the right is where a space is chosen, and a list of five that took five rows of
 * two lines would take the room the participants need.
 *
 * The state a project is in is the one reading the list exists to show, and it is drawn in the shared scheme so that
 * the bar's own reading of the open project and this one cannot drift apart.
 */
export function ProjectList({
  projects,
  projectId,
  onOpen,
}: {
  projects: Bundle[];
  projectId: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col">
      {projects.map((project) => {
        const state = project.status ? PROJECT_STATE[project.status] : null;
        return (
          <li key={project.id}>
            <button
              type="button"
              title={`${project.id} ${state?.word ?? ''}`.trim()}
              onClick={() => onOpen(project.id)}
              className={cn(
                ROW,
                'w-full gap-2 text-left',
                'hover:bg-accent/40',
                project.id === projectId && 'bg-accent/60',
              )}
            >
              <span className={cn('size-2 shrink-0 rounded-full', state?.mark ?? 'bg-transparent')} />
              <span className="min-w-0 flex-1 truncate">{project.title}</span>
              {state ? (
                <span className="shrink-0 text-[11.5px] text-muted-foreground">{state.word}</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
