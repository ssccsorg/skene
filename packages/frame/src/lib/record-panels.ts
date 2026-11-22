// What a record's detail says, as the place that states the record decides it.
//
// The frame draws one record's envelope: its kind, when it was written, its origin, and the address the format derives.
// Those are the format's own and every deployment has them. What a record *means* is not the format's, and a panel that
// spelled it out would be the frame claiming a domain: an engine's record is an address and a payload size, while a run
// read as a mission is a step and what it established, and both are the same three kinds underneath.
//
// So a place names a record panel by key, and the module that draws one installs itself here. A place that names none
// keeps the frame's envelope, which is what every place written before this existed does. What the frame checks is that
// the key the project wrote is one it holds; what the panel says is the panel's own.

import type { ComponentType } from 'react';
import type { Entry, Place } from '@ssccsorg/skene-kernel';

/** What a record panel is handed: the picked record, the place it was picked in, and the envelope around it. */
export interface RecordPanelProps {
  /** The picked record, as the run wrote it. */
  record: Entry;
  /** The place in force, which is what a panel needs to read a coordinate back. */
  place: Place;
  /**
   * What the format says about the record, as rows a panel may place rather than copy.
   *
   * The envelope is the frame's answer and not the panel's, so a panel that wants to show it arranges these and does not
   * derive them again: kind, when it was written, its origin, and what it measured or holds.
   */
  envelope: { label: string; value: string }[];
}

export interface RecordPanel {
  /** The name a place writes in `recordPanel`, which is what every other field is read by. */
  key: string;
  /** What the panel is called where a reader is told which one is in force. */
  label: string;
  /** The panel itself, drawn where the record's detail stands. */
  View: ComponentType<RecordPanelProps>;
}

const registered = new Map<string, RecordPanel>();

/** Install a record panel, where the module that draws it is written. The declaration comes back so a caller can hold it. */
export function registerRecordPanel(panel: RecordPanel): RecordPanel {
  registered.set(panel.key, panel);
  return panel;
}

/** One panel, or undefined when this build does not hold the key a place names. */
export function recordPanelOf(key: string): RecordPanel | undefined {
  return registered.get(key);
}

/** Every panel this build holds, in the order they were installed. */
export function recordPanels(): RecordPanel[] {
  return [...registered.values()];
}
