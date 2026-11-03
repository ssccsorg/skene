// A campaign, held to the record rather than to a second copy of the work.
//
// A campaign's start, its end, and every objective are predicates over the records that arrived, so the only thing that
// can be asserted is what the record says at a second of the run. What is here is that proof of shape, and the reading at
// the moments the run changes: before the start, inside a window, and after one closed.

import { expect, test } from 'vitest';

import { campaignsNamed, campaignsOf, runsOf } from '@ssccsorg/skene-kernel';
import type { Campaign } from '@ssccsorg/skene-kernel';
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
