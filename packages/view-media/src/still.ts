// A still is an address asked again, on a clock.
//
// The renderer takes a picture from an image element, and an element changes its picture only when the
// browser says so. A multipart stream inside one is the case a browser does not announce: the element
// keeps the frame it decoded, so a window drawn from it is one photograph, and a surface composed from
// it is that photograph redrawn. Asking the address again is the mechanism every engine honours, and
// the camera already holds the frame an answer carries.
//
// The rate is the board's and not the camera's. A patch of the shell is read at a handful of frames a
// second, and each frame is one request the device answers from the frame it has, so a window costs a
// picture and not a second capture.

/** One answer: the picture it brought, or nothing when the address did not answer in time. */
export type Frame = { image: HTMLImageElement; width: number; height: number } | null;

/** How often a still is asked for, in frames a second: what the eye reads of a board, and no more. */
export const FRAME_RATE = 10;

/** How long one answer may take before the address is counted as silent, in milliseconds. */
const GIVE_UP = 4000;

/** How long a silent address waits before it is asked again, in milliseconds. */
const RETRY = 1000;

/**
 * The address with a counter of its own. A camera ignores it and an engine cannot answer a frame it
 * already holds, which is the one thing a still must not do. The address this host serves a frame from
 * may carry a query of its own, so the counter joins one rather than starting one.
 */
export function frameAddress(src: string, frame: number): string {
  const join = src.includes('?') ? '&' : '?';
  return `${src}${join}frame=${frame}`;
}

/**
 * Whether an address is a file rather than a camera.
 *
 * A camera answers a picture endpoint with whatever frame it holds, and a counter is what makes it answer again. A file
 * ends in its own extension and answers the same bytes every time, so the counter buys nothing: the same ask again is
 * the same answer again, on a request the host serving a file was never told to expect.
 */
export function isFile(src: string): boolean {
  return /\.(?:png|jpe?g|webp|avif|gif)(?:[?#]|$)/i.test(src);
}

/**
 * Ask `src` for a frame now, and again after each answer, until the returned function is called.
 *
 * Only one request is open at a time: a slow device is a picture at the rate it can answer rather than
 * a queue of requests it cannot. A frame that does not arrive is reported as none, and the address is
 * tried again in a second, so a camera that comes back is a picture that comes back.
 *
 * `once` names a picture that is a file rather than a camera. A file answers the same bytes every time,
 * so asking it again only spends the network on an answer already in hand, and the counter that keeps
 * a camera from answering a frame it holds is a query the host serving a file need not expect. One
 * answer is taken, and a host with no range to ask about is asked at the address it published.
 */
export function feedFrames(
  src: string,
  rate: number,
  onFrame: (frame: Frame) => void,
  once = false,
): () => void {
  let stopped = false;
  let timer: number | undefined;
  let count = 0;

  const ask = () => {
    const mine = (count += 1);
    const image = new Image();
    // The frame comes from this host's camera server rather than this window's origin, and a picture
    // loaded without CORS is one a texture cannot take.
    image.crossOrigin = 'anonymous';
    let settled = false;
    let guard: number | undefined;

    const settle = (arrived: boolean) => {
      if (settled) return;
      settled = true;
      if (guard !== undefined) window.clearTimeout(guard);
      // A newer request has taken over, which happens when the caller stops and starts again.
      if (stopped || mine !== count) return;
      onFrame(arrived ? { image, width: image.naturalWidth, height: image.naturalHeight } : null);
      if (once) return;
      timer = window.setTimeout(ask, arrived ? 1000 / rate : RETRY);
    };

    guard = window.setTimeout(() => settle(false), GIVE_UP);
    image.addEventListener('load', () => settle(true));
    image.addEventListener('error', () => settle(false));
    image.src = once ? src : frameAddress(src, mine);
  };

  ask();
  return () => {
    stopped = true;
    if (timer !== undefined) window.clearTimeout(timer);
  };
}
