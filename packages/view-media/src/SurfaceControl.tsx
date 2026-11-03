// How the room's surface is filled, as the footage's own control.
//
// The button and its menu lived in the board's control column because the board was the only thing that drew a surface.
// They are the kind's now: how many pictures a surface shows and in what shape is a fact about footage, and a board with a
// kind that has no surface draws no such control.

import { useMemo } from 'react';
import { Check, Columns2, EyeOff, Grid2x2, Tv } from 'lucide-react';
import { Hint } from '@ssccsorg/skene-ui';
import { useMenu } from '@ssccsorg/skene-frame/hooks/useMenu';
import { cn } from '@ssccsorg/skene-ui';
import { SURFACE_MODES, surfaceMedia } from './surface';
import { useSurface } from './surface-store';
import { filling, type SurfaceProps } from './MediaSurface';

/** The tool's own shape, which is the board's column: the surface control stands in it and is drawn by the board. */
const TOOL =
  'pointer-events-auto flex size-6 items-center justify-center rounded-sm border border-border/70 bg-card/85 ' +
  'text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-40';

export function SurfaceControl({ world, pickedId }: SurfaceProps) {
  const surface = useSurface((state) => state.mode);
  const setSurface = useSurface((state) => state.setMode);
  const [menu, setMenu, menuBox] = useMenu();
  const hasMedia = useMemo(() => surfaceMedia(filling(world), pickedId).length > 0, [world, pickedId]);
  const icon = surface === 'single' ? Tv : surface === 'split' ? Columns2 : surface === 'grid' ? Grid2x2 : EyeOff;
  const name = surface === 'single' ? 'full' : surface;
  const Icon = icon;

  return (
    <div ref={menuBox} className="relative">
      <Hint label={`surface: ${name}`}>
        <button
          type="button"
          data-region="surface-mode"
          data-on={surface !== 'off'}
          className={TOOL}
          disabled={!hasMedia}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          <Icon className="size-3.5" />
        </button>
      </Hint>
      {menu ? (
        <div
          data-region="surface-mode-menu"
          className="absolute right-7 bottom-0 z-[90] flex w-20 flex-col rounded-sm border bg-card p-0.5 text-[11px] shadow-sm"
        >
          {SURFACE_MODES.map((mode) => {
            const label = mode === 'single' ? 'full' : mode;
            return (
              <button
                key={mode}
                type="button"
                data-mode={mode}
                aria-pressed={surface === mode}
                className={cn(
                  'flex items-center justify-between rounded-sm px-1.5 py-1 text-left text-muted-foreground hover:bg-accent/40 hover:text-foreground',
                  surface === mode && 'text-foreground',
                )}
                onClick={() => {
                  setSurface(mode);
                  setMenu(false);
                }}
              >
                <span>{label}</span>
                {surface === mode ? <Check className="size-3" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
