import { EMPTY, useRecords, type Volume } from '../stores/records';

/**
 * The volume the frame reads, or the one a project owns.
 *
 * A blackboard is per project, so a panel that reads records reads a project's: with nothing named it is the
 * focused project's, which is the run the transport and the panels are about. Naming one is how a reading of
 * another open project is taken without the frame being about that project.
 *
 * The value handed back is the stored volume itself rather than a copy, so a component reading it re-renders
 * when that one volume changes and not when any other project's does.
 */
export function useVolume(project?: string | null): Volume {
  return useRecords((state) => (project ? (state.volumes[project] ?? EMPTY) : state.focus ? (state.volumes[state.focus] ?? EMPTY) : EMPTY));
}
