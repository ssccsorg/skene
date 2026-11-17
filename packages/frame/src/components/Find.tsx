import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Hint, RowControl, cn } from '@ssccsorg/skene-ui';
import { useUnit } from '../lib/brand';
import { find as search, indexOf, type Found } from '../lib/find';
import { useScenario } from '../stores/scenario';
import { useSelection } from '../stores/selection';

// One field over the whole board: every project the frame holds, and every unit each of them stands.
//
// The panels search what they list, and each of them is one place's list. This is the question a pilot asks before they
// know which place the answer is in: the name of a planet, a station, a gate, or the system it is all in. Choosing a
// system opens it; choosing a member opens its system and picks the member, so one press is both the place and the thing
// in it.
//
// The shortcut is the frame's own and not a panel's, which is why it is bound on the window: a pilot looking for one row
// in a board of six thousand is looking from wherever the pointer happens to be. The control in the header is the same
// question for a reader who does not know a shortcut exists.

/** How the palette is opened: the platform's command key and the letter every command palette is opened with. */
function commanded(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
}

export function Find() {
  const projects = useScenario((state) => state.projects);
  const openProject = useScenario((state) => state.open);
  const selectUnit = useSelection((state) => state.selectUnit);
  const unit = useUnit();
  const index = useMemo(() => indexOf(projects), [projects]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [at, setAt] = useState(0);
  const found = useMemo(() => search(index, query), [index, query]);
  const field = useRef<HTMLInputElement>(null);

  const choose = (found: Found) => {
    openProject(found.project);
    if (found.unit) selectUnit(found.unit, null);
    setOpen(false);
    setQuery('');
    setAt(0);
  };

  useEffect(() => {
    if (!open) return;
    setAt(0);
    field.current?.focus();
  }, [open]);

  useEffect(() => setAt(0), [query]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (commanded(event)) {
        event.preventDefault();
        setOpen((was) => !was);
        return;
      }
      if (!open) return;
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setAt((was) => {
          const next = was + (event.key === 'ArrowDown' ? 1 : -1);
          return Math.min(Math.max(next, 0), Math.max(found.length - 1, 0));
        });
        return;
      }
      if (event.key === 'Enter' && found[at]) {
        event.preventDefault();
        choose(found[at]);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  });

  return (
    <>
      <Hint label={`find a ${unit.one}, a member (⌘K)`}>
        <RowControl data-region="find" data-on={open} onClick={() => setOpen(true)}>
          <Search />
        </RowControl>
      </Hint>
      {open ? (
        <div
          role="presentation"
          data-region="find-palette"
          onMouseDown={() => setOpen(false)}
          className="fixed inset-0 z-[200] flex items-start justify-center bg-background/70 pt-[12vh]"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`find a ${unit.one} or a member`}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-[min(640px,92vw)] overflow-hidden rounded-sm border border-border bg-card shadow-lg"
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                ref={field}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`a ${unit.one}, a member, a kind`}
                aria-label={`find a ${unit.one} or a member`}
                className="min-w-0 flex-1 bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="shrink-0 rounded-sm border border-border px-1 text-[10px] text-muted-foreground">⌘K</kbd>
            </div>
            <ul role="listbox" aria-label="found" className="max-h-[50vh] overflow-y-auto py-1">
              {found.map((each, index) => {
                const chosen = index === Math.min(at, found.length - 1);
                return (
                  <li key={`${each.project}:${each.unit ?? ''}`} role="option" aria-selected={chosen}>
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        choose(each);
                      }}
                      onMouseEnter={() => setAt(index)}
                      className={cn(
                        'flex w-full items-baseline gap-2 px-3 py-1 text-left text-[12px]',
                        chosen ? 'bg-accent text-foreground' : 'text-foreground/90 hover:bg-accent/40',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{each.label}</span>
                      <span className="shrink-0 text-[10.5px] text-muted-foreground">
                        {each.unit === null ? unit.one : `${each.kind ?? 'unit'} · ${each.place}`}
                      </span>
                    </button>
                  </li>
                );
              })}
              {query.trim() && !found.length ? (
                <li className="px-3 py-2 text-[11.5px] text-muted-foreground">nothing matches</li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
