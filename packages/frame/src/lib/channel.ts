// The room's vocabulary, and the seam a project's channel answers through.
//
// A project declares which channel answers for its room, and the frame asks that room the same questions
// whichever it is: what stands there, what a thread holds, what a turn said, and what a call is waiting on.
// The sim that stands in front of the engine and the shell that has already reached the stack answer those
// questions in their own ways, and the difference stops here. Nothing above this file asks which it is talking
// to, which is what keeps a panel from being written twice.
//
// The readings at the end belong here rather than with either room, because what they read is the envelope
// both rooms send. A message's mark, its reasoning runs, its tool call and its time are the shape of a
// `Message`, so a reading written against one room's habits would be wrong about the other room's facts.

import type { BoardDocument } from './project';
import type { Channel } from './types';
import { simRoom } from './chat';
import { host } from './host';

export type Role = 'user' | 'assistant' | 'note' | 'system';

/** The reasoning effort a turn runs at, which is the provider's own scale. */
export type Effort = 'low' | 'high' | 'max';

/**
 * The three, in the order they are offered.
 *
 * The type is the contract and this is its list, kept beside it because a control that spelled the three out would be the
 * fourth place the scale is written and the one that goes stale when the provider adds a level.
 */
export const EFFORTS: readonly Effort[] = ['low', 'high', 'max'];

/** One entry of a thread, as the room gives it. */
export interface Message {
  id: string;
  thread_id: string;
  role: Role;
  content: string;
  entry_type?: 'prose' | 'tool_call';
  tool_name?: string;
  tool_status?: string;
  author?: string;
  at: string;
}

export interface ThreadSummary {
  id: string;
  agent: string;
  title: string | null;
  message_count: number;
  created_at: string;
  /** When the thread last moved, which is the order the list is drawn in. */
  activity_at: string;
  /**
   * The work this thread is the conversation of, by the address the record gives it.
   *
   * A room holds conversations whichever way they started: the pilot's own, and one that belongs to a piece of work
   * the record declared. The two are the same kind of row, so a room says which a row is rather than a panel working
   * it out from a title. Absent means a conversation that belongs to no declared work, which is what a turn the pilot
   * started is.
   */
  work?: string;
}

/** A participant of the space that can be asked to do something: a machine, or the workspace itself. */
export interface Agent {
  id: string;
  kind: string;
  status: 'ready' | 'busy' | 'off';
  capabilities: { approval: boolean };
}

/** A tool call a turn made and is waiting on, which is the one thing a person can answer from the panel. */
export interface PendingCall {
  /** The agent whose turn is standing, because a room holds more than one and a call belongs to one of them. */
  agent: string;
  tool_call_id: string;
  platform_thread_id: string;
  tool_name: string;
  detail?: string;
}

/** A turn as it arrives: the entries so far, in order, and whether the turn is finished. */
export interface Progress {
  agent: string;
  thread_id: string;
  messages: Message[];
  done: boolean;
}

/** Whether the room itself is reachable, which is a different question from whether what stands behind it is up. */
export type Link = 'connecting' | 'live' | 'closed' | 'error';

/**
 * What each of the four says, in the words a panel shows.
 *
 * The words are here and not at the panel for the same reason the reading is: whether a room answers is one fact about
 * one contract, and two panels that named it in their own words would be two answers to it. It is the room's own state
 * and not the record's, which is the distinction that costs a pilot the most when it is not drawn: a board read from a
 * file draws with nothing answering at all, so a frame that reported only the record would report a session as whole
 * while every turn went nowhere.
 */
export const LINK_WORDS: Record<Link, string> = {
  connecting: 'the room has not answered yet',
  live: 'the room answers',
  closed: 'the room closed its socket',
  error: 'the room refused',
};

/** What a room holds before anything is opened in it. */
export interface RoomState {
  agents: Agent[];
  threads: ThreadSummary[];
  waiting: PendingCall[];
}

/**
 * What a write answered with.
 *
 * A room that cannot name the entry it made answers null, and the panel reads the thread back instead. A local
 * id invented here would be one the next read disagrees with, and the store joins a turn to the thread it
 * settles into by id, so that entry would be drawn twice.
 */
export interface Written {
  thread_id: string;
  message_id: string | null;
}

/**
 * One thing a member says it can be asked, in the member's own words.
 *
 * An ability is a name in the place's declaration, and a name says what a member is for and nothing about whether a line
 * to it can be run. What the console draws a control from is therefore not the declaration but the member's own answer,
 * because only the member's side knows what it can do with a line: a machine that runs its commands answers with them, and
 * a deployment that has no executor-side path answers with none.
 */
export interface Asked {
  /** What the member calls it, which is what a line carries and what the control is named. */
  name: string;
  /** What it does, in the member's own words, which the control says on rollover. */
  does: string;
}

/**
 * A file a room has taken for a conversation: what a line carries back, and what the composer draws before it goes.
 *
 * The id is the whole of what a line needs, because a room holding the file does not need telling what it is called. The
 * name and the size are the composer's own reading, which is what a chip says while the line is still being written.
 */
export interface Taken {
  id: string;
  name: string;
  bytes: number;
}

/** One thing said: a turn when an agent runs it, and a note when the pilot says it to the people. */
export interface Say {
  agent: string;
  thread: string | null;
  text: string;
  effort: Effort;
  /**
   * The files that go with the line, by the id the room filed each under.
   *
   * A line carries ids and not the files, because the file is taken before the line is said: the room already holds it,
   * and a line that carried the bytes again would send the same file twice. A room that takes no files is never handed
   * one, so this is empty or absent rather than an error.
   */
  attachments?: string[];
}

/**
 * One window of a conversation, and where in the log it sits.
 *
 * A conversation is longer than the panel that draws it, so a room answers a window of it rather than the whole of it:
 * `from` is the index of the first entry the window holds and `total` is how many the thread holds, which together are
 * what the window before it is asked for. A room with nothing to hide answers one page whose `from` is zero, which is
 * the same shape as a page of a longer conversation and is what keeps the panel from having two cases.
 */
export interface Page {
  messages: Message[];
  from: number;
  total: number;
}

/**
 * Which window of a conversation to answer with.
 *
 * An absent `from` is the newest `limit` entries, which is where a conversation is opened: nobody arrives at a
 * conversation at its beginning. An absent `limit` is the room's own default, because how much of a log is worth
 * sending is a fact about the room and not about the panel asking.
 */
export interface Ask {
  from?: number;
  limit?: number;
}

/** Where a room's pushes go. */
export interface Watchers {
  link: (link: Link, detail?: string | null) => void;
  agents: (agents: Agent[]) => void;
  threads: (threads: ThreadSummary[]) => void;
  /**
   * The calls the room is holding, whole.
   *
   * Whole rather than an agent's own, because a room that reports one agent at a time is free to gather them and
   * one that reports its own list is already there: a contract that said "these replace that agent's" would
   * append the whole list to itself at the room that has only one list to give.
   */
  waiting: (waiting: PendingCall[]) => void;
  progress: (progress: Progress) => void;
  /**
   * A turn that failed after the room accepted it.
   *
   * The sim refuses a turn in the answer to the call, so that failure is the caller's to catch. A room whose
   * write resolves only when the turn is over has nothing left to refuse, and reports the failure here.
   */
  failure: (agent: string, detail: string) => void;
}

/** One lower element a room can list: its name, and whether it is something that holds more of its own. */
/** One row of a member's own level, as the room states it: the address, and whether it holds more. */
export interface Lower {
  /**
   * The address of the element, which leads with the member it belongs to.
   *
   * It is the room's own answer and not a name the window made up: a member's elements are read from wherever the place
   * points them, so an address that did not say whose it was would not be resolvable. What leads it is therefore the
   * member, which is the same name a line about the element goes to and the same name a reader of the record resolves.
   */
  name: string;
  dir: boolean;
}

/**
 * One level of a member's own elements, as the room is asked for it.
 *
 * The member is the name the answer is stated under; `at` is where the member's own elements live in this room's terms,
 * which the place declares, because a member's name and the folder it stands for are two facts and neither implies the
 * other. A room that can resolve a member for itself ignores `at`, and the stack room cannot: the shell has no place, so
 * the window hands it the root the deployment's own board declared.
 *
 * `dir` is the level within the member, empty for the member's own level, so one level and the whole tree are one question
 * and a room answers a member's tree with one answer per level asked.
 */
export interface HoldsAsk {
  member: string;
  at: string;
  dir: string;
}

/**
 * The room a project is answered by.
 *
 * `note` carries no effort because a note is stored and not run, so there is no level for it to run at. Every
 * verb takes the project: the shell's own commands already know which stack they are on and ignore it, and the
 * sim needs it because one server answers for every project it holds.
 *
 * `files` is the one member a room may not have, and its absence is an answer: a room that keeps no files cannot
 * list what a participant holds, and the panel that asked says so rather than drawing an empty list. That is the
 * whole of it, so the optional member is how a capability is really asked for and not a placeholder.
 */
export interface Room {
  read: (project: string) => Promise<RoomState>;
  /**
   * What a conversation holds, as the window asked for.
   *
   * The window is the panel's own request and never this file's decision: a conversation is longer than any panel, so
   * which part of it is drawn is a question about what the reader is doing, and the room answers the part it is asked
   * for and says where that part sits.
   */
  open: (project: string, thread: string, window?: Ask) => Promise<Page>;
  say: (project: string, body: Say) => Promise<Written>;
  /**
   * Say something to the people in a conversation, which runs no turn and so takes no effort and no files.
   *
   * Both are taken off the body rather than left optional, because a note has nowhere for either to go: a room that was
   * handed ids would drop them in silence, and one that was handed an effort would have nothing to run at.
   */
  note: (project: string, body: Omit<Say, 'effort' | 'attachments'>) => Promise<Written>;
  /**
   * Run a line where the work is, without a turn: what a commanded line is promised.
   *
   * A room that has this runs the words itself, so the line costs no model call. A room that has it not is asked
   * nothing, and the frame refuses a commanded line rather than quietly sending it as a turn, because the promise the
   * mark makes is the point of the mark. It is the seam a machine's own commands come through, and the one place a
   * deployment that has no executor-side path says so.
   */
  run?: (project: string, body: Say) => Promise<Written>;
  cancel: (project: string, agent: string) => Promise<void>;
  decide: (project: string, call: PendingCall, allow: boolean) => Promise<void>;
  watch: (project: string, watchers: Watchers) => () => void;
  /**
   * One level of a member's own elements, stated under the member.
   *
   * The optional member again, and this one is asked per level rather than whole: a room answers another level for every
   * level asked, so a tree is unbounded by the room and bounded by whoever reads it (`HELD_DEPTH`).
   */
  files?: (project: string, ask: HoldsAsk) => Promise<Lower[]>;
  /**
   * Take a file for a conversation, and answer what a line carries back.
   *
   * The bytes come through the window, because the file is one a person chose in this frame and the server has no path it
   * could read for itself: what the frame holds is the bytes and never the file. The optional member again, and for the
   * same reason as `files` and `board`: a room that takes no files answers nothing here, so the composer offers no way to
   * send one rather than a control whose every press fails.
   */
  attach?: (project: string, body: { name: string; thread: string | null; data: number[] }) => Promise<Taken>;
  /**
   * What a member says it can be asked, and nothing about a member this room has no answer for.
   *
   * The optional member again, and this one is where the console learns whether a control is possible at all: a name in
   * the place's declaration is a name, while what a line to the member costs and where it runs is the member's own answer.
   * A room that answers nothing here is a deployment with no executor-side path, so the console exposes no control rather
   * than one whose every press is refused, and the pilot writes the line where every line is written.
   */
  asks?: (project: string, member: string) => Promise<Asked[]>;
  /**
   * The board this deployment holds: the projects a window can open, and the note beside them.
   *
   * The optional member again, and for the same reason as `files`: where a deployment's projects come from is the
   * deployment's own fact. The sim holds the demonstration's board and serves it, so the window reads the spaces it
   * draws from an implementation of this contract rather than from its own build; a deployment whose projects are the
   * folders on a host answers the same shape from its own tree; and a room that answers nothing here leaves the window
   * the files it was built with, which is what the cockpit did before this existed.
   *
   * It is not per project, because the board is what the projects are chosen from: asking one project's room for the
   * list of projects would be asking a space which spaces there are.
   */
  board?: () => Promise<BoardDocument>;
  /**
   * One project's record, as the text the engine wrote for it.
   *
   * A project declares the record it runs, and a room that holds that record answers it here rather than leaving the
   * window to read the file the declaration names: the demonstration's records are the mock this room is, and a
   * deployment's are the volume it keeps. The text is the engine's own file, because that is what the reading of a run
   * is derived from, and a room that answered a fold instead would be answering a reading of its own about a format
   * the frame already reads.
   */
  record?: (project: string) => Promise<string>;
}

/** How a room is made: the one thing an implementation needs from the frame, and the frame's to hand over. */
export type Prove = () => Promise<void>;

/**
 * The channels a project can name, by the name it declares.
 *
 * A register and not a switch, so a third channel (a repository on this machine, a device's own store) is a new file
 * and a line here, and nothing above this line learns about it. A name with nothing registered against it is refused
 * where a bundle is read, the way a resource of a kind with no reader is: a project read as less than it is would
 * render wrong and say nothing.
 */
const CHANNELS: Record<string, (prove: Prove) => Room> = {
  sim: simRoom,
};

/**
 * Put a room in the register, where the deployment that answers for it is written.
 *
 * A room is a deployment's, not the frame's: the sim is the demonstration's and every other room arrives from whoever
 * holds the shell behind it. A name registered twice is the caller's own business; the last one answers.
 */
export function registerRoom(name: string, make: (prove: Prove) => Room): void {
  CHANNELS[name] = make;
}

/**
 * Whether the room a project names nothing for is the stack's.
 *
 * A window a launcher started has a shell, and a shell is a stack: the room that answers it is the
 * stack's. A browser and a bundle have no shell, and the sim is what a window with no stack reads, so
 * a board still draws the record the build shipped with.
 */
/**
 * The channel a project that names none is answered by.
 *
 * A window a launcher started has a shell, and a shell is a stack: the room that answers it is the
 * stack's. A browser and a bundle have no shell, and the sim is what a window with no stack reads, so
 * a board still draws the record the build shipped with. It is one answer read by the board and by
 * every project that declares no channel, because two rules would let the two disagree.
 */
export function defaultChannel(): Channel {
  return host().roomByDefault?.() ?? 'sim';
}

/**
 * The room a deployment's board comes from, before any project is in hand.
 *
 * A board has to be read before the projects it names exist, so this is the one room that is resolved without a
 * project to declare it. It is the stack's where there is a shell, which is what a launcher hands a window, and the
 * sim's where there is none. The member is optional either way, so a room that does not answer it leaves the window
 * the files it was built with rather than failing the read.
 */
export function defaultRoom(prove: Prove): Room {
  return CHANNELS[defaultChannel()](prove);
}

/** The channel a project declares, held to what is registered rather than trusted. */
export function channelNamed(name: unknown): Channel {
  if (typeof name === 'string' && name in CHANNELS) return name;
  throw new Error(`no channel named ${String(name)} to answer for this project's room`);
}

/**
 * Which room answers for a project.
 *
 * A project that names a channel is answered by that one. A project that names none is answered by the stack where
 * this window has a shell and by the sim where it does not, which is the same rule the board is read by: the sim is
 * the demonstration's room, and a project written before the field existed is read from the room the window is
 * actually over. `prove` is handed to the stack's room rather than reached for inside it: the credential belongs to
 * the frame, and a room that read the stores for itself would be a second opinion about whether this window is
 * connected.
 */
export function roomFor(declared: Channel | undefined, prove: Prove): Room {
  return CHANNELS[declared ? channelNamed(declared) : defaultChannel()](prove);
}

/** The mark a note opens with, which is the client's convention and the other half of the command mark. */
export const NOTE_MARK = ';';

/**
 * A line that opens with the note mark is a note and not a turn.
 *
 * The mark is the client's convention rather than either room's: a note is a fact somebody who is not the
 * executor wrote, and the cheap way to say so while typing is one character. What is returned is the body with
 * the mark taken off, or null when the line is a turn.
 */
export function noteOf(text: string): string | null {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith(NOTE_MARK)) return null;
  const body = trimmed.slice(NOTE_MARK.length).trim();
  return body || null;
}

/** The mark a commanded line opens with, which is the client's convention and the promise a line carries. */
export const COMMAND_MARK = ':';

/**
 * A line that opens with the command mark is a command and not a turn.
 *
 * The mark is a promise about cost: the line is run where the work is and no model is called, which is what makes a
 * device's own command something a pilot may press, and what keeps a line that is meant to execute from being answered
 * as prose. A room with no direct path is asked nothing, so a promise that cannot be kept is refused rather than spent.
 * What is returned is the body with the mark taken off, or null when the line is not a command.
 */
export function commandOf(text: string): string | null {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith(COMMAND_MARK)) return null;
  const body = trimmed.slice(COMMAND_MARK.length).trim();
  return body || null;
}

/** The name a thread goes by: the first thing said in it, as one line. */
export function threadTitle(text: string, max = 40): string {
  const line = text.trim().split('\n').find((each) => each.trim()) ?? '';
  return line.trim().slice(0, max);
}

export const isToolCall = (message: Message): boolean => message.entry_type === 'tool_call';

/**
 * A body split into the runs the panel draws apart: what the agent said, and the run it reasoned in.
 *
 * The engine's own answer carries its reasoning inline, so the split is on the tag rather than on a field, and
 * the unterminated branch is deliberate: a turn that is still arriving ends in an open tag, and a reader that
 * dropped it would drop the half of the reasoning that has already arrived.
 */
export function splitThinking(content: string): { kind: 'text' | 'thinking'; text: string }[] {
  const runs: { kind: 'text' | 'thinking'; text: string }[] = [];
  const pattern = /<thinking>([\s\S]*?)(?:<\/thinking>|$)/g;
  let at = 0;
  for (const match of content.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > at) runs.push({ kind: 'text', text: content.slice(at, start) });
    if (match[1]) runs.push({ kind: 'thinking', text: match[1] });
    at = start + match[0].length;
  }
  if (at < content.length) runs.push({ kind: 'text', text: content.slice(at) });
  return runs.filter((run) => run.text.trim());
}

/**
 * What a tool call says, read from its own body.
 *
 * A call arrives as one entry whose head is a line and whose body is what the tool wrote, so the name and the
 * status are read out of the text rather than out of fields the room may not carry. A head that does not parse
 * falls back to the entry's own name and status with the whole body as the tool's output.
 */
export function toolParts(message: Message): { label: string; status: string; body: string } {
  const lines = message.content.split('\n');
  const head = lines[0]?.match(/^\*\*Tool Call:\s*(.*?)\*\*$/);
  const status = lines[1]?.match(/^Status:\s*(.*)$/);
  if (head) {
    return { label: head[1], status: status?.[1]?.trim() ?? message.tool_status ?? '', body: lines.slice(2).join('\n').trim() };
  }
  return { label: message.tool_name ?? 'tool call', status: message.tool_status ?? '', body: message.content.trim() };
}

/** Where a tool call stands, as the one mark the panel draws for it. */
export function statusOf(status: string): 'running' | 'done' | 'failed' | 'waiting' | 'none' {
  const word = status.toLowerCase();
  if (!word) return 'none';
  if (/await|wait|pending|approval/.test(word)) return 'waiting';
  if (/complete|done|allow/.test(word)) return 'done';
  if (/fail|error|refus|den/.test(word)) return 'failed';
  return 'running';
}

/** The time a message was written, as a row reads it: the hour, and the day when it is not today. */
export function timeOf(at: string, now = new Date()): string {
  const when = new Date(at);
  if (Number.isNaN(when.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  const clock = `${pad(when.getHours())}:${pad(when.getMinutes())}`;
  const sameDay = when.getFullYear() === now.getFullYear() && when.getMonth() === now.getMonth() && when.getDate() === now.getDate();
  return sameDay ? clock : `${pad(when.getMonth() + 1)}-${pad(when.getDate())} ${clock}`;
}
