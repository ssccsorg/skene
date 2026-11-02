import { create } from 'zustand';

/**
 * How the board lays what it draws.
 *
 * The frame has one picture of the space and two ways of joining a mark to the middle: the straight line its own reading
 * is published along, and the route the ground's own cells give (`lib/world`), which crosses from one cell to the next at
 * the middle of the edge they share and turns by sixty degrees. The second is the tidier picture on a ground where things
 * stand close together and the first is the shorter one, and which a pilot wants is theirs rather than the frame's.
 *
 * It is held in a store and not in a component, because the board is rebuilt every time a record arrives and a choice
 * kept in the component would be a choice that resets when the thing under it changes. It is one value for the frame
 * rather than a setting of the reading: both readings of the wire are the same claim about the same ground, so a reading
 * added later draws whichever of them is in force without being told the choice exists.
 */
export type Wires = 'cells' | 'lines';

interface DrawingState {
  /** Which of the two the board draws: the ground's own cells, or the straight line each of them replaces. */
  wires: Wires;
  setWires: (wires: Wires) => void;
}

export const useDrawing = create<DrawingState>((set) => ({
  wires: 'cells',
  setWires: (wires) => set({ wires }),
}));
