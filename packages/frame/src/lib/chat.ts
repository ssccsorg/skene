// The sim's room: the demonstration's own channel, for a window with no stack.
//
// The stack is read through the shell holding this window (`stack-room.ts`), and a window with a shell is
// answered by it; the sim is what a browser and a bundle read, so the board still draws the record the build
// shipped with. Both present a `Room`, and nothing above them asks which of them it has.
//
// What this file speaks is one demo server's protocol on one port. It is a fixture of the demonstration and not
// a second way to reach a deployment: a turn over a real stack goes through the shell.
//
// A turn arrives whole on every update and corrects itself rather than growing. That is the channel's own
// statement and not this side's invention: a room that appended each report would make the panel draw a second
// copy of the turn every time the agent thought again.

import type { BoardDocument } from './project';
import type {
  Agent,
  Asked,
  Lower,
  Page,
  PendingCall,
  Progress,
  Room,
  Taken,
  ThreadSummary,
  Written,
} from './channel';

export const CHAT_PORT = 8790;

function base(): string {
  return import.meta.env?.VITE_CHAT_URL ?? `http://127.0.0.1:${CHAT_PORT}`;
}

async function ask<T>(
  path: string,
  project: string,
  body?: unknown,
  query: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${base()}${path}`);
  url.searchParams.set('project', project);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(detail.error ?? `the channel answered ${response.status}`);
  }
  return (await response.json()) as T;
}

/**
 * A read of the room that is not about one project.
 *
 * The board is what the projects are chosen from, so it is asked before there is a project to name it with. This is
 * `ask` without the query the rest of the room's verbs carry, and with the project named only where there is one: the
 * record is a project's and the board is the deployment's.
 */
async function get<T>(path: string, project?: string): Promise<T> {
  const url = new URL(`${base()}${path}`);
  if (project) url.searchParams.set('project', project);
  const response = await fetch(url);
  if (!response.ok) {
    const detail = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(detail.error ?? `the channel answered ${response.status}`);
  }
  return (await response.json()) as T;
}

/**
 * A request whose body is the thing itself rather than a record of it, which is what taking a file is.
 *
 * The name and the conversation travel in the query and the bytes are the body, which is the shape the gateway's own
 * upload route takes. That is not an imitation for its own sake: a deployment's room and this one are then reached by one
 * request, so a window that can hand a file to one can hand it to the other.
 */
async function upload<T>(
  project: string,
  path: string,
  // The view is over a buffer and not over whatever a caller happened to hand in, which is what the fetch body takes: a
  // view of a shared buffer is not something this side would ever send, and the type is where that is said.
  body: Uint8Array<ArrayBuffer>,
  query: Record<string, string>,
): Promise<T> {
  const url = new URL(`${base()}${path}`);
  url.searchParams.set('project', project);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/octet-stream' },
    body,
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(detail.error ?? `the channel answered ${response.status}`);
  }
  return (await response.json()) as T;
}

/** What the sim pushes on its socket, in the one list of shapes the socket may carry. */
type Push =
  | { type: 'agents'; agents: Agent[] }
  | { type: 'threads'; threads: ThreadSummary[] }
  | { type: 'pending'; pending: PendingCall[] }
  | ({ type: 'progress' } & Progress);

export function simRoom(): Room {
  return {
    read: async (project) => {
      const [agents, threads, waiting] = await Promise.all([
        ask<Agent[]>('/v1/agents', project),
        ask<ThreadSummary[]>('/v1/threads', project),
        ask<PendingCall[]>('/v1/pending', project),
      ]);
      return { agents, threads, waiting };
    },

    open: async (project, thread, window) => {
      const query: Record<string, string> = {};
      if (window?.from !== undefined) query.from = String(window.from);
      if (window?.limit !== undefined) query.limit = String(window.limit);
      return await ask<Page>(`/v1/threads/${encodeURIComponent(thread)}`, project, undefined, query);
    },

    say: (project, body) =>
      ask<Written>('/v1/chat', project, {
        agent: body.agent,
        thread_id: body.thread,
        message: body.text,
        effort: body.effort,
        attachments: body.attachments ?? [],
      }),

    note: (project, body) =>
      ask<Written>('/v1/notes', project, { agent: body.agent, thread_id: body.thread, message: body.text }),

    // The sim has no model to call, so a line it is commanded to run and a line it is asked are the same line: the
    // device own commands are what the room answers either way. A deployment whose room does call a model is the one
    // that needs the direct path apart, and that room is the shell.
    run: (project, body) =>
      ask<Written>('/v1/chat', project, {
        agent: body.agent,
        thread_id: body.thread,
        message: body.text,
        effort: body.effort,
        attachments: body.attachments ?? [],
      }),

    // The file is taken at this room's address, so what holds it is the sim and not the window: the composer draws what
    // the room filed, which is the whole reason the bytes travel rather than a path the sim would have to resolve. The
    // name travels in the query and the bytes are the body, which is the shape the gateway's own upload route takes. The
    // conversation is not sent, because a mock with no store to file into keeps one pile per project: what says which file
    // goes where is the line that carries the id.
    attach: async (project, body) =>
      await upload<Taken>(project, '/v1/attachments', new Uint8Array(body.data), { name: body.name }),

    // What a member says it can be asked. The sim answers with the commands of the machine it stands in for, in that
    // machine's own words, and with nothing for a member it has no such machine for: a member that can only be read is a
    // member with nothing to run, and the console exposes no control rather than one the room would refuse.
    asks: async (project, member) => await ask<Asked[]>('/v1/asks', project, undefined, { member }),

    cancel: async (project, agent) => {
      await ask<unknown>('/v1/cancel', project, { agent });
    },

    // The board and the records this room is the mock of. The demonstration's projects are a file and its records are
    // the engine's own texts, and both are served from this room's address rather than left to the window's own build:
    // what the frame draws is then an answer from an implementation of the contract, which is what makes a real board
    // or a real volume the same window with another room behind it.
    board: () => get<BoardDocument>('/v1/board'),
    record: async (project) => {
      const found = await get<{ text: string }>('/v1/record', project);
      return found.text;
    },

    // What a member holds, which the sim answers from the host's own tree: a repository a project names is a repository
    // that exists, and a path that is not there is an empty listing. The three fields travel as they stand, because the
    // room is what turns them into a reading: the member is the namespace the answer is stated in and `at` is where the
    // elements live, and a window that resolved either for the room would be a second opinion about the deployment.
    files: async (project, body) => {
      const found = await ask<{ files: Lower[] }>('/v1/files', project, undefined, {
        member: body.member,
        at: body.at,
        dir: body.dir,
      });
      return found.files;
    },

    decide: async (project, waiting, allow) => {
      await ask<unknown>('/v1/resolve', project, {
        agent: waiting.agent,
        platform_thread_id: waiting.platform_thread_id,
        tool_call_id: waiting.tool_call_id,
        allow,
      });
    },

    watch: (project, watchers) => {
      watchers.link('connecting');
      // The room's socket, which carries what the panel cannot ask for: a turn arriving, and a call waiting.
      let socket: WebSocket;
      try {
        socket = new WebSocket(`${base().replace(/^http/, 'ws')}/chat?project=${encodeURIComponent(project)}`);
      } catch (error) {
        watchers.link('error', String(error));
        return () => {};
      }

      socket.addEventListener('open', () => watchers.link('live'));
      socket.addEventListener('close', () => watchers.link('closed'));
      socket.addEventListener('error', () => watchers.link('error', 'the room refused'));
      socket.addEventListener('message', (event) => {
        let push: Push;
        try {
          push = JSON.parse(String(event.data)) as Push;
        } catch {
          return;
        }
        if (push.type === 'progress') watchers.progress(push);
        else if (push.type === 'pending') watchers.waiting(push.pending);
        else if (push.type === 'agents') watchers.agents(push.agents);
        else if (push.type === 'threads') watchers.threads(push.threads);
      });

      return () => socket.close();
    },
  };
}
