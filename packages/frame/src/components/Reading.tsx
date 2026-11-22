import { CircleOff, LoaderCircle } from 'lucide-react';

/**
 * The frame while it reads the board.
 *
 * A window with no board has no space to draw and no panels to read, so the body is this one state rather than a
 * cockpit of empty panels: the header keeps every reading it already has, and below it the ground is the rectangle a
 * place declares, drawn empty, with the middle a star will stand at.
 *
 * The mark is the one the status bar spins for a source that has not answered, and the ink is the same idle and
 * offline the rest of the chrome reads a waiting and a refused thing in, so the frame says not yet in one way wherever
 * it says it. A refused read keeps the reason it came back with, because a bar that says only that something failed
 * leaves a reader with nothing to do about it.
 */
export function Reading({ error }: { error: string | null }) {
  return (
    <div data-region="reading" className="flex min-h-0 flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-[360px] flex-col gap-3">
        {/* The place's own proportions, and its middle: the board's ground before anything stands on it. */}
        <div className="relative aspect-[520/176] overflow-hidden rounded-sm border border-border bg-card/40">
          <span className="absolute top-1/2 right-4 left-4 h-px -translate-y-1/2 bg-border/70" />
          <span className="absolute top-3 bottom-3 left-1/2 w-px -translate-x-1/2 bg-border/70" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="size-[3px] rounded-full bg-idle motion-safe:animate-pulse" />
          </span>
        </div>
        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-[11.5px] text-muted-foreground"
        >
          {error ? (
            <CircleOff aria-hidden className="size-3.5 shrink-0 text-offline" />
          ) : (
            <LoaderCircle aria-hidden className="size-3.5 shrink-0 text-idle motion-safe:animate-spin" />
          )}
          <span className="min-w-0 truncate">{error ?? 'reading the board'}</span>
        </p>
      </div>
    </div>
  );
}
