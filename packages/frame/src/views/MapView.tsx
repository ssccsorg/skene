// The place read as a map, with every unit whose kind presents its location on it.
//
// This is a reading of the space and not a member's own attribute: the shell answers where a unit is relative to the
// pilot, and this answers where the placed units are on the ground the place declares. What stands on the ground is the
// member's own property (`located`): a workspace, an agent with no body, and the blackboard the records are read from
// are outside it, so this map shows the machines and not the place's bookkeeping.
//
// The map opens on the whole place because that is the question this reading asks. A member's own map follows that
// member; this one holds the yard. Pressing a unit is the same pick as pressing its mark on the shell, so the rail, the
// console and the board cannot end up pointing at two different things.

import { MapPin } from 'lucide-react';
import { EarthMap } from '../components/GroundMap';
import { registerReading, type Board } from '../lib/readings';
import { mappable } from '../lib/world';
import { useFrame } from '../stores/frame';
import { useScenario } from '../stores/scenario';

function MapReading({ world, place, pickedId, onPick }: Board) {
  const projectId = useScenario((state) => state.projectId);
  const orbit = useFrame((state) => state.orbitOf(projectId));
  const tone = useFrame((state) => state.tone);
  if (!world || !place) return null;
  // A place that offers no map is said so at the address as well as at the button, because a link can reach a reading
  // the bar has disabled and a plane of bookkeeping would be a picture the place never declared.
  if (!mappable(place, world)) {
    return (
      <div
        data-region="map-unavailable"
        className="flex h-full items-center justify-center p-6 text-center text-[11.5px] text-muted-foreground"
      >
        this place declares no ground and no member with a location
      </div>
    );
  }
  const key = place.geo?.bounds.join(',') ?? place.view.join(',');
  return (
    <EarthMap
      key={`${key}:${orbit ? 'orbit' : 'flat'}`}
      world={world}
      place={place}
      pickedId={pickedId}
      onPick={onPick}
      orbit={orbit}
      tone={tone}
    />
  );
}

export const MAP = registerReading({
  key: 'map',
  path: '/map',
  View: MapReading,
  pane: true,
  button: { order: 14, title: 'map', Icon: MapPin },
});
