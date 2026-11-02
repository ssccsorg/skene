import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { depthFade, framedCells, patchGrid, patchOf, patchRim, shellAt, type Bearing } from '../lib/board';
import { picture, ring } from '../lib/board-geometry';
import { leaderPath } from '../lib/views';

// A window's picture painted on the shell: the patch of surface it stands on, the rim that says where it ends, and the
// line back to the entity that carries it.
//
// The surface is the same for every kind of window, which is the point of this file, and it is one mapping: the picture's
// columns are the room's meridians and its rows are the room's parallels, so a window's frame is made of the lines the
// graticule is drawn with and the picture bends with the room under it (`patchAt`, and the test that anchors it). A video
// and a map differ in where their pixels come from, and in nothing about where they stand: both are decals of the room,
// curving with it and foreshortening as the pilot turns away, so both are drawn by this one geometry. What the caller
// brings is a texture.
//
// It is a patch of the surface and not a plane through it. A plane at the window's own place and turned to face the
// pilot is exact at its middle and comes off the shell at its own corners, which nobody sees at one cell and which is
// three and a half percent of the shell's radius at three: sized up, a plane reads as a card held in front of the
// room, and every point of a patch is on the room's own surface.
//
// The line back to the entity is three's own `Line` held in a ref and rewritten in place, because the points are what
// change and the buffers are not. A dashed line would read as a construction line, which is what a drawing uses for
// something that is not there; this is one thing standing on the shell.

/** The ink the line back to an entity is drawn in: the picture's own edge ink, at the weight a leader is read at. */
const LEAD_INK = '#c3ccdc';
/** How far the line back to the entity is held off the surface, so it is read over the shell and not in it. */
const OFF_SHELL = 1.001;
/** How far the line round the picture is held off the surface, for the same reason and by less of it. */
const PICTURE_EDGE = 1.0005;
/** How many steps each of the line's two runs is drawn at. */
const LEAD_STEPS = 20;

export function ShellPatch({
  bearing,
  cells,
  lead,
  hidden,
  texture,
  medium,
  order,
}: {
  /** The bearing the window stands at on the shell, which is where its own patch of the surface is centred. */
  bearing: Bearing;
  /** How large the patch is, in cells of the graticule. */
  cells: Bearing;
  /** The two bearings of the line back to the entity: the window's pin and the entity. */
  lead: [Bearing, Bearing] | null;
  /** Whether the pilot has put the window away. The picture itself keeps running. */
  hidden: boolean;
  /** What is painted on the patch, which is the caller's medium. */
  texture: THREE.Texture;
  /**
   * The shape of the medium, width over height, or nothing while it is not known yet.
   *
   * A patch is whatever shape the pilot made it and a medium has its own, so the texture is cropped to fill the patch
   * rather than stretched to it: the rule the panel's own thumbnail and the shell surface already follow.
   */
  medium?: number;
  /** The pilot's stack, so the pictures are drawn in the order their controls are stacked in. */
  order: number;
}) {
  const at = useMemo(() => shellAt(bearing), [bearing]);
  const fade = depthFade(at);

  // The picture is its own patch of the shell, in the shell's own coordinates, so nothing here is turned or placed: a
  // patch is already where it stands and already the shape the room is. The cuts are the picture's own resolution, so a
  // patch that is sized up is cut more finely and its own curve stays a curve.
  // The frame is the pilot's shape and the picture inside it is the medium's, so the window is a
  // frame that scales its contents rather than one that crops them. The rim follows the frame and
  // the patch is the span the medium fills.
  const elevation = bearing[1];
  const frame = useMemo(() => patchOf(bearing, cells), [bearing, cells]);
  const shown = useMemo(
    () => patchOf(bearing, framedCells(cells, elevation, medium)),
    [bearing, cells, elevation, medium],
  );
  const surface = useMemo(
    () => picture(patchGrid(shown), shown.quads[0], shown.quads[1]),
    [shown],
  );
  useEffect(() => () => surface.dispose(), [surface]);
  // The patch already has the medium's shape, so the texture is shown whole: no crop is left to do.
  useEffect(() => {
    texture.repeat.set(1, 1);
    texture.offset.set(0, 0);
  }, [texture]);
  const rim = useMemo(
    () =>
      ring(
        patchRim(frame).map(
          (point) => point.map((edge) => edge * PICTURE_EDGE) as [number, number, number],
        ),
      ),
    [frame],
  );
  useEffect(() => () => rim.dispose(), [rim]);

  // The line back to the entity whose window this is: the pin's own bearing across the parallel to the entity's
  // meridian, and then down that meridian to the entity. Its geometry is made once and its points are written into it in
  // place, because the points are what change and the buffers are not.
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array((LEAD_STEPS * 2 + 1) * 3), 3),
    );
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(LEAD_INK),
      transparent: true,
      opacity: 0.6,
    });
    const made = new THREE.Line(geometry, material);
    made.visible = false;
    // Its own bounds are written by hand and are not read here: a line whose points have just moved would be culled
    // against where it was.
    made.frustumCulled = false;
    return made;
  }, []);
  useEffect(
    () => () => {
      line.geometry.dispose();
      line.material.dispose();
    },
    [line],
  );
  // The pair the line was last written for, so that a frame that changed nothing about it writes nothing.
  const wrote = useRef<string>('');
  useEffect(() => {
    if (!lead) {
      line.visible = false;
      wrote.current = '';
      return;
    }
    const key = `${lead[0][0]},${lead[0][1]},${lead[1][0]},${lead[1][1]}`;
    if (key === wrote.current) return;
    const points = leaderPath(lead[0], lead[1], LEAD_STEPS);
    const positions = line.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let index = 0; index < points.length; index += 1) {
      positions.setXYZ(index, points[index][0] * OFF_SHELL, points[index][1] * OFF_SHELL, points[index][2] * OFF_SHELL);
    }
    positions.needsUpdate = true;
    line.visible = true;
    wrote.current = key;
  }, [lead, line]);

  useEffect(() => {
    line.renderOrder = order;
  }, [line, order]);

  return (
    <group visible={!hidden}>
      <mesh geometry={surface} renderOrder={order}>
        <meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} transparent opacity={fade} />
      </mesh>
      <lineSegments geometry={rim} renderOrder={order + 0.5}>
        <lineBasicMaterial color={LEAD_INK} transparent opacity={0.26 * fade} depthWrite={false} />
      </lineSegments>
      <primitive object={line} />
    </group>
  );
}
