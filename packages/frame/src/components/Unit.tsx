import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { depthFade } from '../lib/board';

// A unit on the board: a small bright point in the colour of the last record it wrote, and, for the kinds the space has a
// body for, that body drawn from primitives rather than a point. What a unit is, the name beside it says: the space holds
// a few dozen of them, and a mark per thing is what keeps that number readable. A unit that has written nothing keeps a
// dim body, which is a different reading from a unit that is not there.
//
// There is no halo under the point. There was, and it was drawn at six times the point's own width, which
// made every unit a soft circle two centimetres across that read as a thing with no name rather than as a
// unit: a mark that is larger than the word beside it is a mark that is asking to be read as something.
//
// What is left is a line rather than a disc. The pulse is a thin ring at the point's own edge, so it draws the
// outline of a breath and never a filled circle: a wide ring filled in by its own thickness reads as a second
// mark beside the first, which is the thing the halo was removed for.
//
// The mark faces the pilot, who stands at the space's centre: a mark left in the plane it was made in is
// an ellipse seen from the side the further round the pilot turns, which is a mark read as a sticker
// rather than as a thing standing in a room. It is also drawn by how far away it is, because distance is
// what tells two marks of the same size apart.
//
// The motion is done on the mesh rather than through React. A position or a scale kept in state would
// re-render the tree every frame, which is the one way a three-dimensional board falls apart.

/** A number from a unit's own name, so two units of the same kind do not beat in step. */
function phaseOf(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) % 997;
  return (hash / 997) * Math.PI * 2;
}

/**
 * A unit's body, for the two machines this interface carries a shape for.
 *
 * A body is a claim about the machine, and only the project knows what its own machine is, so the project names the shape
 * and this file ships it: a device the space has no shape for is a point. The shapes are primitives rather than loaded
 * meshes, because at the board's scale the silhouette is all that reads, and a slight one keeps two devices from covering
 * the ground they stand on.
 */
function Device({ model, tint, opacity }: { model: string; tint: string; opacity: number }) {
  // The body carries its own light. A standard material lit only by the room's lamp reads black at the board's scale,
  // where the point it replaced was a flat colour that read at any distance.
  const ink = {
    color: tint,
    emissive: tint,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity,
    metalness: 0.4,
    roughness: 0.5,
  } as const;
  if (model === 'hexapod') {
    return (
      <group scale={1.1} rotation={[-0.35, 0, 0]}>
        <mesh>
          <sphereGeometry args={[0.012, 12, 8]} />
          <meshStandardMaterial {...ink} />
        </mesh>
        {[-1, 1].map((side) =>
          [0, 1, 2].map((leg) => (
            <mesh
              key={`${side}:${leg}`}
              position={[side * 0.014, -0.006 + leg * 0.006, 0]}
              rotation={[0, 0, side * (0.9 - leg * 0.2)]}
            >
              <cylinderGeometry args={[0.0016, 0.0016, 0.022, 6]} />
              <meshStandardMaterial {...ink} />
            </mesh>
          )),
        )}
      </group>
    );
  }
  if (model === 'drone') {
    return (
      <group scale={1.1} rotation={[-0.35, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.018, 0.006, 0.012]} />
          <meshStandardMaterial {...ink} />
        </mesh>
        {[['-1', '-1'], ['1', '-1'], ['-1', '1'], ['1', '1']].map(([x, y]) => (
          <mesh
            key={`${x}${y}`}
            position={[Number(x) * 0.014, Number(y) * 0.014, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.009, 0.009, 0.0015, 12]} />
            <meshStandardMaterial {...ink} opacity={opacity * 0.6} />
          </mesh>
        ))}
      </group>
    );
  }
  return null;
}

/** The shapes this interface ships. A project name outside the set is a unit with no body, which is a point. */
const BODIES = new Set(['hexapod', 'drone']);

export function Unit({
  id,
  at,
  model,
  tint,
  working,
  ringed,
  written,
  orbit,
  still = false,
}: {
  id: string;
  at: [number, number, number];
  /** The body the project names for this unit, or nothing when the unit is a point. */
  model?: string | null;
  tint: string;
  working: boolean;
  ringed: boolean;
  written: boolean;
  /**
   * The radius of the orbit ring, for a unit standing above the shell.
   *
   * The lift itself is depth from the seat, which a frame pointed at the mark cannot show, so the altitude is read as the
   * width of this ring: a higher orbit draws a wider one. Absent for a unit on the ground.
   */
  orbit?: number;
  /**
   * Whether the mark stands where the record says at once.
   *
   * A unit glides from where it was drawn to where it now stands, because a step in the record is a movement the pilot
   * watches. The middle of a place is not a movement: it is the point the place is read from, and a project's board is
   * already there when the pilot arrives, so a board that glided would read as a thing carried in from the project
   * before this one.
   */
  still?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const phase = phaseOf(id);
  const fade = depthFade(at);
  // Where the unit is being drawn and where the record says it stands. A move is a step in the record, and the mark
  // glides to it rather than jumping: the space is where a reader watches the round happen, and a jump reads as a redraw.
  const drawn = useRef(new THREE.Vector3(...at));
  const aim = useRef(new THREE.Vector3(...at));

  // The pilot is at the space's centre and the camera never leaves it, so a mark is turned to the pilot
  // once and not every frame. Doing it per frame would be a rotation recomputed sixty times a second to
  // arrive at the same answer.
  useEffect(() => {
    group.current?.lookAt(0, 0, 0);
  }, [at]);

  useEffect(() => {
    aim.current.set(at[0], at[1], at[2]);
  }, [at]);

  useFrame((state, delta) => {
    // The glide is frame-rate independent: the fraction of the remaining distance is closed per second, so a slow
    // frame and a fast one arrive at the same place rather than one of them overshooting.
    if (group.current) {
      if (still) drawn.current.copy(aim.current);
      else drawn.current.lerp(aim.current, 1 - Math.exp(-9 * delta));
      if (drawn.current.distanceToSquared(aim.current) < 1e-10) drawn.current.copy(aim.current);
      group.current.position.copy(drawn.current);
    }
    const time = state.clock.elapsedTime;
    // The ring marks the unit that is being read, and it is drawn around the point rather than by making
    // the point bigger: a mark that grows to twice its neighbours is a circle with no name, which is what
    // a reader asks about. The beat is a breath of the ring, so a unit at work is moving without moving.
    const beat = working ? 1 + 0.18 * Math.sin(time * 2.2 + phase) : 1;
    if (ring.current) {
      const material = ring.current.material as THREE.MeshBasicMaterial;
      ring.current.visible = ringed;
      material.opacity = 0.85 * fade * beat;
    }
    const material = pulse.current?.material as THREE.MeshBasicMaterial | undefined;
    if (pulse.current && material) {
      const cycle = (time * 0.6 + phase) % 1;
      pulse.current.scale.setScalar(1 + cycle * 2.2);
      pulse.current.visible = working;
      material.opacity = 0.3 * fade * (1 - cycle);
    }
  });

  return (
    <group ref={group} position={at}>
      {model && BODIES.has(model) ? (
        <Device model={model} tint={tint} opacity={(written ? 0.95 : 0.3) * fade} />
      ) : (
        <mesh>
          <circleGeometry args={[0.02, 24]} />
          <meshBasicMaterial
            color={tint}
            side={THREE.DoubleSide}
            transparent
            opacity={(written ? 0.95 : 0.3) * fade}
          />
        </mesh>
      )}
      {orbit ? (
        <mesh>
          <ringGeometry args={[orbit, orbit + 0.0035, 64]} />
          <meshBasicMaterial color={tint} side={THREE.DoubleSide} transparent opacity={0.65 * fade} />
        </mesh>
      ) : null}
      <mesh ref={ring} visible={false}>
        <ringGeometry args={[0.026, 0.032, 32]} />
        <meshBasicMaterial color={tint} side={THREE.DoubleSide} transparent opacity={0} />
      </mesh>
      <mesh ref={pulse}>
        <ringGeometry args={[0.027, 0.03, 32]} />
        <meshBasicMaterial color={tint} side={THREE.DoubleSide} transparent opacity={0} />
      </mesh>
    </group>
  );
}
