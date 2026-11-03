import { ArrowUpRight } from 'lucide-react';
import { Row } from '../components/Row';
import { Hint } from '../components/ui/hint';
import { useSurfaceForward } from '../hooks/useSurfaceForward';
import { useWorld } from '../hooks/useWorld';
import type { Part, PartProps } from '../lib/kinds';
import type { Place, UnitView, World } from '@ssccsorg/skene-kernel';
import { cn } from '../lib/utils';
import { ownView, type OwnView } from '../lib/world';
import { VIEW_STATUS, statusWith, windowOf } from '../lib/windows';
import { UNKNOWN_KIND, viewKindOf, viewKinds } from '../lib/view-kinds';
import { useSelection } from '../stores/selection';
import { useViews } from '../stores/views';
import { ViewContent } from './ViewContent';

/**
 * What a member shows of itself: where it stands, the route it took, and the views the place gives it.
 *
 * This is the member's own top-level attribute and not what it holds. A lower element is a separate actor the member
 * owns, read on its own; a position and a view are the member speaking about itself, so they stand here rather than
 * under the tree of its parts.
 *
 * The map is real when the place says where it is: the pin is the unit's latest reading and the route is every place it
 * has stood, both converted through the box the place declares, so the picture and the record cannot disagree about the
 * ground. A place that declares no geography keeps its own plane, which is what the map was before it had a location.
 *
 * A view is drawn by the table in `ViewContent.tsx`, and this file only decides which row it stands under. The place's
 * `views` are one list whatever kind each one is: a kind this build has no renderer for is still a row, named by the
 * kind the place wrote, rather than a view the panel silently drops.
 */
export const shows: Part = function Shows({ member, place }: PartProps) {
  const own = ownView(place, member);
  const setRunning = useViews((state) => state.setRunning);
  const { world, lastOf } = useWorld();
  const pickedId = useSelection((state) => state.unit);
  const selectUnit = useSelection((state) => state.selectUnit);
  const pick = (id: string) => selectUnit(id, lastOf[id] ?? null);
  // A kind may say it can draw a member's own position, and then the Location row carries that drawing. The place's own
  // declaration is read through the kind, so the panel invents no view and names no kind of its own.
  const placeKind = viewKinds().find((kind) => kind.place && kind.read);
  const placeView = placeKind?.read?.({ id: `${member.id}/${placeKind.kind}`, cells: [1, 1] }) ?? null;
  const placeWindow = placeView ? windowOf(placeView.kind, placeView.id, member.id, `${member.id} place`) : null;
  // A place may declare a view that stands over the ground, and then that one is a row of its own. The Location row keeps
  // the coordinates and stops offering a second drawing of the same ground.
  const declaredPlace = own.views.some((view) => viewKindOf(view.kind)?.anchor === 'place');
  return (
    <div data-region="shows" className="flex flex-col gap-2 px-3 pb-2">
      <Row
        label="Location"
        fold="right"
        defaultOpen={false}
        value={
          <span className="ml-auto text-muted-foreground tabular-nums">
            {Math.round(own.at[0])}, {Math.round(own.at[1])}
          </span>
        }
        content={
          declaredPlace || !placeView || !placeWindow ? undefined : (
            <div data-window={placeWindow.id} data-kind={placeWindow.kind}>
              <ViewContent
                view={placeView}
                member={member.id}
                own={own}
                place={place}
                world={world}
                pickedId={pickedId}
                onPick={pick}
                running={undefined}
                setRunning={setRunning}
              />
            </div>
          )
        }
      />

      {own.views.map((view) => (
        <ViewRow
          key={view.id}
          view={view}
          member={member.id}
          own={own}
          place={place}
          world={world}
          pickedId={pickedId}
          onPick={pick}
        />
      ))}
    </div>
  );
};

/**
 * One of a member's views: the row says what it is and what it is doing, and the body stands under it.
 *
 * The value is the view's own glyph in the state's ink, so the status costs no second mark. Whether the same view's
 * window is folded on the space is the space's own state and is not drawn here, because this panel reads the member and
 * not the arrangement above it.
 *
 * The label comes from the kind table and the body from the content table, so a kind the place adds is named and drawn
 * by two lines rather than by a second shape here. A kind this build cannot draw keeps its name and is said to be
 * undrawable by its own entry, rather than guessed at.
 */
function ViewRow({
  view,
  member,
  own,
  place,
  world,
  pickedId,
  onPick,
}: {
  view: UnitView;
  member: string;
  own: OwnView;
  place: Place;
  world: World | null;
  pickedId: string | null;
  onPick: (id: string) => void;
}) {
  // The picture is the only thing that knows whether the medium is running, so its own events are what the row reads.
  // The same state is what the pin on the space draws, so one view has one answer in both places.
  const running = useViews((state) => state.running[view.id]);
  const setRunning = useViews((state) => state.setRunning);
  const forward = useSurfaceForward();
  const status = statusWith(view, running);
  const { word, ink } = VIEW_STATUS[status];
  const { label, Icon } = viewKindOf(view.kind) ?? UNKNOWN_KIND;
  const shell = windowOf(view.kind, view.id, member, view.id);
  return (
    <div data-window={shell.id} data-kind={shell.kind}>
      <Row
        label={label}
        fold="right"
        value={
          <>
            <span
              role="img"
              aria-label={`the view is ${word}`}
              title={`the view is ${word}`}
              className={cn('flex shrink-0 items-center', ink)}
            >
              <Icon className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted-foreground">{shell.title}</span>
            {viewKindOf(view.kind)?.forward ? (
              <Hint label="forward to the sphere">
                <button
                  type="button"
                  data-region="surface-forward"
                  className="flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                  onClick={() => forward(member)}
                >
                  <ArrowUpRight className="size-3.5" />
                </button>
              </Hint>
            ) : null}
          </>
        }
        content={
          <ViewContent
            view={view}
            member={member}
            own={own}
            place={place}
            world={world}
            pickedId={pickedId}
            onPick={onPick}
            running={running}
            setRunning={setRunning}
          />
        }
      />
    </div>
  );
}
