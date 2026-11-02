import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight, Lightbulb } from 'lucide-react';
import { isToolCall, splitThinking, statusOf, timeOf, toolParts, type Message } from '../lib/channel';
import { END_SLACK } from '../lib/chrome';
import { markdownOf } from '../lib/markdown';
import { cn } from '../lib/utils';

/**
 * One entry of a thread, drawn by what it is rather than by who wrote it.
 *
 * A turn carries three kinds of thing and they read differently: what the agent said, the run it reasoned in,
 * and the calls it made. The reasoning is folded but open, because a pilot watching a machine work wants to
 * see why it decided what it decided, and the fold is there to be closed once they have. A call is drawn as a
 * head with the one mark its status earns and a body that opens when it does, which is how a long command
 * stays one line until somebody asks for it.
 *
 * A body with no markdown renderer is drawn as text with its fences read: a turn's output is a record, and a
 * record read as escaped backticks is a record nobody reads.
 *
 * An agent's own body goes through the renderer (`lib/markdown`) and a tool's output does not. The difference is who
 * wrote it: a body is somebody speaking and is laid out to be read, and a tool's output is what a program printed, where
 * a line break, a leading `#` and a run of spaces are the content rather than a request for a heading.
 */
const MARK = {
  running: 'animate-pulse bg-working',
  done: 'bg-working',
  failed: 'bg-destructive',
  waiting: 'animate-pulse bg-idle',
  none: 'bg-border',
} as const;

/** The body as runs of prose and of code, so a fenced block is drawn in the frame's own mono. */
function runs(body: string): { code: boolean; text: string }[] {
  return body
    .split(/```/)
    .map((part, index) => ({ code: index % 2 === 1, text: index % 2 === 1 ? part.replace(/^[a-z]*\n/, '') : part }))
    .filter((run) => run.text.trim());
}

function Body({ body, mono }: { body: string; mono?: boolean }) {
  return (
    <>
      {runs(body).map((run, index) => (
        <pre
          key={index}
          className={cn(
            'break-words whitespace-pre-wrap',
            run.code && 'my-1 rounded-sm border bg-card/60 px-2 py-1 font-mono text-[11.5px]',
            mono && !run.code && 'font-mono',
          )}
        >
          {run.text.trim()}
        </pre>
      ))}
    </>
  );
}

/** A body the agent wrote, as the markup it asked for. Its only tags are the renderer's own. */
function Prose({ body }: { body: string }) {
  return <div className="md" dangerouslySetInnerHTML={{ __html: markdownOf(body) }} />;
}

function Reasoning({ text }: { text: string }) {
  const [open, setOpen] = useState(true);
  const box = useRef<HTMLPreElement>(null);
  // Whether the block follows its end. A reasoning run is written into a box of its own, and the part being written is
  // its end: the box that kept its scroll at the top showed the beginning of a thought and hid the one in progress.
  const follow = useRef(true);
  useLayoutEffect(() => {
    const element = box.current;
    if (!element || !follow.current) return;
    element.scrollTop = element.scrollHeight;
  }, [text, open]);
  return (
    <div className="my-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center gap-1.5 text-left text-[11.5px] tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground',
        )}
        title={open ? 'fold the reasoning' : 'read the reasoning'}
      >
        <Lightbulb className="size-3 shrink-0" />
        <span className="flex-1">thinking</span>
        <ChevronRight className={cn('size-3 shrink-0 transition-transform', open && 'rotate-90')} />
      </button>
      {open ? (
        <pre
          ref={box}
          onScroll={() => {
            const element = box.current;
            if (!element) return;
            follow.current = element.scrollHeight - element.scrollTop - element.clientHeight < END_SLACK;
          }}
          className="mt-1 max-h-40 overflow-y-auto border-l pl-2 break-words whitespace-pre-wrap text-muted-foreground"
        >
          {text.trim()}
        </pre>
      ) : null}
    </div>
  );
}

function Call({ message }: { message: Message }) {
  const parts = toolParts(message);
  const stand = statusOf(parts.status);
  const [open, setOpen] = useState(false);
  const hasBody = parts.body.length > 0;
  return (
    <div data-region="tool-call" data-status={stand} className="my-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={!hasBody}
        className="flex w-full items-start gap-1.5 text-left text-[11.5px] transition-colors hover:text-foreground"
        title={parts.status ? `the call is ${parts.status}` : undefined}
      >
        <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', MARK[stand])} />
        <span className="min-w-0 flex-1">
          <span className="text-muted-foreground">{parts.label}</span>
          {parts.status ? <span className="ml-1.5 text-muted-foreground/70">{parts.status}</span> : null}
        </span>
        <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{timeOf(message.at)}</span>
        {hasBody ? <ChevronRight className={cn('mt-0.5 size-3 shrink-0 transition-transform', open && 'rotate-90')} /> : null}
      </button>
      {open && hasBody ? (
        <div className="mt-1 border-l pl-2 text-muted-foreground">
          <Body body={parts.body} mono />
        </div>
      ) : null}
    </div>
  );
}

export function ChatEntry({ message, own }: { message: Message; own?: boolean }) {
  if (isToolCall(message)) return <Call message={message} />;

  if (message.role === 'system') {
    return <p className="mt-1.5 text-[11.5px] text-destructive">{message.content}</p>;
  }

  const note = message.role === 'note';
  const named = message.role === 'assistant' ? null : note ? 'note' : message.author ?? null;
  const name = named && !(own && !note) ? named : null;

  return (
    <div data-region="chat-entry" data-role={message.role} className={cn('mt-2.5', note && 'border-l pl-2')}>
      <div className="flex items-baseline gap-2">
        {name ? <span className="text-[11.5px] tracking-wide text-muted-foreground uppercase">{name}</span> : null}
        <span className="ml-auto shrink-0 font-mono text-[11.5px] tabular-nums text-muted-foreground">{timeOf(message.at)}</span>
      </div>
      <div className={cn('mt-0.5', message.role === 'user' && 'text-foreground')}>
        {message.role === 'assistant' ? (
          splitThinking(message.content).map((run, index) =>
            run.kind === 'thinking' ? <Reasoning key={index} text={run.text} /> : <Prose key={index} body={run.text} />,
          )
        ) : (
          <Prose body={message.content} />
        )}
      </div>
    </div>
  );
}
