import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@ssccsorg/skene-ui';
import { Hint } from '@ssccsorg/skene-ui';
import { CONTROL } from '@ssccsorg/skene-ui';
import { registerInstrument } from '../../lib/instruments';
import { useReadings, useSeat, type Reading } from '../../lib/readings';
import { cn } from '@ssccsorg/skene-ui';
import { useFrame } from '../../stores/frame';
import { useScenario } from '../../stores/scenario';

/**
 * Which reading of the space the board draws.
 *
 * Every reading speaks to every reading, because choosing one is the one thing that is always possible: a pilot standing
 * in the account can always look at the shell. The one in force is drawn in the brightest ink, so the row says both what
 * is being looked at and what could be.
 *
 * A reading that declares itself a pane is not in this row. Its control belongs with the arrangements that size it, so
 * the pane and its arrangements stand together in `PaneSplit` and this row stays a row of pictures.
 *
 * The shell is not in this row either. It is the sphere itself, so its control stands with the sphere's own projection
 * controls (`SphereView`) and a turn of the frame's field is read beside the picture it changes rather than across a
 * rule. What is left here is the readings that read the run through something other than the shell.
 */
function ReadingButton({ reading }: { reading: Reading }) {
  const { pathname } = useLocation();
  if (!reading.button) return null;
  return (
    <Hint label={reading.button.title}>
      <Button
        asChild
        variant="ghost"
        size="icon-xs"
        className={cn(CONTROL)}
        data-on={pathname === reading.path}
      >
        <NavLink to={reading.path}>
          <reading.button.Icon />
        </NavLink>
      </Button>
    </Hint>
  );
}

function Readings() {
  const readings = useReadings();
  return (
    <>
      {readings.map((reading) =>
        reading.button && !reading.pane && !reading.seat ? (
          <ReadingButton key={reading.key} reading={reading} />
        ) : null,
      )}
    </>
  );
}

/**
 * The shell's own control, drawn where the sphere's projection is.
 *
 * The sphere is a pane of the board, not a reading that replaces the pane beside it: the pane can stand beside it, above
 * it, or take the whole frame. So this control is a visibility reading and not only an address. It is on while the sphere
 * is drawn, which is every arrangement but the pane alone, and it is off in the pane alone and on the pane's own page.
 *
 * A press has one job: bring the sphere back. From the pane alone it returns to the last arrangement that drew both panes,
 * so the pane's own icon stays on because the pane is still there. From the pane's own page it comes back to that
 * arrangement as well, rather than to a split that would hide the sphere again. A press while the sphere is already on
 * changes nothing: the control says where the pilot is, and the pane's own button is the one that puts the pane away.
 */
function SphereView() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const seat = useSeat();
  const projectId = useScenario((state) => state.projectId);
  const split = useFrame((state) => state.splitOf(projectId));
  const returnToTogether = useFrame((state) => state.returnToTogether);
  if (!seat?.button) return <></>;

  const here = pathname === seat.path;
  const drawn = here && split !== 'full';

  return (
    <Hint label={seat.button.title}>
      <Button
        size="icon-xs"
        variant="ghost"
        className={cn(CONTROL)}
        data-on={drawn}
        onClick={() => {
          navigate(seat.path);
          // The pane alone is the one arrangement a return must not keep, because it would hide the sphere again.
          returnToTogether(projectId);
        }}
      >
        <seat.button.Icon />
      </Button>
    </Hint>
  );
}


registerInstrument({
  key: 'sphere-view',
  order: 10,
  band: 0,
  Control: SphereView,
});

registerInstrument({
  key: 'readings',
  order: 30,
  band: 0,
  Control: Readings,
});
