// A project declaration, proved before it is read.
//
// The frame is handed declarations written by people and by models, so the contract is the one place a bad one is answered
// with a list of places to fix instead of a board that draws nothing. What is asserted here is that the frame's own
// example is provable, that every way of writing it wrong is refused by name, and that a submission (a declaration with
// its run carried beside it) becomes the same document the disk would hold.

import { expect, test } from 'vitest';

import {
  PROJECT_FORMAT,
  documentOf,
  placeIn,
  slugOf,
  sourcesIn,
  validateProject,
  validateSubmission,
} from '@/lib/contract';
import type { ProjectDocument } from '@/lib/project';
import { documents, scenario } from './board';

/** The example's own declaration, which is the document a deployment's board holds. */
const example = () => documents()[0];

const issuesOf = (input: unknown, taken: string[] = []) => {
  const proof = validateProject(input, taken);
  return proof.ok ? [] : proof.issues.map((issue) => `${issue.path}: ${issue.message}`);
};

/** A document that at least has a run, so a test about one resource is not answered by the missing record. */
const withRecord = (...resources: { kind: string; at: unknown }[]) => ({
  id: 'one',
  resources: [{ kind: 'record', at: 'a.txt' }, ...resources],
});

test('a name is keyed the way the frame keys it', () => {
  expect(slugOf('Rover One')).toBe('rover-one');
  expect(slugOf('  --A_b__C--  ')).toBe('a-b-c');
  expect(slugOf('')).toBe('');
});

test('the example a deployment is shown is a project this build proves', () => {
  const proof = validateProject(example());
  expect(proof.ok, proof.ok ? '' : JSON.stringify(proof.issues)).toBe(true);
  // Its view pack is the seam the whole surface is built on, so a proof that refuses `views` would refuse its own example.
  expect(example().resources.map((resource) => resource.kind)).toContain('views');
});

test('a declaration that is not an object is refused without a place to look', () => {
  expect(issuesOf(null)).toEqual([': a project is an object']);
  expect(issuesOf([])).toEqual([': a project is an object']);
});

test('a name the frame cannot key is refused, and so is one already taken', () => {
  const document = { id: 'Not A Slug', resources: [{ kind: 'record', at: 'a.txt' }] };
  expect(issuesOf(document)).toEqual(['id: is a lower-case name of letters, digits and dashes']);
  expect(issuesOf({ ...document, id: 'taken' }, ['taken'])).toEqual([
    'id: is already the name of a project the frame holds',
  ]);
});

test('a declaration with nothing to read is refused before its resources are', () => {
  expect(issuesOf({ id: 'one' })).toEqual(['resources: is a non-empty list']);
  expect(issuesOf({ id: 'one', resources: [] })).toEqual(['resources: is a non-empty list']);
});

test('a kind this build does not read is refused by name, and the ones it does are listed', () => {
  const [issue] = issuesOf({ id: 'one', resources: [{ kind: 'nonsense', at: 1 }] });
  expect(issue).toContain('resources[0].kind: nonsense is not a kind this build reads');
  expect(issue).toContain('record');
  expect(issue).toContain('views');
});

test('a kind that may be declared once is refused twice, and a project resource may repeat', () => {
  expect(
    issuesOf({
      id: 'one',
      resources: [
        { kind: 'record', at: 'a.txt' },
        { kind: 'place', at: { view: [0, 0, 10, 10] } },
        { kind: 'place', at: { view: [0, 0, 10, 10] } },
      ],
    }),
  ).toEqual(['resources[2].kind: declares place twice']);
  expect(
    issuesOf({
      id: 'one',
      resources: [
        { kind: 'record', at: 'a.txt' },
        { kind: 'project', at: 'other' },
        { kind: 'project', at: 'another' },
      ],
    }),
  ).toEqual([]);
});

test('a project with no record has nothing to walk', () => {
  expect(issuesOf({ id: 'one', resources: [{ kind: 'status', at: 'running' }] })).toEqual([
    'resources: declares no record',
  ]);
  expect(issuesOf({ id: 'one', resources: [{ kind: 'record', at: '  ' }] })).toEqual([
    'resources[0].at: is the record the project runs',
  ]);
});

test('a place is read far enough that a projection cannot divide by nothing', () => {
  expect(issuesOf({ id: 'one', resources: [{ kind: 'place', at: 4 }] })[0]).toBe(
    'place: is an object',
  );
  expect(
    issuesOf({ id: 'one', resources: [{ kind: 'place', at: { view: [0, 0, 0, 10] } }] }),
  ).toContain('place.view: has a positive width and height');
  expect(
    issuesOf(
      withRecord({
        kind: 'place',
        at: {
          view: [0, 0, 10, 10],
          units: { rover: { at: { nowhere: [1, 2] } } },
        },
      }),
    ),
  ).toEqual([
    'place.units.rover.at.nowhere: is one of the run its scenes',
  ]);
});

test('a scene the run does not have is a scene the clock would draw nowhere', () => {
  expect(
    issuesOf(withRecord({ kind: 'clock', at: { record: 'now', later: 'tomorrow' } })),
  ).toEqual(['clock.later: is one of the run its scenes']);
  expect(issuesOf(withRecord({ kind: 'clock', at: { record: 4 } }))).toEqual([
    'clock.record: is a line of words',
  ]);
});

test('a status is one of the three a rail can say', () => {
  expect(issuesOf(withRecord({ kind: 'status', at: 'busy' }))).toEqual([
    'resources[1].at: is running, idle, or offline',
  ]);
});

test('a view declaration is an object, and a pack the build does not have waits for one that does', () => {
  expect(issuesOf(withRecord({ kind: 'views', at: 4 }))).toEqual([
    'resources[1].at: is an object naming the pack and the reading it opens on',
  ]);
  // Which readings a pack stands is `standing`'s question, so a pack this build has never heard of is proved here and
  // answered as empty there rather than refused twice.
  expect(issuesOf(withRecord({ kind: 'views', at: { pack: 'spec', main: 'field' } }))).toEqual([]);
});

test('a document from another build is refused rather than read as this one', () => {
  expect(issuesOf({ ...example(), format: 'project/2' })).toEqual([
    `format: is ${PROJECT_FORMAT} for this build`,
  ]);
  expect(issuesOf({ ...example(), format: PROJECT_FORMAT })).toEqual([]);
});

test('a submission carries its run, so the declaration does not have to name one', () => {
  const submission = {
    id: 'pasted',
    title: 'A pasted run',
    record: scenario(),
    resources: [{ kind: 'status', at: 'running' }],
  };
  const proof = validateSubmission(submission);
  expect(proof.ok, proof.ok ? '' : JSON.stringify(proof.issues)).toBe(true);
  if (!proof.ok) return;
  expect(proof.submission.format).toBe(PROJECT_FORMAT);
  expect(proof.submission.record).toBe(scenario());

  // The document the frame holds is the declaration plus the inline record, which is what the loader reads.
  const document = documentOf(proof.submission);
  expect(document.resources.map((resource) => resource.kind)).toEqual(['status', 'record']);
  expect(document.resources[1].at).toBe('inline');
  expect(documentOf(proof.submission).id).toBe('pasted');
});

test('a submission with no run is refused, because there is nothing to walk', () => {
  expect(validateSubmission({ id: 'pasted', resources: [] })).toEqual({
    ok: false,
    issues: [{ path: 'record', message: 'is the run the project carries' }],
  });
});

test('a submission keeps the judgement calls the form made, and reads its place and sources back', () => {
  const proof = validateSubmission({
    id: 'pasted',
    record: scenario(),
    resources: [
      { kind: 'place', at: { view: [0, 0, 10, 10] } },
      { kind: 'sources', at: [{ member: 'rover', kind: 'mock', tree: [] }] },
    ],
  });
  expect(proof.ok).toBe(true);
  if (!proof.ok) return;
  expect(placeIn(proof.submission)?.view).toEqual([0, 0, 10, 10]);
  expect(sourcesIn(proof.submission)).toEqual([{ member: 'rover', kind: 'mock', tree: [] }]);
  expect(sourcesIn({ ...proof.submission, resources: [] })).toEqual([]);
});

test('a submission whose declaration is wrong is refused with the declaration\'s own places', () => {
  const document: ProjectDocument = { id: 'Bad Name', resources: [] };
  const proof = validateSubmission({ id: document.id, record: scenario(), resources: [] });
  expect(proof.ok).toBe(false);
  if (proof.ok) return;
  expect(proof.issues.map((issue) => issue.path)).toContain('id');
});
