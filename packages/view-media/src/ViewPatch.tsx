import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { Bearing } from '@ssccsorg/skene-board';
import { FRAME_RATE, feedFrames } from './still';
import type { Camera } from '@ssccsorg/skene-kernel';
import { useViews } from '@ssccsorg/skene-frame/stores/views';
import { ShellPatch } from '@ssccsorg/skene-frame/components/ShellPatch';

// A window is a scale of the picture, and not the size the picture is rendered at. The medium is
// drawn at its own resolution and the patch samples that through a mip chain, so a window made
// smaller reads a smaller sample of the same picture rather than a second, coarser render of it.
//
// A window's picture, painted on the shell by the one patch every window kind stands on.
//
// A still is the medium a device's camera is: the address is asked again on a clock and the answer is
// the texture's next picture (`lib/still`). An image element pointed at a stream is the version that
// did not work, because a browser keeps the frame it decoded and never says another arrived.
//
// A video is the other medium, and it is told by the element when a frame has arrived, so a picture
// nothing new has come to is a picture nothing is uploaded for.
//
// A picture is also the only thing that knows whether its own medium is running, so it says so
// (`stores/views.ts`): the page draws the icon a window becomes when the pilot cannot see its picture,
// and an icon for a medium that is running says that there is something to see if they turn. That is
// why a folded window keeps its picture mounted and draws nothing of it: what is running is the
// camera's own watching, and a picture unmounted the moment it was put away would take the one reading
// of it with it.

export function ViewPatch({
  camera,
  bearing,
  cells,
  lead,
  hidden,
  order,
}: {
  camera: Camera;
  /** The bearing the window stands at on the shell, which is where its own patch of the surface is centred. */
  bearing: Bearing;
  /** How large the patch is, in cells of the graticule. */
  cells: Bearing;
  /** The two bearings of the line back to the entity the camera is carried by: the window's pin and the entity. */
  lead: [Bearing, Bearing] | null;
  /** Whether the pilot has put the picture away. The medium carries on. */
  hidden: boolean;
  /** The pilot's stack, which is the order the picture is drawn in. */
  order: number;
}) {
  const still = camera.medium === 'image';
  // What the sampler may spend on a picture that is not drawn at its own size. A patch is often a
  // fraction of the medium's pixels, and this is the one number that says how well that reads.
  const mostAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const say = useViews((state) => state.setRunning);

  const video = useMemo(() => {
    if (still) return null;
    const made = document.createElement('video');
    made.src = camera.src;
    made.muted = true;
    made.loop = true;
    made.playsInline = true;
    void made.play().catch(() => undefined);
    return made;
  }, [camera.src, still]);

  const texture = useMemo(() => {
    const made = video ? new THREE.VideoTexture(video) : new THREE.Texture();
    made.colorSpace = THREE.SRGBColorSpace;
    made.magFilter = THREE.LinearFilter;
    if (video) {
      made.minFilter = THREE.LinearFilter;
    } else {
      // The chain is what turns a downscale into a resize: without it a picture smaller than its own
      // resolution samples one texel and aliases. A video cannot afford a chain a frame.
      made.generateMipmaps = true;
      made.minFilter = THREE.LinearMipmapLinearFilter;
      made.anisotropy = Math.min(8, mostAnisotropy);
    }
    return made;
  }, [video, mostAnisotropy]);
  useEffect(() => () => texture.dispose(), [texture]);

  // The shape of the picture, which is what the patch is filled with and not stretched to. A picture
  // whose shape is not known yet is drawn on the patch as it is.
  const [aspect, setAspect] = useState<number | null>(null);
  const shaped = (width: number, height: number) => {
    if (!width || !height) return;
    const next = width / height;
    setAspect((was) => (was === next ? was : next));
  };

  // A still is asked for, and each answer is the frame the texture takes. An address that stops
  // answering is a picture that says it is not running rather than one that keeps its last frame and
  // reads as a live window.
  useEffect(() => {
    if (!still) return;
    const stop = feedFrames(camera.src, FRAME_RATE, (frame) => {
      if (!frame) {
        say(camera.id, false);
        return;
      }
      texture.image = frame.image;
      texture.needsUpdate = true;
      shaped(frame.width, frame.height);
      say(camera.id, true);
    });
    return () => {
      stop();
      say(camera.id, false);
    };
  }, [camera.id, camera.src, still, texture, say]);

  // A video reports its own frame and its own shape, and a picture that failed or stopped is one
  // there is nothing to see in. The reading on the way in is taken as well as listened for, because
  // a medium that was already running when this mounted has nothing left to announce.
  useEffect(() => {
    if (!video) return;
    const read = () => shaped(video.videoWidth, video.videoHeight);
    const started = () => say(camera.id, true);
    const stopped = () => say(camera.id, false);
    video.addEventListener('loadedmetadata', read);
    video.addEventListener('playing', started);
    video.addEventListener('pause', stopped);
    video.addEventListener('ended', stopped);
    video.addEventListener('error', stopped);
    read();
    say(camera.id, video.readyState >= 2 && !video.paused);
    return () => {
      video.removeEventListener('loadedmetadata', read);
      video.removeEventListener('playing', started);
      video.removeEventListener('pause', stopped);
      video.removeEventListener('ended', stopped);
      video.removeEventListener('error', stopped);
      video.pause();
      video.removeAttribute('src');
      video.load();
      say(camera.id, false);
    };
  }, [video, camera.id, say]);

  return (
    <ShellPatch
      bearing={bearing}
      cells={cells}
      lead={lead}
      hidden={hidden}
      texture={texture}
      medium={aspect ?? undefined}
      order={order}
      // The picture is what a medium window is: its cell is the pilot's shape and the footage is the camera's, so a line
      // on the cell is a frame standing away from the picture on two of its sides.
      edge={false}
    />
  );
}
