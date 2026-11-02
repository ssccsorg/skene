import { Abilities } from '../components/Abilities';
import { askable } from '../lib/kinds';
import type { Part, PartProps } from '../lib/kinds';

/**
 * What a member can be asked, for a member that puts what it has on the medium itself.
 *
 * A member that emits has already written its trace for whoever observes it, so there is no reading to pull and no
 * work to address: what is asked of it is what it can produce next, which is the same row and the same line as the
 * other two directions. It draws the row only when it is the member's first direction, which is the frame's order
 * rather than this atom's choice.
 */
export const emits: Part = function Emits({ member }: PartProps) {
  if (askable(member.properties) !== 'emits') return null;
  return <Abilities member={member} />;
};
