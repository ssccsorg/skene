import { Boxes, LoaderCircle, UserRound, Wifi, WifiOff, type LucideIcon } from 'lucide-react';
import { propertiesOf } from '../lib/kinds';
import { PROJECT_STATE } from '@ssccsorg/skene-ui';
import { useVolume } from '../hooks/useVolume';
import { useWorld } from '../hooks/useWorld';
import { useScenario } from '../stores/scenario';
import type { StreamState } from '../lib/record-client';
import { cn } from '@ssccsorg/skene-ui';

/**
 * The readings the frame keeps, at the end of the bar, where a status bar keeps them.
 *
 * A status bar is the one place a person looks without aiming: the readings are small, always in the same corner, and
 * each is a mark with a word. Four are here: the link the run arrives over, what the open project is doing, how many
 * members the space holds and how many people the place names.
 *
 * No reading spells its own name on the bar. The bar is one line and the names are long, so each stands as a glyph and
 * says its word on rollover: the thing a reader is looking at is the thing they ask, and a bar that wrote "online" and
 * "running" beside two marks spent the room of two readings on two words a reader already knows the shape of. What the
 * words cannot say is in the same tooltip, since a status bar is read at a glance and a sentence in one is a sentence
 * nobody reads.
 *
 * The link and the project's own state are two readings of two different things and are drawn so they cannot be taken
 * for one: the link is whether the run is arriving, which is a fact about this window's source, and the state is what
 * the open project is doing, which is a fact about the project wherever it is read. The link is the transport and the
 * state is the subject, so the first is a signal and the second is a shape the transport has nothing to say about. The
 * link is what the bar said next to the name before and does not belong there, because the name is the application's and
 * the readings are the state's, and a bar that runs them together has one line doing two jobs. The members are what the
 * space holds, which is a fact about the deployment and belongs with the state rather than in the space: a member stands
 * in the space and is named with it, and the count of them is what the frame has to report about itself.
 *
 * The room is read from the place and not from the space: a person is what the place declares, and asking the derived
 * space would re-derive every unit of it on every record that arrives to count a number the place already holds.
 *
 * The project's own state is here rather than on the bar that names the project, because that bar drops to one line in
 * the middle of the frame: a name in the middle of a bar is a name, and what a project is doing is a reading, so it
 * belongs with the rest of what the frame has to report about itself at the end of the top bar. It is the same scheme
 * the list of projects draws, so a running project is the same green in both, and the mark pulses in both for the same
 * reason.
 *
 * How many members the space holds is here because it is a reading of the whole space and of nothing in it: the map's own
 * foot carried it, where it was a number under a picture of the thing it counted and belonged to no row, and a count of
 * the space is what a status bar is for. It counts what the board draws, which is the devices the place declares and the
 * people who have intervened, and the members' own list is where the breakdown between them is read. The users are the
 * count of people the place names, which is the one reading the room's own section used to carry before the members
 * became one list: a user is not a thing in the space, so what the frame says about them is how many the place names.
 *
 * The run's own scenes were here as a strip of ticks and are not. A tick is the same reading the scene's own line
 * under the board carries in words, the strip was four controls wide of a bar that has one line, and a reader who wants
 * to know which scene the cursor is in reads the name of it rather than counting marks.
 */
/**
 * The link, as the glyph and the ink its own state is drawn in, and the word it says on rollover.
 *
 * The glyph is what tells a link that is up from one that is down at a glance and it is a signal rather than a state: a
 * source that has not answered is the one the frame is still setting up, and the two that have answered are the same
 * signal whether the source is still open or has handed the run over whole.
 */
const LINK: Record<StreamState, { Icon: LucideIcon; ink: string; word: string; title: string }> = {
  connecting: {
    Icon: LoaderCircle,
    ink: 'animate-spin text-idle',
    word: 'connecting',
    title: 'the source has not answered yet',
  },
  live: { Icon: Wifi, ink: 'text-working', word: 'online', title: 'the source is open and the run is arriving' },
  closed: { Icon: Wifi, ink: 'text-working', word: 'online', title: 'the source handed the run over whole and closed' },
  error: { Icon: WifiOff, ink: 'text-destructive', word: 'offline', title: 'the source refused' },
};

/** A source with no stream at all: the run read from the file the engine ran. */
const FROM_FILE = { Icon: Wifi, ink: 'text-working', word: 'online', title: 'the run, read from the file the engine ran' };
/** No run and no source: what a cold frame is before either has answered. */
const NO_SOURCE = { Icon: WifiOff, ink: 'text-destructive', word: 'offline', title: 'no source yet' };

export function StatusBar() {
  const source = useVolume().source;
  const stream = useVolume().stream;
  const detail = useVolume().detail;
  const units = useScenario((state) => state.model?.project.place.units);
  const status = useScenario((state) => state.model?.project.status);
  // What the space holds, which is what the board draws: the devices the place declares and the people who have taken
  // work. It is the same reading the map and the board draw, so the count and the picture cannot disagree.
  const members = useWorld().world?.present.length ?? 0;

  const link = source === 'local' ? FROM_FILE : source === 'stream' ? LINK[stream] : NO_SOURCE;
  const state = status ? PROJECT_STATE[status] : null;
  // A place that declares no units at all is a frame whose project has not arrived, and the entry list of nothing is what
  // the users are then. The list is built here rather than by the selector, because a selector that built it would hand
  // back a new array on every read and a store that sees a new value every read is a store that re-renders forever.
  // Whether a member is a person is asked of the atoms its kind is assembled from, which is the same reading the list of
  // members says a word of on every row.
  const kinds = useScenario((state) => state.model?.project.kinds);
  const users = units
    ? Object.entries(units)
        .filter(([, unit]) => propertiesOf(kinds, unit.icon).person)
        .map(([id]) => id)
    : [];

  return (
    <span data-region="status" className="flex items-center gap-2.5">
      <span
        data-region="link"
        data-link={link.word}
        className="flex items-center"
        title={`${link.word} \u00b7 ${detail ?? link.title}`}
      >
        <link.Icon className={cn('size-3.5 shrink-0', link.ink)} />
      </span>
      {state ? (
        <span
          data-region="project-state"
          data-state={state.word}
          className="flex items-center"
          title={`${state.word} \u00b7 what the open project is doing`}
        >
          <state.Icon className={cn('size-3.5 shrink-0', state.ink)} />
        </span>
      ) : null}
      {members ? (
        <span
          data-region="member-count"
          data-members={members}
          className="flex items-center gap-1.5"
          title={`${members} ${members === 1 ? 'member stands' : 'members stand'} in this space`}
        >
          <Boxes className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="text-[11.5px] tabular-nums text-muted-foreground">{members}</span>
        </span>
      ) : null}
      {users.length ? (
        <span
          data-region="users"
          data-users={users.length}
          className="flex items-center gap-1.5"
          title={`${users.join(', ')} \u00b7 the users the place names, who are written to rather than asked`}
        >
          <UserRound className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="text-[11.5px] tabular-nums text-muted-foreground">{users.length}</span>
        </span>
      ) : null}
    </span>
  );
}
