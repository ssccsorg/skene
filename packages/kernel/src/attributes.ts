// The attributes an entity reports about itself.
//
// An attribute here is the entity's own and not the space's: a device runs on a charge or it does not, and which of the
// two is a fact about that device. The cockpit therefore reads a declared attribute rather than a device, and the type
// is the build's rather than any one project's, so a robot, a drone and a phone can carry the same reading without the
// frame knowing what any of them is.
//
// The value is the place's declaration because the place is the end of the chain: the space knows what stands in it,
// and a cockpit that reached for a device to fill a row would be a central system with one customer's model in it.
// A run that reports its own reading later is another source of the same value and not another shape.

import type { Place, Standing } from './types';

/** A charge, as the frame draws it. */
export interface Charge {
  /** How full it is, from nought to one. */
  level: number;
}

/**
 * The charge a member declares of itself, or nothing when it declares none.
 *
 * A place may write a fraction or a percentage, because both are how a device says it; anything above one is read as a
 * percentage. A value outside the range is clamped rather than refused, since a reading of 105 percent is a device's
 * optimism and not a reason for a row to draw a fill wider than its cell.
 */
export function chargeOf(place: Place, member: Standing): Charge | null {
  const declared = place.units?.[member.id]?.attributes?.battery;
  if (declared === undefined || !Number.isFinite(declared)) return null;
  const level = declared > 1 ? declared / 100 : declared;
  return { level: Math.min(Math.max(level, 0), 1) };
}
