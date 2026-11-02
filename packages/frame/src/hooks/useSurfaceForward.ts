import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReadings } from '../lib/readings';
import { useFrame } from '../stores/frame';
import { useScenario } from '../stores/scenario';
import { useSelection } from '../stores/selection';
import { useSurface } from '../stores/surface';

// Send a media item to the shell.
//
// A member's camera is also a way into the room the member is in: pressing its forward control brings the pilot to the
// shell, makes the member the observer the surface is read through, and leaves the layout as it was. The surface is only
// switched on, not reset, so a pilot who was reading a grid finds the entity in a grid.
//
// The pick is the observer because the selection is the space's one answer about which entity is being read. A media
// item whose entity is already picked keeps the record the panel had selected; one from another entity is a new pick and
// the surface follows it.

export function useSurfaceForward(): (origin: string) => void {
  const navigate = useNavigate();
  const projectId = useScenario((state) => state.projectId);
  const selectUnit = useSelection((state) => state.selectUnit);
  const activate = useSurface((state) => state.activate);
  const returnToTogether = useFrame((state) => state.returnToTogether);
  const readings = useReadings();
  const path = readings.find((reading) => reading.seat)?.path ?? '/';

  return useCallback(
    (origin: string) => {
      if (!origin) return;
      const state = useSelection.getState();
      selectUnit(origin, state.unit === origin ? state.selected : null);
      // The map alone hides the shell; the forward is a request for the shell, so it comes back beside the map.
      returnToTogether(projectId);
      activate();
      navigate(path);
    },
    [activate, navigate, path, projectId, returnToTogether, selectUnit],
  );
}
