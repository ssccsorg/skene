import { Columns2, Maximize2, Moon, Orbit, Rows2, Sun } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Hint } from '../ui/hint';
import { useWorld } from '../../hooks/useWorld';
import { CONTROL } from '../../lib/chrome';
import { registerInstrument } from '../../lib/instruments';
import { useReadings } from '../../lib/readings';
import { cn } from '../../lib/utils';
import { mappable } from '../../lib/world';
import { useFrame, type MapSplit as Split } from '../../stores/frame';
import { useScenario } from '../../stores/scenario';

// The map, how much of the frame it takes, and how it is drawn, as one run of controls.
//
// The map is a pane beside the reading in force rather than another page the cockpit goes to, so its button is an
// activation and stands with the arrangements it opens: the globe and the map side by side, the globe above the map, and
// the map taking the frame. Those three are one place read at different sizes. The orbit is a toggle over that map: the
// same ground drawn on the earth itself, which is the view a mission above it is briefed from. It is a projection and
// not an arrangement, so pressing it leaves the frame's own shape alone. Closing the pane is the pin's own press, so the
// pin is the whole of the way back.
//
// The run is its own band, so the bar draws the rule between it and the globe's controls before it and the frame's own
// controls after it, rather than a pilot reading three unrelated groups as one.

// Closing the pane is the pin's own press, so the arrangements are the three flat ways it can be open. A second globe
// here would be the same state under a second icon, which is what the pin already says.
const ARRANGEMENTS: { mode: Split; title: string; Icon: typeof Columns2 }[] = [
  { mode: 'vertical', title: 'side by side', Icon: Columns2 },
  { mode: 'horizontal', title: 'stacked', Icon: Rows2 },
  { mode: 'full', title: 'map only', Icon: Maximize2 },
];

function MapSplit() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const readings = useReadings();
  const pane = readings.find((reading) => reading.pane);
  // The reading the space itself is drawn as. A pane closed from its own address comes back to it rather than leaving
  // the cockpit on a map the pilot has just closed.
  const space = readings.find((reading) => !reading.pane);
  const projectId = useScenario((state) => state.projectId);
  const mode = useFrame((state) => state.splitOf(projectId));
  const orbit = useFrame((state) => state.orbitOf(projectId));
  const tone = useFrame((state) => state.tone);
  const toggle = useFrame((state) => state.toggle);
  const set = useFrame((state) => state.setSplit);
  const toggleOrbit = useFrame((state) => state.toggleOrbit);
  const toggleTone = useFrame((state) => state.toggleTone);
  const { world, model } = useWorld();
  if (!pane?.button) return <></>;

  // A place without a ground or without a member that presents a location has nothing to draw, so the map is a mode it
  // does not offer. The control is absent rather than disabled: a mode a place does not have is not a mode the bar says
  // anything about, the same way a project's own views are absent from the bar until it declares them.
  const available = mappable(model?.project.place ?? null, world);
  if (!available) return <></>;

  const open = mode !== 'globe' || pathname === pane.path;

  return (
    <>
      <Hint label={open ? 'close map' : pane.button.title}>
        <Button
          variant="ghost"
          size="icon-xs"
          className={cn(CONTROL)}
          data-on={open}
          onClick={() => {
            if (pathname === pane.path) {
              // The map's own page is the map on its own, so its pin is the control that puts it away and hands the
              // frame back to the sphere.
              set(projectId, 'globe');
              navigate(space?.path ?? '/');
            } else toggle(projectId);
          }}
        >
          <pane.button.Icon />
        </Button>
      </Hint>
      {mode === 'globe' ? null : (
        <>
          <Hint label="orbit">
            <Button
              variant="ghost"
              size="icon-xs"
              className={cn(CONTROL)}
              data-on={orbit}
              onClick={() => toggleOrbit(projectId)}
            >
              <Orbit />
            </Button>
          </Hint>
          {ARRANGEMENTS.map((arrangement) => (
            <Hint key={arrangement.mode} label={arrangement.title}>
              <Button
                variant="ghost"
                size="icon-xs"
                className={cn(CONTROL)}
                data-on={mode === arrangement.mode}
                onClick={() => set(projectId, arrangement.mode)}
              >
                <arrangement.Icon />
              </Button>
            </Hint>
          ))}
          <Hint label="map theme">
            <Button
              variant="ghost"
              size="icon-xs"
              className={cn(CONTROL)}
              data-on={tone === 'dark'}
              onClick={toggleTone}
            >
              {tone === 'dark' ? <Moon /> : <Sun />}
            </Button>
          </Hint>
        </>
      )}
    </>
  );
}

registerInstrument({ key: 'map-split', order: 40, band: 1, Control: MapSplit });
