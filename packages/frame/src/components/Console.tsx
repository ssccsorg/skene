import { useEffect, useMemo, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { Button } from './ui/button';
import { Hint } from './ui/hint';
import { keyOf } from '../lib/address';
import { CONTROL } from '../lib/chrome';
import { applyPatch, changesBetween, isEdit, parseState, writeState, type BoardState } from '../lib/state-text';
import { askableNames } from '../lib/kinds';
import { addressesOf } from '../lib/offer';
import { lineOf, workingSet, writerOf } from '../lib/world';
import type { Entry, Place, World } from '../lib/types';
import { cn } from '../lib/utils';
import { useAsks } from '../hooks/useAsks';
import { useTree } from '../hooks/useTree';
import { useEdits } from '../stores/edits';
import { useRecords } from '../stores/records';
import { useScenario } from '../stores/scenario';
import { useSelection } from '../stores/selection';
import { Chat } from './Chat';
import { ChatTabs } from './ChatTabs';

/**
 * The board as a person drives it: what the space is, written out, and the room that answers about it.
 *
 * The text at the top is the board's answer to "what are you now", and it is read rather than typed at: a
 * pilot who wants to move a unit says so in the room, and the panel that draws the space is what turns that
 * into one. The room below is the layer's own channel, so the two edges of the panel are one interface at two
 * resolutions rather than a console and a chat that happen to stand beside each other.
 *
 * The board's own edit path is handed to the room rather than kept here. A line that reads as a directive is
 * applied to the space, because the thing that knows where a unit stands is this panel and not the channel;
 * anything else is a declaration, and a declaration belongs to an agent.
 */
export function Console({
  place,
  world,
  project,
  scene,
  shown,
  total,
  pickedId,
}: {
  place: Place;
  world: World;
  project: string;
  scene: string;
  shown: number;
  total: number;
  pickedId: string | null;
}) {
  const select = useSelection((state) => state.select);
  const selectUnit = useSelection((state) => state.selectUnit);
  const selected = useSelection((state) => state.selected);
  const open = useScenario((state) => state.open);
  const save = useEdits((state) => state.set);
  const seek = useRecords((state) => state.seek);

  // Whether the board read out as text stands at the head of the panel. It is the console's own reading of the space
  // and not a panel of the frame, so it folds here rather than standing in the bar: the control that puts it away is on
  // the row it folds into, which is where a reader looks for it.
  const [raw, setRaw] = useState(true);

  // The last record each unit wrote, read once because two things want it: the text at the head of the panel, and the
  // record a member is picked by when the addressee is chosen from the console rather than on the board.
  const lastOf = useMemo(() => {
    const map = new Map<string, Entry>();
    for (const point of world.records) map.set(writerOf(point.event), point.event);
    return map;
  }, [world.records]);

  const before = useMemo<BoardState>(() => {
    // The same reading the rail and the board make of a unit, so the text and the picture cannot disagree
    // about whether a unit is working.
    const working = workingSet(world.records.map((point) => point.event));
    return {
      project,
      shown,
      total,
      scene,
      picked: pickedId,
      units: world.standing.map((unit) => {
        const last = lastOf.get(unit.id) ?? null;
        const [x, y] = unit.ground;
        return {
          id: unit.id,
          at: [Math.round(x), Math.round(y)] as [number, number],
          state: !last ? 'offline' : working.has(unit.id) ? 'working' : 'idle',
          last: last ? `${last.kind.toUpperCase()} ${lineOf(last)}` : null,
          written: unit.written,
          abilities: unit.abilities,
        };
      }),
    };
  }, [project, shown, total, scene, pickedId, world, place, lastOf]);

  /**
   * Say who the next line is for, which is the same pick the board makes.
   *
   * The addressee is one value on one store, so choosing a member in the console is choosing it on the board and the
   * record the pick carries is the member's own last record: the console hands the member's name over and the pick names
   * it exactly as a press on the board would. The project is the case with no member behind it, and picking nothing is
   * what tells the line to go to the work itself.
   */
  const address = (member: string | null) => {
    if (!member || member === project) select(null);
    else selectUnit(member, lastOf.get(member) ?? null);
  };

  /**
   * Read a line as an edit of the board, and answer what the board did about it, or null when the line is not an edit
   * at all.
   *
   * A line the board does not know is not a directive and falls through to the room, which is the whole of the mapping
   * between the two edges: a `unit` line moves a thing, a sentence about a thing is a question for the agent that owns
   * it, and the panel does not have to guess which the pilot meant, because the text's own shape says so. Whether the
   * text asks the board for anything is the grammar's own answer, so a directive added to the reader is a directive the
   * console acts on without this being told about it.
   */
  const interpret = (text: string): string | null => {
    const patch = parseState(text);
    if (!isEdit(patch)) return null;
    for (const [id, edit] of patch.units) {
      if (edit.at || edit.abilities) save({ unit: id, at: edit.at ?? null, abilities: edit.abilities ?? null });
    }
    if (patch.project && patch.project !== before.project) open(patch.project);
    if (patch.shown !== undefined && patch.shown !== before.shown) seek(patch.shown);
    if (patch.picked !== undefined && patch.picked !== before.picked) {
      if (patch.picked) selectUnit(patch.picked, null);
      else select(null);
    }
    // What the board did about it is answered rather than swallowed, because a console that quietly ignored
    // a line would be a console that lied about what it had done.
    const said = changesBetween(before, applyPatch(before, patch));
    const refused = patch.unknown.map((line) => `? ${line}`);
    return [...said, ...refused].join('\n') || 'nothing changed';
  };

  // Who a line may be said to, which is the space's own answer and not the room's: the project stands for its own files,
  // and every member that can be asked stands for itself. A member can be asked in any of the three directions, because
  // what answers a line is the member's own surface: a machine is asked for work, a camera for a frame, and a device that
  // emits for what it has put on the medium. A person is not asked, because a note is what goes to the people, and a
  // member with no direction is one a pilot can only read. It is the same answer the row of controls is drawn by, so a
  // member offered here is a member whose own reading offers the controls to ask it.
  //
  // Each of them is offered as itself and then as its abilities (`lib/offer`), because an ability is a leaf of the member
  // and naming one is how a line says what to do rather than only where to go. The abilities are the room's answer, so the
  // room is asked about every member the field may name, which is the same answer the members list draws from.
  const names = useMemo(() => askableNames(project, world.standing), [project, world.standing]);
  const { asks, ensure } = useAsks();
  useEffect(() => {
    // The project is the first name and is not a member the room answers about: it stands for its own files and for the
    // work itself, so asking the room what can be asked of it is a question about nothing.
    for (const name of names) if (name !== project) ensure(name);
  }, [ensure, names, project]);

  // What the space holds, walked once per project and kept (`hooks/useTree`). Only a member whose kind says it holds has
  // anything under it, so the walk is over those and not over the space: the rest are members with nothing to read and a
  // request each is what makes a walk cost more than it answers.
  const roots = useMemo(
    () =>
      world.standing
        .filter((unit) => unit.properties.holds)
        .map((unit) => ({ member: unit.id, at: unit.holdsAt })),
    [world.standing],
  );
  const under = useTree(roots);
  const targets = useMemo(() => addressesOf(names, asks, under), [names, asks, under]);
  // What each member answers, by name. It is the same answer the offer is built from, handed over as the map the field
  // opens after a member is named: the second list is the member's own interface, and a skill it offers is one the room
  // answered for that member.
  const skills = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const name of names) out[name] = (asks(name) ?? []).map((each) => each.name);
    return out;
  }, [names, asks]);

  // The work the console is the conversation of: the declaration that is picked, by the address the record gives
  // it. A record that is not a declaration is not a piece of work, so the list stands whole rather than scoped.
  const work = selected?.kind === 'intent' ? keyOf(selected) : null;

  return (
    <div data-region="console" className="flex h-full min-h-0 flex-col border-r">
      {/* The panel's own head is the room's conversations, which is the title it does not need: a row that said
          "console" over a row of conversations names the thing the conversations already are, and costs the row. */}
      <ChatTabs
        project={project}
        work={work}
        lead={
          <Hint label="board text">
            <Button
              size="icon-xs"
              variant="ghost"
              className={cn(CONTROL)}
              data-region="console-raw-toggle"
              data-on={raw}
              onClick={() => setRaw(!raw)}
            >
              <ScrollText />
            </Button>
          </Hint>
        }
      />

      {/* What the board is now. It stands outside the exchange and is recomputed every frame, because it is
          the board's answer to "what are you now" and it changes while the run arrives.

          It yields rather than holds its height. This is a reading of the board and the exchange below it is what the
          console is for, so a short panel is a panel where the reading is what gives way: it was held at half the panel
          and the log was left with whatever was over, which in a short window was a strip one line tall. */}
      {raw ? (
        <div className="flex max-h-[30%] min-h-0 shrink flex-col border-b px-3 py-2">
          <pre
            data-region="console-state"
            className="min-h-0 overflow-y-auto font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-words text-muted-foreground"
          >
            {writeState(before)}
          </pre>
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        <Chat project={project} targets={targets} skills={skills} interpret={interpret} work={work} onAddress={address} />
      </div>
    </div>
  );
}
