import type { Bundle } from '@ssccsorg/skene-kernel';

// The board as one thing to ask: every project the frame holds, and every unit each of them declares.
//
// A project is a space and the board is a space of spaces, so a reader looking for one planet is looking for one row
// in a list they cannot see. The index is what makes that row findable: the place itself, and the members the place
// stands, with the project each belongs to kept beside it. A unit is searched by its id, its name, what it is, and the
// project it stands in, because a reader may know any of the four.
//
// The index is built once per board and the query is read against it, which is what keeps a search of six thousand
// rows a list of twelve.

export interface Found {
  /** The project the found thing belongs to, which is what choosing it opens. */
  project: string;
  /** The project the row stands in, as the board names it: the place's own label, then the project's title. */
  place: string;
  /** The project's title, which is what a run is named and not where the unit stands. */
  title: string;
  /** The unit's id, or null when the found thing is the place itself. */
  unit: string | null;
  /** What the row reads: the unit's name, or the place's own name. */
  label: string;
  /** What the thing is, as the place declared it, or null for the place itself. */
  kind: string | null;
}

/** Every project and every unit the board declares, in the board's own order. */
export function indexOf(projects: Bundle[]): Found[] {
  const out: Found[] = [];
  for (const project of projects) {
    const title = project.title || project.id;
    // A place is named by what its own store is called, which is the name its people use. The run's title is what a
    // project is named by and it is kept in the row's search, because a reader may know either.
    const place = project.place?.store?.label || title;
    out.push({ project: project.id, place, title, unit: null, label: place, kind: null });
    for (const [id, unit] of Object.entries(project.place?.units ?? {})) {
      // The star is named for its system, and the place is already the row a reader is looking for.
      if (id === project.id) continue;
      out.push({
        project: project.id,
        place,
        title,
        unit: id,
        label: unit.label ?? id,
        kind: unit.icon ?? null,
      });
    }
  }
  return out;
}

const lower = (text: string) => text.toLowerCase();

/** Whether a token begins a word of a name, so "iv" finds `jita-iv` and not `survive`. */
function begins(haystack: string, token: string): boolean {
  let at = haystack.indexOf(token);
  while (at !== -1) {
    if (at === 0 || !/[a-z0-9]/.test(haystack[at - 1])) return true;
    at = haystack.indexOf(token, at + 1);
  }
  return false;
}

/**
 * How well a row answers a query, or null when it does not.
 *
 * The names are the row's own four, because a row is addressed by all of them: the unit's name, its id, the project it
 * stands in, and the project's name. An exact name outranks a prefix, a prefix outranks a word boundary, and a word
 * boundary outranks a substring, which is what puts the system above its own moons when the query is the system's name.
 * A place takes half a step over its units at the same quality, because a reader asking for a system is asking for the
 * space.
 */
function score(found: Found, query: string, tokens: string[]): number | null {
  const names = [found.label, found.unit ?? '', found.project, found.place, found.title].map(lower);
  const haystack = `${names.join(' ')} ${lower(found.kind ?? '')}`;
  if (!tokens.every((token) => haystack.includes(token))) return null;
  const exact = names.some((name) => name === query);
  const starts = names.some((name) => name.startsWith(query));
  const word = tokens.every((token) => names.some((name) => begins(name, token)));
  return (exact ? 0 : starts ? 1 : word ? 2 : 3) + (found.unit === null ? 0 : 0.5);
}

/** The rows that answer a query, best first, cut at `limit`. A blank query finds nothing, which is a list not yet asked. */
export function find(index: Found[], query: string, limit = 12): Found[] {
  const wanted = query.trim().toLowerCase();
  if (!wanted) return [];
  const tokens = wanted.split(/\s+/).filter(Boolean);
  const hits: { found: Found; score: number }[] = [];
  for (const found of index) {
    const rank = score(found, wanted, tokens);
    if (rank !== null) hits.push({ found, score: rank });
  }
  hits.sort(
    (left, right) =>
      left.score - right.score ||
      left.found.label.length - right.found.label.length ||
      left.found.project.localeCompare(right.found.project) ||
      (left.found.unit ?? '').localeCompare(right.found.unit ?? ''),
  );
  return hits.slice(0, limit).map((hit) => hit.found);
}
