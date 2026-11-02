import { create } from 'zustand';
import type { Asked } from '../lib/channel';

// What a room answered about what its members can be asked.
//
// An ability is a name in the place's declaration, and whether a line to it can be run is the member's own answer, so the
// console draws its controls from what came back here rather than from the declaration. It is held here rather than in the
// panel because a member's reading is opened and closed all day: a control asked again on every open is a request per open
// for an answer that does not change while the room is up.
//
// What the answers are answers of is a room, and the room is in here with them. A member's name is not a room's own, so two
// projects may both stand a member under one name and answer differently about it, and the store is what knows which one it
// is holding. A panel that reconciled it against its own memory would be a panel that has to be mounted for the store to be
// right, and one that is put away while the project changes would leave the last room's answers standing for the next.
//
// Nothing here is persisted. It is a reading of one room, and a room is not the same one next time.

interface AsksState {
  /** The room every answer here is a reading of, which is the project whose room it is. */
  room: string | null;
  /** What the room answered about a member, by member id. */
  rows: Record<string, Asked[]>;
  /**
   * The members that have been asked, so a row drawn every frame is asked once.
   *
   * A member is claimed before its answer arrives, and the claim carries no answer, so it cannot be read as one.
   */
  asked: Record<string, true>;
  /** Record the room's answer about a member. A null answer is a claim made while its own answer is in flight. */
  answered: (member: string, asks: Asked[] | null) => void;
  /** Take up another room, forgetting what the last one answered: the answers are not about this member any more. */
  clear: (room: string) => void;
}

export const useAskStore = create<AsksState>((set) => ({
  room: null,
  rows: {},
  asked: {},

  answered: (member, asks) =>
    set((state) => ({
      asked: { ...state.asked, [member]: true },
      rows: asks ? { ...state.rows, [member]: asks } : state.rows,
    })),

  clear: (room) => set({ room, rows: {}, asked: {} }),
}));
