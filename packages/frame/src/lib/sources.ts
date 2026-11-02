// What a member holds, as one question with more than one answer.
//
// A member's lower elements are the same tree whether they are a machine's parts, a folder on the host, or a robot
// reached through a bridge. The frame asks a source for one level; the source decides where the answer comes from. The
// project declares which source a member stands on, so a mock and a real entity are two entries in the same list rather
// than two kinds of member the frame has to know about.

import type { HoldsAsk, Lower } from './channel';
import { roomOf } from '../stores/chat';
import type { SourceNode, SourceSpec } from './types';

export interface EntitySource {
  /** One level under the member, in the room's own address shape. */
  list: (ask: HoldsAsk) => Promise<Lower[]>;
}

/** One level of a declared mock tree, with the member's own address leading each row. */
function childrenOf(nodes: SourceNode[], member: string, dir: string): Lower[] {
  return nodes.map((node) => ({
    name: [member, dir, node.name].filter(Boolean).join('/'),
    dir: node.holds !== undefined,
  }));
}

/** The node a path names under the declared tree, or null when the path is not there. */
function nodeAt(nodes: SourceNode[], path: string): SourceNode | null {
  if (!path) return null;
  const [head, ...rest] = path.split('/').filter(Boolean);
  const found = nodes.find((node) => node.name === head);
  if (!found) return null;
  return rest.length ? nodeAt(found.holds ?? [], rest.join('/')) : found;
}

/** A tree the project itself declares, which is what lets a mock entity stand beside a real one. */
function mockSource(spec: SourceSpec): EntitySource {
  return {
    list: async ({ member, dir }) => {
      const at = dir ? nodeAt(spec.tree ?? [], dir) : null;
      const nodes = dir ? at?.holds ?? [] : spec.tree ?? [];
      return childrenOf(nodes, member, dir);
    },
  };
}

/**
 * A member reached over its own connection, which this build has no adapter for.
 *
 * The seam is the same as a folder's: the source answers one level and nothing above it changes. A build without the
 * adapter answers with the reason rather than an empty tree, because a robot that is not wired is a fact the member's own
 * panel has to be able to say.
 */
function bridgeSource(spec: SourceSpec): EntitySource {
  return {
    list: async () => {
      throw new Error(`the bridge at ${spec.at ?? 'no address'} is not in this build`);
    },
  };
}

/** The room's own answer, which is what a member with no declared source reads. */
function roomSource(project: string, at?: string): EntitySource | null {
  const room = roomOf(project);
  const files = room.files?.bind(room);
  if (!files) return null;
  return {
    list: (ask) => files(project, at === undefined ? ask : { ...ask, at }),
  };
}

/**
 * The source a member is read from.
 *
 * A declared source wins; a member the project says nothing about keeps the room's answer, which is every project written
 * before the resource existed. A folder source is the room's own listing with the path the project gave, because the
 * room is the surface that can reach a host's files; a bridge would add one more adapter here and no member gain a kind.
 */
export function sourceFor(
  project: string | null,
  member: string | null,
  sources: SourceSpec[] | undefined,
): EntitySource | null {
  if (!project || !member) return null;
  const spec = sources?.find((each) => each.member === member);
  if (!spec) return roomSource(project);
  if (spec.kind === 'mock') return mockSource(spec);
  if (spec.kind === 'bridge') return bridgeSource(spec);
  return roomSource(project, spec.at);
}
