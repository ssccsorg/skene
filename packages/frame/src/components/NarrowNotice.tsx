// The notice a window too narrow for the screen reads.
//
// A screen is a column of intents, a stage, and a column of panels, and each of them is sized for a window. A phone draws
// the same markup as slivers, so the page says so rather than letting a reader take a cramped screen for a broken one.
// The words are the deployment's, because only it knows what its own columns are and what a reader should open instead.

import { useState, type ReactNode } from 'react';

export interface NarrowNoticeProps {
  /** What the notice says first, in the deployment's own words. */
  title: string;
  /** The rest: what does not fit, and what to open instead. */
  children: ReactNode;
  /** Whether the reader may put it away. Absent means it stands, because the screen still does not fit. */
  dismissible?: boolean;
  /** The width below which it stands: a tablet, or a desk with one narrow column. */
  below?: 'md' | 'lg';
}

const BELOW: Record<NonNullable<NarrowNoticeProps['below']>, string> = {
  md: 'md:hidden',
  lg: 'lg:hidden',
};

function Warning({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 4 2.8 20h18.4Z" />
      <path d="M12 10v4M12 17.2v.1" />
    </svg>
  );
}

export function NarrowNotice({ title, children, dismissible = false, below = 'md' }: NarrowNoticeProps) {
  const [read, setRead] = useState(false);
  // A notice that is put away stays away for this window: the screen it describes has not changed.
  if (read) return null;
  return (
    <div
      role="note"
      data-region="narrow"
      className={`fixed inset-x-0 bottom-0 z-[300] flex items-start gap-2 border-t border-border bg-sidebar px-3 py-2 text-[11.5px] leading-snug text-muted-foreground ${BELOW[below]}`}
    >
      <Warning className="mt-px size-3.5 shrink-0 text-idle" />
      <span className="min-w-0 flex-1">
        <span className="text-foreground">{title}</span> {children}
      </span>
      {dismissible ? (
        <button
          type="button"
          onClick={() => setRead(true)}
          className="shrink-0 rounded-sm border border-border px-1.5 py-px text-foreground"
        >
          dismiss
        </button>
      ) : null}
    </div>
  );
}
