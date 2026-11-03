import { Fragment } from 'react';
import { LABEL, TITLE } from '@ssccsorg/skene-ui';
import { boundsOf, roundOf, turnsOf } from '@ssccsorg/skene-kernel';
import type { Campaign, Entry, NodeKind } from '@ssccsorg/skene-kernel';
import { cn } from '@ssccsorg/skene-ui';
import { KindTag } from './KindTag';

/** The reading a turn left, which is a name when it is a conclusion and a path when it is a reading. */
const readingOf = (wrote: string) => wrote.split('/').filter(Boolean).pop() ?? wrote;

/**
 * The run as one chain: the declarations, the acts that took them, and the hints that bounded them.
 *
 * A campaign is the intent, the execution, and the hint read together, so its strip is every turn the run holds rather
 * than the newest round. The hints stand first because they are the bounds of the whole run, and each turn after them is
 * one declaration, the worker that took it, and the fact it produced. A project with no campaign keeps the round it
 * always had: the newest declaration and the machines it reached, compressed to one mark per turn because a round is four
 * turns and twenty marks on one row is unreadable.
 *
 * A conclusion writes its name and no origin, so the reading is the fact's own label in that case. The strip reads the
 * links and names the records carry rather than a second account of what happened, so scrubbing the transport back takes
 * the chain with it.
 *
 * It is the strip at the foot of the frame and it is read with the transport above it, so it is the row's own type and
 * not the document's: it wraps rather than holding one line, which is why it states the size and the inset itself instead
 * of taking the row a wrapping strip cannot be. It names itself in the frame's own label style, because a strip of marks
 * under the transport reads as part of the transport unless it says what it is.
 */
export function Trace({ records, campaign }: { records: Entry[]; campaign?: Campaign | null }) {
  const bounds = campaign ? boundsOf(records) : [];
  const turns = campaign ? turnsOf(records) : roundOf(records);
  if (!turns.length && !bounds.length) return null;

  return (
    <div
      data-region="trace"
      data-chain={campaign ? 'campaign' : 'round'}
      className="flex shrink-0 items-center gap-1.5 overflow-x-auto px-3 py-1.5 text-[11.5px] [&>*]:shrink-0"
    >
      <span className={LABEL}>Chain</span>
      {bounds.map((hint, index) => (
        <Fragment key={`bound-${index}`}>
          <KindTag kind="hint" />
          <span className={cn(TITLE, 'max-w-[10rem] truncate')} title={hint.content ?? hint.label}>
            {hint.label}
          </span>
        </Fragment>
      ))}
      {bounds.length && turns.length ? <span className="text-muted-foreground">|</span> : null}
      {campaign ? (
        turns.map((turn, index) => (
          <Fragment key={`${turn.worker}-${index}`}>
            {index ? <span className="text-muted-foreground">›</span> : null}
            <KindTag kind="intent" />
            <span className={cn(TITLE, 'max-w-[12rem] truncate')} title={turn.said}>
              {turn.intent.label ?? turn.said}
            </span>
            {turn.claimed ? (
              <>
                <KindTag kind="claim" />
                <span className={cn(TITLE, 'max-w-[10rem] truncate')} title={`${turn.worker} took it`}>
                  {turn.worker}
                </span>
              </>
            ) : null}
            {turn.wrote ? (
              <>
                <KindTag kind="fact" />
                <span className={cn(TITLE, 'max-w-[12rem] truncate')} title={turn.wrote}>
                  {readingOf(turn.wrote)}
                </span>
              </>
            ) : null}
          </Fragment>
        ))
      ) : (
        turns.map((turn, index) => {
          // What the turn has reached, which is what its tag says: declared, then claimed, then what it wrote.
          const state: NodeKind = turn.wrote ? 'fact' : turn.claimed ? 'claim' : 'intent';
          const reading = readingOf(turn.wrote);
          return (
            <Fragment key={`${turn.worker}-${index}`}>
              {index ? <span className="text-muted-foreground">›</span> : null}
              <span className="opacity-100">
                <KindTag kind={state} />
              </span>
              <span className={cn(TITLE, 'max-w-[12rem] truncate')} title={turn.said}>
                {turn.worker}
                {turn.wrote ? <span className="text-muted-foreground"> · {reading}</span> : null}
              </span>
            </Fragment>
          );
        })
      )}
    </div>
  );
}
