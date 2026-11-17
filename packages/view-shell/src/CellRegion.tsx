import { useMemo } from 'react';
import * as THREE from 'three';
import { cellAt, cellRim } from '@ssccsorg/skene-board';
import { fan, ring } from '@ssccsorg/skene-board';

// A place's own ground, as the cell it holds: the polygon the tiling gave it, drawn as a translucent surface
// with its edge drawn out. It is the ground the place's marks stand on, and it is where the place ends.
//
// A cell is a polygon of the shell and not a cap around a bearing, because a deployment that stands many places in
// one space tiles it: every place holds an edge and no two hold the same direction. A cap is the right shape for a
// place that has the whole shell to itself, which is what `FieldRegion` still draws.
//
// The surface carries no words. A cell is named by the mark that stands on it, and what is inside is named by the
// place's own areas, so this layer says where a place is and no more.

export function CellRegion({
  cell,
  tint,
  lit,
}: {
  /** The cell the place holds, as bearings in radians. */
  cell: [number, number][];
  /** The colour of the zone, which is the state the place declares it is in. */
  tint: string;
  /** Whether this is the place the pilot is inside, which is the one drawn the stronger. */
  lit: boolean;
}) {
  const geometry = useMemo(() => fan(cellAt(cell), cellRim(cell)), [cell]);
  const rim = useMemo(() => ring(cellRim(cell)), [cell]);

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
