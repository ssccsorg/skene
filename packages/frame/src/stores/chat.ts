import { create } from 'zustand';
import {
  commandOf,
  defaultChannel,
  noteOf,
  roomFor,
  type Agent,
  type Effort,
  type Link,
  type Message,
  type PendingCall,
  type Progress,
  type Room,
  type Taken,
  type ThreadSummary,
  type Written,
} from '../lib/channel';
import { host } from '../lib/host';
import { useScenario } from './scenario';

// The room: the threads a project holds, the one that is open, and the turn arriving in it.
//
// Which room answers is the project's own declaration and not this store's opinion about the space it is looking
// at, so a bundle that names the stack is read through the shell and a bundle that names nothing is read from the
// sim. The two are the same object here, which is why nothing below this line branches on it.
//
// A turn is drawn apart from the thread it is in, because a room serves it whole on every report and corrects it
// rather than appending to it: what `turn` holds is the answer as it now stands, and settling it is one move from
// `turn` into `messages`. A panel that appended each report instead would draw a turn that grew a second copy of
// itself every time the agent thought again.
//
// Nothing here is persisted. A draft not yet sent, and the fold of a reasoning block, are the pilot's own reading
// of the room and not a fact about the record, so they belong to the panel that holds them.

/**
 * One line typed while the room was in a turn, kept with the member it was said to.
 *
 * The member travels with the line rather than being the key the line is held under, because the pick a line was said to
 * can change while it waits: a queue keyed by member would send the words to whoever the pick had moved to by the time
 * the room was free.
 *
 * The files travel with it for the same reason they are taken at all: a line that waited its turn and then went without
 * the file it was written about is a line the pilot has to write again.
 */
export interface Queued {
  id: string;
  target: string;
  text: string;
  attachments?: string[];
}

/**
 * The conversation a line is being written in.
 *
 * The plus opens a tab before the room names a thread, so what is being written in has a name here whether or not the room
 * has one for it, and it is the same name the panel keys the draft it is editing under.
 */
const composer = (open: string | null): string => open ?? 'new';

interface ChatState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  /** The project these threads and this turn belong to, so another project is read rather than added to. */
  project: string | null;
  /** The room's own channel, which is a different reading from the load: a load can succeed and the room fall. */
  link: Link;
  detail: string | null;
  agents: Agent[];
  threads: ThreadSummary[];
  open: string | null;
  /** The entries of the open conversation that are loaded, oldest first. */
  messages: Message[];
  /**
   * Where the loaded entries begin in the conversation's own log, and how many it holds.
   *
   * A conversation is longer than the panel that draws it, so what is held is a window of it and these two are what an
   * earlier window is asked for: `from` is the index of the first entry drawn, so a conversation opened on its end has
   * one that is not zero, and `total` is what the room says the whole log holds.
   */
  from: number;
  total: number;
  turn: { thread_id: string; messages: Message[] } | null;
  /** The calls a turn is waiting on, which are the one thing a person answers from the panel. */
  waiting: PendingCall[];
  /** Which agents are in a turn. A key and not a list, so reading one is a read and not a search. */
  busy: Record<string, true>;
  /** The last thing a turn failed with, per agent, which is what a thread row marks and the panel names. */
  failures: Record<string, string>;
  /**
   * The lines typed while a turn was running, oldest first.
   *
   * A turn is the room being busy, and a composer that dropped the next line would throw away what a pilot wrote while
   * watching the last answer arrive. What is held here is the line and not the draft: the draft is still the pilot's to
   * keep editing, and this is the one they already sent.
   */
  queue: Queued[];
  /**
   * The files taken for a conversation, by the conversation they were taken for.
   *
   * A file is taken by the room before the line that carries it is said, so what stands here is a fact about the room and
   * not a draft: the id is what the line will name. It is keyed by the conversation for the reason a draft is, because a
   * file taken for a line about one machine is not a file to send with a line to the next and a composer that carried it
   * across would put a photograph of one cell in front of another.
   */
  attached: Record<string, Taken[]>;
  /**
   * Whether this project's room takes files, which is what the composer asks before it offers a `+`.
   *
   * It is the room's own answer and not the frame's: a chat over a record read from a file has no server to take one, and a
   * control whose every press fails is worse than no control. Read once with the room, because a room does not grow a
   * member while a window is open.
   */
  takesFiles: boolean;
  /**
   * A turn being composed from outside the console, or null.
   *
   * The space declares what a member can be asked, and the console is where a turn is said: a press in a member's own
   * reading puts the words and the addressee here, and the console takes them. It is a request and not a send, because a
   * turn costs a model call, and once it is taken the draft it became is the panel's own.
   */
  composing: { target: string; text: string } | null;
  /** Ask the console to compose a turn. Whether it is sent is the pilot's, from the console. */
  compose: (target: string, text: string) => void;
  /** Take the request, which is the console's own read, and clear it so the words land once. */
  take: () => { target: string; text: string } | null;
  /** The reasoning effort a turn runs at, which travels with the turn rather than with the thread. */
  effort: Effort;
  /**
   * How many times the frame has asked the room to answer again.
   *
   * A room that was not up when the window opened is a socket that failed once and is not retried: the frame holds no
   * second copy of what the room is, so the only thing it can do is reach for it again, and that is a count rather than a
   * flag because the second attempt has to look different from the first to the effect that makes it.
   */
  attempt: number;
  /** Reach for the room again, which is the press a pilot makes when the room was not there yet. */
  reach: () => void;
  load: (project: string) => Promise<void>;
  choose: (project: string, id: string) => Promise<void>;
  start: () => void;
  /**
   * Send a line to the room, and answer whether the room took it.
   *
   * The answer is the panel's, and it is why this is not void: a room that refused the line refused it to the person who
   * typed it, and a console that cleared the field anyway would take the words away with nothing to show for them. What
   * it answers with says what to do with the draft.
   *
   * `attachments` are the ids the room filed the files under, which only a turn carries: a note is stored for the people
   * and a command is run where the work is, and neither is given anything.
   */
  send: (project: string, agent: string, text: string, attachments?: string[]) => Promise<boolean>;
  /**
   * Take a file the pilot chose for the conversation being written in, and answer whether the room took it.
   *
   * The file itself arrives rather than its bytes, because reading it is the half that can fail before the room is ever
   * asked: a file that was moved out from under the chooser is a rejection, and one place that catches is better than two.
   *
   * A room that takes no files refuses nothing here. It has no member for this, so the composer offers no way to send one
   * and this is never reached with a file in hand.
   */
  attach: (project: string, agent: string, file: File) => Promise<boolean>;
  /** Give one up before the line goes, which is the press on the chip. */
  untake: (id: string) => void;
  cancel: (project: string, agent: string) => Promise<void>;
  decide: (project: string, call: PendingCall, allow: boolean) => Promise<void>;
  applyProgress: (progress: Progress) => void;
  applyWaiting: (waiting: PendingCall[]) => void;
  applyThreads: (threads: ThreadSummary[]) => void;
  applyAgents: (agents: Agent[]) => void;
  applyFailure: (agent: string, detail: string) => void;
  /** Hold a line until the room is free for the member it was said to. */
  enqueue: (target: string, text: string, attachments?: string[]) => void;
  /**
   * Declare work: queue a line and let the queue deliver it, which is what a declaration in the panel and a line typed in
   * the console have in common.
   *
   * A line the pilot typed goes through the console, which is where a turn is said. A line a pilot declares in the panel
   * that lists what has been declared is the same act with the same target, so it takes the same queue: two ways of saying
   * "this is the work" would be two queues, and one of them would be the one nobody drains.
   */
  offer: (target: string, text: string) => void;
  /** Drop one, which is the press on the line itself. */
  drop: (id: string) => void;
  /** Send the first line waiting for a member, which is what a turn ending is waiting for. */
  drain: (freed: string) => Promise<void>;
  /**
   * Read the window of the open conversation that stands before the one held.
   *
   * It is what a panel asks for when a reader has reached the top of what is loaded: the log above is a request away
   * rather than a longer fetch, because a conversation of a thousand turns is not read by fetching all of it.
   */
  earlier: () => Promise<void>;
  setLink: (link: Link, detail?: string | null) => void;
  setEffort: (effort: Effort) => void;
}

const rooms: Record<string, Room> = {};

/**
 * Why a shipped bundle has no room.
 *
 * Said once, so a panel that asks a bundle for a roster and a panel that asks it to run a line report the same fact.
 */
const SHIPPED = 'this build shipped its board and its runs, so it has no room to ask';

/**
 * The room a shipped bundle is answered by, which is none.
 *
 * A host that says its board and its runs are the files it shipped with has no server behind it. A read or a write here
 * is refused with the reason rather than sent to an address this build never had, which is the difference between a
 * panel that says why it is empty and a console filling with refused connections. The subscription answers with a stop
 * that stops nothing, because a panel mounts one either way.
 */
const NO_ROOM: Room = {
  read: () => Promise.reject(new Error(SHIPPED)),
  open: () => Promise.reject(new Error(SHIPPED)),
  say: () => Promise.reject(new Error(SHIPPED)),
  note: () => Promise.reject(new Error(SHIPPED)),
  cancel: () => Promise.reject(new Error(SHIPPED)),
  decide: () => Promise.reject(new Error(SHIPPED)),
  watch: () => () => {},
};

/**
 * The room a project is answered by, made once and kept.
 *
 * One room an implementation, not one a project: the sim is stateless, and the stack's room is the frame's own
 * reach to the shell and holds what the shell told it. Making one per project would throw away the roster the
 * last read saw and leave a turn's completion with nobody to report it to.
 *
 * `prove` is handed in rather than reached for inside the room: the credential belongs to the frame, and a room
 * that read the stores for itself would be a second opinion about whether this window is connected.
 */
export function roomOf(project: string): Room {
  // A shipped bundle names a channel in a board written for a deployment that had one. The files are all this build has,
  // so the declaration is answered with the reason rather than with a room resolved to an address that is not here.
  if (host().static === true) return NO_ROOM;
  const declared = useScenario.getState().projects.find((each) => each.id === project)?.channel;
  // The key is the room `roomFor` resolves, so a deployment that names its own default room is not cached under the sim.
  const key = declared ?? defaultChannel();
  rooms[key] ??= roomFor(declared, host().prove ?? (async () => {}));
  return rooms[key];
}

/** The newest thread, which is the one a panel opens on: the room's own way of saying where the work is. */
function newest(threads: ThreadSummary[]): ThreadSummary | null {
  return [...threads].sort((left, right) => right.activity_at.localeCompare(left.activity_at))[0] ?? null;
}

/**
 * The conversations of one piece of work, and the pilot's own, which belong to no declared work.
 *
 * A room holds conversations whichever way they started, and a declaration that is open scopes what is shown: the rail
 * holds the declarations and the console holds what was said about the one that is picked. It is here rather than in the
 * panels because two of them ask it, and a second spelling of the rule is how the strip and the exchange come to disagree
 * about which conversations are in front of the pilot.
 */
export function scopedThreads(threads: ThreadSummary[], work: string | null): ThreadSummary[] {
  return work ? threads.filter((thread) => !thread.work || thread.work === work) : threads;
}

/** Two lists as one, by the id the room gave each entry, so a settled turn is never drawn twice. */
function merge(messages: Message[], added: Message[]): Message[] {
  const named = new Set(messages.map((message) => message.id));
  return [...messages, ...added.filter((message) => !named.has(message.id))];
}

/**
 * The lists with the files that went taken out of them, wherever they were held.
 *
 * By id and not by conversation, because the ids are the whole of what went. A line held until the room was free goes out
 * from the conversation it was written in rather than from the one that is open when it drains, and a pilot who attached a
 * file for the next line while the last was still out must not lose it to a line that never carried it.
 */
export function withoutFiles(held: Record<string, Taken[]>, ids: string[]): Record<string, Taken[]> {
  if (!ids.length) return held;
  const gone = new Set(ids);
  const out: Record<string, Taken[]> = {};
  for (const [key, list] of Object.entries(held)) out[key] = list.filter((file) => !gone.has(file.id));
  return out;
}

const said = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** How many lines have been held, which is what gives two of them one name each. */
let held = 0;

/**
 * How many entries an earlier window asks for.
 *
 * It is the panel's own request and not the room's default: the default is what a conversation is *opened* at, and this
 * is what a reader asks for more of. One number for both would make the second window a different size from the first
 * for a reason nobody chose.
 */
export const EARLIER = 40;

export const useChat = create<ChatState>((set, get) => ({
  status: 'idle',
  error: null,
  project: null,
  link: 'connecting',
  detail: null,
  agents: [],
  threads: [],
  open: null,
  messages: [],
  from: 0,
  total: 0,
  turn: null,
  waiting: [],
  busy: {},
  failures: {},
  queue: [],
  attached: {},
  takesFiles: false,
  composing: null,
  effort: 'high',
  attempt: 0,

  reach: () => set((state) => ({ attempt: state.attempt + 1 })),

  load: async (project) => {
    // Another project is another room, so a thread open in the last one is not a thread here, and neither is the
    // roster the last read saw. A room that answers nothing, which is what a stack nobody can reach does, would
    // otherwise leave the last project's machines standing under this project's name. Holding the name would ask
    // this room for a thread it has never had, and the list is what decides what it opens on.
    if (get().project !== project) {
      set({
        project,
        agents: [],
        threads: [],
        open: null,
        messages: [],
        from: 0,
        total: 0,
        turn: null,
        waiting: [],
        busy: {},
        failures: {},
        queue: [],
        attached: {},
      });
    }
    set({ status: 'loading', error: null });
    try {
      const room = roomOf(project);
      set({ takesFiles: room.attach !== undefined });
      const { agents, threads, waiting } = await room.read(project);
      set({ status: 'ready', agents, threads, waiting, error: null });
      const first = get().open ?? newest(threads)?.id ?? null;
      if (first) await get().choose(project, first);
    } catch (error) {
      set({ status: 'error', error: said(error) });
    }
  },

  choose: async (project, id) => {
    try {
      const page = await roomOf(project).open(project, id);
      set({ open: id, messages: page.messages, from: page.from, total: page.total, turn: null, error: null });
    } catch (error) {
      set({ error: said(error) });
    }
  },

  start: () => set({ open: null, messages: [], from: 0, total: 0, turn: null }),

  send: async (project, agent, text, attachments) => {
    const body = text.trim();
    if (!body) return false;
    // The failure on record belongs to the turn before this one, so it is cleared as this turn goes out and not
    // after the room answers. A room that accepted a turn reports its end later, and one that refuses it can
    // refuse it sooner than this call returns: a clear that ran afterwards would wipe out the line it had just
    // written, which is the one case a person most needs to read.
    set((state) => ({ failures: { ...state.failures, [agent]: '' } }));
    // A line that opens with the note mark is a fact the pilot wrote rather than a turn, so it takes the other
    // half of the room and lands in it before anybody answers.
    const command = commandOf(body);
    const note = command ? null : noteOf(body);
    // Only a turn is given anything: a note is stored for the people and a command is run where the work is, so neither
    // has anywhere for a file to go and the ids are not carried.
    const carried = !command && !note && attachments?.length ? attachments : undefined;
    try {
      const room = roomOf(project);
      // A commanded line is promised a direct run. A room with no direct path is told what it cannot do rather than
      // handed a turn, because sending it as prose would spend the model call the mark exists to avoid: a promise that
      // cannot be kept is refused rather than quietly broken.
      let answer: Written;
      if (command) {
        if (!room.run) {
          throw new Error('this room runs a line as a turn and has no direct path, so the command was not run');
        }
        answer = await room.run(project, { agent, thread: get().open, text: command, effort: get().effort });
      } else if (note) {
        answer = await room.note(project, { agent, thread: get().open, text: note });
      } else {
        answer = await room.say(project, { agent, thread: get().open, text: body, effort: get().effort, attachments: carried });
      }
      const own: Message | null = answer.message_id
        ? {
            id: answer.message_id,
            thread_id: answer.thread_id || get().open || '',
            role: note ? 'note' : 'user',
            content: note ?? command ?? body,
            at: new Date().toISOString(),
          }
        : null;
      set((state) => {
        // A line that opened a conversation is the first entry of it, and a line said into one the panel already holds
        // is one more entry at its end: where a window begins does not move because its end grew.
        const opened = !!answer.thread_id && answer.thread_id !== state.open;
        // The files the room has are the room's, so the composer gives them up: a chip still standing over a line that
        // has already gone is a file the pilot would send a second time. What is emptied is what the line carried and not
        // the conversation it is drawn in, because a held line goes out from the composer it was written in and the one
        // that is open when it drains may hold files for the next line.
        const emptied = carried ? withoutFiles(state.attached, carried) : state.attached;
        return {
          // A room that cannot name the thread yet leaves the panel on the thread it has. A turn in a new thread is
          // one the server names when it ends, and the completion is what moves the panel.
          open: answer.thread_id || state.open,
          messages: own ? merge(state.messages, [own]) : state.messages,
          from: opened ? 0 : state.from,
          total: (opened ? 0 : state.total) + (own ? 1 : 0),
          attached: emptied,
          // A note and a command are not turns, so neither puts an agent in one.
          busy: note || command ? state.busy : { ...state.busy, [agent]: true },
        };
      });
      // A room that stored the line without naming the entry it made leaves the truth on the server, so the
      // thread is read back. A local id here would be one the next read disagrees with, and the same line would
      // be drawn twice.
      if (!own && answer.thread_id) await get().choose(project, answer.thread_id);
      return true;
    } catch (error) {
      set((state) => ({ failures: { ...state.failures, [agent]: said(error) } }));
      return false;
    }
  },

  cancel: async (project, agent) => {
    await roomOf(project)
      .cancel(project, agent)
      .catch(() => undefined);
    set((state) => {
      const busy = { ...state.busy };
      delete busy[agent];
      return { busy };
    });
  },

  /**
   * Take a file the pilot chose for the conversation being written in.
   *
   * The bytes are read here because the room has no path it could read for itself, so what travels is the file and never
   * its address. The conversation is read before the room is asked and not after it: a file in flight belongs to the
   * composer that asked for it, and a conversation switched in the meantime is not handed a chip it never asked for.
   */
  attach: async (project, agent, file) => {
    const room = roomOf(project).attach;
    if (!room) return false;
    const key = composer(get().open);
    const thread = get().open;
    try {
      const data = Array.from(new Uint8Array(await file.arrayBuffer()));
      const taken = await room(project, { name: file.name, thread, data });
      set((state) => ({ attached: { ...state.attached, [key]: [...(state.attached[key] ?? []), taken] } }));
      return true;
    } catch (error) {
      // The same surface a refused line lands on, because it is the same kind of thing: the pilot pressed something and
      // the room did not take it, and the line above the field is where the reason is read.
      set((state) => ({ failures: { ...state.failures, [agent]: said(error) } }));
      return false;
    }
  },

  untake: (id) =>
    set((state) => {
      const key = composer(state.open);
      return { attached: { ...state.attached, [key]: (state.attached[key] ?? []).filter((each) => each.id !== id) } };
    }),

  decide: async (project, call, allow) => {
    set({ waiting: get().waiting.filter((each) => each.tool_call_id !== call.tool_call_id) });
    await roomOf(project)
      .decide(project, call, allow)
      .catch(() => undefined);
  },

  applyProgress: (progress) => {
    set((state) => {
      const busy = { ...state.busy };
      if (progress.done) delete busy[progress.agent];
      else busy[progress.agent] = true;
      // A turn in another thread is still the room moving and the thread list says so, but the panel shows one
      // thread and does not draw a turn that is not in it. A panel with nothing open is the case a turn in a new
      // thread arrives through: there is no id to match yet, and that turn is what the panel is waiting for.
      if (state.open !== null && progress.thread_id !== state.open) return { busy };
      if (!progress.done) return { busy, turn: { thread_id: progress.thread_id, messages: progress.messages } };
      // A room may end a turn without a body. The shell's own completion carries the id the server named and
      // nothing else, because its entries were the reports along the way, so those stand.
      const settled = progress.messages.length ? progress.messages : (state.turn?.messages ?? []);
      const merged = merge(state.messages, settled);
      return {
        busy,
        open: progress.thread_id || state.open,
        messages: merged,
        // The log grew by what the turn added to it and not by what was drawn twice, and the window's own beginning is
        // where it was: a settled turn adds to the end of a conversation nobody has asked to see the start of.
        total: state.total + (merged.length - state.messages.length),
        turn: null,
      };
    });
    // A turn ending is the room becoming free, and a line held for that member is what the queue was waiting for. It is
    // sent from here rather than from inside the write above, because writing the store is what a reducer does and
    // sending a turn is not.
    if (progress.done) void get().drain(progress.agent);
  },

  enqueue: (target, text, attachments) =>
    set((state) => ({ queue: [...state.queue, { id: `q${(held += 1)}`, target, text, attachments }] })),

  offer: (target, text) => {
    // An instruction to a member is work declared, whether it is typed in the console or written in the panel that reads
    // what has been declared, so a declaration takes the one path a line takes: it is queued and the queue delivers it. A
    // member that is not in a turn is delivered to at once, because the queue is what a busy room defers and not where a
    // declaration waits for a turn that has already ended.
    get().enqueue(target, text);
    if (useChat.getState().busy[target]) return;
    void get().drain(target);
  },

  drop: (id) => set((state) => ({ queue: state.queue.filter((each) => each.id !== id) })),

  drain: async (freed) => {
    const next = get().queue.find((each) => each.target === freed);
    if (!next) return;
    // Taken out before it is sent, so a second report for the same turn finds nothing to send rather than the line
    // itself: the room's own busy flag is what usually stops that, and a queue that trusted it would send twice the
    // moment a report was repeated.
    set((state) => ({ queue: state.queue.filter((each) => each.id !== next.id) }));
    const project = get().project;
    if (project) await get().send(project, next.target, next.text, next.attachments);
  },

  earlier: async () => {
    const { project, open, from } = get();
    if (!project || !open || from <= 0) return;
    const limit = Math.min(EARLIER, from);
    const asked = open;
    try {
      const page = await roomOf(project).open(project, asked, { from: from - limit, limit });
      // A reader who moved to another conversation while the window was in flight is not handed this one's log: the
      // window is a part of the conversation it was asked about and of no other.
      set((state) =>
        state.open === asked
          ? { messages: [...page.messages, ...state.messages], from: page.from, total: page.total }
          : {},
      );
    } catch (error) {
      set({ error: said(error) });
    }
  },

  applyWaiting: (waiting) => set({ waiting }),

  applyThreads: (threads) => set({ threads }),

  // The room reports its agents' own state, which is where a machine's "in a turn" comes from rather than from
  // this side's memory of having asked it something.
  applyAgents: (agents) => set({ agents }),

  applyFailure: (agent, detail) => set((state) => ({ failures: { ...state.failures, [agent]: detail } })),

  setLink: (link, detail = null) => set({ link, detail }),

  compose: (target, text) => set({ composing: { target, text } }),

  take: () => {
    const held = get().composing;
    if (held) set({ composing: null });
    return held;
  },

  setEffort: (effort) => set({ effort }),
}));
