import { useLocation } from 'react-router-dom';
import { useInstruments } from '../lib/instruments';
import { useReadingAt } from '../lib/readings';
import { cn } from '../lib/utils';
// The imports are what put these in the register: an instrument declares itself where it lives, and a bar that listed
// them would be the conditional this exists to avoid. The list is the kind's own barrel, so one control a file and one
// line there is the whole of what an instrument costs.
import './instruments';

/**
 * The hairline drawn where the run of instruments changes.
 *
 * It is a rule of the control's own box and not separator markup: the box is empty when the control it holds has nothing
 * to draw, and an empty box is hidden, so a control the place does not offer leaves no rule behind. The pseudo-element
 * is the drawing; the box is what decides whether there is a drawing at all.
 */
const RUN = cn(
  'flex items-center gap-0.5 empty:hidden',
  "data-[band-start=true]:before:mx-0.5 data-[band-start=true]:before:h-4 data-[band-start=true]:before:w-px data-[band-start=true]:before:shrink-0 data-[band-start=true]:before:bg-border data-[band-start=true]:before:content-['']",
);

/**
 * What can be done to the frame, at the end of the bar that says what the space is.
 *
 * They stood at the foot of the board, floating over the space in a card of their own. A control that floats is a
 * control that has to be kept clear of everything else and that a window can come to stand over, and the frame's own
 * bar is where a cockpit keeps the instruments that are about the frame: the title says what is being looked at and
 * the controls beside it say how.
 *
 * There are two rows of them, one at each end of the name in the middle: the panels that stand on the left edge are
 * named at the left and everything else at the right, so a control is beside the panel it opens. Which row an
 * instrument stands in is the instrument's own answer, in the same way its order and its band are, and this draws the
 * answer for the side it was asked for.
 *
 * What stands here is what the register has for the reading in force, in the order and the runs the instruments
 * declared. Nothing in this row knows what any of them is or when it should be drawn: a control that is about the
 * shell and not about a table says so where it is written, and this draws the answer.
 */
export function DisplayButtons({ side }: { side: 'left' | 'right' }) {
  const { pathname } = useLocation();
  // The name a control is asked by comes from the reading the address names, so the bar holds no address table of its own
  // and a reading added later is a reading the bar asks about without being told it exists.
  const reading = useReadingAt(pathname);
  const instruments = useInstruments(reading?.key ?? '', side);

  return (
    <span data-region="display" data-side={side} className="flex shrink-0 items-center gap-0.5">
      {instruments.map((instrument, index) => (
        <span
          key={instrument.key}
          data-instrument={instrument.key}
          data-band-start={index > 0 && instruments[index - 1].band !== instrument.band ? 'true' : undefined}
          className={RUN}
        >
          <instrument.Control />
        </span>
      ))}
    </span>
  );
}
