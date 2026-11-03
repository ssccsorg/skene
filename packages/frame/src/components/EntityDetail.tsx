import { useEffect, useState } from 'react';
import { GitBranch, MapPin, RotateCcw, Save } from 'lucide-react';
import { Button } from './ui/button';

import type { Place, Standing } from '@ssccsorg/skene-kernel';
import { useEdits } from '../stores/edits';
import { useSelection } from '../stores/selection';
import { LABEL, TITLE } from '../lib/chrome';
import { cn } from '../lib/utils';
import { Glyph } from './Glyph';

// One participant, opened: what it is, where the place stands it, what the place declares it can be asked to do. The two
// numbers and the abilities are the fields a pilot can change, and saving them is a branch rather than a
// rewrite, so the panel says where the branch is taken and offers to take it here.
//
// The abilities field is the place's declaration and not the interface a member is asked through. What a press can run is
// the member's own answer, drawn as controls under its row in the space and as chips in the list of members
// (`hooks/useAsks`), so what is typed here is what the place states of the member: a name saved here reaches the record and
// the console's text form, and a control appears when the room answers for that name.
//
// The form's own values are the world's, which are the place's until a change is applied and the pilot's
// after that: winding the transport back past the branch brings the place's numbers back into the fields,
// because the fields are a reading of the world and not a second copy of it.
//
// What the participant wrote last is not said here. The record it stands for is the panel's own subject
// and is drawn under these fields, so a line saying it again would be the same record twice in one panel.

/** How the abilities field is read: words separated by commas or spaces, which is how they are written. */
function readAbilities(text: string): string[] {
  return text.split(/[\s,]+/).filter(Boolean);
}

export function EntityDetail({
  unit,
  fork,
  shown,
}: {
  unit: Standing;
  place: Place;
  /** The record the branch is taken at, or null while it is taken from the end of the run. */
  fork: number | null;
  /** How far the run has arrived, which is where a branch taken now would start. */
  shown: number;
}) {
  const save = useEdits((state) => state.set);
  const drop = useEdits((state) => state.drop);
  const branchAt = useEdits((state) => state.branchAt);
  const setMoving = useSelection((state) => state.setMoving);
  const [x, y] = unit.ground;
  const [draftX, setDraftX] = useState(String(Math.round(x)));
  const [draftY, setDraftY] = useState(String(Math.round(y)));
  const [draftAbilities, setDraftAbilities] = useState(unit.abilities.join(', '));

  // The fields follow the world when the world moves under them, which is what winding the transport past
  // the branch does. Typing changes no field of the world, so a keystroke is never overwritten.
  useEffect(() => {
    setDraftX(String(Math.round(x)));
    setDraftY(String(Math.round(y)));
  }, [x, y]);
  useEffect(() => {
    setDraftAbilities(unit.abilities.join(', '));
  }, [unit.abilities]);

  const position: [number, number] = [Number(draftX), Number(draftY)];
  const usable = Number.isFinite(position[0]) && Number.isFinite(position[1]);

  return (
    <div className="flex flex-col gap-2 px-3 py-2 text-[11.5px]">
      <div className="flex items-center gap-2">
        <Glyph icon={unit.icon} role={unit.role} className="text-muted-foreground" />
        <span className={TITLE}>{unit.id}</span>
        {unit.title ? <span className="text-[11.5px] text-muted-foreground">{unit.title}</span> : null}
        <span className="ml-auto text-[11.5px] text-muted-foreground tabular-nums">
          {unit.written ? `${unit.written} written` : 'empty'}
        </span>
      </div>

      <label className="flex items-center gap-2">
        <span className={cn(LABEL, 'w-[74px] shrink-0')}>
          place
        </span>
        <input
          data-region="edit-x"
          value={draftX}
          inputMode="numeric"
          spellCheck={false}
          onChange={(event) => setDraftX(event.target.value)}
          className="w-[64px] rounded-sm border bg-transparent px-1.5 py-0.5 font-mono text-[11.5px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <input
          data-region="edit-y"
          value={draftY}
          inputMode="numeric"
          spellCheck={false}
          onChange={(event) => setDraftY(event.target.value)}
          className="w-[64px] rounded-sm border bg-transparent px-1.5 py-0.5 font-mono text-[11.5px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <span className="text-[11.5px] text-muted-foreground">the place's own numbers</span>
      </label>

      <label className="flex items-center gap-2">
        <span className={cn(LABEL, 'w-[74px] shrink-0')} title="what the place declares of this member; what a press can run is the room's answer">
          abilities
        </span>
        <input
          data-region="edit-abilities"
          value={draftAbilities}
          spellCheck={false}
          placeholder="none"
          onChange={(event) => setDraftAbilities(event.target.value)}
          className="min-w-0 flex-1 rounded-sm border bg-transparent px-1.5 py-0.5 text-[11.5px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </label>

      <div className="flex items-center gap-1.5">
        {/* The place as a thing to choose rather than two numbers to type: the same change, written by the context that
            draws the ground under it. */}
        <Button size="xs" variant="outline" title="choose where it stands on the ground" onClick={() => setMoving(unit.id)}>
          <MapPin />
          Move on the ground
        </Button>
        <Button
          size="xs"
          variant="outline"
          disabled={!usable}
          title="save the change, applied from where the branch is taken"
          onClick={() =>
            save({ unit: unit.id, at: position, abilities: readAbilities(draftAbilities) })
          }
        >
          <Save />
          Save the change
        </Button>
        <Button size="xs" variant="ghost" title="the record has it again" onClick={() => drop(unit.id)}>
          <RotateCcw />
          Revert
        </Button>
        <span className="ml-auto flex items-center gap-1 text-[11.5px] text-muted-foreground">
          <GitBranch className="size-3" />
          from {fork === null ? 'the end of the run' : `record ${fork}`}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          size="xs"
          variant="ghost"
          title="take the branch from where the cursor stands"
          onClick={() => branchAt(shown)}
        >
          branch here, at record {shown}
        </Button>
        {fork !== null ? (
          <Button size="xs" variant="ghost" title="take the branch from the end again" onClick={() => branchAt(null)}>
            from the end
          </Button>
        ) : null}
      </div>
    </div>
  );
}
