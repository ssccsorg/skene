import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AtSign, Paperclip, RotateCw, Send, Square, X } from 'lucide-react';
import { Button } from './ui/button';
import { Hint } from './ui/hint';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { commandOf, EFFORTS, LINK_WORDS, noteOf, type Message } from '../lib/channel';
import { drawn } from '../hooks/useRoom';
import { CONTROL, END_SLACK, ROW } from '../lib/chrome';
import { firstMention, mentionAt, withoutMention } from '../lib/mention';
import { offersFor, skillsOf, type Offered } from '../lib/offer';
import { cn } from '../lib/utils';
import { scopedThreads, useChat, type Queued } from '../stores/chat';
import { host } from '../lib/host';
import { useSelection } from '../stores/selection';
import { ChatEntry } from './ChatEntry';

/**
 * The exchange with the room: the conversation that is open, the turn arriving in it, and the field the next line is
 * written in.
 *
 * It is the chat the layer is driven from, and it is a chat because driving a workspace is a conversation
 * with it: what the pilot types is a declaration, the agent named for it takes it, and what comes back is
 * what it did. The thing that is not like a chat room is who answers. The names here are the space's own, so a
 * machine and a person answer in the same exchange the project's files do, which is the whole claim: a machine and a
 * folder are two payloads under one envelope.
 *
 * Who a line goes to is the pick, which is the whole of how this panel knows who is meant: the member a pilot has on the
 * board is the member they are talking to, and the mark above the field says which one that is. The space is what says a
 * member can be given work, so a pick that is not one is not an addressee and the line goes to the project itself. A
 * member whose kind is open to a conversation and one whose kind is a fixed set of commands are the same question asked
 * of two declarations, which is why the mark is the pick rather than a list of names: a control that adapts to what an
 * entity is has nowhere to stand in a list of every entity there is.
 *
 * One input carries both edges of the room. A line that reads as a directive still moves the board (the
 * panel is handed that reading), and anything else is a turn, so the picture and the words are two
 * resolutions of one channel rather than two ways to work.
 *
 * Which conversations are in front of the pilot is the strip above this panel, which is scoped to the work that is open.
 * That is what keeps this panel from reading as a second copy of the rail: the rail holds the declarations, and this
 * holds what was said about the one that is picked.
 */
export function Chat({
  project,
  targets,
  skills,
  interpret,
  work,
  onAddress,
}: {
  project: string;
  /** The members a turn may be addressed to: the project itself, and every member the space says writes. */
  targets: string[];
  /**
   * What each member answers, by name.
   *
   * A member's abilities are what a line can ask it for, so naming the member opens them: the second list is the
   * member's own interface and not another reading of the space. The map is the room's answer already read for the
   * offer, so a skill offered here is a skill the room answered for that member.
   */
  skills: Record<string, string[]>;
  interpret?: (text: string) => string | null;
  /** The address of the work that is open, which is what the list is scoped to. Null is every conversation. */
  work?: string | null;
  /**
   * Say who the next line is for, which is the pilot picking an addressee from the menu.
   *
   * The addressee is the pick and not a second value, so choosing here is choosing on the board: the console hands the
   * member over rather than holding a name of its own, and a pick made in the space moves this mark because it is the
   * same name. `null` is the project, which is what a pilot addresses when they mean the work itself.
   */
  onAddress?: (member: string | null) => void;
}) {
  const [said, setSaid] = useState<Message[]>([]);
  const all = useChat((state) => state.threads);
  const open = useChat((state) => state.open);
  const messages = useChat((state) => state.messages);
  const from = useChat((state) => state.from);
  const earlier = useChat((state) => state.earlier);
  const turn = useChat((state) => state.turn);
  const waiting = useChat((state) => state.waiting);
  const busy = useChat((state) => state.busy);
  const failures = useChat((state) => state.failures);
  const queue = useChat((state) => state.queue);
  const drop = useChat((state) => state.drop);
  const enqueue = useChat((state) => state.enqueue);
  const takesFiles = useChat((state) => state.takesFiles);
  const attached = useChat((state) => state.attached);
  const attach = useChat((state) => state.attach);
  const untake = useChat((state) => state.untake);
  const effort = useChat((state) => state.effort);
  const status = useChat((state) => state.status);
  const error = useChat((state) => state.error);
  const link = useChat((state) => state.link);
  const detail = useChat((state) => state.detail);
  const reach = useChat((state) => state.reach);
  const send = useChat((state) => state.send);
  const cancel = useChat((state) => state.cancel);
  const decide = useChat((state) => state.decide);
  const setEffort = useChat((state) => state.setEffort);

  // The draft belongs to the conversation it is being written in. Switching tabs is switching subjects, and a composer
  // that carried one draft across them would put a sentence meant for an arm in front of a pump. A conversation the room
  // has not named yet is a draft of its own, which is the one the plus opens.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draftKey = open ?? 'new';
  const draft = drafts[draftKey] ?? '';
  // The files taken for the conversation being written in, which are keyed as the draft is and for the same reason.
  const files = attached[draftKey] ?? [];
  // The mention the field is standing in, and which of the members it offers is under the keyboard. The offer is the
  // field's own state and not the console's: what it names is what the line is about to become, and the addressee it
  // resolves to is the console's one value, which is why choosing writes nothing into the text.
  //
  // It carries the conversation it was read from, because a caret's offsets mean nothing in another draft: a tab switched or
  // a turn that named a new thread while the offer stood would otherwise leave it standing over a sentence it never read,
  // and `withoutMention` would take a slice of that sentence out. Whether an offer is live is asked once, here.
  const [mention, setMention] = useState<{ key: string; start: number; query: string } | null>(null);
  // The member whose abilities stand over the field after it is named. A skill is a leaf of the member, so naming the
  // member is the first half of saying what to do and the second half is this list.
  const [skillAt, setSkillAt] = useState<{ key: string; member: string } | null>(null);
  const [standing, setStanding] = useState(0);
  const field = useRef<HTMLTextAreaElement>(null);

  /**
   * Open the offer without the pilot typing the `@`.
   *
   * The button is a way into the same list, so it does what the keystroke does: it puts the `@` where the caret stands and
   * opens the offer over it. A list that opened without the character would be a list whose choice has no mark in the draft
   * to resolve, and the sentence sent would be the pilot's words with a name somewhere the reader cannot see where it is.
   */
  const openMentions = () => {
    const element = field.current;
    const caret = element?.selectionStart ?? draft.length;
    const head = draft.slice(0, caret);
    const gap = head && !/\s$/.test(head) ? ' ' : '';
    const start = head.length + gap.length;
    writeDraft(`${head}${gap}@${draft.slice(caret)}`);
    setMention({ key: draftKey, start, query: '' });
    setStanding(0);
    window.requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + 1, start + 1);
    });
  };

  /**
   * Write the draft of the conversation in force, and close the offer.
   *
   * Every write to the draft goes through here, which is what keeps the offer from outliving the sentence it was read from:
   * what it stands over is a caret in a sentence someone is typing, and a draft that was replaced under it is not that
   * sentence. The field opens it again as it is typed into, which is the one caller that means to.
   */
  const writeDraft = (next: string | ((held: string) => string)) => {
    setDrafts((held) => ({ ...held, [draftKey]: typeof next === 'function' ? next(held[draftKey] ?? '') : next }));
    setMention(null);
    setSkillAt(null);
    setStanding(0);
  };

  const log = useRef<HTMLDivElement>(null);
  const entries = useRef<HTMLDivElement>(null);
  /** The window's own file chooser, which the `+` presses: a button cannot open one, so one is kept and hidden. */
  const picker = useRef<HTMLInputElement>(null);
  // Whether the view follows the end. A pilot who has scrolled up is reading, and what they are reading is the reason the
  // reports are worth following at all.
  const follow = useRef(true);
  // A turn the space composed: the panel that offers a member's abilities puts the words here, and the console is where a
  // turn is said, so it takes them into the draft. It is taken rather than read, so the words land once and are the
  // pilot's from then on.
  const composing = useChat((state) => state.composing);
  const take = useChat((state) => state.take);
  const threads = useMemo(() => scopedThreads(all, work ?? null), [all, work]);
  const shown = [...drawn(messages, turn), ...said];

  // What the next line is said to: the member the pilot has picked, as `@`. This is where the console adapts to what is on
  // the board rather than to a list of names: what a member can be asked is that member's own declaration, so the pick is
  // how a pilot says which member they mean, and the composer follows it. A pick the space cannot give work to is not an
  // addressee, and the line falls next to the member the open conversation is already with, which is what the tab says,
  // and then to the project itself. The order is what keeps the mark and the tab from disagreeing about who answers.
  const picked = useSelection((state) => state.unit);
  const inThread = threads.find((thread) => thread.id === open)?.agent ?? null;
  const target =
    picked && targets.includes(picked)
      ? picked
      : inThread && targets.includes(inThread)
        ? inThread
        : project;
  const here = waiting.filter((call) => call.agent === target);

  /**
   * The offer the field is standing in, which is the one read from the draft on screen.
   *
   * It is asked as one value rather than compared at each use, because there are four uses and one of them slices the draft
   * the offsets came from: an offer that outlived its draft is not a stale drawing, it is a wrong cut.
   */
  const live = mention && mention.key === draftKey ? mention : null;

  /**
   * The members the field's `@` offers, which is the same answer the menu carries.
   *
   * A mention and the pick are one value, so the offer is the console's own list rather than a second one: a member that
   * can be named in the field is a member the menu offers and the board's pick can stand on, and the three cannot
   * disagree about who a line may be said to. What is offered is a name and where it lives (`lib/offer`), so a member and
   * an element under it are one list and a line can name either.
   */
  const offered = live ? offersFor(targets, live.query) : [];

  /**
   * The skills the named member answers, read as the same kind of row the mention list draws.
   *
   * The list is the room's answer for that member (`skills`), so a skill offered is one the member can actually be asked
   * for: the window does not invent a command from a declaration. An ability is addressed under its member, which is the
   * same shape a file and a joint are read at, so the row and the choice are the ones the offer already knows.
   */
  const skillMember = skillAt && skillAt.key === draftKey ? skillAt.member : null;
  const skillsOffered = useMemo(
    () => (skillMember ? skillsOf(skills[skillMember] ?? [], skillMember) : []),
    [skillMember, skills],
  );

  /** What the keyboard is walking: the mention list while a mention stands, and the member's skills after it is named. */
  const choices = live ? offered : skillsOffered;


  /**
   * Name something in the space for the line being written.
   *
   * The mention is taken out of the draft, because the addressee is not written into the sentence: the mark above the
   * field says where the line goes, and a member name left in the text would be the same name said twice, once where it
   * is read as prose. What the field keeps is the pilot's own words.
   *
   * A member named is where the line goes and nothing more. An element named is what the line says, so its address is
   * written into the sentence and the member that holds it becomes the addressee, which is the same act the space's own
   * row of elements performs (`properties/Holds`): one press and one mention, one spelling of one address.
   */
  const name = (found: Offered | undefined) => {
    // Nothing under the keyboard is nothing to name: the offer is a list the space answers and it can shrink under a frame
    // that was not asked again, and a name of `undefined` would reach the pick and clear it.
    if (!found) return;
    if (live) writeDraft(withoutMention(draft, live));
    // The first mention says where the line goes; a later one is a place the line talks about, and naming it must not
    // move the addressee out from under the sentence. This is what makes "@alpha @move to @beta" a move of alpha rather
    // than a line handed to beta.
    if (!live || firstMention(draft, live)) onAddress?.(found.member === project ? null : found.member);
    // What the field keeps is the name, not the address: the parent is what the list showed to tell two of one name apart,
    // and a line carries `@leaf` because that is what a person writes and what a reader recognises. The address is the
    // reader's own (`lib/offer`) and is resolved again where the line is read, so writing it here would put a path in a
    // sentence that only needs a name in it.
    writeDraft((held) => {
      const rest = held.trim() ? `${held.trimEnd()} ` : '';
      return `${rest}@${found.name} `;
    });
    setMention(null);
    setStanding(0);
    // Naming a member is naming where the line goes; what it can be asked is the next thing a pilot says, so the member's
    // own abilities stand over the field at once. A leaf is already the action, so choosing one closes the lists.
    setSkillAt(
      found.at === '' && (skills[found.address] ?? []).length ? { key: draftKey, member: found.address } : null,
    );
  };

  /**
   * Name one of the member's skills in the line.
   *
   * The skill is a leaf of the member, so the line carries it as an address and the member stays the addressee: the two
   * halves of one sentence are written one after the other and the console reads them with one reader.
   */
  const nameSkill = (found: Offered | undefined) => {
    if (!found) return;
    writeDraft((held) => {
      const rest = held.trim() ? `${held.trimEnd()} ` : '';
      return `${rest}@${found.name} `;
    });
  };

  useEffect(() => {
    if (!composing) return;
    // The words and the addressee travel together, because a line composed for a member that is not addressed to it goes
    // somewhere else: a command composed for a camera would be run by whatever the pick happened to be, which is a press
    // that does nothing the pilot asked for. The member is handed over the same way the menu hands one over, so the mark,
    // the menu and the board's own pick say one name.
    onAddress?.(composing.target === project ? null : composing.target);
    // A press adds to what is already being written rather than replacing it: the pilot's own sentence is not the
    // frame's to throw away because a control was pressed. The write goes through the draft of the conversation in
    // force, which is the one the press belongs to, because the console is what was opened for it.
    writeDraft((held) => (held.trim() ? `${held.trimEnd()} ${composing.text}` : composing.text));
    take();
  }, [composing, take, onAddress, project]);

  // The end is held by the box's own scroll and by the moment the frame is laid out, so the reader is brought along
  // before the paint rather than a frame after it. There is nothing to compare to decide whether to scroll: a report that
  // grows the turn in place is one the count of messages cannot see, and a body that reflows without React writing
  // anything is one no dependency can see either. A reader who is at the end stays at it and a reader who is not is left
  // where they are, which is the whole rule and is read from the box's own position rather than from a flag a report sets.
  useLayoutEffect(() => {
    const box = log.current;
    if (!box || !follow.current) return;
    box.scrollTop = box.scrollHeight - box.clientHeight;
  });

  // A conversation opened is read from its end, whatever the reader was doing in the one before it: arriving at the top of
  // a conversation and having to scroll to find out what was said last is not a place the panel ever wants to put them.
  useLayoutEffect(() => {
    follow.current = true;
    const box = log.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [open]);

  useEffect(() => {
    const box = log.current;
    const body = entries.current;
    if (!box || !body) return;
    // What grows without a render: a fenced block that reflows once its font arrives, a line the browser wraps after the
    // frame was painted, and the answer that is still being written into a message already on screen. The box's own
    // observer is what keeps the end at the end for all three.
    const observer = new ResizeObserver(() => {
      if (follow.current) box.scrollTop = box.scrollHeight - box.clientHeight;
    });
    observer.observe(body);
    return () => observer.disconnect();
  }, []);

  const onScroll = () => {
    const box = log.current;
    if (!box) return;
    follow.current = box.scrollHeight - box.scrollTop - box.clientHeight < END_SLACK;
  };

  /**
   * Read what stands before what is loaded, which is a request and not a longer fetch.
   *
   * The window is added above what the reader is looking at, so the box is put back where it was once the window has
   * landed: a reader who asked for what is above them is asking to stay where they are, and one carried to the end of the
   * conversation by a press for its beginning has been moved by the thing they asked to read.
   */
  const readEarlier = async () => {
    const box = log.current;
    const height = box?.scrollHeight ?? 0;
    const top = box?.scrollTop ?? 0;
    follow.current = false;
    await earlier();
    requestAnimationFrame(() => {
      const after = log.current;
      if (after) after.scrollTop = after.scrollHeight - height + top;
    });
  };

  /**
   * Take the files a pilot chose, one at a time.
   *
   * A file goes to the room as it is chosen rather than when the line goes, because the room is what keeps it: what the chip
   * says is what the room has, and the line carries the id the room answered with. The bytes are read here and sent because
   * the room has no path it could open, which is the whole reason the file travels rather than its address.
   */
  const chooseFiles = async (chosen: FileList | null) => {
    for (const file of Array.from(chosen ?? [])) {
      await attach(project, target, file);
    }
  };

  const post = async () => {
    const text = draft.trim();
    if (!text) return;
    // A line sent is the pilot putting themselves at the end of the log, whatever they were reading before it.
    follow.current = true;
    // A directive line is an edit of the board and not a turn: the panel that draws the space owns that
    // reading and answers with what it did, which the room then shows as the board's own note.
    // A commanded line is promised a direct run, so the board's own grammar does not read it: a command names where
    // the line runs and not what the space should become, and the room is the one that keeps the promise.
    const answer = commandOf(text) ? null : (interpret?.(text) ?? null);
    if (answer !== null) {
      setSaid((held) => [...held, { id: `board-${held.length}`, thread_id: open ?? '', role: 'note', author: 'board', content: answer, at: new Date().toISOString() }]);
      writeDraft('');
      return;
    }
    // The files the line goes with, by what the room filed them under. They travel with the line here and are not read
    // from the store when it goes: a line held until the room is free has to carry what it was written about, and the
    // composer gives the chips up either way.
    const carried = files.map((file) => file.id);
    // A turn is the room being busy, and the line then waits rather than being refused: the pilot wrote it while the last
    // answer was arriving, which is when a pilot has the next thing to say.
    if (turn || busy[target]) {
      enqueue(target, text, carried.length ? carried : undefined);
      writeDraft('');
      return;
    }
    // The words stay in the field when the room did not take them. A line that vanished into a room that refused it is a
    // line the pilot has to write again from memory, and the reason it was refused is above the field rather than here.
    if (await send(project, target, text, carried.length ? carried : undefined)) writeDraft('');
  };

  return (
    <div data-region="chat" className="flex h-full min-h-0 flex-col">
      {/* The exchange. It is the one region of the console with a floor, because it is the region the console is for: a
          log that the readings above it can squeeze to a line is a console that looks like it answered nothing. */}
      <div
        data-region="chat-log"
        ref={log}
        onScroll={onScroll}
        className="min-h-16 min-w-0 flex-1 overflow-y-auto px-3 py-2 text-[11.5px]"
      >
        {/* Whether the room answers is the room's own state and not the record's, and a board read from a file draws with
            nothing answering at all: a console that reported only the record would report a session as whole while every
            turn went nowhere, which is what a turn that is sent and never answered looks like. It stands at the head of
            the exchange rather than in the thread list, because this is the region that always has room: a state line in
            a list that is capped and empty is a line that is clipped exactly when it is needed. The press beside it is
            the only thing the frame can do about it, because the subscription is what knows how the room is reached and
            asking again is making the subscription again. */}
        {link !== 'live' ? (
          <div data-region="chat-link" className="mb-2 flex items-center gap-2 text-idle">
            <span className="min-w-0 flex-1 truncate" title={detail ?? undefined}>
              {LINK_WORDS[link]}
            </span>
            <Hint label="reconnect">
              <Button size="icon-xs" variant="ghost" onClick={reach}>
                <RotateCw />
              </Button>
            </Hint>
          </div>
        ) : null}
        {status === 'loading' ? <p className="mb-2 text-muted-foreground">reading the room</p> : null}
        {status === 'error' ? <p className="mb-2 text-destructive">{error}</p> : null}
        {/* What the room owes the panel, which is the one thing there is to say while the exchange is quiet. A turn is
            the room being busy, and between the line going out and the first report arriving there is nothing on screen
            that says the room took it: the tool call the turn opens with is a report, and a report that has not arrived
            yet is exactly the wait this is for. It stands with the link's own line, which is the same claim about the
            room at another scale. */}
        {turn || busy[target] ? (
          <p data-region="chat-progress" className="mb-2 text-working">
            {busy[target] ? `waiting for ${target} to answer` : 'the room is in a turn'}
          </p>
        ) : null}
        {status === 'ready' && work && !threads.length ? (
          <p className="mb-2 text-muted-foreground">nothing has been said about this work</p>
        ) : null}
        <div ref={entries}>
          {/* The way back into the part of the conversation that is not loaded. A conversation is read as a window of its
              log rather than whole, so what stands above is a request away, and this line is the only thing on screen that
              says there is any of it. */}
          {from > 0 ? (
            <Hint label="earlier">
              <button
                type="button"
                data-region="chat-earlier"
                onClick={() => void readEarlier()}
                className="mb-2 block w-full py-1 text-center text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
              >
                read {from} earlier {from === 1 ? 'entry' : 'entries'}
              </button>
            </Hint>
          ) : null}
          {shown.length ? (
            shown.map((message: Message) => (
              <ChatEntry key={message.id} message={message} own={message.role === 'user'} />
            ))
          ) : (
            // A window that has never been connected is over the record it shipped with and has no room to
            // reach: what a turn does is not the first thing to say, because there is nowhere for one to go yet.
            // What it needs and where to give it are, and they are said here rather than left to be found out by
            // a line that goes nowhere.
            <p className="text-muted-foreground">
              {host().everConnected?.() ?? false
                ? `Nothing said yet. A turn to ${project} reads the project's files; a turn to a machine reads what it recorded. A line starting with ; is a note and not a turn.`
                : `No stack yet. This window draws the record the engine ran and reaches no room, so a turn has nowhere to go: the frame's own settings carry the stack this cockpit should be over, and the record is read here whether one answers or not.`}
            </p>
          )}
        </div>
      </div>

      {here.length ? (
        <div data-region="approvals" className="shrink-0 border-t px-3 py-2">
          {here.map((call) => (
            <div key={call.tool_call_id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[11.5px]">
                <span className="text-idle">waiting for a decision</span> {call.tool_name}
                {call.detail ? <span className="text-muted-foreground"> · {call.detail}</span> : null}
              </span>
              <Button size="xs" variant="outline" className="shadow-none" title="let the call run" onClick={() => void decide(project, call, true)}>
                Allow
              </Button>
              <Button size="xs" variant="ghost" className={cn(CONTROL)} title="refuse the call" onClick={() => void decide(project, call, false)}>
                Deny
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {/* A turn that failed after the room accepted it has no answer left to refuse, so the room reports it and
          the panel says so here. Without this the only trace would be a red dot on a thread row. */}
      {failures[target] ? (
        <p data-region="chat-failure" className="shrink-0 border-t px-3 py-2 text-[11.5px] text-destructive">
          {failures[target]}
        </p>
      ) : null}

      <div className="flex max-h-[50%] shrink-0 flex-col border-t p-2">
        {/* The members the `@` in the field can name, and then the abilities of the member it named. Both are one list
            over the field because both are about the line being written now, and a skill is a leaf of the member in the
            same address space (lib/offer): naming the member says where the line goes, and naming its skill says what. */}
        {choices.length ? (
          <ul
            data-region="chat-mentions"
            data-stage={live ? 'mention' : 'skill'}
            // The offer is as long as the space has names and the panel is not: a list that opened at its own height would
            // push the conversation and the field off the bottom of the console, which is the one thing the pilot needs
            // while naming something. The footer is what carries the measure, half the console it stands in, because a
            // percentage is read against the box that holds the list and the field is that box's own fixed part; the list
            // then scrolls inside it. That makes the cap follow the panel rather than the window, so a console dragged
            // short and a frame made small both bound the offer, and it is never taller than the thing it stands in.
            className="mb-1 flex min-h-0 flex-col gap-0.5 overflow-y-auto rounded-sm border border-border bg-card/60 py-0.5"
          >
            {choices.map((each, index) => (
              <li key={each.address}>
                <button
                  type="button"
                  data-region="chat-mention"
                  data-member={each.address}
                  data-on={index === standing}
                  title={each.at ? `name ${each.address} in the line` : `say the line to ${each.address}`}
                  onClick={() => (live ? name(each) : nameSkill(each))}
                  className={cn(
                    ROW,
                    'h-6 w-full gap-1.5 px-2 text-left hover:bg-accent/40',
                    index === standing && 'bg-accent/40',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {each.at ? each.name : each.address === project ? `${each.address} · the project` : `@${each.address}`}
                  </span>
                  {/* Where it lives, which is the whole of what tells two things of one name apart: a leaf carries its
                      address and a member carries nothing, because a member is where everything else is read from. */}
                  {each.at ? <span className="shrink-0 text-muted-foreground">{each.at}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {/* The lines the pilot said while the room was busy, which go out one at a time as it frees up. They stand above
            the field rather than in the log because they are not said yet: a line in the log and a line waiting to be are
            two different things, and a pilot who could not see the difference would think the room had answered them. */}
        {queue.length ? (
          <ul data-region="chat-queue" className="mb-1 flex flex-col gap-0.5">
            {queue.map((item: Queued) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-sm border border-border/60 px-1.5 py-0.5 text-[11.5px] text-muted-foreground"
              >
                <span className="shrink-0 font-mono">@{item.target}</span>
                <span className="min-w-0 flex-1 truncate" title={item.text}>
                  {item.text}
                </span>
                <Hint label="drop">
                  <button
                    type="button"
                    onClick={() => drop(item.id)}
                    className="shrink-0 transition-colors hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </Hint>
              </li>
            ))}
          </ul>
        ) : null}
        {/* The files that go with the line being written. They stand closest to the field of the three rows above it, because
            they are about the line itself rather than about where it goes or what is waiting: the room already holds them, so
            the chip is a reading of what the room has and the press on it is the way back out. */}
        {files.length ? (
          <ul data-region="chat-files" className="mb-1 flex flex-wrap items-center gap-1">
            {files.map((file) => (
              <li
                key={file.id}
                data-region="chat-file"
                className="flex max-w-full items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-[11.5px]"
              >
                <Paperclip className="size-3 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate" title={`${file.name} \u00b7 ${file.bytes} bytes`}>
                  {file.name}
                </span>
                <Hint label="remove">
                  <button
                    type="button"
                    data-region="chat-file-drop"
                    onClick={() => untake(file.id)}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </Hint>
              </li>
            ))}
          </ul>
        ) : null}
        <textarea
          ref={field}
          data-region="chat-input"
          value={draft}
          rows={2}
          spellCheck={false}
          // The field says only what the line is about to become and nothing about where it goes: the addressee stands on
          // the row above, and a placeholder that repeated it would be the same name written twice on one panel.
          placeholder={
            noteOf(draft)
              ? 'a note, to the people'
              : commandOf(draft)
                ? `a command, run where ${target} is`
                : undefined
          }
          className="w-full resize-none appearance-none rounded-sm border-0 bg-card/60 px-2 py-1 font-mono text-foreground shadow-none outline-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
          onChange={(event) => {
            const next = event.target.value;
            const found = mentionAt(next, event.target.selectionStart ?? next.length);
            const names = found ? offersFor(targets, found.query) : [];
            // The write closes any offer that was standing, so the one this keystroke opens is set after it: what the
            // field is standing in is read from the sentence as it now is.
            writeDraft(next);
            setMention(found && names.length ? { key: draftKey, ...found } : null);
            setStanding(0);
          }}
          onKeyDown={(event) => {
            // The list is under the keyboard while it stands, whichever list it is: Enter names the row under it rather
            // than sending the line, the arrows walk it, and Escape closes it and leaves the `@` where the pilot typed it.
            if (choices.length) {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setStanding((at) => (at + 1) % choices.length);
                return;
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setStanding((at) => (at - 1 + choices.length) % choices.length);
                return;
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                setMention(null);
                setSkillAt(null);
                return;
              }
              if (event.key === 'Enter' || event.key === 'Tab') {
                event.preventDefault();
                if (live) name(choices[standing]);
                else nameSkill(choices[standing]);
                return;
              }
            }
            // Enter sends and Shift+Enter is the newline. A chord to send is a key nobody finds, and every chat this
            // pilot has used sends on the one press: what was being protected was a model call, and the protection was
            // costing more attention than the call costs.
            if (event.key !== 'Enter' || event.shiftKey) return;
            event.preventDefault();
            void post();
          }}
        />
        {/* The field's own controls carry no words: each one says one thing and stands at the end of a field, and a word
            beside an icon is the icon read twice at the cost of the room the field needs. The new conversation is not here
            at all, because it is a tab and the tab strip is where a conversation is started. */}
        <div className="mt-1 flex items-center gap-1">
          <Select value={effort} onValueChange={(value) => setEffort(value as typeof effort)}>
            <SelectTrigger
              data-region="chat-effort"
              title="the reasoning effort a turn runs at"
              className={cn('h-6 shrink-0 gap-1 rounded-sm border-0 px-1 py-0 text-[11.5px] shadow-none focus-visible:ring-0 dark:bg-transparent', CONTROL)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EFFORTS.map((level) => (
                <SelectItem key={level} value={level} className="text-[11.5px]">
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Hint label="mention">
            <Button
              size="icon-xs"
              variant="ghost"
              className={cn(CONTROL)}
              data-region="chat-mention-open"
              onClick={openMentions}
            >
              <AtSign />
            </Button>
          </Hint>
          {/* The decision on what the room answered, offered while it stands: an outcome that is settled, by a caller the
              workspace allows, and not already accepted. It carries a word rather than an icon for the reason the
              approvals row does: a control over the field says one thing and the field is its label, and a decision about
              an answer is not a control over the field. Pressing it writes the acceptance as a note, so the offer goes
              away because the record the reading reads has changed. */}
          {/* The two controls at the ends of the field are the panel's own and are drawn as the frame draws every
              control: the ink a control rests in, brightened under the pointer, and bright when it is in force. A send
              that filled itself with the palette's white would be the one control in the frame drawn as another kind of
              thing, which is what made the console read as a form from outside it. */}
          <span className="min-w-0 flex-1" />
          {/* The way a file joins the line, drawn only where the room takes one: a chat over a record has no server behind
              it, so the control would be a press that fails. It stands with the field's own controls because what it changes
              is what the line carries, and the chooser it opens is the window's rather than this frame's. */}
          {takesFiles ? (
            <>
              <input
                ref={picker}
                data-region="chat-file-input"
                type="file"
                multiple
                hidden
                onChange={(event) => {
                  void chooseFiles(event.target.files);
                  // The chooser holds what was picked last, so a file chosen twice in a row would be a change nobody hears:
                  // what is taken is the file and not the field's memory of it.
                  event.target.value = '';
                }}
              />
              <Hint label="attach">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className={cn(CONTROL)}
                  data-region="chat-file-pick"
                  onClick={() => picker.current?.click()}
                >
                  <Paperclip />
                </Button>
              </Hint>
            </>
          ) : null}
          {turn || busy[target] ? (
            <Hint label="stop">
              <Button
                size="icon-xs"
                variant="ghost"
                className={cn(CONTROL)}
                onClick={() => void cancel(project, target)}
              >
                {/* Filled, because a stop is a state and not an edge: an outlined square reads as the corner of a
                    frame among the line controls beside it. */}
                <Square fill="currentColor" strokeWidth={0} />
              </Button>
            </Hint>
          ) : null}
          <Hint label="send">
            <Button
              size="icon-xs"
              variant="ghost"
              className={cn(CONTROL)}
              data-region="chat-send"
              onClick={() => void post()}
            >
              <Send />
            </Button>
          </Hint>
        </div>
      </div>
    </div>
  );
}
