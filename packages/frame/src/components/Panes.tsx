import { useFrame } from '../hooks/useFrame';
import { usePanels, type PanelAt } from '../lib/panels';
// The panels that declare themselves, loaded where the frame draws them: a register knows only what has been imported.
import './panels';

/**
 * The panels that stand at one place in the frame.
 *
 * It draws what the register has for that place and nothing else: what a panel is called, how its control is drawn, and
 * what its box looks like are the panel's own, so a panel added later stands here without this being told it exists and
 * the frame holds no list of its own. A panel that is away is not drawn at all and leaves nothing behind, which is why
 * there is no closed form here.
 *
 * A place and not an order: the middle of the frame is the reading the board draws and it is where it is, so the frame
 * has three places a panel can stand and the middle is not one of them.
 *
 * Where the frame has no room for its own row, nothing stands at any place and the panels are drawn over the space
 * instead (`components/PanelOverlay`). The question is asked here rather than at each panel because it is one question
 * about the frame, and a panel that answered it for itself would be a panel that hid itself, which is what left the
 * frame's bar offering a control for a panel no window could draw.
 */
export function Panes({ at, only = 'open' }: { at: PanelAt; only?: 'open' | 'closed' }) {
  const room = useFrame();
  const all = usePanels();
  const panels = all
    .filter((panel) => panel.unit.at === at && (only === 'closed' ? !panel.open : panel.open))
    .map((panel) => panel.unit);
  if (!room) return null;

  return (
    <>
      {panels.map((panel) => (
        <panel.View key={panel.key} />
      ))}
    </>
  );
}
