import { useMemo } from 'react';
import * as THREE from 'three';
import { capGrid } from '@ssccsorg/skene-frame/lib/board';
import { ring, surface } from '@ssccsorg/skene-frame/lib/board-geometry';

// A field's own ground, as the zone its place takes on the shell: every direction within reach of the field's
// bearing, drawn as a translucent surface with its rim drawn out. The zone of a field the pilot is not inside
// still meets the frame at its own edge, so the fields beside the open one are visible without turning onto
// them, and the turn from one to the next joins two zones instead of leaving a gap.
//
// It is a cap and not a rectangle because it is on a sphere. A field's ground is however far its own members
// reach in every direction, so the zone is the smallest cap that holds them: a box drawn round them claims
// corners the field does not hold, and the corners of five boxes on one sphere are what makes fields overlap.
// The radius is read from the members by `spanOf` at each call, so a field that grows widens its own zone and
// no field's zone reaches into another's.
//
// The surface carries no words. A field is named by its own group mark, and the ground inside it is named by
// the place's own areas, so this layer says only where a field is and what it is doing. It is drawn under
// everything else and writes no depth, because the marks of a field stand on the surface this draws.

export function FieldRegion({
  centre,
  radius,
  tint,
  lit,
}: {
  /** The bearing of the place's own patch on the shell, as a direction from the seat. */
  centre: [number, number, number];
  /** How far the field's own members reach from that bearing, in radians. */
  radius: number;
  /** The colour of the zone, which is the state the field declares it is in. */
  tint: string;
  /** Whether this is the field the pilot is inside, which is the one drawn the stronger. */
  lit: boolean;
}) {
  const geometry = useMemo(() => {
    const grid = capGrid(centre, radius);
    return surface(grid.points, grid.across, grid.up);
  }, [centre, radius]);
  // The rim is the outer ring of the same grid, with its own repeated last point dropped: the seam of the
  // surface is not a point of the edge.
  const rim = useMemo(() => {
    const grid = capGrid(centre, radius);
    return ring(grid.points.slice(grid.up * (grid.across + 1), -1));
  }, [centre, radius]);

  return (
    <group>
      <mesh geometry={geometry} renderOrder={-2}>
        <meshBasicMaterial
          color={tint}
          side={THREE.DoubleSide}
          transparent
          opacity={lit ? 0.1 : 0.045}
          depthWrite={false}
        />
      </mesh>
      <lineSegments geometry={rim} renderOrder={-1}>
        <lineBasicMaterial color={tint} transparent opacity={lit ? 0.32 : 0.15} depthWrite={false} />
      </lineSegments>
    </group>
  );
}
