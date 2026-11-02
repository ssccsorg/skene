import { Abilities } from '../components/Abilities';
import { askable } from '../lib/kinds';
import type { Part, PartProps } from '../lib/kinds';

/**
 * What a member can be asked, for a member work is addressed to.
 *
 * The row itself is the member's own interface and stands in `components/Abilities`; what this atom decides is whether
 * it is the one that draws it. A member that reads draws its abilities through `reads`, because the frame's order puts
 * reading first and the row is one row: this atom draws it for a member whose direction is being given work alone.
 */
export const writes: Part = function Writes({ member }: PartProps) {
  if (askable(member.properties) !== 'writes') return null;
  return <Abilities member={member} />;
};
