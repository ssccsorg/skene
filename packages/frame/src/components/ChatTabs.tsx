import { useMemo, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@ssccsorg/skene-ui';
import { Hint } from '@ssccsorg/skene-ui';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@ssccsorg/skene-ui';
import { CONTROL } from '@ssccsorg/skene-ui';
import { cn } from '@ssccsorg/skene-ui';
import { scopedThreads, useChat } from '../stores/chat';

/**
 * The room's conversations, as the one list the panel's head offers.
 *
 * The head was a strip of tabs, and a strip is the wrong shape here: the console is a column, every conversation is
 * another tab on a row that also has to hold the panel's own controls, and a run of twenty leaves the pilot scrolling a
 * row to find the title they are reading. A list that opens costs one row whatever the room holds, and it says more about
 * each entry than a truncated tab can.
 *
 * What the head shows is the conversation that is up, with the room's own reading of it: its title, and whether the member
 * that answers in it is in a turn or has failed, which is the same mark the panel shows beside the composer.
 *
 * A new conversation is not a thread. The room names a thread when the first line of it is written, so before that there is
 * nothing for the list to carry and the entry that stands for it is an entry and not a thread. The plus is the other way to
 * it, because a pilot who reads the head as "the conversation I am in" needs a control that starts one rather than a list
 * entry that happens to mean it.
 *
 * The row is the panel's head, so a control that is about the panel rather than about the conversations stands on it: the
 * console puts its own fold at the end the field's controls are not, and this file draws it where it is handed without
 * knowing what it is.
 */
export function ChatTabs({ project, work, lead }: { project: string; work?: string | null; lead?: ReactNode }) {
  const all = useChat((state) => state.threads);
  const open = useChat((state) => state.open);
  const busy = useChat((state) => state.busy);
  const failures = useChat((state) => state.failures);
  const choose = useChat((state) => state.choose);
  const start = useChat((state) => state.start);

  // The conversations of the work that is open, and the pilot's own, which belong to no declared work. The work's own
  // name is the record's address with its kind taken off, which is the part a reader recognises.
  const threads = useMemo(() => scopedThreads(all, work ?? null), [all, work]);

  const here = threads.find((thread) => thread.id === open) ?? null;
  const who = here?.agent ?? null;
  // The list needs a value for a conversation the room has not named yet, and it is a value no thread id can be.
  const nowhere = '\u0000new';

  return (
    <div data-region="chat-tabs" className="flex h-7 shrink-0 items-center gap-1 border-b bg-card px-1">
      {lead}
      <Select
        value={open ?? nowhere}
        onValueChange={(value) => {
          if (value === nowhere) start();
          else void choose(project, value);
        }}
      >
        <SelectTrigger
          data-region="chat-thread"
          data-thread={open ?? nowhere}
          title={
            here
              ? `${here.title ?? 'nobody has written in it'} · ${here.agent} · ${here.message_count} entries`
              : 'a conversation nobody has written in'
          }
          className={cn(
            'h-6 min-w-0 flex-1 gap-1 rounded-sm border-0 px-1.5 py-0 text-[11.5px] shadow-none focus-visible:ring-0 dark:bg-transparent',
            CONTROL,
          )}
        >
          <span
            className={cn(
              'size-1.5 shrink-0 rounded-full',
              who && failures[who] ? 'bg-destructive' : who && busy[who] ? 'animate-pulse bg-working' : 'bg-border',
            )}
          />
          <span className="min-w-0 flex-1 truncate text-left">
            {here?.title ?? 'a new conversation'}
          </span>
        </SelectTrigger>
        <SelectContent>
          {open === null ? (
            <SelectItem value={nowhere} className="text-[11.5px]">
              a new conversation
            </SelectItem>
          ) : null}
          {threads.map((thread) => (
            <SelectItem key={thread.id} value={thread.id} className="text-[11.5px]">
              {thread.title ?? 'nobody has written in it'}
              <span className="ml-2 text-muted-foreground">{thread.agent}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Hint label="new conversation">
        <Button
          size="icon-xs"
          variant="ghost"
          className={cn(CONTROL)}
          data-region="chat-new"
          onClick={start}
        >
          <Plus />
        </Button>
      </Hint>
    </div>
  );
}
