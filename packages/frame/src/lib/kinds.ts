// What a kind of participant is to the frame: the atoms it is assembled from.
//
// A kind is not a thing this app holds. There is no list of kinds here and no file a kind, because a kind is what you
// get when atomic properties are assembled: a machine and a conveyor and an arm differ in nothing the frame asks about,
// so writing them down separately would be the same answer repeated under three names. What the frame holds is the
// atoms, and the assembling is the project's own declaration (`kinds` in a bundle), which is what lets a project bring
// a domain the frame was written before.
//
// An atom is not only a flag. What a member holds is drawn, and so, one day, is what it reads and what it is asked for,
// so each atom's module may export a part: a component the frame draws for a member whose kind names that atom. The
// parts are one file an atom, and the frame draws whatever a member's own assembly asks for, in the order the atoms
// stand. That is what keeps every entity's own shape out of the frame: a folder and a robot hold different things, and
// each says so where it is written rather than in a case here.
//
// The asking has two answers and the frame's own for a participant the project never assembled. The frame's answer is
// the reading of a member it has never heard of: read, holding nothing, named in the space rather than in the room.

import type { ComponentType } from 'react';
import { PARTS } from '../properties';
import { ATOM_KEYS, type Place, type Properties, type Property, type Standing } from './types';

/**
 * What a member's own reading is handed: the member it is drawn for.
 *
 * What a member holds is the frame's own reading of the room it is read from, and the frame binds that reading in one
 * place (`hooks/useHolds`). A part that reached for the room itself would be a second opinion about which room answers,
 * and one that named a project's channel would be a part a project has to be written for.
 */
export interface PartProps {
  member: Standing;
  /** The place the member stands in, which is what turns a world position back into the place's own numbers. */
  place: Place;
}

/** What an atom brings to a member that declares it: a way to draw it, or nothing but the answer it stands for. */
export type Part = ComponentType<PartProps>;

// What the frame answers for a name a project never assembled is in `assembledOf`: read, and nothing else. A member
// that is more than that is a member whose project said so.

/**
 * One project's own kinds, as the bundle declares them: a name, and the atoms it is assembled from.
 *
 * It is read at the bundle and refused by name, the way a channel or a resource of an unknown kind is. A bundle that
 * named an atom the frame does not know would otherwise be a member that silently lost the property its project meant
 * it to have, and a wrong drawing is harder to see than a refusal.
 */
export function kindsNamed(at: unknown): Record<string, Property[]> {
  if (!at || typeof at !== 'object') throw new Error('the kinds of a project are a map of names to atoms');
  const out: Record<string, Property[]> = {};
  for (const [name, atoms] of Object.entries(at as Record<string, unknown>)) {
    if (!Array.isArray(atoms)) throw new Error(`the kind ${name} is not a list of atoms`);
    for (const atom of atoms) {
      if (typeof atom !== 'string' || !ATOM_KEYS.includes(atom as Property)) {
        throw new Error(`the kind ${name} names an atom the frame does not know: ${String(atom)}`);
      }
    }
    out[name] = atoms as Property[];
  }
  return out;
}

/**
 * The atoms a participant's kind is assembled from, which is where every question about it is answered.
 *
 * A name the project never assembled is read and nothing else, because a member the frame draws has a reading whatever
 * its project says: one the frame knows nothing about is a reading it draws and nothing more. A kind the project did
 * assemble is taken exactly as written, and reading is not added under it, because the atoms are the directions a signal
 * crosses a boundary in: a member whose kind says it emits leaves traces on the medium for whoever observes them, and one
 * whose kind says work can be given to it is a target, and neither of them necessarily observes anything. Reading put
 * there would be the frame answering for the project a question the project had already answered. This is the one place
 * the frame's own answer is written, and `propertiesOf` reads it here rather than stating it a second time.
 */
function assembledOf(
  kinds: Record<string, Property[]> | undefined,
  icon: string | null | undefined,
): Property[] {
  const named = icon && kinds?.[icon];
  if (!named) return ['reads'];
  return named;
}

/**
 * What a participant is, as the questions a panel has to ask about it.
 *
 * The frame used to answer these by testing what a kind was called, and there were as many answers as there were places
 * asking: whether a member is a person was asked in four, and a device was whatever was left after that. Now the
 * project assembles the kind and the frame asks the assembly, so a project that adds a member adds the atoms it is made
 * of rather than a case somewhere in the frame.
 */
export function propertiesOf(
  kinds: Record<string, Property[]> | undefined,
  icon: string | null | undefined,
): Properties {
  const atoms = new Set(assembledOf(kinds, icon));
  return Object.fromEntries(ATOM_KEYS.map((key) => [key, atoms.has(key)])) as Properties;
}

/**
 * The parts of a member that are more than a flag, in the order the atoms stand.
 *
 * It is asked of the member's own answers rather than of its kind again, because what a member is was already read
 * once: a second reading of the same declaration would be a second place for the two to disagree.
 */
export function partsOf(properties: Properties): { key: Property; View: Part }[] {
  return ATOM_KEYS.filter((key) => properties[key])
    .map((key) => ({ key, View: PARTS[key] }))
    .filter((each): each is { key: Property; View: Part } => each.View !== null);
}

/**
 * What a member is to the space, as the three words the frame says it in.
 *
 * A user is a person: somebody the place names who is not a thing in it, who is written to rather than asked, and who
 * stands on the board only once they have taken work. An agent is a member work can be given, which is the one thing the
 * console asks before it offers a name as an addressee. An entity is anything else the place stands: a thing in the space
 * that reads and is read, and that nothing is asked of.
 *
 * The three are one reading of the atoms rather than three lists, so a project that assembles a new kind puts a member in
 * the right one by what it declares that kind is made of. It is here rather than at a panel because two places ask it and
 * they have to agree: the list of members says what each one is, and the console asks which of them a line may be said to.
 */
export type Member = 'user' | 'agent' | 'entity';

export function memberOf(properties: Properties): Member {
  if (properties.person) return 'user';
  return properties.writes ? 'agent' : 'entity';
}

/**
 * The three atoms a member can be asked in, which is the frame's own order without the three that are not directions.
 *
 * `holds` is the shape the member's lower elements stand in, `shows` is what the member presents of itself and `person`
 * is a category, so none of them is something a line can be said to. The order comes from the one list rather than a
 * second one, because the frame's order is what decides which atom draws a member's controls and a table of its own would
 * be the place the two drifted apart.
 */
const DIRECTIONS: Property[] = ATOM_KEYS.filter((key) => key !== 'holds' && key !== 'person' && key !== 'shows');

/**
 * The direction a member can be asked in, or null when nothing can be asked of it.
 *
 * This is one question asked in two places, so it is answered once. The controls a member is asked through are drawn by
 * the first direction it has, in the frame's order, and the names a line may be said to are exactly the members this
 * answers for: a member offered as an addressee and a member with controls are the same member, and the two cannot
 * disagree about which.
 *
 * Reading and emitting are directions in this sense even though neither is work addressed to the member. A camera is
 * asked for a frame and a device that emits is asked what it has put on the medium, and the member's own surface is what
 * answers in every case, which is why a line may be said to all three and why the mark on the line promises a cost
 * rather than a direction. What has no direction is a member a pilot can only read: it is drawn in the space, its own
 * record is read, and nothing is asked of it.
 */
export function askable(properties: Properties): Property | null {
  if (properties.person) return null;
  return DIRECTIONS.find((key) => properties[key]) ?? null;
}

/**
 * The names a line may be said to in a space: the project itself, and every member that can be asked.
 *
 * The project stands first because a line said to no member is said to the work, and because it is the one name that is
 * always there: a space whose members are all read-only still has the work itself to ask for something.
 */
export function askableNames(project: string, standing: { id: string; properties: Properties }[]): string[] {
  return [project, ...standing.filter((unit) => askable(unit.properties) !== null).map((unit) => unit.id)];
}
