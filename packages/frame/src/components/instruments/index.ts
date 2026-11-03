// The controls the bar draws, listed where a control is registered.
//
// A register knows only what has been imported, which is the one price of a control declaring itself where it is
// drawn: this file is what pays it, the way `components/panels/index.ts` pays it for the panels and `views/index.ts`
// for the readings. A control added as a file is a control added here, and nothing else in the frame changes.
import './FillScreen';
import './FoldPanels';
import './MapSplit';
import './Panels';
import './Readings';
