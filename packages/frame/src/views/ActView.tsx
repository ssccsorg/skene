import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CausalNeighbours } from '../components/CausalNeighbours';
import { InspectorPanel } from '../components/InspectorPanel';
import { Button } from '../components/ui/button';
import { keyOf } from '../lib/address';
import { causesOf, effectsOf, type Neighbour } from '../lib/causes';
import { ROW } from '../lib/chrome';
import { registerReading } from '../lib/readings';
import type { Entry } from '../lib/types';
import { cn } from '../lib/utils';
import { useRecords } from '../stores/records';
import { useVolume } from '../hooks/useVolume';
import { useScenario } from '../stores/scenario';
import { useSelection } from '../stores/selection';

/**
 * The act that is picked, and what it runs into. The envelope says what the record holds; the two
 * lists say where it sits in the run, one direction each, so the chain can be walked from anywhere in
 * it. A neighbour the frame has not reached is marked rather than hidden, because the run's shape is
 * the record's and not the feed's.
 */
export function ActView() {
  const model = useScenario((state) => state.model);
  const selected = useSelection((state) => state.selected);
  const select = useSelection((state) => state.select);
  const received = useVolume().received;
  const shown = useVolume().shown;
  const seek = useRecords((state) => state.seek);
  const navigate = useNavigate();

  const reached = useMemo(() => {
    const keys = new Set(received.slice(0, shown).map(keyOf));
    return (record: Entry) => keys.has(keyOf(record));
  }, [received, shown]);

  const causes = selected ? causesOf(selected) : [];
  const effects = selected && model ? effectsOf(selected, model.records) : [];
  const picked = selected ? keyOf(selected) : null;
  const here = selected ? received.findIndex((entry) => keyOf(entry) === picked) : -1;

  const choose = (link: Neighbour) => select(link.record);

  // The records this reader reached one from another, so walking a chain is a walk rather than a fall: a press on `led to`
  // replaces the pick, and without the trail the record it left is gone from the panel with no way back to it. Only the
  // selections that changed under this view are kept, and a step taken by the button itself is not pushed again.
  const [trail, setTrail] = useState<Entry[]>([]);
  const watching = useRef<Entry | null>(null);
  const goingBack = useRef(false);
  useEffect(() => {
    if (!selected) return;
    if (goingBack.current) {
      goingBack.current = false;
      watching.current = selected;
      return;
    }
    const previous = watching.current;
    if (previous && keyOf(previous) !== keyOf(selected)) {
      setTrail((held) => [...held, previous].slice(-50));
    }
    watching.current = selected;
  }, [selected]);
  const back = () => {
    const previous = trail.at(-1);
    if (!previous) return;
    goingBack.current = true;
    setTrail((held) => held.slice(0, -1));
    select(previous);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className={cn(ROW, 'gap-2 border-b')}>
        <span className="min-w-0 truncate text-muted-foreground">
          The act that is picked, where it came from and what it led to.
        </span>
        <span className="ml-auto flex items-center gap-1">
          {/* The reading's parent, which is the space a record is read from: a record reached from anywhere in the
              interface can be looked at here and left here, whatever trail brought the reader to it. */}
          <Button size="xs" variant="ghost" title="back to the space" onClick={() => navigate('/space')}>
            <ArrowUp />
            Up
          </Button>
          <Button
            size="xs"
            variant="ghost"
            disabled={!trail.length}
            title="back to the record this one was reached from"
            onClick={back}
          >
            <ArrowLeft />
            Back
          </Button>
          <Button
            size="xs"
            variant="ghost"
            disabled={here === -1}
            title="put the player on this record"
            onClick={() => {
              seek(here + 1);
              navigate('/space');
            }}
          >
          Run from here
          </Button>
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <InspectorPanel selected={selected} />
        <CausalNeighbours
          title="came from"
          links={causes}
          reached={reached}
          empty="the record this act started from is not in the run, or this act started from nothing"
          onPick={choose}
        />
        <CausalNeighbours
          title="led to"
          links={effects}
          reached={reached}
          empty="nothing in this run followed from this record yet"
          onPick={choose}
        />
      </div>
    </div>
  );
}

// The act has an address and no button: it is read by picking a record and pressing the detail's own control, so a bar
// that offered it would offer a reading of nothing until something was picked.
registerReading({ key: 'act', path: '/act', View: ActView });
