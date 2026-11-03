import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { depthFade } from '@ssccsorg/skene-frame/lib/board';

// A project that is not open, as the space holds it: one mark at the place its patch is, drawn in the state
// the project declares and sized by how many members it stands for. It is the summary of everything standing
// in that patch, and it is the mark a pilot presses to go there, so it is drawn at a weight the dim cloud of
// its members never reaches.
//
// It is a hexagon rather than a circle because a circle is what a unit is. A group and a member are two
// readings of the same space, and a reader who cannot tell the two marks apart cannot tell a place from a
// thing in it. Nesting needs no drawing of its own here: a group inside a group is this mark at the inner
// container's place, and the field it is drawn in is the one the container it belongs to has opened.
//
// The mark is turned to the pilot, who stands at the centre, for the same reason a unit's mark is: a mark
// left in the plane it was made in is seen edge-on the further round the pilot turns.

/** The hexagon's width at the smallest group, and how much wider each member makes it. */
const SMALL = 0.016;
const PER_MEMBER = 0.0003;
const WIDEST = 0.026;

export function GroupMark({
  at,
  tint,
  members,
}: {
  at: [number, number, number];
  tint: string;
  /** How many members this group stands for, which is what its size says. */
  members: number;
}) {
  const group = useRef<THREE.Group>(null);
  const fade = depthFade(at);
  const radius = Math.min(SMALL + members * PER_MEMBER, WIDEST);

  useEffect(() => {
    group.current?.lookAt(0, 0, 0);
  }, [at]);

  return (
    <group ref={group} position={at}>
      <mesh>
        <circleGeometry args={[0.011, 20]} />
        <meshBasicMaterial color={tint} side={THREE.DoubleSide} transparent opacity={0.95 * fade} />
      </mesh>
      <mesh>
        <ringGeometry args={[radius, radius + 0.005, 6]} />
        <meshBasicMaterial color={tint} side={THREE.DoubleSide} transparent opacity={0.55 * fade} />
      </mesh>
    </group>
  );
}
