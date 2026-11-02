import { describe, expect, it } from 'vitest';
import { chargeOf } from '@/lib/attributes';
import type { Place, Standing } from '@/lib/types';

// A charge is an attribute of an entity and not a fact about the space, so the reader takes the place's declaration and
// nothing else: the cockpit has no device to ask, and a row must be drawn from what the end tier wrote.

const member = (id: string): Standing => ({ id }) as Standing;
const place = (attributes?: Record<string, unknown>): Place =>
  ({ view: [0, 0, 1, 1], units: { robot: { attributes } } }) as unknown as Place;

describe('chargeOf', () => {
  it('reads a fraction as it stands', () => {
    expect(chargeOf(place({ battery: 0.62 }), member('robot'))).toEqual({ level: 0.62 });
  });

  it('reads a number above one as a percentage', () => {
    expect(chargeOf(place({ battery: 87 }), member('robot'))).toEqual({ level: 0.87 });
  });

  it('clamps what a device claims past full, rather than drawing a wider cell', () => {
    expect(chargeOf(place({ battery: 105 }), member('robot'))).toEqual({ level: 1 });
    expect(chargeOf(place({ battery: -4 }), member('robot'))).toEqual({ level: 0 });
  });

  it('answers nothing for a member that declares no charge', () => {
    expect(chargeOf(place(undefined), member('robot'))).toBeNull();
    expect(chargeOf(place({}), member('robot'))).toBeNull();
    expect(chargeOf(place({ battery: 87 }), member('other'))).toBeNull();
  });
});
