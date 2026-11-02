// A colour per campaign, so a run is recognisable in the transport and on its flag.
//
// The choice is the campaign's place in the project's own list, not a hash of its name: two campaigns declared together get
// two colours, and a palette of six is enough for the stacks a project carries. Inserting a campaign shifts the ones after
// it, which is the cost of that guarantee and the reason it is one line.

const INKS = ['#7dd3fc', '#fcd34d', '#86efac', '#f0abfc', '#fdba74', '#a5b4fc'];

/** The colour of the campaign at a place in the list, wrapping when a project declares more than the palette holds. */
export function campaignInk(index: number): string {
  const at = ((index % INKS.length) + INKS.length) % INKS.length;
  return INKS[at];
}
