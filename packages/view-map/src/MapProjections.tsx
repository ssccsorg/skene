import { Moon, Orbit, Sun } from 'lucide-react';
import { Button } from '@ssccsorg/skene-ui';
import { Hint } from '@ssccsorg/skene-ui';
import { CONTROL } from '@ssccsorg/skene-ui';
import { cn } from '@ssccsorg/skene-ui';
import { useFrame } from '@ssccsorg/skene-frame/stores/frame';
import { useScenario } from '@ssccsorg/skene-frame/stores/scenario';

// How the map is drawn, as the pane's own two controls.
//
// The orbit is the same ground on the earth itself rather than on a flat page, which is the view a mission above it is
// briefed from, and the tone is the page's dark ground or the tiles' own colour. Both are projections of this picture and
// not arrangements of the frame, so they change what the map draws and never how much of the frame it takes.
//
// They are here rather than in the bar because a reading that can be drawn two ways brings the controls for it: the frame
// draws them beside the arrangements, and a pane that is not a map brings none.

export function MapProjections() {
  const projectId = useScenario((state) => state.projectId);
  const orbit = useFrame((state) => state.orbitOf(projectId));
  const tone = useFrame((state) => state.tone);
  const toggleOrbit = useFrame((state) => state.toggleOrbit);
  const toggleTone = useFrame((state) => state.toggleTone);
  return (
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
  );
}
