import { Columns2, Maximize2, Minimize2, Rows2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@ssccsorg/skene-ui';
import { Hint } from '@ssccsorg/skene-ui';
import { useWorld } from '../../hooks/useWorld';
import { CONTROL } from '@ssccsorg/skene-ui';
import { registerInstrument } from '../../lib/instruments';
import { useReadings } from '../../lib/readings';
import { cn } from '@ssccsorg/skene-ui';
import { useFrame, type Split as SplitMode } from '../../stores/frame';
import { useScenario } from '../../stores/scenario';

// The pane, how much of the frame it takes, and how it is drawn, as one run of controls.
//
// A pane is not a page the cockpit goes to but a picture held beside the reading in force, so its button is an
// activation and stands with the arrangements it opens: the two of them side by side, one above the other, and the pane
// taking the frame. Those three are one place read at different sizes. A pane that can be drawn two ways brings the
// controls for that itself (`Reading.controls`), because which ways those are is a fact about the picture and not about
// the frame. Closing the pane is its own button's second press, so that button is the whole of the way back.
//
// The run is its own band, so the bar draws the rule between it and the pictures before it and the frame's own controls
// after it, rather than a pilot reading three unrelated groups as one.

// Closing the pane is the pin's own press, so the arrangements are the three flat ways it can be open. The last of them
// gives the pane the whole frame, which is one press in and the same press out: it answers in the frame's own fullscreen
// words and hands the frame back to the arrangement it was taken from, rather than dropping the pane beside the sphere.
// The arrows are the pane's and not the frame's, because the frame already stands a fullscreen control of its own in this
// bar and two of one glyph would be two buttons a pilot cannot tell apart.
const ARRANGEMENTS: {
  mode: SplitMode;
  title: (on: boolean) => string;
  Icon: (on: boolean) => typeof Columns2;
}[] = [
  { mode: 'vertical', title: () => 'side by side', Icon: () => Columns2 },
  { mode: 'horizontal', title: () => 'stacked', Icon: () => Rows2 },
  { mode: 'full', title: (on) => (on ? 'windowed' : 'fullscreen'), Icon: (on) => (on ? Minimize2 : Maximize2) },
];

function PaneSplit() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const readings = useReadings();
  const pane = readings.find((reading) => reading.pane);
  // The reading the space itself is drawn as. A pane closed from its own address comes back to it rather than leaving
  // the cockpit on a picture the pilot has just closed.
  const space = readings.find((reading) => !reading.pane);
  const projectId = useScenario((state) => state.projectId);
  const mode = useFrame((state) => state.splitOf(projectId));
  const toggle = useFrame((state) => state.toggle);
  const set = useFrame((state) => state.setSplit);
  const toggleFull = useFrame((state) => state.toggleFull);
  const { world, model } = useWorld();
  if (!pane?.button) return <></>;

  // A pane with no picture of this board is a mode the frame does not offer. The question is the pane's own, because
  // what it can draw is a fact about the reading: a map needs a ground, and a sphere of a project's own needs none. The
  // control is absent rather than disabled, since a mode the board does not have is not a mode the bar speaks about.
  const available = pane.can ? pane.can(world, model?.project.place ?? null) : true;
  if (!available) return <></>;

  const button = pane.button;
  const open = mode !== 'globe' || pathname === pane.path;

  return (
    <>
      <Hint label={open ? `close ${button.title}` : button.title}>
        <Button
          variant="ghost"
          size="icon-xs"
          className={cn(CONTROL)}
          data-on={open}
          onClick={() => {
            if (pathname === pane.path) {
              // The pane's own page is the pane on its own, so its own button is the control that puts it away and hands
              // the frame back to the reading in force.
              set(projectId, 'globe');
              navigate(space?.path ?? '/');
            } else toggle(projectId);
          }}
        >
          <button.Icon />
        </Button>
      </Hint>
      {mode === 'globe' ? null : (
        <>
          {pane.controls ? <pane.controls /> : null}
          {ARRANGEMENTS.map((arrangement) => {
            const on = mode === arrangement.mode;
            const Icon = arrangement.Icon(on);
            return (
              <Hint key={arrangement.mode} label={arrangement.title(on)}>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className={cn(CONTROL)}
                  data-on={on}
                  onClick={() =>
                    arrangement.mode === 'full' ? toggleFull(projectId) : set(projectId, arrangement.mode)
                  }
                >
                  <Icon />
                </Button>
              </Hint>
            );
          })}
        </>
      )}
    </>
  );
}

registerInstrument({ key: 'pane-split', order: 40, band: 1, Control: PaneSplit });
