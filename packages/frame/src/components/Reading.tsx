import { CircleOff, LoaderCircle } from 'lucide-react';

/**
 * The frame while it reads the board.
 *
 * A window with no board has no space to draw and no panels to read, so the body is one line saying so: the header
 * keeps the readings it already has, and the mark is the one the status bar spins for a source that has not answered.
 * A refused read keeps the reason it came back with, because a line that says only that something failed leaves a
 * reader with nothing to do about it.
 */
export function Reading({ error }: { error: string | null }) {
  return (
    <div data-region="reading" className="grid min-h-0 flex-1 place-items-center p-6">
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
  );
}
