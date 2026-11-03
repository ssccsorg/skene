import { Separator } from '@ssccsorg/skene-ui';
import { LABEL, ROW } from '@ssccsorg/skene-ui';
import { usePanels } from '../lib/panels';
import { cn } from '@ssccsorg/skene-ui';
import { useSizes } from '../stores/sizes';
import { useViews } from '../stores/views';
import { host } from '../lib/host';

/**
 * What the settings control opens: the stack this frame is a window over, and the pilot's own arrangement of
 * the surface.
 *
 * The server comes first because it is the one setting that decides what can be shown at all: a panel that
 * cannot reach its stack is a panel drawing an old picture. It is works' own connect form, field for field,
 * because the two windows reach one stack and one of them should not have to be learned separately.
 *
 * The frame's arrangement stands under it: the panels and whether they are out. Everything else about
 * the surface is read from the space rather than chosen, so those rows are the whole of what a pilot
 * arranges, and each row is the same press the bar's own toggle makes rather than a second control that
 * has to agree with it.
 *
 * A window is the one thing a pilot moves that outlives the session, so forgetting where they were put is
 * here too: it is a setting about the arrangement rather than an edit to the record.
 *
 * It is a menu and closes like one. It is not a panel and is never away: a panel's own toggle is in the bar,
 * and this hangs off the control that opened it and goes away when the press lands elsewhere.
 */
export function SettingsMenu() {
  const Connect = host().connect;
  const panels = usePanels();
  const forget = useViews((state) => state.reset);
  const forgetSizes = useSizes((state) => state.forget);

  return (
    <div
      data-region="settings"
      className="absolute top-full right-0 z-[100] mt-1 flex max-h-[calc(100vh-3rem)] w-[308px] flex-col gap-1.5 overflow-y-auto rounded-md border border-border/70 bg-card/95 p-2 shadow-lg backdrop-blur-sm"
    >
      {Connect ? <Connect /> : null}
      <Separator className="my-0.5" />
      <h2 className={cn(LABEL, 'px-0 pb-0.5')}>
        Panels
      </h2>
      {panels.map(({ unit, open, toggle }) => (
        <button
          key={unit.key}
          type="button"
          title={open ? `put the ${unit.label.toLowerCase()} away` : unit.title}
          onClick={toggle}
          className={cn(ROW, 'w-full gap-2 rounded-sm px-0 text-left transition-colors hover:bg-accent')}
        >
          <span className="flex-1">{unit.label}</span>
          <span className="text-[11.5px] text-muted-foreground">{open ? 'shown' : 'hidden'}</span>
        </button>
      ))}
      <Separator className="my-0.5" />
      <button
        type="button"
        title="put every window back where it came from"
        onClick={forget}
        className={cn(ROW, 'w-full rounded-sm px-0 text-left transition-colors hover:bg-accent')}
      >
        forget where the windows were put
      </button>
      <button
        type="button"
        title="give every panel its first width and height back"
        onClick={forgetSizes}
        className={cn(ROW, 'w-full rounded-sm px-0 text-left transition-colors hover:bg-accent')}
      >
        forget the panel sizes
      </button>
    </div>
  );
}
