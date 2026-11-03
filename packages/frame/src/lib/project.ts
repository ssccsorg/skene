// A project's own document: what a project is, and how the dashboard reads it.
//
// A project is not a folder and it is not a scenario. It is the bundle of resources that make up one
// context, and every resource is read by the kind it declares. That is what lets one project hold a
// record the engine runs, a place the demonstration draws, a storage served over MCP, or another
// project, without the app growing a vocabulary for each, and it is why nothing here names a domain:
// the title a project carries is its own record's.

import { channelNamed } from './channel';
import { campaignsNamed } from '@ssccsorg/skene-kernel';
import { kindsNamed } from './kinds';
import type { Bundle, Clock, Layout, Place, ProjectStatus, SourceSpec, Views } from '@ssccsorg/skene-kernel';

/**
 * The document format this build reads.
 *
 * A bundle that states a format is held to it, because a document from another build is a document whose resources may
 * mean something else. A bundle that states none is this build's own, which is what every project written before the
 * field existed is.
 */
export const PROJECT_FORMAT = 'project/1';

export interface ProjectDocument {
  /** The declaration's own version, when it carries one. A document without one is read as this build's format. */
  format?: string;
  id: string;
  /** A resource's value is the reader's to interpret: a string, an object, or a list of either. */
  resources: { kind: string; at: unknown }[];
}

/**
 * The board: the projects a deployment holds, and the note beside them.
 *
 * It is the document a bundle is written in rather than anything the app derives, because a deployment's projects come
 * from wherever it holds them: the demonstration's is a file the sim serves, and a deployment whose projects are folders
 * on a host answers the same shape its own way. It is here rather than with the store that reads it so that a room,
 * which is a library module, can answer it without reaching into a store.
 */
export interface BoardDocument {
  note?: string;
  projects: ProjectDocument[];
}

/**
 * The readers, one a kind. A resource of a kind with no reader is refused by name rather than
 * ignored, because a bundle read as less than it is would render wrong and say nothing.
 *
 * `project` is the kind that makes the bundle recursive: a project whose resource is another project
 * holds everything that one holds, so a device, a storage or a space can be a resource of a space
 * without any of them becoming a kind of participant.
 *
 * `channel` is a resource rather than a field of the app because the project is what decides which room answers
 * for it, and a default here (the sim) is what lets a bundle written before the kind existed read unchanged.
 *
 * `layout` is a resource for the same reason: what the frame comes up with follows from what the project is, and
 * a project that declares none takes the frame's own arrangement.
 *
 * `kinds` is a resource because the frame holds atoms and not kinds: what a machine is, what a sensor is, and what a
 * folder is are this project's assemblies of them, and a project that declares none has every member read as a name the
 * frame has never heard of.
 *
 * `views` is the project's own declaration about how the board is read: the pack it brings, the reading it opens on, and
 * the readings it stands. It is read here rather than by the store so that a project's arrangement is part of its bundle
 * like every other answer it gives about itself.
 *
 * `abilities` is what a deployment can do beside drawing a run, and it is the project's answer rather than the frame's:
 * a console that needs a live room is a deployment's fact, so the frame draws it where the project says the deployment
 * has one and nowhere else.
 *
 * `sims` is a resource the frame keeps and does not read. It is the machine vocabulary of whichever room answers for the
 * project, and the frame is one observer of a bundle among others, so a declaration that belongs to another observer is
 * carried rather than interpreted. It is a name rather than a form, and the cost of that is the frame's: a second
 * observer would add a second name here, where one carrier whose value names the observers would add none. The name is
 * kept because there is one observer, and the debt is written here so that the second one is the moment it is paid.
 */
/**
 * A project's capabilities: the names it states, and nothing that is not a name.
 *
 * One name and a list of them are one declaration, the same way a pack's name is, so a deployment that has one capability
 * does not have to learn the list's shape.
 */
function abilitiesNamed(at: unknown): string[] {
  const list = Array.isArray(at) ? at : at === undefined || at === null ? [] : [at];
  return list.filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
}

const READERS: Record<
  string,
  (at: unknown, projects: ProjectDocument[]) => unknown
> = {
  channel: (at) => channelNamed(at),
  kinds: (at) => kindsNamed(at),
  // A project's own machine vocabulary, which the frame keeps and does not read. A bundle is read by more than one
  // observer, and what stands in for a machine is the room's business: the frame refusing this would be the frame
  // deciding what a bundle may say about itself, and the frame is one reader of a bundle rather than its owner.
  sims: (at) => at,
  // The rules a room holds its units to, keyed by the same kind names `sims` answers for. It is the room's declaration
  // for the same reason: a guard stands in front of a device, and the frame draws what the guard let through.
  policy: (at) => at,
  // A member's own entity source. It is data and not a kind the frame interprets: a mock tree, a folder, and a room are
  // three answers to one question, and the reader that asks it chooses the adapter rather than the member's kind.
  sources: (at) => at as SourceSpec[],
  layout: (at) => at as Layout,
  views: (at) => at as Views,
  abilities: (at) => abilitiesNamed(at),
  record: (at) => at as string,
  status: (at) => at as ProjectStatus,
  clock: (at) => at as Clock,
  place: (at) => at as Place,
  // A campaign is a reading of the record the bundle already holds, so the reader proves its conditions and the record
  // stays the one account of the work.
  campaigns: (at) => campaignsNamed(at),
  project: (at, projects) => {
    const nested = projects.find((entry) => entry.id === at);
    if (!nested) throw new Error(`no project named ${String(at)} to hold as a resource`);
    return bundleOf(nested, projects.filter((entry) => entry !== nested));
  },
};

/**
 * A reader a pack brings for a resource kind the frame does not know.
 *
 * It is the same shape as the frame's own readers because it answers the same question, and it is registered rather than
 * added to `READERS` so that a domain arrives as a module a project names instead of as an edit here. A kind declared
 * twice is the caller's own business: the last registration answers, which is what lets a build replace a reader.
 */
export type ResourceReader = (at: unknown, projects: ProjectDocument[]) => unknown;

const EXTRA = new Map<string, ResourceReader>();

export function registerResource(kind: string, read: ResourceReader): void {
  EXTRA.set(kind, read);
}

/** Read one project's bundle, resolving every resource it declares. */
export function bundleOf(project: ProjectDocument, projects: ProjectDocument[] = []): Bundle {
  const bundle = {
    id: project.id,
    title: project.id,
    channel: 'sim',
    layout: undefined as Layout | undefined,
    abilities: [] as string[],
    record: '',
    status: undefined as ProjectStatus | undefined,
    clock: {} as Clock,
    place: {} as Place,
    sources: [] as SourceSpec[],
    resources: [] as string[],
  } as Bundle;

  if (project.format !== undefined && project.format !== PROJECT_FORMAT) {
    throw new Error(
      `project ${project.id}: is written in ${project.format}, and this build reads ${PROJECT_FORMAT}`,
    );
  }

  for (const resource of project.resources ?? []) {
    const read = READERS[resource.kind] ?? EXTRA.get(resource.kind);
    if (!read) {
      throw new Error(
        `project ${project.id}: no reader for a resource of kind ${resource.kind}, ` +
          `so this bundle cannot be read whole`,
      );
    }
    (bundle as unknown as Record<string, unknown>)[resource.kind] = read(resource.at, projects);
    bundle.resources.push(resource.kind);
  }

  if (!bundle.record) {
    throw new Error(`project ${project.id}: declares no record, so there is nothing to show`);
  }
  return bundle;
}
