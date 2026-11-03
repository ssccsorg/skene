import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SHELL } from '../lib/board';
import { FRAME_RATE, feedFrames } from '../lib/still';
import { mediumOf, slotsOf, type SurfaceMode } from '../lib/surface';
import type { Camera } from '@ssccsorg/skene-kernel';

// The media the room is read through, painted on the inside of the shell.
//
// The picture is one canvas because the surface is one picture. A medium is drawn into the slot its layout gives it, and
// the canvas becomes the sphere's texture, so the layouts are the only thing that changes between a single medium, a
// left and a right, and a grid. The canvas is uploaded at a reading rate rather than at the source's frame rate, and a
// surface with no footage is drawn once.
//
// A spatial camera is a slot that says it is spatial rather than a flat crop. That is the seam the future renderer takes:
// a 360 projection is not a rectangle on this canvas, and pretending it is would be a wrong picture rather than a
// missing one. The medium's `projection` is the declaration that picks the slot renderer.

/** The canvas the surface is drawn at. Two to one is the sphere's own UV, so a whole-surface medium covers it without a seam. */
const RENDER: [number, number] = [1280, 640];
/** How much of the film is read through: the room is still the interface and the film is behind it. */
const FILM = 0.6;
/** How often the canvas is uploaded while footage is running. The sources are camera feeds, not a high-frame-rate display. */
const STEP = 1 / 24;

/** One medium as the surface holds it, with the element its pixels come from. */
interface Loaded {
  camera: Camera;
  element: HTMLVideoElement | HTMLImageElement | null;
}

export function SphereSurface({ media, mode }: { media: Camera[]; mode: SurfaceMode }) {
  const canvas = useMemo(() => {
    const made = document.createElement('canvas');
    made.width = RENDER[0];
    made.height = RENDER[1];
    return made;
  }, []);
  const texture = useMemo(() => {
    const made = new THREE.CanvasTexture(canvas);
    made.colorSpace = THREE.SRGBColorSpace;
    made.minFilter = THREE.LinearFilter;
    made.magFilter = THREE.LinearFilter;
    return made;
  }, [canvas]);
  useEffect(() => () => texture.dispose(), [texture]);

  const loaded = useRef<Loaded[]>([]);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const drawRef = useRef<(() => void) | null>(null);
  const live = useRef(false);
  const last = useRef(0);

  const draw = useCallback(() => {
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#05080c';
    context.fillRect(0, 0, RENDER[0], RENDER[1]);

    const slots = slotsOf(modeRef.current, loaded.current.length);
    loaded.current.slice(0, slots.length).forEach(({ camera, element }, index) => {
      const slot = slots[index];
      const x = slot.x * RENDER[0];
      const y = slot.y * RENDER[1];
      const w = slot.w * RENDER[0];
      const h = slot.h * RENDER[1];
      if (camera.projection === 'spatial') {
        context.fillStyle = '#0c1218';
        context.fillRect(x, y, w, h);
        context.fillStyle = '#a8b6c8';
        context.font = '18px ui-monospace, SFMono-Regular, Menlo, monospace';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('spatial feed', x + w / 2, y + h / 2 - 12);
        context.fillStyle = '#6f7f90';
        context.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
        context.fillText(camera.id, x + w / 2, y + h / 2 + 12);
        context.textAlign = 'left';
      } else if (element) {
        const width = element instanceof HTMLVideoElement ? element.videoWidth : element.naturalWidth;
        const height = element instanceof HTMLVideoElement ? element.videoHeight : element.naturalHeight;
        if (width && height) {
          // Cover the slot rather than letterboxing it: a surface slot is the room and not a player with a black frame.
          const scale = Math.max(w / width, h / height);
          const sw = w / scale;
          const sh = h / scale;
          context.drawImage(
            element,
            (width - sw) / 2,
            (height - sh) / 2,
            sw,
            sh,
            x,
            y,
            w,
            h,
          );
        }
      }
    });
    // The layout is drawn even where no medium fills a cell. Without the empty cell's own edge, a grid with one camera
    // reads as one picture in a corner rather than as a grid the pilot chose.
    if (modeRef.current !== 'single') {
      // The edge is light because the footage under it is not: a dark seam on a dark feed reads as a compression
      // artifact rather than as the cell the pilot chose.
      context.strokeStyle = 'rgba(200,212,224,.45)';
      context.lineWidth = 1.5;
      for (const slot of slots) {
        context.strokeRect(
          slot.x * RENDER[0] + 1,
          slot.y * RENDER[1] + 1,
          slot.w * RENDER[0] - 2,
          slot.h * RENDER[1] - 2,
        );
      }
    }
    texture.needsUpdate = true;
  }, [canvas, texture]);
  drawRef.current = draw;

  // The elements are made once per set of media, not once per layout: changing from a single medium to a grid redraws
  // the same footage instead of restarting it. The key is the media's own identity, so a new camera or a new source is a
  // new set and anything else is the same picture laid out another way.
  const key = media
    .map((camera) => `${camera.id}:${camera.src}:${camera.medium ?? ''}:${camera.projection ?? ''}`)
    .join('|');
  useEffect(() => {
    const made = media.map((camera): Loaded => {
      if (camera.projection === 'spatial' || mediumOf(camera) === 'image') {
        return { camera, element: null };
      }
      const video = document.createElement('video');
      video.src = camera.src;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      void video.play().catch(() => undefined);
      return { camera, element: video };
    });
    loaded.current = made;
    // A video reports its own frames and the surface reads them at its own rate. A still is asked for
    // (`lib/still`): the surface is drawn when an answer arrives, which is the one thing an image
    // element holding a stream never gives it.
    live.current = made.some(({ element }) => element instanceof HTMLVideoElement);

    const redraw = () => drawRef.current?.();
    const stops = made.map(({ camera, element }, index) => {
      if (element instanceof HTMLVideoElement) {
        element.addEventListener('loadeddata', redraw);
        return () => element.removeEventListener('loadeddata', redraw);
      }
      if (camera.projection === 'spatial') return () => undefined;
      return feedFrames(camera.src, FRAME_RATE, (frame) => {
        made[index].element = frame ? frame.image : null;
        redraw();
      });
    });
    redraw();

    return () => {
      for (const stop of stops) stop();
      for (const { element } of made) {
        if (!(element instanceof HTMLVideoElement)) continue;
        element.pause();
        element.removeAttribute('src');
        element.load();
      }
      loaded.current = [];
      live.current = false;
    };
    // `media` is keyed by `key`: the array is rebuilt by the world on every reading, and the key is what says whether it
    // is the same set of media.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // A layout change is a redraw of the same elements, and so is the first draw after a new set has been made.
  useEffect(() => {
    last.current = 0;
    drawRef.current?.();
  }, [mode, key]);

  useFrame((state) => {
    if (!live.current) return;
    if (state.clock.elapsedTime - last.current < STEP) return;
    last.current = state.clock.elapsedTime;
    drawRef.current?.();
  });

  return (
    <mesh scale={SHELL * 1.002} renderOrder={-3}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        toneMapped={false}
        transparent
        opacity={FILM}
        depthWrite={false}
      />
    </mesh>
  );
}
