import { CheckCircle2, Circle, Flag, XCircle } from 'lucide-react';
import { useMemo } from 'react';
import { Hint } from './ui/hint';
import { useVolume } from '../hooks/useVolume';
import { campaignAt, type CampaignState, type ObjectiveState } from '@ssccsorg/skene-kernel';
import { LABEL, ROW, TITLE } from '../lib/chrome';
import { campaignInk } from '../lib/inks';
import { parseScenario } from '@ssccsorg/skene-kernel';
import { cn } from '../lib/utils';
import { useScenario } from '../stores/scenario';

/**
 * The campaign's own line, under the board.
 *
 * A mission is read from the run the board is already walking, so the HUD is a second reading of one record and not a
 * panel with its own state: the objective that is met is the fact the record wrote, and the cursor that walks back before
 * it puts the objective back to open. The line is the frame's own row, which is what keeps it out of the map's layers:
 * a scenario that wants a mark on the ground declares an overlay (`lib/map-overlays`), and the campaign's progress is
 * about the run rather than about a place.
 *
 * The words are the objective's own names. A campaign with none is a project that is a space and not a mission, and it
 * draws no line at all.
 *
 * A project holds several runs, and a campaign names the one it is read over. Every run of a project starts at zero, so
 * the cursor's second is a second in each of them and every campaign is read there: two campaigns over one place are
 * comparable at one point, which is what the slot is for. A run shorter than the cursor is read at its last record,
 * because the evaluator answers with what has arrived. A campaign over another run carries that run's name beside its
 * state, so a line that is waiting because its run is elsewhere says which run that is.
 */
const WORD: Record<CampaignState, string> = {
  pending: 'waiting',
  running: 'running',
  ended: 'complete',
};

const INK: Record<ObjectiveState, string> = {
  waiting: 'text-muted-foreground',
  open: 'text-muted-foreground',
  met: 'text-working',
  missed: 'text-claim',
};

function Mark({ state }: { state: ObjectiveState }) {
  if (state === 'met') return <CheckCircle2 className="size-3 shrink-0" />;
  if (state === 'missed') return <XCircle className="size-3 shrink-0" />;
  return <Circle className="size-3 shrink-0" />;
}

export function CampaignLine() {
  const projects = useScenario((state) => state.projects);
  const projectId = useScenario((state) => state.projectId);
  const { received, shown } = useVolume(projectId);
  // The bundle's own list rather than a fresh filter, so the memo holds while the run does not move.
  const bundle = projects.find((each) => each.id === projectId);
  const campaigns = bundle?.campaigns;
  const progress = useMemo(() => {
    if (!campaigns?.length || !bundle) return [];
    const revealed = received.slice(0, shown);
    const now = revealed.length ? revealed[revealed.length - 1].at : 0;
    return campaigns.map((campaign) => {
      if (!campaign.record || campaign.record === bundle.record) {
        return { campaign, run: null, read: campaignAt(campaign, revealed, now) };
      }
      const text = bundle.texts?.[campaign.record];
      const entries = text ? parseScenario(text).records : [];
      return { campaign, run: campaign.record, read: campaignAt(campaign, entries, now) };
    });
  }, [bundle, campaigns, received, shown]);

  if (!progress.length) return null;

  return (
    <>
      {progress.map(({ run, read: each }, index) => (
        <div
          key={each.campaign.id}
          data-region="campaign"
          data-campaign={each.campaign.id}
          data-state={each.state}
          className={cn(ROW, 'gap-2 border-t bg-card/40')}
        >
          <Flag className="size-3 shrink-0" style={{ color: campaignInk(index) }} />
          <span className={cn(TITLE, 'shrink-0')}>{each.campaign.title}</span>
          <span className={cn(LABEL, 'shrink-0')}>{WORD[each.state]}</span>
          {run ? (
            <Hint label={`read over its own run, ${run}`}>
              <span
                data-run={run}
                className={cn(LABEL, 'shrink-0 rounded border border-border px-1')}
              >
                {run.split('/').pop()}
              </span>
            </Hint>
          ) : null}
          <span className="mx-0.5 h-3 w-px shrink-0 bg-border" />
          <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            {each.objectives.map((objective) => (
              <Hint key={objective.objective.id} label={objective.objective.title}>
                <span
                  data-objective={objective.objective.id}
                  data-objective-state={objective.state}
                  className={cn('flex min-w-0 items-center gap-1', INK[objective.state])}
                >
                  <Mark state={objective.state} />
                  <span className="truncate">{objective.objective.title}</span>
                </span>
              </Hint>
            ))}
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {each.met}/{each.total}
          </span>
        </div>
      ))}
    </>
  );
}
