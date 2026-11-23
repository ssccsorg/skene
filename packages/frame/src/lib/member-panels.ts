// What a member's detail says, as the place that stands the member decides it.
//
// The frame draws one member opened: what it is, where the place stands it, and what the place declares it can be asked to
// do. Those are the frame's own, and a cockpit over machines is what they were written for: a pilot moves a unit on the
// ground and takes a branch from where the run stands, which is work a run that is being laid out or recorded does not
// have.
//
// So a place names a member panel by key, and the module that draws one installs itself here. A place that names none
// keeps the frame's form, which is what every place written before this existed does. What the frame checks is that the key
// the project wrote is one it holds; what the panel says is the panel's own.

import type { ComponentType } from 'react';
import type { Place, Standing } from '@ssccsorg/skene-kernel';

/** What a member panel is handed: the opened member, the place it stands in, and where the run is. */
export interface MemberPanelProps {
  /** The member as the place stands it and the run has changed it. */
  unit: Standing;
  /** The place in force, which is what a panel reads a coordinate or a declaration back from. */
  place: Place;
  /** The record the branch would be taken at, or null while it is taken from the end of the run. */
  fork: number | null;
  /** How far the run has arrived, which is where a branch taken now would start. */
  shown: number;
  /**
   * The names of what the member holds, as its project declares them.
   *
   * A board whose members are records stands each subject's runs as rows rather than as a window over all of them, so
   * the panel draws the list and a row is what a reader opens.
   */
  holds?: string[];
}

export interface MemberPanel {
  /** The name a place writes in `memberPanel`, which is what every other field is read by. */
  key: string;
  /** What the panel is called where a reader is told which one is in force. */
  label: string;
  /** The panel itself, drawn where the member's detail stands. */
  View: ComponentType<MemberPanelProps>;
}

const registered = new Map<string, MemberPanel>();

/** Install a member panel, where the module that draws it is written. The declaration comes back so a caller can hold it. */
export function registerMemberPanel(panel: MemberPanel): MemberPanel {
  registered.set(panel.key, panel);
  return panel;
}

/** One panel, or undefined when this build does not hold the key a place names. */
export function memberPanelOf(key: string): MemberPanel | undefined {
  return registered.get(key);
}

/** Every panel this build holds, in the order they were installed. */
export function memberPanels(): MemberPanel[] {
  return [...registered.values()];
}
