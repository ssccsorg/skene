import {
  FoldHorizontal,
  Minus,
  PanelBottom,
  Pause,
  Play,
  Plus,
  Rows3,
  SkipBack,
  SkipForward,
  UnfoldHorizontal,
} from 'lucide-react';
import { useState, useMemo, useRef } from 'react';
import { Splitter } from '../Splitter';
import { Timeline, ZOOMS } from '../Timeline';
import { Button } from '../ui/button';
import { Hint } from '../ui/hint';
import { RowControl } from '../ui/row-control';
import { useVolume } from '../../hooks/useVolume';
import { useWorld } from '../../hooks/useWorld';
import { keyOf } from '@ssccsorg/skene-kernel';
import { CONTROL, LABEL, ROW } from '../../lib/chrome';
import { campaignInk } from '../../lib/inks';
import { registerPanel } from '../../lib/panels';
import { parseScenario } from '@ssccsorg/skene-kernel';
import { cn } from '../../lib/utils';
import { useEdits } from '../../stores/edits';
import { useRecords } from '../../stores/records';
import { useScenario } from '../../stores/scenario';
import { useSelection } from '../../stores/selection';
import { useSizes } from '../../stores/sizes';

/**
 * The transport, under the board.
 *
 * It is the run's own axis, and it is a panel of the frame like the columns beside it: it keeps a header so the reading
 * it is has a name, and the transport is that header rather than a row of its own, because a panel that spends a row on
 * its name and another on its controls leaves the board two rows poorer for one line of track.
 *
 * Its height is the pilot's from a floor it cannot go under. The floor is the panel's own content, because a transport
 * shorter than its header, its strip and its line is a transport with something cut off, and one merged run is one line:
 * the panel comes up at that floor and stays there until the pilot drags it taller. The split view answers the same way,
 * with a row per writer as its floor.
 *
 * It draws its own box, its edge and its header. The header is its own and not the frame's because a row's header sits
 * above its content while a column's sits beside it, which is the difference the frame would have to know to draw it.
 */
function TimelinePane() {
  const { model, received, shown, branch } = useWorld();
  const [expanded, setExpanded] = useState(false);
  const [depth, setDepth] = useState(0);
  const projects = useScenario((state) => state.projects);
  const projectId = useScenario((state) => state.projectId);
  const bundle = projects.find((each) => each.id === projectId);
  // The project's runs, one branch each. The open one is the delivered run, because that is what the board is walking;
  // another is read from its own text, and its marks are places in that run so two lengths share one strip.
  const branches = useMemo(() => {
    const campaigns = bundle?.campaigns;
    if (!bundle || !campaigns?.length) return [];
    return campaigns.map((campaign, index) => {
      const open = !campaign.record || campaign.record === bundle.record;
      const entries = open ? received : parseScenario(bundle.texts?.[campaign.record ?? ''] ?? '').records;
      const last = Math.max(entries.length - 1, 1);
      return {
        id: campaign.id,
        title: campaign.title,
        ink: campaignInk(index),
        active: open,
        marks: entries.map((_, at) => at / last),
      };
    });
  }, [bundle, received]);
  const selected = useSelection((state) => state.selected);
  const bottom = useSelection((state) => state.bottom);
  const setBottom = useSelection((state) => state.setBottom);
  // The bar's press for this panel folds the edge, so the pane reads the edge's answer and does not draw the press. A
  // look at the folded edge draws the panel as it was, because a look is at the panel and not at its absence.
  const bar = useSelection((state) => state.bar);
  const drawn = bar || useSelection((state) => state.peek === 'bottom');
  const seek = useRecords((state) => state.seek);
  const setFollowing = useRecords((state) => state.setFollowing);
  const play = useRecords((state) => state.play);
  const pause = useRecords((state) => state.pause);
  const branchAt = useEdits((state) => state.branchAt);
  const { following, playing } = useVolume();
  // The two readings of one run keep their own height: a split that needed more room for its rows says nothing about the
  // height one line was dragged to, and each comes back at the floor of its own content.
  const measure = expanded ? 'timelineSplit' : 'timeline';
  const kept = useSizes((state) => state[measure]);
  const pane = useRef<HTMLDivElement>(null);
  const setSize = useSizes((state) => state.set);
  // A folded edge is not drawn at all, so a pane that is drawn has the height the pilot left it at.
  return (
    <div
      ref={pane}
      data-region="timeline-pane"
      style={drawn ? { height: kept } : undefined}
      className="relative flex min-h-fit shrink-0 flex-col overflow-hidden border-y"
    >
      {drawn ? (
        <Splitter
          axis="y"
          invert
          value={kept}
          measure={() => pane.current?.getBoundingClientRect().height ?? kept}
          onChange={(value) => setSize(measure, value)}
          className="inset-x-0 -top-[3px] h-1.5"
        />
      ) : null}
      <div className={cn(ROW, 'gap-2')}>
        <h2 className={LABEL}>Timeline</h2>
        <span className="flex items-center gap-1 text-muted-foreground tabular-nums">
          <span>
            {shown} / {received.length}
          </span>
          {/* The depth of the run, which is the one control the axis has of its own: a press doubles what is read of it
              around the cursor, and the counter says where in the whole run the window stands. */}
          <Hint label="zoom out">
            <Button
              size="icon-xs"
              variant="ghost"
              className={cn(CONTROL)}
              disabled={depth === 0}
              onClick={() => setDepth(depth - 1)}
            >
              <Minus />
            </Button>
          </Hint>
          <Hint label="zoom in">
            <Button
              size="icon-xs"
              variant="ghost"
              className={cn(CONTROL)}
              disabled={depth === ZOOMS.length - 1}
              onClick={() => setDepth(depth + 1)}
            >
              <Plus />
            </Button>
          </Hint>
        </span>
        <span className="flex-1" />
        <span className="flex items-center gap-1">
          <Hint label="back">
            <Button size="icon-xs" variant="ghost" className={cn(CONTROL)} onClick={() => seek(shown - 1)}>
              <SkipBack />
            </Button>
          </Hint>
          <Hint label={playing ? 'pause' : 'play'}>
            <Button size="icon-xs" variant="outline" onClick={playing ? pause : play}>
              {playing ? <Pause /> : <Play />}
            </Button>
          </Hint>
          <Hint label="forward">
            <Button size="icon-xs" variant="ghost" className={cn(CONTROL)} onClick={() => seek(shown + 1)}>
              <SkipForward />
            </Button>
          </Hint>
        </span>
        <span className="flex-1" />
        <Hint label="latest">
          <RowControl size="xs" at="middle" data-on={following} onClick={() => setFollowing(true)}>
            Latest
          </RowControl>
        </Hint>
        {/* The run as one line, or as one row per writer. A split is a reading of the same run, so it is a control of
            the transport and not a second panel. */}
        {/* The panel's own two presses, at the end of the row: read the run as rows, and say how far the frame's bottom
            edge reaches. Folding the edge is the bar's press for this panel, which is the one place the edge is named. */}
        <Hint label={expanded ? 'one line' : 'split by writer'}>
          <RowControl
            size="icon-xs"
            at="middle"
            data-on={expanded}
            aria-pressed={expanded}
            aria-label={expanded ? 'one line' : 'split by writer'}
            onClick={() => setExpanded(!expanded)}
          >
            <Rows3 />
          </RowControl>
        </Hint>
        <Hint label={bottom === 'full' ? 'bottom between the panels' : 'bottom across the frame'}>
          <RowControl
            size="icon-xs"
            at="end"
            data-on={bottom === 'full'}
            aria-pressed={bottom === 'full'}
            aria-label={bottom === 'full' ? 'bottom between the panels' : 'bottom across the frame'}
            onClick={() => setBottom(bottom === 'full' ? 'inset' : 'full')}
          >
            {bottom === 'full' ? <FoldHorizontal /> : <UnfoldHorizontal />}
          </RowControl>
        </Hint>
      </div>
      {drawn ? (
        <Timeline
          records={received}
          boundaries={(model?.scenes ?? []).map((each) => ({ title: each.title, at: each.to }))}
          shown={shown}
          following={following}
          depth={depth}
          picked={selected ? keyOf(selected) : null}
          branch={branch}
          branches={branches}
          expanded={expanded}
          onSeek={seek}
          onFollow={() => setFollowing(true)}
          onBranch={(after) => branchAt(Math.min(Math.max(after, 0), received.length))}
        />
      ) : null}
    </div>
  );
}

registerPanel({
  key: 'timeline',
  at: 'bottom',
  order: 10,
  side: 'right',
  label: 'Timeline',
  title: 'the transport, walking the run',
  starts: true,
  fold: 'edge',
  Icon: PanelBottom,
  View: TimelinePane,
});
