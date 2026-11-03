// The project declaration as a contract: the shape a bundle is written in, and what a bundle has to say before it can be
// read.
//
// A project is a list of resources, each by a kind the frame has a reader for, and the record it runs is one of them. That
// envelope is small on purpose: a new capability is a new kind and a reader, and a project that declares a kind this build
// does not have is refused by name rather than read as less than it is. The record inside it is the run's own text, so
// a project is the envelope around a run and not a second language for the same thing.
//
// The checks below are the ones the frame can make before it reads anything: names, the resources a bundle cannot be
// without, and the shape of the values a reader would divide by. A reader's own errors (an unknown project held as a
// resource, a record that will not parse) are the reader's, and `bundleOf` still says those. The point of a separate
// proof is that a declaration written by a person or a model can be refused with a list before the board is touched.

import { campaignsOf } from '@ssccsorg/skene-kernel';
import { PROJECT_FIELDS, type ProjectDocument } from './project';
import { ATOM_KEYS, type Place, type SourceSpec } from '@ssccsorg/skene-kernel';

/** The version of the declaration this build reads. A bundle may carry it; a bundle without one is read as this. */
export const PROJECT_FORMAT = 'project/1';

/** A name as the frame keys it by: lower case, and runs of anything else become one dash. */
export function slugOf(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** One thing wrong with a declaration, at the place in it a reader would find it. */
export interface ProjectIssue {
  path: string;
  message: string;
}

export type ProjectProof =
  | { ok: true; document: ProjectDocument }
  | { ok: false; issues: ProjectIssue[] };

/** What a project added in the frame is: the declaration, and the run the record resource would otherwise name. */
export interface ProjectSubmission extends ProjectDocument {
  title?: string;
  /** The run itself, for a project the frame is handed rather than one on the disk. */
  record: string;
}

/** The resource kinds this build reads. `project` is the one that may repeat, because a project may hold more than one. */
const KINDS = new Set([
  'channel',
  'kinds',
  'sims',
  // The rules a room holds its units to, by the same kind names `sims` answers for. The envelope is all this build
  // checks: what a guard refuses is the room's business, the same way what a machine is asked to do is.
  'policy',
  'sources',
  'layout',
  // The project's own declaration of how the board is read: the pack it brings, the reading it opens on, and the readings
  // it stands. It is proved here because `bundleOf` reads it, and a list of the kinds this build reads cannot refuse one.
  'views',
  // What the deployment can do beside drawing a run. `bundleOf` reads it for the panels and the controls that ask, so the
  // proof has to admit the kind: a list that refused one the reader accepts would refuse the books it exists to read.
  'abilities',
  'record',
  'status',
  'clock',
  'place',
  'campaigns',
  'project',
]);

/** The kinds a bundle may declare once. A second `place` is two grounds and no answer to which one the board draws. */
const ONCE = new Set([
  'channel',
  'kinds',
  'sims',
  'policy',
  'sources',
  'layout',
  'views',
  'abilities',
  'record',
  'status',
  'clock',
  'place',
  'campaigns',
]);

const STATUS = new Set(['running', 'idle', 'offline']);
const SCENES = new Set(['record', 'notice', 'declare', 'act', 'resume']);
const ATOMS = new Set<string>(ATOM_KEYS);
const SOURCE_KINDS = new Set(['mock', 'folder', 'room', 'bridge']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * A name, or a list of names.
 *
 * One capability is a declaration too, which is how a deployment that has one writes it. An empty list is a project
 * stating none, and that is a declaration the reader already answers, so it is admitted here.
 */
function namesOf(value: unknown): boolean {
  const list = Array.isArray(value) ? value : [value];
  return list.every((name) => typeof name === 'string' && name.trim().length > 0);
}

/** Four numbers, which is what a ground box and a place view are. */
function four(value: unknown, path: string, issues: ProjectIssue[]): number[] | null {
  if (!Array.isArray(value) || value.length !== 4 || !value.every(isNumber)) {
    issues.push({ path, message: 'is four finite numbers' });
    return null;
  }
  return value as number[];
}

/** Two numbers, which is what a bearing is. */
function pair(value: unknown, path: string, issues: ProjectIssue[]): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2 || !value.every(isNumber)) {
    issues.push({ path, message: 'is two finite numbers' });
    return null;
  }
  return value as [number, number];
}

/** A place, read far enough that a projection cannot divide by nothing or a ground have no inside. */
function placeOf(value: unknown, issues: ProjectIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: 'place', message: 'is an object' });
    return;
  }
  const view = four(value.view, 'place.view', issues);
  if (view && (!(view[2] > 0) || !(view[3] > 0))) {
    issues.push({ path: 'place.view', message: 'has a positive width and height' });
  }
  if (value.sector !== undefined) pair(value.sector, 'place.sector', issues);
  if (value.geo !== undefined) {
    if (!isRecord(value.geo)) {
      issues.push({ path: 'place.geo', message: 'is an object' });
    } else {
      const bounds = four(value.geo.bounds, 'place.geo.bounds', issues);
      if (bounds && (!(bounds[2] > bounds[0]) || !(bounds[3] > bounds[1]))) {
        issues.push({ path: 'place.geo.bounds', message: 'has east past west and north past south' });
      }
    }
  }
  if (value.units !== undefined) {
    if (!isRecord(value.units)) {
      issues.push({ path: 'place.units', message: 'is an object of members' });
    } else {
      for (const [member, unit] of Object.entries(value.units)) {
        if (!isRecord(unit)) {
          issues.push({ path: `place.units.${member}`, message: 'is an object' });
          continue;
        }
        if (unit.at !== undefined) {
          if (!isRecord(unit.at)) {
            issues.push({ path: `place.units.${member}.at`, message: 'is an object of scenes to positions' });
          } else {
            for (const [scene, at] of Object.entries(unit.at)) {
              if (!SCENES.has(scene)) {
                issues.push({ path: `place.units.${member}.at.${scene}`, message: 'is one of the run its scenes' });
              }
              pair(at, `place.units.${member}.at.${scene}`, issues);
            }
          }
        }
        if (unit.geo !== undefined) pair(unit.geo, `place.units.${member}.geo`, issues);
        if (unit.alt !== undefined && (!isNumber(unit.alt) || unit.alt < 0)) {
          issues.push({ path: `place.units.${member}.alt`, message: 'is a height in metres above the ground' });
        }
        if (unit.attributes !== undefined) {
          // An attribute is the entity's own reading, so the shape is this build's and the refusal is here rather than
          // in the row that draws it.
          if (!isRecord(unit.attributes)) {
            issues.push({ path: `place.units.${member}.attributes`, message: 'is an object of attributes' });
          } else if (unit.attributes.battery !== undefined && !isNumber(unit.attributes.battery)) {
            issues.push({
              path: `place.units.${member}.attributes.battery`,
              message: 'is a charge, a fraction or a percentage',
            });
          }
        }
        if (unit.views !== undefined) {
          if (!Array.isArray(unit.views)) {
            issues.push({ path: `place.units.${member}.views`, message: 'is a list' });
          } else {
            unit.views.forEach((view, index) => {
              const at = `place.units.${member}.views[${index}]`;
              if (!isRecord(view) || typeof view.id !== 'string') {
                issues.push({ path: at, message: 'is a view with a name' });
                return;
              }
              if (view.from !== undefined && !isNumber(view.from)) {
                issues.push({ path: `${at}.from`, message: 'is a second of the run' });
              }
              if (view.to !== undefined && !isNumber(view.to)) {
                issues.push({ path: `${at}.to`, message: 'is a second of the run' });
              }
            });
          }
        }
      }
    }
  }
}

/** The members' own element sources, read for the one value each adapter cannot answer without. */
function sourcesOf(value: unknown, issues: ProjectIssue[]): void {
  if (!Array.isArray(value)) {
    issues.push({ path: 'sources', message: 'is a list of sources' });
    return;
  }
  value.forEach((source, index) => {
    const path = `sources[${index}]`;
    if (!isRecord(source)) {
      issues.push({ path, message: 'is an object' });
      return;
    }
    if (typeof source.member !== 'string' || !source.member) {
      issues.push({ path: `${path}.member`, message: 'names the member the source is for' });
    }
    if (typeof source.kind !== 'string' || !SOURCE_KINDS.has(source.kind)) {
      issues.push({ path: `${path}.kind`, message: 'is mock, folder, or room' });
    } else if (source.kind === 'mock' && !Array.isArray(source.tree)) {
      issues.push({ path: `${path}.tree`, message: 'is the tree a mock source answers with' });
    } else if (source.kind === 'folder' && typeof source.at !== 'string') {
      issues.push({ path: `${path}.at`, message: 'is the path a folder source stands at' });
    } else if (source.kind === 'bridge' && typeof source.at !== 'string') {
      issues.push({ path: `${path}.at`, message: 'is the address a bridge source reaches' });
    }
  });
}

/** The machine vocabulary, which the frame carries and the room reads. */
function kindsOf(value: unknown, issues: ProjectIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: 'kinds', message: 'is an object of kind names' });
    return;
  }
  for (const [kind, atoms] of Object.entries(value)) {
    if (!Array.isArray(atoms) || !atoms.every((atom) => typeof atom === 'string' && ATOMS.has(atom))) {
      issues.push({ path: `kinds.${kind}`, message: 'is a list of the atoms a member is assembled from' });
    }
  }
}

/** A clock, whose scenes are the run's own. A name the format does not have is a scene the panel would draw nowhere. */
function clockOf(value: unknown, issues: ProjectIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: 'clock', message: 'is an object of scenes' });
    return;
  }
  for (const [scene, words] of Object.entries(value)) {
    if (!SCENES.has(scene)) issues.push({ path: `clock.${scene}`, message: 'is one of the run its scenes' });
    if (typeof words !== 'string') issues.push({ path: `clock.${scene}`, message: 'is a line of words' });
  }
}

/**
 * Prove a declaration before the frame reads it.
 *
 * The proof is of the shape and not of the run: `bundleOf` still reads the resources, and the record is still parsed where
 * the space is built. What stands here is what can be said without doing either, so a declaration written by a person or
 * a model is answered with a list of places to fix rather than a board that draws nothing.
 */
export function validateProject(input: unknown, taken: string[] = []): ProjectProof {
  const issues: ProjectIssue[] = [];
  if (!isRecord(input)) {
    return { ok: false, issues: [{ path: '', message: 'a project is an object' }] };
  }
  if (input.format !== undefined && input.format !== PROJECT_FORMAT) {
    issues.push({ path: 'format', message: `is ${PROJECT_FORMAT} for this build` });
  }
  // A field beside the resources is a declaration the reader has no place for, and dropping it silently is how a
  // capability written at the project level became a console with no exchange under it. The proof names it instead.
  for (const key of Object.keys(input)) {
    if (!(PROJECT_FIELDS as readonly string[]).includes(key)) {
      issues.push({
        path: key,
        message: 'is not a project-level field: a project declares its id, its format, and its resources',
      });
    }
  }
  const id = input.id;
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    issues.push({ path: 'id', message: 'is a lower-case name of letters, digits and dashes' });
  } else if (taken.includes(id)) {
    issues.push({ path: 'id', message: `is already the name of a project the frame holds` });
  }
  const resources = input.resources;
  if (!Array.isArray(resources) || resources.length === 0) {
    issues.push({ path: 'resources', message: 'is a non-empty list' });
    return { ok: false, issues };
  }

  const seen = new Set<string>();
  resources.forEach((resource, index) => {
    const path = `resources[${index}]`;
    if (!isRecord(resource) || typeof resource.kind !== 'string') {
      issues.push({ path, message: 'is an object with a kind' });
      return;
    }
    if (!KINDS.has(resource.kind)) {
      issues.push({
        path: `${path}.kind`,
        message: `${resource.kind} is not a kind this build reads (${[...KINDS].join(', ')})`,
      });
      return;
    }
    if (ONCE.has(resource.kind) && seen.has(resource.kind)) {
      issues.push({ path: `${path}.kind`, message: `declares ${resource.kind} twice` });
    }
    seen.add(resource.kind);
    switch (resource.kind) {
      case 'record':
        if (typeof resource.at !== 'string' || !resource.at.trim()) {
          issues.push({ path: `${path}.at`, message: 'is the record the project runs' });
        }
        break;
      case 'place':
        placeOf(resource.at, issues);
        break;
      case 'sources':
        sourcesOf(resource.at, issues);
        break;
      case 'kinds':
        kindsOf(resource.at, issues);
        break;
      case 'clock':
        clockOf(resource.at, issues);
        break;
      case 'campaigns':
        issues.push(...campaignsOf(resource.at).issues);
        break;
      case 'status':
        if (typeof resource.at !== 'string' || !STATUS.has(resource.at)) {
          issues.push({ path: `${path}.at`, message: 'is running, idle, or offline' });
        }
        break;
      case 'layout':
        if (!isRecord(resource.at)) {
          issues.push({ path: `${path}.at`, message: 'is an object of readings to true or false' });
        }
        break;
      case 'views':
        if (!isRecord(resource.at)) {
          issues.push({ path: `${path}.at`, message: 'is an object naming the pack and the reading it opens on' });
        }
        break;
      case 'abilities':
        if (!namesOf(resource.at)) {
          issues.push({ path: `${path}.at`, message: 'is a capability name, or a list of them' });
        }
        break;
    }
  });

  if (!seen.has('record')) issues.push({ path: 'resources', message: 'declares no record' });
  if (issues.length) return { ok: false, issues };
  return { ok: true, document: { id, resources } as ProjectDocument };
}

/**
 * Prove a submission: a declaration and the run it carries.
 *
 * A project added in the frame is handed its run rather than a path, so the record is the text beside the resources and a
 * `record` resource in the list is a second answer the form does not need. That is the one difference from a document on
 * the disk, and it is checked here rather than left for the loader to discover.
 */
export function validateSubmission(
  input: unknown,
  taken: string[] = [],
): { ok: true; submission: ProjectSubmission } | { ok: false; issues: ProjectIssue[] } {
  const issues: ProjectIssue[] = [];
  if (!isRecord(input)) {
    return { ok: false, issues: [{ path: '', message: 'a submission is an object' }] };
  }
  if (typeof input.record !== 'string' || !input.record.trim()) {
    issues.push({ path: 'record', message: 'is the run the project carries' });
  }
  if (input.title !== undefined && typeof input.title !== 'string') {
    issues.push({ path: 'title', message: 'is a name, when the form was given one' });
  }
  const resources = Array.isArray(input.resources)
    ? input.resources.filter((resource) => !(isRecord(resource) && resource.kind === 'record'))
    : [];
  // The proof of a document wants a record resource; a submission's run is the text beside the resources, so the proof
  // sees one and the submission keeps the text. The submission's own fields (`title` and `record`) stay outside it: a
  // project is its id, its format, and its resources, and the proof now refuses anything else by name.
  const proof = validateProject(
    { format: input.format, id: input.id, resources: [...resources, { kind: 'record', at: 'inline' }] },
    taken,
  );
  if (!proof.ok) issues.push(...proof.issues);
  if (issues.length) return { ok: false, issues };
  return {
    ok: true,
    submission: {
      format: PROJECT_FORMAT,
      id: input.id as string,
      title: input.title as string | undefined,
      record: input.record as string,
      resources,
    },
  };
}

/** A submission as a document: the resources, and the run as the inline record the frame adds. */
export function documentOf(submission: ProjectSubmission): ProjectDocument {
  return {
    format: PROJECT_FORMAT,
    id: submission.id,
    resources: [...submission.resources, { kind: 'record', at: 'inline' }],
  };
}

/** The place a submission declares, which the form hands to the store beside the text. */
export function placeIn(submission: ProjectSubmission): Place | undefined {
  return submission.resources.find((resource) => resource.kind === 'place')?.at as Place | undefined;
}

/** The sources a submission declares. */
export function sourcesIn(submission: ProjectSubmission): SourceSpec[] {
  return (submission.resources.find((resource) => resource.kind === 'sources')?.at as SourceSpec[]) ?? [];
}
