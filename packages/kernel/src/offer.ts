// What a line can name, read out of the space's addresses.
//
// An address is a member and the path below it: `a/b/c` is a leaf, `a/b` is what holds it, and `a` is a member of the
// space itself. The same shape carries an ability, because an ability is a leaf of the member that answers for it: a
// command is a leaf of the machine that runs it. So there is one address space and one reader over it, whatever the leaf
// happens to be, which is what makes a file, a joint and a command the same interaction rather than three.
//
// The offer is read the way a file finder reads a query, and Zed's own finder is where the rule comes from
// (`crates/file_finder/src/file_finder.rs`: a match is kept when at least one matched position is in the file name, which
// is what stops a directory match from being offered for a query that names a file). What is searched is therefore the
// name and never the path: a query for the leaf offers everything called that and shows where each of them lives, and a
// query for a folder offers the folder with what holds it beside it. Searching the path as well would answer a leaf query
// with every leaf under a directory whose name held the query, which is not what a pilot naming something is asking for.
//
// What is shown with each offer is the parent, and it is shown for the reason a finder shows it: two things may share a
// name, and the address is what tells them apart. That is the whole of the relation between the two columns, so a row is
// the name and where it lives rather than two names for one thing.
//
// A name is offered with the member it belongs to as well, because naming an element is not the same act as naming a
// member: the member is who the line goes to and the element is what the line says. A press in the space and a mention in
// the field are that one act read in two places, which is why the reading is here and not in either.

/** One thing a line can name, read whole: the name, where it lives, and the member it belongs to. */
export interface Offered {
  /** What the line names it by, which is the last segment of the address. */
  name: string;
  /** Where it lives, which is every segment before the name and empty for a member of the space itself. */
  at: string;
  /** The address whole, which is what a press composes and what a line about it carries. */
  address: string;
  /** The member the address belongs to, which is who a line about it goes to. */
  member: string;
}

/**
 * The address read whole, or null for a string that is not one.
 *
 * An empty segment is not part of an address: `dir//file` and `/file` are two spellings of a path nothing stands at, and
 * answering them with an offer would be the frame inventing a place.
 */
export function offeredAt(address: string): Offered | null {
  const parts = address.split('/').filter(Boolean);
  if (!parts.length || parts.join('/') !== address) return null;
  const [member] = parts;
  return {
    name: parts[parts.length - 1] as string,
    // Everything before the name, the member included: what a row shows beside the name is the address it is read at, and
    // `dir/src` is where a file in `dir/src` lives as much as `src` is where that folder lives.
    at: parts.slice(0, -1).join('/'),
    address,
    member: member as string,
  };
}

/**
 * What a query offers, in the order the addresses are given.
 *
 * The query matches the name and only the name, case-insensitively, and a query with nothing in it offers everything: the
 * `@` on its own is how a pilot reads what can be named, which is the same thing an empty search in a finder is.
 */
export function offersFor(addresses: string[], query: string): Offered[] {
  const wanted = query.toLowerCase();
  return addresses
    .map(offeredAt)
    .filter((each): each is Offered => each !== null)
    .filter((each) => !wanted || each.name.toLowerCase().includes(wanted));
}

/**
 * A member's own skills, read as offers.
 *
 * An ability is a leaf of the member that answers for it, so the second list a mention opens is the same row shape one
 * level down. The names are the member's answers (`asks`) and not everything the address space holds under it: a folder
 * under a workspace is where files are read from, not something a line can ask the workspace to do.
 */
export function skillsOf(names: string[], member: string): Offered[] {
  return names
    .map((name) => offeredAt(`${member}/${name}`))
    .filter((each): each is Offered => each !== null);
}

/**
 * The space's addresses, read from the members a line may be said to and what each of them answered.
 *
 * A member is offered as itself and then as its abilities, because an ability is a leaf of the member that answers for it
 * and naming one is how a pilot says what the line should do rather than only where it goes. What a member's lower
 * elements add to this is the same shape one level further in, and it is read where those elements are read
 * (`hooks/useHolds`): the tree is a question per level and the room answers it, so what is known here without asking is the
 * member and its own interface.
 *
 * The members are handed in already filtered (`askableNames`), so who a line may be said to is decided in one place and
 * this reader cannot offer an address the console would refuse. What is under them (`under`) is the rest of the tree, read
 * where a member's own elements are read (`hooks/useTree`), because how deep a tree goes is a question per level and the
 * room is what answers it.
 */
export function addressesOf(
  names: string[],
  asked: (member: string) => { name: string }[] | null,
  under: string[] = [],
): string[] {
  // The tree walk answers with the member itself as its own root, and a member is already the first address: one name
  // offered twice is a list that reads as two members and a press that is the same act whichever row was under the hand.
  const all = [
    ...names.flatMap((member) => [member, ...(asked(member) ?? []).map((each) => `${member}/${each.name}`)]),
    ...under,
  ];
  return [...new Set(all)];
}
