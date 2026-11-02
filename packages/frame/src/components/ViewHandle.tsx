import { ArrowUpRight, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import { Hint } from './ui/hint';
import { standing } from '../lib/cameras';
import { WINDOW_KINDS, kindOf } from '../lib/windows';
import type { CarriedView } from '../lib/types';
import { CONTROL } from '../lib/chrome';
import type { FrameBox } from '../lib/views';
import { cn } from '../lib/utils';
import { useSurfaceForward } from '../hooks/useSurfaceForward';
import { useViews, type WindowView } from '../stores/views';

// The pin a window on the shell is carried by: what the window is, and the one thing that can be done to it.
//
// It is a thing of the page, which is what it is for: a control that has to be read, hovered and pressed is not
// something a texture can be asked. The picture stays on the shell (`components/ViewPatch.tsx`).
//
// A view is the place's own declaration, so it is not the pilot's to remove: a camera or a map a project gives its member
// is there for as long as the project says it is, and the control a window offers is putting it away. That is why the pin
// carries a fold and no close.
//
// It stands clear of the window rather than over it, off the window's edge on the side one of the space's own read of
// where its camera is carried, across as well as up and down. Where it stands is `handleOf`'s reading and not this
// component's, because the line back to the entity starts at this box's own middle: two readings of it would be a
// line that meets the pin beside it.
//
// What it says is the camera, and not the entity: an entity with two cameras has two windows, so a name that says
// the entity would name both of them the same thing. Where the camera is carried is what the pin's own tooltip says,
// and a camera that stands in the space as an entity of its own needs no tooltip to say it. The glyph before the name
// says the pin is a window and not a unit's own mark: both are drawn on the shell and both are pressed to pick, so
// what tells them apart is that this one carries a picture.
//
// The gesture is handed in rather than made here, and it is the press alone: the pin, the grip and the picture under
// them are handles on one thing and the layer above owns the one gesture that moves it, which it advances from the page
// (`components/ViewLayer.tsx`). A press that never travelled is the window's own action instead, which the layer reads
// on the picture's own click: the pin is a control of the window and its drag is the window's, so it is the picture that
// carries what a press means.

export function ViewHandle({
  view,
  source,
  at,
  onGrip,
  onPick,
}: {
  view: WindowView;
  source: CarriedView;
  /** Where the pin stands, which is the box `handleOf` gives for this window. */
  at: FrameBox;
  /** The press that opens a drag of the window the pin is on, which is the same gesture the picture under it takes. */
  onGrip: (event: React.PointerEvent<HTMLElement>) => void;
  /** The press that takes the pilot to the member the window belongs to, when the press did not travel. */
  onPick: () => void;
}) {
  const fold = useViews((state) => state.fold);
  const forward = useSurfaceForward();
  // The place declares what a view is, so its kind is read from there: a window the browser kept before the place gave
  // the view a kind would otherwise go on being drawn as footage, which is what a map used to look like.
  const { Icon } = WINDOW_KINDS[kindOf(source.kind)];

  return (
    <div
      data-handle={view.id}
      title={standing(source) ? source.id : `${source.id}, carried by ${source.origin}`}
      className="pointer-events-auto absolute flex touch-none cursor-grab items-center gap-0.5 overflow-hidden rounded-full border border-border/70 bg-card pr-0.5 shadow-sm active:cursor-grabbing"
      style={{ left: at.left, top: at.top, width: at.width, height: at.height }}
      onPointerDown={onGrip}
      onClick={onPick}
    >
      <Icon className="ml-1.5 size-3 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate px-0.5 text-[10px] text-muted-foreground">{source.id}</span>
      {source.kind === 'media' ? (
        <Hint label="forward to the sphere">
          <Button
            size="icon-xs"
            variant="ghost"
            className={cn(CONTROL)}
            data-region="surface-forward"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              forward(source.origin);
            }}
          >
            <ArrowUpRight />
          </Button>
        </Hint>
      ) : null}
      <Hint label="fold">
        <Button
          size="icon-xs"
          variant="ghost"
          className={cn(CONTROL)}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            fold(view.id);
          }}
        >
          <ChevronUp />
        </Button>
      </Hint>
    </div>
  );
}
