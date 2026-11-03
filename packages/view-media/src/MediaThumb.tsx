import { useEffect, useRef } from 'react';
import { FRAME_RATE, feedFrames } from './still';
import { cn } from '@ssccsorg/skene-ui';
import { useViews } from '@ssccsorg/skene-frame/stores/views';

// A member's own camera, as the picture its row can carry.
//
// It is the same still the window and the sphere read (`lib/still`), so one camera has one reading
// wherever it is drawn, and a row says that a member is looking at something without the pilot
// opening it. The picture is drawn into a canvas and covered rather than stretched, which is the rule
// the patch follows: a row that stretched a camera to its own shape would draw a picture of something
// else.
//
// A row draws a picture and says nothing else about it. Pressing the row is pressing the member, and a
// control inside a row that is itself a button would be two controls in one press.

/** The picture's own pixels, twice the size it stands at, so it is sharp on a display that is not one-to-one. */
const PIXELS: [number, number] = [88, 56];

export function MediaThumb({ id, src, className }: { id: string; src: string; className?: string }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const say = useViews((state) => state.setRunning);

  useEffect(() => {
    const stop = feedFrames(src, FRAME_RATE, (frame) => {
      if (!frame) {
        say(id, false);
        return;
      }
      const context = canvas.current?.getContext('2d');
      if (!context || !frame.width || !frame.height) return;
      const [width, height] = PIXELS;
      const scale = Math.max(width / frame.width, height / frame.height);
      const across = frame.width * scale;
      const down = frame.height * scale;
      context.drawImage(frame.image, (width - across) / 2, (height - down) / 2, across, down);
      say(id, true);
    });
    return () => {
      stop();
      say(id, false);
    };
  }, [id, src, say]);

  return (
    <canvas
      ref={canvas}
      width={PIXELS[0]}
      height={PIXELS[1]}
      aria-hidden
      data-thumb={id}
      title={`${id}: the member's own camera`}
      className={cn('h-7 w-11 shrink-0 self-center rounded-sm border border-border/70 bg-black/40', className)}
    />
  );
}
