import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Info, Map, Plus } from 'lucide-react';
import { Button } from '@ssccsorg/skene-ui';
import { Hint } from '@ssccsorg/skene-ui';
import { RowControl } from '@ssccsorg/skene-ui';
import { useEntityState } from '../hooks/useEntityState';
import { useMenu } from '../hooks/useMenu';
import { CONTROL, LABEL, ROW } from '@ssccsorg/skene-ui';
import { hasSeat, useReadings, useReadingAt } from '../lib/readings';
import { cn } from '@ssccsorg/skene-ui';
import { useScenario } from '../stores/scenario';
import { LIMITS, useSizes } from '../stores/sizes';
import type { Entry, Place, World } from '@ssccsorg/skene-kernel';
import type { Neighbour } from '../lib/world';
import { EntityPanel, MEMBERS_MIN } from './EntityPanel';
import { AddProject } from './AddProject';
import { ProjectList } from './ProjectList';
import { ProjectSummary } from './ProjectSummary';
import { MAP_MIN, SpaceMap } from './SpaceMap';
import { Splitter } from './Splitter';

/**
 * The right column, which is the space read at every scale and in one place: the shell as a disc with the
 * frame's own region painted on it, the projects the board holds, and the members standing in it.
 *
 * The map is at the top because it is the one reading that says where the others are: a member's row and a
 * project's row are both places on the disc, and the disc says where the pilot is looking at them from. The
 * projects come next, because opening one is choosing which space the column is reading.
 *
 * The members are one list and not two. The people the place names were a section of their own under it, and the two
 * were the same members read twice: what tells a person from a machine is what the member is, which is the row's own
 * word, and a reader walking one list learns one set of words rather than two.
 *
 * Nothing here is titled. The panel's own name stands in the bar and in the frame's control for it, and a row that says
 * "Space" over a disc and a list of projects names the things already under it: it costs the row it stands on and says
 * nothing a reader did not already have.
 *
 * The map is pinned and the lists below it scroll, because a space of thirty would otherwise push the map off the panel:
 * what stays put is what says where you are, and what moves is the list you are walking. The map is also the one section
 * that goes away entirely, because it is the whole column's reading rather than a list of things in it: a pilot reading
 * the members gives the disc up and the control on the projects row brings it back.
 *
 * What the space is is the projects row's own reading, one press away. It stood over the foot of the column and came out
 * when the pointer entered the column, which made a reading of the project in force cost the height of everything under it
 * and made it appear for a reader who was passing over the members to reach something else. It is the row's because the
 * row is what names the project in force, and a control that answers beside the name it is about is where a reader looks
 * for it.
 *
 * Two of the remaining sections are measures of the pilot's: how much of the column the projects take, and how much the
 * members take. Both are given away by name rather than by position, because the two questions a pilot asks of a column
 * this shape are which context is open and who is standing in it, and a frame that answered one with room for the other
 * would decide which of the two the panel is for. The edge of each is the same control as every other edge of the frame.
 */
export function SpacePanel({
  world,
  neighbours,
  place,
  lastOf,
  pickedId,
  onPick,
  onOpenProject,
}: {
  world: World;
  /** The other projects the one shell holds, which the map draws as the ground they take. */
  neighbours: Neighbour[];
  place: Place;
  lastOf: Record<string, Entry | null>;
  pickedId: string | null;
  onPick: (id: string) => void;
  onOpenProject: (id: string) => void;
}) {
  const { pathname } = useLocation();
  const reading = useReadingAt(pathname);
  // The readings this project stands, which is what the disc is drawn on: a build that installs a seat reading tells
  // nothing about a project whose bundle does not stand it.
  const readings = useReadings();
  const projects = useScenario((state) => state.projects);
  const projectId = useScenario((state) => state.projectId);
  const open = useScenario((state) => state.open);
  const add = useScenario((state) => state.add);
  const state = useEntityState();
  const projectHeight = useSizes((size) => size.projects);
  const setSize = useSizes((size) => size.set);

  // Whether the disc stands. It is the column's own reading rather than a panel of the frame, so it folds here and not
  // through the arrangement the bar draws. It is a picture of the sphere a seat reading looks through, so it stands
  // only where the project in force stands one: a project read as a chain, a table or a record keeps the column's lists
  // and no disc, because there is no sphere in it for a disc to be a picture of.
  const [map, setMap] = useState(true);
  const sphere = hasSeat(readings);
  const disc = map && sphere;
  // The form that adds a project, on the row that names the projects rather than in a dialog: a project is one record and
  // one source, and both are read where the list of projects is.
  const [adding, setAdding] = useState(false);
  // What the space is, on the row that names the project in force rather than over the foot of the column.
  const [info, setInfo, infoBox] = useMenu();

  /**
   * How tall the column actually is, which is what says how much of it the projects may take.
   *
   * The projects are dragged upward to take the map's room, so where the drag stops is the map's floor: without the
   * column's own height the drag would be clamped by a constant and a short frame would let the projects push the map and
   * the members off the bottom. It is measured rather than asked of a style, because a flex column has no height to read
   * out of a declaration.
   */
  const column = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const element = column.current;
    if (!element) return undefined;
    const read = () => setHeight(element.clientHeight);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // The most the projects may stand at: the column less what the map and the members may not give up. A map that is away
  // guarantees nothing, which is the whole of what folding it is for.
  const most = Math.max(height - (disc ? MAP_MIN : 0) - MEMBERS_MIN, LIMITS.projects[0]);

  return (
    <div ref={column} className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {disc ? (
        <SpaceMap
          world={world}
          neighbours={neighbours}
          state={state}
          pickedId={pickedId}
          seat={reading?.seat === true}
          onPick={onPick}
          onOpenProject={onOpenProject}
        />
      ) : null}

      <div
        data-region="projects"
        style={{ height: projectHeight }}
        className="relative flex min-h-0 shrink-0 flex-col border-b"
      >
        {/* The count is here because the section is a measure the pilot set and a list longer than it is a list
            that scrolls: a project that is not on screen says so by the number, rather than looking like a project
            that is not there. */}
        <div className={cn(ROW)}>
          <h2 className={cn(LABEL)}>Projects</h2>
          {/* What the space is, beside the name of the project in force and not covering the column. */}
          <div ref={infoBox} className="relative">
            <Hint label="summary">
              <Button
                size="icon-xs"
                variant="ghost"
                className={cn(CONTROL)}
                data-region="project-info"
                data-on={info}
                onClick={() => setInfo(!info)}
              >
                <Info />
              </Button>
            </Hint>
            {info ? <ProjectSummary world={world} state={state} /> : null}
          </div>
          <span className="flex-1" />
          <span className="text-[11.5px] tabular-nums text-muted-foreground">{projects.length}</span>
          <Hint label="add project">
            <Button
              size="icon-xs"
              variant="ghost"
              className={cn(CONTROL)}
              data-region="project-add-open"
              data-on={adding}
              onClick={() => setAdding((was) => !was)}
            >
              <Plus />
            </Button>
          </Hint>
          {/* The disc's own control, on the row under it because that is the row that stands whichever way the disc
              stands: a section away is a section with no row to carry its way back. A project with no sphere stands no
              disc, so it stands no control into one. */}
          {map && sphere ? (
            <Hint label={map ? 'hide map' : 'map'}>
              <RowControl
                at="end"
                data-region="map-fold"
                data-on={map}
                onClick={() => setMap(!map)}
              >
                <Map />
              </RowControl>
            </Hint>
          ) : null}
        </div>
        {adding ? <AddProject onAdd={add} onClose={() => setAdding(false)} /> : null}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ProjectList projects={projects} projectId={projectId} onOpen={open} />
        </div>
        {/* The edge is between the projects and the disc above them, because dragging it up is how the projects are
            given the disc's room: a handle at the foot of the section would move the members instead, and the pilot
            dragging it up would watch the list they meant to grow stay where it was. */}
        <Splitter
          axis="y"
          invert
          value={projectHeight}
          onChange={(value) => setSize('projects', Math.min(value, most))}
          className="inset-x-0 -top-[3px] h-1.5"
        />
      </div>

      <div style={{ minHeight: MEMBERS_MIN }} className="flex min-h-0 flex-1 flex-col">
        <EntityPanel
          world={world}
          place={place}
          state={state}
          lastOf={lastOf}
          pickedId={pickedId}
          onPick={onPick}
        />
      </div>
    </div>
  );
}
