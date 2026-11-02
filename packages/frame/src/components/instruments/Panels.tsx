import { Button } from '../ui/button';
import { Hint } from '../ui/hint';
import { useFrame } from '../../hooks/useFrame';
import { CONTROL } from '../../lib/chrome';
import { registerInstrument } from '../../lib/instruments';
import { usePanels, type PanelSide } from '../../lib/panels';
import { cn } from '../../lib/utils';
import { useSelection } from '../../stores/selection';

/**
 * The controls that open the frame's panels, named at the bar's two ends.
 *
 * A panel used to be opened by the spine it left behind: closed, it was a strip down the edge of the frame with its own
 * name written along it, and the control that brought it back was at the end of that strip. A strip is a control
 * standing where the panel is not, and each of the panels also carried its own fold button in its own header, so the
 * frame had five places that decided what was out. The controls are named once, here, and a closed panel is drawn
 * nowhere at all.
 *
 * One row draws one side of the bar because where a control stands is a fact about the panel it opens: the panels of the
 * left edge are named at the left and the rest at the right, so a control is beside the thing it opens rather than
 * wherever a list happened to put it. What is in a row is not listed here either: it is the register's answer for that
 * side, so a panel is added where panels are declared and the bar draws it. The glyph is the panel's own for the same
 * reason: a table of names and drawings beside the register would be a second list to keep in step with it.
 *
 * What a press means is the width's, because where there is no room a panel is not beside the space and the question is
 * which one is up rather than which ones are out. So a control that stands for the panel that is up puts it away, and
 * every other brings its own forward, and the two answers the frame gives about a panel, the bar's and the overlay's,
 * are then one answer by construction rather than two that happen to agree.
 *
 * A panel that stands for an edge folds that edge instead of putting itself away. The transport is the one: its header
 * is the line the bottom keeps when the rest of it is folded, so a press that put the panel away would take away the
 * thing the next press has to be on. One press for the edge is what the bar names.
 */
function Row({ side }: { side: PanelSide }) {
  const room = useFrame();
  const front = useSelection((state) => state.front);
  const setOpen = useSelection((state) => state.setOpen);
  const bar = useSelection((state) => state.bar);
  const setBar = useSelection((state) => state.setBar);
  const panels = usePanels().filter((panel) => panel.unit.side === side);

  return (
    <>
      {panels.map(({ unit, open, toggle }) => {
        // An edge's press is about the edge, so what it says and what it does are the edge's answer: the panel it is
        // drawn from stays out, and the press that brings the edge back is the press that put it away.
        const edge = unit.fold === 'edge';
        const up = edge ? bar : room ? open : open && front === unit.key;
        const press = () => {
          if (!edge) {
            if (room) toggle();
            else setOpen(unit.key, !up);
            return;
          }
          if (bar) {
            setBar(false);
            return;
          }
          // An edge with its panel away has nothing to fold, so bringing it back brings the panel with it.
          if (!open) setOpen(unit.key, true);
          setBar(true);
        };
        const name = edge ? 'the bottom edge' : unit.label.toLowerCase();
        return (
          <Hint key={unit.key} label={up ? `hide ${name}` : edge ? `show ${name}` : unit.label}>
            <Button
              size="icon-xs"
              variant="ghost"
              className={cn(CONTROL)}
              data-region="panel-toggle"
              data-panel={unit.key}
              data-on={up}
              onClick={press}
            >
              <unit.Icon />
            </Button>
          </Hint>
        );
      })}
    </>
  );
}

registerInstrument({ key: 'panels-left', order: 10, band: 0, side: 'left', Control: () => <Row side="left" /> });
registerInstrument({ key: 'panels-right', order: 60, band: 3, Control: () => <Row side="right" /> });
