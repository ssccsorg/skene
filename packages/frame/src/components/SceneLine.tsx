import { LABEL, ROW, TITLE } from '../lib/chrome';
import type { Scene } from '@ssccsorg/skene-kernel';
import { cn } from '../lib/utils';

/**
 * Where in the record the frame is: the project's own clock, and what the scene is.
 *
 * It names itself the way the two strips it stands between do. The transport above says what it is walking and the
 * chain below says what the walk is made of, so a row of clock, title and note with no name of its own read as a
 * caption to whichever of the two the eye landed on last.
 */
export function SceneLine({ scene }: { scene: Scene | null }) {
  return (
    <div data-region="scene" className={cn(ROW, 'gap-2')}>
      <span className={LABEL}>Scene</span>
      <span className="text-muted-foreground tabular-nums">{scene?.clock ?? ''}</span>
      <span className={cn(TITLE, 'shrink-0')}>{scene?.title ?? 'The space, before anything'}</span>
      <span className="min-w-0 truncate text-muted-foreground">{scene?.note ?? ''}</span>
    </div>
  );
}
