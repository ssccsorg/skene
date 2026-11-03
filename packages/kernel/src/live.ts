// The state a device reports in its turn, read as positions in the place's own numbers.
//
// A turn is prose and the app draws a board, so the bridge adds one line the reader can take:
// `state {"unit-a":[100,130]}`. The line is a reading of the device, not a second record,
// which is why it travels in the answer the room already stores rather than in a side channel.

const STATE = /^state\s+(\{.*\})\s*$/;

/** The positions a turn states, by unit. A malformed line is dropped rather than drawn as a place. */
export function statesOf(content: string): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {};
  for (const raw of content.split('\n')) {
    const match = STATE.exec(raw.trim());
    if (!match) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      continue;
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value) || value.length < 2) continue;
      const [x, y] = value;
      if (
        typeof x !== 'number' ||
        typeof y !== 'number' ||
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      ) {
        continue;
      }
      out[id] = [x, y];
    }
  }
  return out;
}
