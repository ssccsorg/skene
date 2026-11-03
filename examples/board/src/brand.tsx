import type { Brand } from '@ssccsorg/skene-frame';

/** The stage: a frame divided in four, which is the mark of a surface rather than of a product. */
const MARK = 'M4 7H28V25H4ZM16 7V25M4 16H28';

function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" role="img" aria-label="Skene" className={className}>
      <path d={MARK} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

export const brand: Brand = {
  title: 'SKENE',
  name: 'Skene',
  version: 'v0.1.0',
  layers: ['nexus', 'chton', 'tagma'],
  Mark,
  mark: { path: MARK, viewBox: 32 },
};
