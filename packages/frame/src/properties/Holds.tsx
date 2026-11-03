import { useEffect } from 'react';
import { AtSign, ChevronRight } from 'lucide-react';
import { Row } from '../components/Row';
import { useHolds } from '../hooks/useHolds';
import { CONSOLE, useCapability } from '../lib/capabilities';
import { ROW } from '../lib/chrome';
import { HELD_DEPTH, leafOf } from '../lib/holds';
import { askable, type Part, type PartProps } from '../lib/kinds';
import { useChat } from '../stores/chat';
import { useSelection } from '../stores/selection';
import { cn } from '../lib/utils';

/**
 * What a member holds, as a tree: the first part, and the shape every other part is written in.
 *
 * The atom says that a member holds lower elements and that they stand at the member's own address. What the room
 * answers for a path is the room's business, and a room that keeps no files says so rather than drawing an empty list.
 *
 * An element the room gives back as holding more opens one level down into the same reading, which is the whole of the
 * recursion: the frame knows an address and a folder and nothing about files or folders beyond that, so a folder of
 * folders is the same code as a folder of files. That is what makes a held element a thing a pilot can walk rather
 * than a list of strings, and it is the unit a later link between two members is made of.
 *
 * What is drawn is the last step of the room's address and not the whole of it, because the levels are drawn one
 * inside another: an address repeated down every level is the same words written as many times as the tree is deep.
 * A file is a row and not a form, because this is not an editor: a file here is an object that is read.
 *
 * A row can be named in the console, which is what makes an element a thing a line can be about. The name is the room's
 * own address for it and it leads with the member (`files`), so what a pilot reads, what a line carries and what a reader
 * of the record resolves are one name: the element is resolved through its member, and an element alone would be a name
 * with nothing to resolve it against. The control is drawn on the same rule the member's own controls are, which is that a
 * line can be said to the member at all: an element of a member nothing can be asked of is a thing a pilot reads and not
 * a thing a line is about.
 *
 * How deep this reads is the model's bound (`HELD_DEPTH`) and not this file's: a room answers another level for every
 * level asked, so a tree is unbounded by the room and bounded by whoever reads it, and the number belongs where the
 * reading does. What a level at the bound holds is said once for the level rather than once for each of its rows.
 *
 * The spend the model also puts on a tree (`HELD_ELEMENTS`) is not applied here, and the difference is the shape of the
 * two surfaces: a list scrolls and a board does not, so a list of two hundred rows is a list and a board of two hundred
 * names is a spray. The room's own cap on one level is what bounds this one, and it is the room's answer rather than this
 * file's bound for the same reason the depth is: what is too much to read is a claim about the reading.
 */

/** How far a level is drawn in, from the member row's own inset: the depth is the lay-out and the inset is the row's. */
const indent = (depth: number) => ({ paddingLeft: 12 + depth * 12 });

export const holds: Part = function Holds({ member }: PartProps) {
  // The root is read here as well as by the first level, because the count is the row's value and a row that counted a
  // list it had not asked for would say nothing until the tree was opened.
  const { rows, ensure } = useHolds({ member: member.id, at: member.holdsAt });
  useEffect(() => {
    ensure(member.id);
  }, [ensure, member.id]);
  const root = rows[member.id] ?? null;
  // The atom is shared: a workspace holds files and a machine holds the parts it is assembled from. The noun is the
  // member's own icon and not a name this file knows, so a project that brings another kind of held list is drawn
  // under its own word rather than under a word of the frame's.
  const noun = member.icon === 'workspace' ? 'Files' : 'Parts';
  return (
    <div className="px-3 pb-1.5">
      <Row
        label={noun}
        value={
          <span data-region="holds-count" className="ml-auto text-muted-foreground tabular-nums">
            {root ? root.length : ''}
          </span>
        }
        content={
          <ul data-region="holds" className="flex flex-col pb-1">
            <Level member={member} path={member.id} depth={0} />
          </ul>
        }
      />
    </div>
  );
};

/**
 * One address, and the levels under it.
 *
 * What a level is drawn from is the frame's reading rather than its own answer, and it asks the room for its own path
 * when it is drawn: a level that is closed again is a level whose answer the frame is free to forget. The member travels
 * down with it, because naming an element is naming it under the member the tree belongs to.
 */
function Level({ member, path, depth }: { member: PartProps['member']; path: string; depth: number }) {
  const compose = useChat((state) => state.compose);
  const console = useCapability(CONSOLE);
  const { rows, why, isOpen, toggle, ensure } = useHolds({ member: member.id, at: member.holdsAt });
  useEffect(() => {
    ensure(path);
  }, [ensure, path]);

  if (why[path]) {
    return <Note depth={depth}>{why[path]}</Note>;
  }
  const found = rows[path];
  if (!found) return <Note depth={depth}>reading</Note>;
  if (!found.length) return <Note depth={depth}>nothing in it</Note>;
  // A level is read no further than the model does, and a directory standing at the bound is the last of it: what is
  // under it is what the reader stopped at rather than what is not there, so the level says so once.
  const bounded = depth >= HELD_DEPTH;
  const nameable = askable(member.properties) !== null && console;

  return (
    <>
      {found.map((each) => {
        const open = each.dir && !bounded && isOpen(each.name);
        const folder = each.dir && !bounded;
        const label = (
          <>
            {folder ? (
              <ChevronRight className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-90')} />
            ) : (
              <span aria-hidden className="size-3.5 shrink-0" />
            )}
            <span className={cn('min-w-0 flex-1 truncate', !folder && 'text-muted-foreground')}>
              {leafOf(each.name)}
            </span>
          </>
        );
        return (
          <li key={each.name}>
            <span className={cn(ROW, 'h-6 w-full gap-1.5')} style={indent(depth)}>
              {folder ? (
                <button
                  type="button"
                  title={each.name}
                  onClick={() => toggle(each.name)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  {label}
                </button>
              ) : (
                <span className="flex min-w-0 flex-1 items-center gap-1.5" title={each.name}>
                  {label}
                </span>
              )}
              {/* The way an element becomes the subject of a line. It carries the member, which is the whole of what makes
                  the name resolvable, and it is drawn where the member can be asked and nowhere else. */}
              {nameable ? (
                <button
                  type="button"
                  data-region="holds-name"
                  data-holds={each.name}
                  title={`name ${each.name} in the line`}
                  onClick={() => {
                    compose(member.id, each.name);
                    // The console is where a line is said, so the press hands it the words and the addressee and opens it,
                    // which is what the member's own row of controls does: the two are the same act at two scales.
                    useSelection.getState().setOpen('console', true);
                  }}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <AtSign className="size-3" />
                </button>
              ) : null}
            </span>
            {open ? (
              <ul className="flex flex-col">
                <Level member={member} path={each.name} depth={depth + 1} />
              </ul>
            ) : null}
          </li>
        );
      })}
      {bounded && found.some((each) => each.dir) ? <Note depth={depth}>held deeper than this list reads</Note> : null}
    </>
  );
}

/** What a level says when it has nothing to draw, in the row's own type so the tree keeps one left edge. */
function Note({ depth, children }: { depth: number; children: string }) {
  return (
    <p className="py-1 text-[11.5px] text-muted-foreground" style={indent(depth)}>
      {children}
    </p>
  );
}
