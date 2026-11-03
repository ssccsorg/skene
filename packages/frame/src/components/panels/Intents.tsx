import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, PanelLeft } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { EventStream } from '../EventStream';
import { Hint } from '../ui/hint';
import { RowControl } from '../ui/row-control';
import { IntentQueue } from '../IntentQueue';
import { RecordDetail } from '../RecordDetail';
import { Splitter } from '../Splitter';
import { useIntentPick } from '../../hooks/useIntentPick';
import { useWorld } from '../../hooks/useWorld';
import { keyOf } from '../../lib/address';
import { LABEL, ROW } from '../../lib/chrome';
import { boundsOf, intentsOf } from '../../lib/intents';
import { CONSOLE, useCapability } from '../../lib/capabilities';
import { registerPanel } from '../../lib/panels';
import { useReadingAt } from '../../lib/readings';
import { cn } from '../../lib/utils';
import { useEdits } from '../../stores/edits';
import { useChat } from '../../stores/chat';
import { useScenario } from '../../stores/scenario';
import { useSelection } from '../../stores/selection';
import { useSizes } from '../../stores/sizes';
// The readings this panel's own halves declare themselves by, held as the declarations themselves: asking whether the
// address is one of them by comparing against the reading means one renamed or moved stops compiling here rather than
// matching nothing.
import { INTENTS } from '../../views/IntentsView';
import { RECORDS } from '../../views/RecordsView';

/**
 * The left column: the space's intents, and under them the record as it arrives.
 *
 * An agent's own app puts its conversations here, and this space's unit of work is not a conversation. It
 * is a piece of work declared over the record, taken by a participant and closed by the fact it produced,
 * so the queue is read from the record rather than kept beside it, and it grows as the run declares work.
 * The queue is also where the space's N:N is read: one participant declares, another may claim, and the
 * state says which has happened.
 *
 * The feed is the lower half of the same column because the two are the same reading at two scales: the
 * queue is the shape of the work and the feed is the record it is made of. It is also where the picked
 * thing is opened: the row the pick landed on expands in place and the detail stands in the list, so the
 * record and its envelope are one row rather than the same record in two columns at once.
 *
 * A participant that has written nothing has no row to open, and a record the cursor has not reached is
 * not drawn, so a pick that has no row docks its detail under the list rather than going missing.
 *
 * It draws its own box, its own header and its own edge, which is what a panel of this frame does: leaving out what is
 * away is the frame's, and a column and a row are two shapes rather than one for the frame to build from a declaration.
 *
 * The two readings of this column are the frame's other scale of the same facts, so each half stands down while its own
 * reading is in force: a queue drawn whole in the board and again as a strip of the column is the same queue twice. What
 * is left in the column is the other half, which is why the box is a half when one of the two is away rather than a box
 * with a gap in it. What stands down is the list and not the row that names it: a title bar is where the half is named and
 * where the way to the whole of it stands, so it stays while the board draws the whole, and the half the board is drawing
 * is marked as the reading in force is marked in the bar.
 *
 * The way into either whole reading is the record's own glyph, drawn on the row that names the reading. It is the glyph
 * the record's detail carried while the detail had a control of its own, and it moved here because a whole reading is a
 * reading of the column rather than of the one record that happens to be opened: the detail is a row of the feed, and a
 * row that offered to leave the column would be the same press in the place the press is least about.
 */
function Intents() {
  const { pathname } = useLocation();
  // The reading in force at the address, so each half answers for its own reading's address.
  const reading = useReadingAt(pathname);
  const { model, revealed, inView, shown, world } = useWorld();
  const selected = useSelection((state) => state.selected);
  const unit = useSelection((state) => state.unit);
  const select = useSelection((state) => state.select);
  const rail = useSizes((state) => state.rail);
  const intentsHeight = useSizes((state) => state.intents);
  const setSize = useSizes((state) => state.set);
  const fork = useEdits((state) => state.fork);
  const openIntent = useIntentPick();

  const intentsAway = reading?.key === INTENTS.key;
  const recordsAway = reading?.key === RECORDS.key;

  const intents = useMemo(() => intentsOf(revealed), [revealed]);
  // What bounded the judgements in this run, read once and said once: a hint is the layer's own record and not a
  // participant's, so it stands over the whole queue rather than on a row of it.
  const bounds = useMemo(() => boundsOf(revealed), [revealed]);
  const pickedKey = selected ? keyOf(selected) : null;
  const picked = unit && world ? (world.standing.find((each) => each.id === unit) ?? null) : null;
  const place = model?.project.place ?? null;
  // The row the pick landed on, if the feed holds it: the detail opens inside that row.
  const hasRow = pickedKey ? revealed.some((entry) => keyOf(entry) === pickedKey) : false;
  const detail = place ? (
    <RecordDetail unit={picked} place={place} fork={fork} shown={shown} />
  ) : null;
  const docked = detail && !hasRow && (pickedKey !== null || picked !== null);

  // The feed folds away by the pilot's own press as well as by the board drawing the whole account: the column is two
  // panes and either of them may be the one the pilot is not reading.
  const [feedOpen, setFeedOpen] = useState(true);

  const [said, setSaid] = useState('');
  const project = useScenario((state) => state.projectId);
  const offer = useChat((state) => state.offer);
  // The line goes to the console's queue, so the form is drawn where the project has a console to say it in.
  const console = useCapability(CONSOLE);
  // Who a declaration goes to is the pick, which is the member the pilot is looking at, and the project when nothing is
  // picked: a line said to no member is said to the work itself, and that is the one name a space always has.
  const addressee = unit ?? project ?? '';

  return (
    <aside
      data-region="rail"
      style={{ width: rail }}
      className="relative flex min-h-0 shrink-0 flex-col border-r"
    >
      {/* The queue's own title bar, which stands whichever reading is up. It names the half and carries the way to the whole
          of it, and a bar that went away with its own reading took the way back with it: the reading is drawn in the board
          and the column still says which readings it has. The half the board is drawing is marked where it is named, the
          same way the bar marks the reading in force. */}
      <div className={cn(ROW)}>
        <h2 className={cn(LABEL, 'flex-1')}>Intents</h2>
        <span className="text-[11.5px] tabular-nums text-muted-foreground">{intents.length}</span>
      </div>
      {/* What declares work, because an instruction to a member is work declared and not a message beside it. The line goes
          to the console's queue rather than to a queue of this panel's: the console is where a turn is said, and a queue
          that delivered from here would be the second place a line is sent from. What the row adds is the way to say it
          without leaving the reading that shows what has been declared.

          A project with no console has no queue for the line, so the row is drawn where the line has somewhere to go. */}
      {console ? (
        <form
          data-region="declare"
          className={cn(ROW, 'gap-1.5 border-t')}
          onSubmit={(event) => {
            event.preventDefault();
            const text = said.trim();
            if (!text || !addressee) return;
            offer(addressee, text);
            setSaid('');
            useSelection.getState().setOpen('console', true);
          }}
        >
          <span className="shrink-0 font-mono text-[11.5px] text-muted-foreground">to {addressee || 'the work'}</span>
          <input
            data-region="declare-input"
            value={said}
            spellCheck={false}
            placeholder="declare work"
            onChange={(event) => setSaid(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[11.5px] outline-none placeholder:text-muted-foreground/70"
          />
        </form>
      ) : null}
      {/* What stood over the work. A hint judged the readings rather than belonging to a participant, so it is the
          whole queue's and not one row's, and a row that repeated it down the list would say it was each
          declaration's. The row says what it is in words because it is the one line here that is not a row of the
          queue: a bare name under the heading read as a category of it. */}
      {intentsAway || !bounds.length ? null : (
        <div
          data-region="bounds"
          className={cn(ROW, 'gap-1.5 border-t')}
          title={`${bounds.map((bound) => bound.label ?? 'a bound').join(', ')} \u00b7 the bound the record declares over the run, judged before the work was declared, so it stands once here rather than on one row of it`}
        >
          <span className={cn(LABEL, 'shrink-0')}>Bounded by</span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            {bounds.map((bound) => bound.label ?? 'a bound').join(', ')}
          </span>
        </div>
      )}
      {/* The column is two panes and the edge between them is a control, the same as every other edge of the
          frame: a pilot reading what is being declared gives the declarations the room, and one reading the
          record gives it to the feed. With the feed away there is no edge to move, so this half takes the column. */}
      {intentsAway ? null : (
        <div
          data-region="intents"
          style={recordsAway || !feedOpen ? undefined : { height: intentsHeight }}
          className={cn('min-h-0 overflow-y-auto border-t', recordsAway || !feedOpen ? 'flex-1' : 'shrink-0')}
        >
          <IntentQueue intents={intents} picked={pickedKey} onOpen={openIntent} />
        </div>
      )}

      {/* The feed's own title bar, for the reason the queue's stands: what the column has is said whether or not the board
          is drawing one of them. */}
      <div className={cn(ROW, 'border-t border-b')}>
        <h2 className={cn(LABEL, 'flex-1')}>Records</h2>
        <span className="text-[11.5px] tabular-nums text-muted-foreground">{revealed.length}</span>
        <Hint label="records">
          <RowControl
            at="end"
            data-region="rail-records-toggle"
            aria-expanded={feedOpen}
            onClick={() => setFeedOpen((open) => !open)}
          >
            {feedOpen ? <ChevronDown /> : <ChevronRight />}
          </RowControl>
        </Hint>
      </div>

      {/* The feed's half of this column is always here, because the space is always what is on screen: the whole
          account is a reading the board draws and not a page this list is replaced by, so the small one and the
          whole one are two scales of one reading rather than one standing in for the other. What stands down while the
          board is drawing it is the feed, which is the whole of what "the same reading at another scale" costs. */}
      {recordsAway || !feedOpen ? null : (
        <div data-region="rail-records" className="relative flex min-h-0 flex-1 flex-col">
          {intentsAway ? null : (
            <Splitter
              axis="y"
              value={intentsHeight}
              onChange={(value) => setSize('intents', value)}
              className="inset-x-0 -top-[3px] h-1.5"
            />
          )}
          <EventStream
            events={inView}
            picked={pickedKey}
            onPick={select}
            detail={() => detail}
            className="min-h-0 flex-1"
          />
          {/* A pick with no row of its own: a participant that has written nothing, or a record the
              cursor has not reached. The detail stands under the list so that a pick is never a pick
              that shows nothing. */}
          {docked ? <div className="max-h-[60%] shrink-0 overflow-y-auto border-t">{detail}</div> : null}
        </div>
      )}

      {/* The rail's own edge: the record column is where a long line is read, and how much of the frame it
          takes is the pilot's, so the border between it and the space is the control. */}
      <Splitter axis="x" value={rail} onChange={(value) => setSize('rail', value)} className="inset-y-0 -right-[3px] w-1.5" />
    </aside>
  );
}

registerPanel({
  key: 'rail',
  at: 'left',
  order: 10,
  side: 'left',
  label: 'Intents',
  title: 'the work declared over the record',
  starts: true,
  Icon: PanelLeft,
  View: Intents,
});
