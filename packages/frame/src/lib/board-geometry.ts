// The board's own geometry: the lines the scene is drawn from, built as buffer attributes rather than
// as elements, because a run of a thousand records is one draw call and not a thousand children.
// Nothing here reads React or the store; it takes points in the scene's own coordinates and hands back
// something three.js can upload.

import * as THREE from 'three';

type Point = [number, number, number];

/**
 * Lines between points that are already in the scene's own coordinates. Colours are per line and go on
 * the vertices, which is what lets one segment to the store carry the colour of the record it comes
 * from.
 */
export function segments(pairs: Point[][], colours?: THREE.Color[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const inks: number[] = [];
  pairs.forEach(([from, to], index) => {
    positions.push(...from, ...to);
    if (!colours) return;
    const colour = colours[index];
    inks.push(colour.r, colour.g, colour.b, colour.r, colour.g, colour.b);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (colours) geometry.setAttribute('color', new THREE.Float32BufferAttribute(inks, 3));
  return geometry;
}

/**
 * A ring through a run of points, closed: each point joined to the next and the last back to the first.
 */
export function ring(points: Point[]): THREE.BufferGeometry {
  return segments(points.map((point, index) => [point, points[(index + 1) % points.length]]));
}

/**
 * A run of points joined end to end and left open, which is what a line that begins at one end and ends at
 * the other is: closing it would draw a segment back across everything between the two ends.
 */
export function line(points: Point[]): THREE.BufferGeometry {
  return segments(points.slice(1).map((point, index) => [points[index], point]));
}

/**
 * The surface a grid of points covers, as triangles. The grid is a run of `across + 1` points by `up + 1`
 * rows in that order, and each cell of it becomes two triangles. It is what a region of a sphere is drawn
 * with: four corners joined by straight edges would cut inside the ground the region stands for.
 */
export function surface(points: Point[], across: number, up: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const at = (x: number, y: number) => points[y * (across + 1) + x];
  for (let x = 0; x < across; x += 1) {
    for (let y = 0; y < up; y += 1) {
      const a = at(x, y);
      const b = at(x + 1, y);
      const c = at(x + 1, y + 1);
      const d = at(x, y + 1);
      positions.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

/**
 * The same surface `surface` builds, with the picture's own coordinates written on its vertices: across runs from
 * nought at the left column to one at the right, and up from nought at the bottom row to one at the top. It is what a
 * window carries, because a medium's bytes are read in their own coordinates and a field's ground has none.
 *
 * It is `surface`'s own triangles in `surface`'s own order, which is what lets a picture and a ground be told apart by
 * their reading rather than by their shape; `tests/view.test.ts` holds the two to the same points.
 */
export function picture(points: Point[], across: number, up: number): THREE.BufferGeometry {
  const geometry = surface(points, across, up);
  const uvs: number[] = [];
  for (let column = 0; column < across; column += 1) {
    for (let row = 0; row < up; row += 1) {
      const left = column / across;
      const right = (column + 1) / across;
      const higher = 1 - row / up;
      const lower = 1 - (row + 1) / up;
      uvs.push(left, higher, right, higher, right, lower);
      uvs.push(left, higher, right, lower, left, lower);
    }
  }
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
}

/**
 * A geometry of segments with the distance along each one written on its vertices, which is what a dashed
 * line material reads. A line segment's dashes restart at each pair, so the attribute is nought at a
 * segment's first vertex and the segment's own length at its second.
 */
export function dashes(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const position = geometry.getAttribute('position');
  const distances: number[] = [];
  for (let index = 0; index + 1 < position.count; index += 2) {
    distances.push(
      0,
      Math.hypot(
        position.getX(index + 1) - position.getX(index),
        position.getY(index + 1) - position.getY(index),
        position.getZ(index + 1) - position.getZ(index),
      ),
    );
  }
  geometry.setAttribute('lineDistance', new THREE.Float32BufferAttribute(distances, 1));
  return geometry;
}

/**
 * The shape a record is drawn as. A point sprite is a square with no texture to tell it otherwise, and a
 * board of records drawn as squares reads as a grid of boxes rather than as light; this is the soft dot
 * they are meant to be. It is made once and handed to every point, and the colour still comes from the
 * record, because the texture is white and a sprite multiplies its map by its colour.
 */
export function dotTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    const middle = size / 2;
    const gradient = context.createRadialGradient(middle, middle, 0, middle, middle, middle);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.85)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(middle, middle, middle, 0, Math.PI * 2);
    context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
