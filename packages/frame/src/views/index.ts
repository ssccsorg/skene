// The readings the frame holds, listed where a reading is registered. The map is not here: it is a package, and a
// deployment that wants the place as a map imports it.
//
// A register knows only what has been imported, which is the one price of a reading declaring itself where it is drawn:
// this file is what pays it. A reading added as a file is a reading added here, and nothing else in the frame changes.
import './ActView';
import './GraphView';
import './HexView';
import './IntentsView';
import './OutsideView';
import './RecordsView';
