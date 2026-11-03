// The cockpit's own frame: the edges of the space let down into the background. It is the one part of
// the board that is chrome rather than data.
//
// It carries nothing and it reads nothing. A cockpit is a place someone is sitting in rather than a page
// someone is looking at, and the difference is mostly that the edges of the view are acknowledged: the
// vignette says the middle is where the pilot is looking. It is faint on purpose. A board's whole claim is
// that every unit is in the frame at once, and a strong vignette buys the frame by hiding the units near
// its edge. Nothing here can be pressed.

const VIGNETTE =
  'absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_62%,rgba(6,8,11,0.16)_100%)]';

export function CockpitFrame() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className={VIGNETTE} />
    </div>
  );
}
