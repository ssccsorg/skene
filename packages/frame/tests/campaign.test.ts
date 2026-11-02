// A campaign, held to the record rather than to a second copy of the work.
//
// A campaign's start, its end, and every objective are predicates over the records that arrived, so the only thing that
// can be asserted is what the record says at a second of the run. What is here is that proof of shape, and the reading at
// the moments the run changes: before the start, inside a window, and after one closed.

import { expect, test } from 'vitest';

import { campaignAt, campaignsNamed, campaignsOf, runsOf } from '@/lib/campaign';
import type { Campaign } from '@/lib/types';
import { example } from './board';

const { model } = example();

const campaign = (extra: Record<string, unknown> = {}): Campaign =>
  ({
    id: 'run-one',
    title: 'One run',
    start: { fact: 'reading-1' },
    end: { fact: 'work-done' },
    objectives: [
      { id: 'take', title: 'The work is taken', when: { intent: 'answer' } },
      { id: 'answer', title: 'The answer is written', when: { fact: 'work-done' }, within: 60 },
      { id: 'again', title: 'A second reading', when: { fact: 'reading-2' }, optional: true },
    ],
    ...extra,
  }) as Campaign;

const issues = (value: unknown) => campaignsOf(value).issues.map((issue) => `${issue.path}: ${issue.message}`);

test('a campaign is proved whole, and refused whole', () => {
  expect(campaignsOf([campaign()])).toEqual({ campaigns: [campaign()], issues: [] });
  expect(campaignsOf([])).toEqual({
    campaigns: [],
    issues: [{ path: 'campaigns', message: 'is a non-empty list of campaigns' }],
  });
  expect(issues({ campaigns: [campaign()] })).toEqual(['campaigns: is a non-empty list of campaigns']);
});

test('a condition has exactly one key, because two keys are one condition read as another', () => {
  expect(issues([campaign({ start: { fact: 'reading-1', hint: 'bound' } })])).toEqual([
    'campaigns[0].start: has exactly one of all, any, not, fact, hint, intent, count, time',
  ]);
  expect(issues([campaign({ start: { all: [] } })])).toEqual([
    'campaigns[0].start.all: is a non-empty list of conditions',
  ]);
  expect(issues([campaign({ start: { count: { kind: 'claim', atLeast: 1 } } })])).toEqual([
    'campaigns[0].start.count.kind: is fact, hint, or intent',
  ]);
  expect(issues([campaign({ start: { count: { kind: 'fact', atLeast: 0 } } })])).toEqual([
    'campaigns[0].start.count.atLeast: is a whole number of records, one or more',
  ]);
  expect(issues([campaign({ start: { time: -1 } })])).toEqual([
    'campaigns[0].start.time: is a second of the run, zero or more',
  ]);
});

test('a field the campaign vocabulary does not have is refused rather than carried', () => {
  expect(issues([campaign({ owner: 'me' })])).toEqual(['campaigns[0].owner: is not a campaign field']);
  expect(
    issues([
      campaign({
        objectives: [{ id: 'take', title: 'Taken', when: { intent: 'answer' }, weight: 2 }],
      }),
    ]),
  ).toEqual(['campaigns[0].objectives[0].weight: is not an objective field']);
});

test('two campaigns and two objectives may not share a name', () => {
  expect(issues([campaign(), campaign()])).toEqual([
    'campaigns[1].id: is the name of another campaign in this project',
  ]);
  expect(
    issues([
      campaign({
        objectives: [
          { id: 'take', title: 'One', when: { intent: 'answer' } },
          { id: 'take', title: 'Two', when: { intent: 'answer' } },
        ],
      }),
    ]),
  ).toEqual(['campaigns[0].objectives[1].id: is the name of another objective in this campaign']);
  expect(issues([campaign({ title: '  ' })])).toEqual(['campaigns[0].title: is a name']);
  expect(
    issues([campaign({ objectives: [{ id: 'take', when: { intent: 'answer' } }] })]),
  ).toEqual(['campaigns[0].objectives[0].title: is a name']);
});

test('a condition nested past what a reader can follow is refused', () => {
  let deep: Record<string, unknown> = { fact: 'reading-1' };
  for (let index = 0; index < 9; index += 1) deep = { not: deep };
  expect(issues([campaign({ start: deep })])).toEqual([
    'campaigns[0].start.not.not.not.not.not.not.not.not.not: nests no deeper than eight conditions',
  ]);
});

test('a declaration refused by name says where to look', () => {
  expect(() => campaignsNamed([campaign({ id: 'Bad Name' })])).toThrow(
    /the campaign declaration at campaigns\[0\]\.id is a lower-case name/,
  );
  expect(campaignsNamed([campaign()]).map((each) => each.id)).toEqual(['run-one']);
});

test('the runs a project holds are its record and each run a campaign names, once', () => {
  const other = campaign({ id: 'run-two', record: 'scenario/other.txt' });
  expect(runsOf('scenario/example.txt', undefined)).toEqual(['scenario/example.txt']);
  expect(runsOf('scenario/example.txt', [other, campaign({ id: 'run-three', record: 'scenario/other.txt' })])).toEqual([
    'scenario/example.txt',
    'scenario/other.txt',
  ]);
  // A campaign over the project's own record is not a second run.
  expect(runsOf('scenario/example.txt', [campaign()])).toEqual(['scenario/example.txt']);
});

test('before its start a campaign is pending, and every objective waits', () => {
  const progress = campaignAt(
    campaign({ id: 'late', start: { fact: 'reading-2' } }),
    model.events,
    600,
  );
  expect(progress.state).toBe('pending');
  expect(progress.startedAt).toBeNull();
  expect(progress.endedAt).toBeNull();
  expect(progress.objectives.map((each) => each.state)).toEqual(['waiting', 'waiting', 'waiting']);
  expect(progress.failed).toBe(false);
});

test('a campaign starts and ends on the second the record says, not on a scene boundary', () => {
  const progress = campaignAt(campaign(), model.events, 0);
  expect(progress.state).toBe('ended');
  expect(progress.startedAt).toBe(0);
  expect(progress.endedAt).toBe(0);
  expect(progress.objectives.map((each) => [each.objective.id, each.state])).toEqual([
    ['take', 'met'],
    ['answer', 'met'],
    ['again', 'open'],
  ]);
  expect(progress.met).toBe(2);
  expect(progress.total).toBe(3);
  expect(progress.failed).toBe(false);
});

test('a window that closed without its objective is missed, and a mandatory one fails the campaign', () => {
  const late = campaign({
    objectives: [{ id: 'again', title: 'A second reading', when: { fact: 'reading-2' }, within: 0 }],
  });
  expect(campaignAt(late, model.events, 0).failed).toBe(true);
  const optional = campaign({
    objectives: [
      { id: 'again', title: 'A second reading', when: { fact: 'reading-2' }, within: 0, optional: true },
    ],
  });
  const progress = campaignAt(optional, model.events, 0);
  expect(progress.objectives[0].state).toBe('missed');
  expect(progress.failed, 'an optional window is not a failure').toBe(false);
  // The objective is read at its deadline, so a record written after it does not take the miss back.
  expect(campaignAt(late, model.events, 3600).objectives[0].state).toBe('missed');
});

test('a threshold is read at the second it names, even when no record stands there', () => {
  const timed = campaign({ id: 'timed', start: { time: 3600 }, end: { fact: 'reading-2' } });
  expect(campaignAt(timed, model.events, 1800).startedAt).toBeNull();
  const progress = campaignAt(timed, model.events, 3600);
  expect(progress.startedAt).toBe(3600);
  expect(progress.state, 'the run ends on the same record it started at').toBe('ended');
  expect(progress.objectives.map((each) => each.state)).toEqual(['met', 'met', 'met']);
});

test('a count is read over what arrived, so it cannot be met before the run writes it', () => {
  const counted = campaign({
    start: { count: { kind: 'fact', atLeast: 12 } },
    end: { fact: 'work-done' },
  });
  expect(campaignAt(counted, model.events, 0).state).toBe('pending');
  expect(campaignAt(counted, model.events, 900).startedAt).toBe(900);
});
