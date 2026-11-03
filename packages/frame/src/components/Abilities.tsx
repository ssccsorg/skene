import { useEffect, useRef, useState, type ReactNode } from 'react';
import { COMMAND_MARK } from '../lib/channel';
import { useAsks } from '../hooks/useAsks';
import { CONSOLE, useCapability } from '../lib/capabilities';
import { drawnAbilities } from '../lib/interface';
import type { PartProps } from '../lib/kinds';
import { useChat } from '../stores/chat';
import { useSelection } from '../stores/selection';
import { Row } from './Row';

/**
 * The member's own interface: what it can be asked, drawn as the controls that ask it.
 *
 * What is drawn is the member's own answer and not the place's declaration of it, which is the difference this row turns
 * on: the declaration names what a member is for, and only the member's side knows whether a line to that name would run.
 * So the row is a request to the room (`hooks/useAsks`), and a room that answers nothing leaves no row rather than
 * controls whose every press is refused. What a pilot has then is the field, which is where every line is written. The
 * reading is the frame's one (`lib/interface`), which is also what the list of members filters on, so a member the list
 * finds by an ability is a member this row offers a control for and neither can withhold what the other offers.
 *
 * The row is the member's and not a direction's, so it is drawn once. Which atom draws it is the first direction the
 * member has, in the frame's own order (`askable`), which is why the three direction atoms each ask rather than testing
 * for their own: a machine that reads and can be given work would otherwise draw its abilities twice, and the frame's
 * order is the only thing that decides which of the two it is. The names a line may be said to are the same member's, so a
 * member with a row here is a member the menu offers, and the two cannot disagree about who a line goes to.
 *
 * A press composes a line and does not send one. The console is where a line is said, so a press hands it the words and the
 * addressee and opens it, and what the member calls the command is what the line carries: the name is the member's own, so
 * a line composed here is a line the member recognises.
 *
 * What the mark cannot be is a substitute for the surface. The mark promises that the line is run where the work is and no
 * model is called, which is why the control says a command and not a turn, and a room with no path to the member answers
 * nothing here rather than letting the row promise a cost the line cannot carry.
 *
 * This is the atom's own reading in another sense: a member whose kind it is not to be asked never reaches here, and a
 * person does not either, because the reading knows that a person states work rather than being given it.
 */
export function Abilities({ member }: Pick<PartProps, 'member'>) {
  const compose = useChat((state) => state.compose);
  const { asks, ensure } = useAsks();
  useEffect(() => {
    ensure(member.id);
  }, [ensure, member.id]);

  const found = drawnAbilities(member, asks(member.id));
  const console = useCapability(CONSOLE);
  const [expanded, setExpanded] = useState(false);
  const line = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const names = found.map((asked) => asked.name).join('|');

  // The row gives one line to the abilities and the fold to the rest. The measurement is the line itself, so a narrow
  // panel shows fewer chips and a wide one shows more without a count taking the place of the names.
  useEffect(() => {
    const element = line.current;
    if (!element) return undefined;
    const read = () => setMore(element.scrollWidth > element.clientWidth + 1);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => observer.disconnect();
  }, [names]);

  // Nothing until the room has answered, and nothing where it answered nothing: a control drawn from a declaration would
  // be a control that promised a command the member never said it could run. What draws as nothing is the reading's own
  // rule rather than this row's, so the two places cannot come apart about it.
  //
  // Nothing either where the project has no console: a press composes a line into one, so the row is drawn where the line
  // has somewhere to go.
  if (!found.length || !console) return null;

  const chip = (asked: (typeof found)[number]): ReactNode => (
    <button
      key={asked.name}
      type="button"
      title={asked.does ? `run the ${asked.name} command on ${member.id}: ${asked.does}` : `run the ${asked.name} command on ${member.id}`}
      onClick={() => {
        compose(member.id, askLine(asked.name));
        useSelection.getState().setOpen('console', true);
      }}
      className="shrink-0 rounded-sm border border-border px-1 py-px text-[11.5px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
    >
      {asked.name}
    </button>
  );
  const lineChips = <div className="flex w-max flex-nowrap items-center gap-1">{found.map(chip)}</div>;
  const allChips = <div className="flex flex-wrap items-center gap-1">{found.map(chip)}</div>;

  return (
    <div data-region="abilities" className="px-3 py-1.5">
      <Row
        label="Ability"
        fold="right"
        expanded={expanded}
        onExpandedChange={setExpanded}
        value={
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <div
              ref={line}
              data-region="ability-line"
              className="flex min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-hidden"
            >
              {lineChips}
            </div>
            {more ? (
              <button
                type="button"
                className="shrink-0 text-[11.5px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? 'less' : 'more'}
              </button>
            ) : null}
          </div>
        }
        content={more ? <div className="pt-1">{allChips}</div> : undefined}
      />
    </div>
  );
}

/** The line a press composes: the member's own command, under the mark that promises it runs where the work is. */
export function askLine(ability: string): string {
  return `${COMMAND_MARK}${ability}`;
}
