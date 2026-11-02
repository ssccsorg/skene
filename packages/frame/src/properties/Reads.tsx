import { Abilities } from '../components/Abilities';
import { askable } from '../lib/kinds';
import type { Part, PartProps } from '../lib/kinds';

/**
 * What a member can be asked, for a member whose own reading is what is asked of it.
 *
 * A camera, a sensor and a station are members a pilot acts on and work is not addressed to: what they answer is what
 * they produce. The interface is the same one a member that can be given work draws, and the same line is composed
 * for it, because the member's own surface is what decides how the request is answered, not the frame. What a member's
 * row in the list of members says it can be asked is the same answer as this one, so a member the room answers nothing
 * about is a member drawn with no ability in either place rather than with its declaration in one of them.
 */
export const reads: Part = function Reads({ member }: PartProps) {
  if (askable(member.properties) !== 'reads') return null;
  return <Abilities member={member} />;
};
