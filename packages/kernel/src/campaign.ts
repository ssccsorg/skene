// A campaign: the run read as a mission, and the conditions that say when a sub-mission is done.
//
// The record is the only account of what happened, so a campaign does not hold a second copy of the work. Its start, its
// end and every objective are predicates over the records that have arrived, and the evaluator walks the run once for the
// question it is asked. That keeps the mission in the same language as the work: an objective completed in the record is
// an objective the HUD can show, and an objective a project declares without a record to show it stays open.
//
// The shapes are in `types.ts` because a bundle holds a campaign beside its record and place. What is here is the proof a
// declaration is well formed, and the reading of it at a moment of the run.

import type { Campaign, Condition, Entry, Kind, Objective } from './types';

/** One thing wrong with a campaign declaration, at the place in it a reader would find it. */
export interface CampaignIssue {
  path: string;
  message: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const isSlug = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(value);

const CONDITION_KEYS = ['all', 'any', 'not', 'fact', 'hint', 'intent', 'count', 'time'] as const;
const COUNT_KINDS = new Set<Kind>(['fact', 'hint', 'intent']);
const CAMPAIGN_KEYS = new Set(['id', 'title', 'record', 'start', 'end', 'objectives']);
const OBJECTIVE_KEYS = new Set(['id', 'title', 'when', 'within', 'optional']);

/** The condition vocabulary, read for the one key it carries and the shape that key asks for. */
function conditionAt(value: unknown, path: string, issues: CampaignIssue[], depth = 0): void {
  if (depth > 8) {
    issues.push({ path, message: 'nests no deeper than eight conditions' });
    return;
  }
  if (!isRecord(value)) {
    issues.push({ path, message: 'is a condition' });
    return;
  }
  const keys = Object.keys(value);
  if (keys.length !== 1) {
    issues.push({ path, message: `has exactly one of ${CONDITION_KEYS.join(', ')}` });
    return;
  }
  const key = keys[0];
  const held = value[key];
  switch (key) {
    case 'all':
    case 'any':
      if (!Array.isArray(held) || held.length === 0) {
        issues.push({ path: `${path}.${key}`, message: 'is a non-empty list of conditions' });
        return;
      }
      held.forEach((one, index) => conditionAt(one, `${path}.${key}[${index}]`, issues, depth + 1));
      return;
    case 'not':
      conditionAt(held, `${path}.not`, issues, depth + 1);
      return;
    case 'fact':
    case 'hint':
    case 'intent':
      if (typeof held !== 'string' || !held.trim()) {
        issues.push({ path: `${path}.${key}`, message: 'names a record' });
      }
      return;
    case 'count': {
      if (!isRecord(held)) {
        issues.push({ path: `${path}.count`, message: 'is a count of records' });
        return;
      }
      if (typeof held.kind !== 'string' || !COUNT_KINDS.has(held.kind as Kind)) {
        issues.push({ path: `${path}.count.kind`, message: 'is fact, hint, or intent' });
      }
      if (!Number.isInteger(held.atLeast) || (held.atLeast as number) < 1) {
        issues.push({ path: `${path}.count.atLeast`, message: 'is a whole number of records, one or more' });
      }
      return;
    }
    case 'time':
      if (!isNumber(held) || held < 0) {
        issues.push({ path: `${path}.time`, message: 'is a second of the run, zero or more' });
      }
      return;
    default:
      issues.push({ path, message: `has exactly one of ${CONDITION_KEYS.join(', ')}` });
  }
}

/** One objective, read for its name, its condition, and the window it has to finish in. */
function objectiveAt(value: unknown, path: string, seen: Set<string>, issues: CampaignIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: 'is an objective' });
    return;
  }
  for (const key of Object.keys(value)) {
    if (!OBJECTIVE_KEYS.has(key)) issues.push({ path: `${path}.${key}`, message: 'is not an objective field' });
  }
  if (!isSlug(value.id)) {
    issues.push({ path: `${path}.id`, message: 'is a lower-case name of letters, digits and dashes' });
  } else if (seen.has(value.id)) {
    issues.push({ path: `${path}.id`, message: 'is the name of another objective in this campaign' });
  } else {
    seen.add(value.id);
  }
  if (typeof value.title !== 'string' || !value.title.trim()) {
    issues.push({ path: `${path}.title`, message: 'is a name' });
  }
  conditionAt(value.when, `${path}.when`, issues);
  if (value.within !== undefined && (!isNumber(value.within) || value.within < 0)) {
    issues.push({ path: `${path}.within`, message: 'is a number of seconds, zero or more' });
  }
  if (value.optional !== undefined && typeof value.optional !== 'boolean') {
    issues.push({ path: `${path}.optional`, message: 'is true or false' });
  }
}

/**
 * Prove the campaigns a project declares before the frame reads them.
 *
 * It is the shape and not the run: whether a fact an objective names is ever written is a question the record answers, and
 * a project added before its run has arrived cannot be refused over it. What is refused here is a campaign the evaluator
 * would read as less than it says, such as a condition with two keys or an objective with no name.
 */
export function campaignsOf(value: unknown): { campaigns: Campaign[]; issues: CampaignIssue[] } {
  const issues: CampaignIssue[] = [];
  if (!Array.isArray(value) || value.length === 0) {
    return { campaigns: [], issues: [{ path: 'campaigns', message: 'is a non-empty list of campaigns' }] };
  }
  const ids = new Set<string>();
  value.forEach((campaign, index) => {
    const path = `campaigns[${index}]`;
    if (!isRecord(campaign)) {
      issues.push({ path, message: 'is a campaign' });
      return;
    }
    for (const key of Object.keys(campaign)) {
      if (!CAMPAIGN_KEYS.has(key)) issues.push({ path: `${path}.${key}`, message: 'is not a campaign field' });
    }
    if (!isSlug(campaign.id)) {
      issues.push({ path: `${path}.id`, message: 'is a lower-case name of letters, digits and dashes' });
    } else if (ids.has(campaign.id)) {
      issues.push({ path: `${path}.id`, message: 'is the name of another campaign in this project' });
    } else {
      ids.add(campaign.id);
    }
    if (typeof campaign.title !== 'string' || !campaign.title.trim()) {
      issues.push({ path: `${path}.title`, message: 'is a name' });
    }
    if (
      campaign.record !== undefined &&
      (typeof campaign.record !== 'string' || !campaign.record.trim())
    ) {
      issues.push({ path: `${path}.record`, message: 'is the run this campaign is read over' });
    }
    conditionAt(campaign.start, `${path}.start`, issues);
    conditionAt(campaign.end, `${path}.end`, issues);
    if (campaign.objectives !== undefined) {
      if (!Array.isArray(campaign.objectives)) {
        issues.push({ path: `${path}.objectives`, message: 'is a list of objectives' });
        return;
      }
      const objectiveIds = new Set<string>();
      campaign.objectives.forEach((objective, at) =>
        objectiveAt(objective, `${path}.objectives[${at}]`, objectiveIds, issues),
      );
    }
  });
  return { campaigns: issues.length ? [] : (value as Campaign[]), issues };
}

/** The campaigns a bundle declares, refused by name where they are not readable. */
export function campaignsNamed(value: unknown): Campaign[] {
  const { campaigns, issues } = campaignsOf(value);
  if (issues.length) {
    const first = issues[0];
    throw new Error(`the campaign declaration at ${first.path} ${first.message}`);
  }
  return campaigns;
}

/**
 * The runs a project holds, the one it opens first.
 *
 * The project's record is the run the board walks, and a campaign names another when it is read over one. A path named
 * twice is one run, so this is a list of distinct runs and not a count of campaigns: two campaigns may read the same
 * record, which is what a second mission over one run is.
 */
export function runsOf(record: string, campaigns: Campaign[] | undefined): string[] {
  const runs = [record];
  for (const campaign of campaigns ?? []) {
    if (campaign.record && campaign.record !== record && !runs.includes(campaign.record)) {
      runs.push(campaign.record);
    }
  }
  return runs;
}

/** How a campaign stands at a moment of its run. */
export type CampaignState = 'pending' | 'running' | 'ended';

/** How one objective stands at that moment. */
export type ObjectiveState = 'waiting' | 'open' | 'met' | 'missed';

export interface ObjectiveProgress {
  objective: Objective;
  state: ObjectiveState;
  /** The second of the run the objective has to be finished by, when it declares a window. */
  deadline: number | null;
}

export interface CampaignProgress {
  campaign: Campaign;
  state: CampaignState;
  /** The second the start condition first held, or null while the campaign has not begun. */
  startedAt: number | null;
  /** The second the end condition first held at or after the start, or null while it has not ended. */
  endedAt: number | null;
  objectives: ObjectiveProgress[];
  met: number;
  total: number;
  /** Whether a mandatory objective's window closed without it. */
  failed: boolean;
}

/** The records the evaluator asks about, accumulated up to one moment of the run. */
interface Tally {
  at: number;
  facts: Set<string>;
  hints: Set<string>;
  intents: Set<string>;
  count: Record<Kind, number>;
}

function tallyOf(): Tally {
  return { at: 0, facts: new Set(), hints: new Set(), intents: new Set(), count: { fact: 0, hint: 0, intent: 0 } };
}

/** One record's contribution. A claim is a step of the stream and not a record of the volume. */
function feed(tally: Tally, entry: Entry): void {
  switch (entry.kind) {
    case 'fact':
      tally.count.fact += 1;
      if (entry.label) tally.facts.add(entry.label);
      return;
    case 'hint':
      tally.count.hint += 1;
      if (entry.label) tally.hints.add(entry.label);
      return;
    case 'intent':
      tally.count.intent += 1;
      if (entry.label) tally.intents.add(entry.label);
      return;
    default:
      return;
  }
}

function holds(condition: Condition, tally: Tally): boolean {
  if ('all' in condition) return condition.all.every((one) => holds(one, tally));
  if ('any' in condition) return condition.any.some((one) => holds(one, tally));
  if ('not' in condition) return !holds(condition.not, tally);
  if ('fact' in condition) return tally.facts.has(condition.fact);
  if ('hint' in condition) return tally.hints.has(condition.hint);
  if ('intent' in condition) return tally.intents.has(condition.intent);
  if ('count' in condition) return tally.count[condition.count.kind] >= condition.count.atLeast;
  return tally.at >= condition.time;
}

/** The seconds a condition names, so a time threshold is evaluated even when no record stands at it. */
function timesOf(condition: Condition, out: Set<number>): void {
  if ('all' in condition) {
    condition.all.forEach((one) => timesOf(one, out));
    return;
  }
  if ('any' in condition) {
    condition.any.forEach((one) => timesOf(one, out));
    return;
  }
  if ('not' in condition) {
    timesOf(condition.not, out);
    return;
  }
  if ('time' in condition) out.add(condition.time);
}

/**
 * The first second at or after `from` the condition holds.
 *
 * A predicate over a run changes at a record time or at a threshold the condition names, and nowhere else, so those are
 * the moments it is read at. A campaign therefore starts when the record says it did rather than at the scene boundary a
 * transcript happens to fall on, and a condition that is true at the top of the run is answered at zero.
 */
function firstHeld(entries: Entry[], condition: Condition, from: number, now: number): number | null {
  const moments = new Set<number>([0, now]);
  for (const entry of entries) moments.add(entry.at);
  timesOf(condition, moments);
  const ordered = [...moments].filter((at) => at >= 0 && at <= now).sort((left, right) => left - right);
  const tally = tallyOf();
  let index = 0;
  for (const at of ordered) {
    while (index < entries.length && entries[index].at <= at) feed(tally, entries[index++]);
    tally.at = at;
    if (at >= from && holds(condition, tally)) return at;
  }
  return null;
}

/** Whether the condition holds at one second of the run, over every record at or before it. */
function heldAt(entries: Entry[], condition: Condition, at: number): boolean {
  const tally = tallyOf();
  for (const entry of entries) {
    if (entry.at > at) break;
    feed(tally, entry);
  }
  tally.at = at;
  return holds(condition, tally);
}

/**
 * Read a campaign at one moment of its run.
 *
 * `now` is the cursor's own second, and the records handed in are what the feed delivered. An objective with a window is
 * read at the earlier of the cursor and its deadline, so an objective finished in time stays finished and one whose window
 * closed is missed even if the record writes it later. A campaign that has not ended has no verdict yet: `failed` is the
 * only negative answer here, and it says a mandatory window closed.
 */
export function campaignAt(campaign: Campaign, entries: Entry[], now: number): CampaignProgress {
  const run = entries.filter((entry) => entry.at <= now).sort((left, right) => left.at - right.at);
  const startedAt = firstHeld(run, campaign.start, 0, now);
  const endedAt = startedAt === null ? null : firstHeld(run, campaign.end, startedAt, now);

  const objectives = (campaign.objectives ?? []).map((objective): ObjectiveProgress => {
    if (startedAt === null) return { objective, state: 'waiting', deadline: null };
    const deadline = objective.within === undefined ? null : startedAt + objective.within;
    const readAt = deadline === null ? now : Math.min(now, deadline);
    const met = heldAt(run, objective.when, readAt);
    const state: ObjectiveState = met
      ? 'met'
      : deadline !== null && now >= deadline
        ? 'missed'
        : 'open';
    return { objective, state, deadline };
  });

  return {
    campaign,
    state: startedAt === null ? 'pending' : endedAt !== null ? 'ended' : 'running',
    startedAt,
    endedAt,
    objectives,
    met: objectives.filter((each) => each.state === 'met').length,
    total: objectives.length,
    failed: objectives.some((each) => each.state === 'missed' && !each.objective.optional),
  };
}
