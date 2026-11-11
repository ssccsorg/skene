import { Separator } from '@ssccsorg/skene-ui';
import { LABEL } from '@ssccsorg/skene-ui';
import { useBrand } from '../lib/brand';
import { cn } from '@ssccsorg/skene-ui';

/**
 * What the frame is, under the mark that opens it.
 *
 * A cockpit is asked what it is and which one it is more often than it is asked anything else, so the answer hangs off
 * the name: the name, the version, and the layers the surface is over. A version that cannot be read at a glance is a
 * version nobody checks, and a version this frame only knows as a constant is a placeholder, which is what the name it
 * reads says.
 *
 * It is a menu and closes like one, so the box and the press are the header's and not this drawing's.
 */
export function VersionCard() {
  const brand = useBrand();
  return (
    <div
      data-region="version"
      className={cn(
        'absolute top-full left-0 z-[100] mt-1 rounded-md border border-border/70 bg-card/95 p-3 shadow-lg backdrop-blur-sm',
        brand.about?.length ? 'w-[304px]' : 'w-[248px]',
      )}
    >
      <span className="block text-[11.5px] text-foreground">{brand.name}</span>
      <span className="block text-[11.5px] tabular-nums text-muted-foreground">{brand.version}</span>
      {brand.about?.length ? (
        <>
          <Separator className="my-2" />
          <span className={cn(LABEL, 'block pb-1')}>About</span>
          <ul className="list-disc space-y-1 pl-4 text-[11.5px] text-muted-foreground">
            {brand.about.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      ) : null}
      <Separator className="my-2" />
      <span className={cn(LABEL, 'block pb-1')}>Stack</span>
      <span className="block text-[11.5px] text-muted-foreground">{brand.layers.join(' · ')}</span>
    </div>
  );
}
