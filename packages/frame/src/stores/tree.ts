import { create } from 'zustand';

// Every address the space holds, walked once when the project is taken up.
//
// The offer cannot read its tree lazily: an offer that answered while a walk was still going would be a list growing under
// the pilot's eyes, and the first `@` of a session would name a member and nothing under it. So the whole tree is read
// once per room and kept, which spends a walk per project rather than a walk per keystroke.
//
// It is held here rather than in the field because the field is opened and closed all day and the space does not change
// while the room is up: a second walk for a second opening would be the same requests for the same answer.
//
// Nothing here is persisted. It is a reading of one room, and a room is not the same one next time.

interface TreeState {
  /** The room every address here was read from, which is the project whose room it is. */
  room: string | null;
  /** Every address the space holds, in the order it was walked: members first, then what they hold. */
  addresses: string[];
  /** Take up a room, forgetting the last one's addresses. */
  clear: (room: string) => void;
  /** Add what a walk has read so far. */
  found: (addresses: string[]) => void;
}

export const useTreeStore = create<TreeState>((set) => ({
  room: null,
  addresses: [],

  clear: (room) => set({ room, addresses: [] }),
  found: (addresses) => set((state) => ({ addresses: [...state.addresses, ...addresses] })),
}));
