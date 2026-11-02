// The record source: a stream of records, and the one place the wire shape is understood.
//
// The dashboard never reads the volume itself. A record arrives as JSON, flat, because a record's
// links are to other records and a cycle cannot go over a wire; the two labels it carries are
// resolved here, against the records already received, so what the store holds is the same shape the
// reader derives from a file.
//
// This is the seam a production deployment replaces. The mock server replays a project's own
// scenario, so the records on the wire are the records the engine writes; a real one would read them
// out of the volume or subscribe to the store that holds it.

import { host } from './host';
import type { Entry, NodeKind } from './types';

export interface WireRecord {
  seq: number;
  kind: NodeKind;
  at: number;
  origin?: string;
  bytes?: number;
  cycle?: number;
  label?: string;
  content?: string;
  description?: string;
  worker?: string;
  fromLabel?: string;
  producedLabel?: string;
  producedByLabel?: string;
}

export type StreamState = 'connecting' | 'live' | 'closed' | 'error';

export interface StreamHandlers {
  onRecord: (record: Entry) => void;
  onState: (state: StreamState, detail?: string) => void;
}

export const DEFAULT_STREAM_PORT = 8790;

export function streamUrl(projectId: string, pace?: number, at?: number): string {
  const base =
    host().endpoints?.stream ?? import.meta.env?.VITE_STREAM_URL ?? `ws://127.0.0.1:${DEFAULT_STREAM_PORT}`;
  const url = new URL(`${base.replace(/\/$/, '')}/stream`);
  url.searchParams.set('project', projectId);
  if (typeof pace === 'number') url.searchParams.set('pace', String(pace));
  // A frame named in an address asks for exactly that many records, so a screenshot is reproducible
  // against a feed that is otherwise a clock.
  if (typeof at === 'number') url.searchParams.set('at', String(at));
  return url.toString();
}

/**
 * The labels a reading has seen, and the declarations that named a record before it arrived.
 *
 * A run is not always printed in a causal order: a volume orders its records by a clock, and a declaration can be
 * printed before the fact it starts from. A link to a record that has not arrived is therefore held rather than read
 * as a missing one, and the arrival fills it in. Both paths that read a run hold one of these, which is what makes the
 * linking rule one rule.
 */
export interface Links {
  named: Map<string, Entry>;
  waiting: Map<string, Entry[]>;
}

export const links = (): Links => ({ named: new Map(), waiting: new Map() });

/**
 * Resolve one flat record into one that reaches the records already received. It is a function of the
 * records named so far rather than a method on the socket, because linking is where the wire shape and
 * the reader's shape have to agree and that is worth holding to a test without a socket.
 */
export function linkRecord({ named, waiting }: Links, wire: WireRecord): Entry | null {
  const record: Entry = {
    kind: wire.kind,
    at: wire.at,
    origin: wire.origin,
    bytes: wire.bytes,
    cycle: wire.cycle,
    label: wire.label,
    content: wire.content,
    description: wire.description,
    worker: wire.worker,
    fromLabel: wire.fromLabel,
  };
  if (wire.fromLabel) {
    const from = named.get(wire.fromLabel);
    record.from = from ?? null;
    if (!from) {
      const held = waiting.get(wire.fromLabel) ?? [];
      held.push(record);
      waiting.set(wire.fromLabel, held);
    }
  }
  if (wire.producedByLabel) {
    const intent = named.get(wire.producedByLabel);
    if (!intent) return null;
    record.producedBy = intent;
    // A turn may write more than one reading, and the first is the one it was said for: a move writes the reading it
    // acted on and then the ground it reached, and the strip names the work rather than where the unit ended up.
    intent.produced = intent.produced ?? record;
  }
  // A claim is a step and not a record: it is not named in the volume, so it must not take the
  // declaration's own name here or the fact the declaration produced reaches the claim instead.
  if (wire.label && wire.kind !== 'claim') {
    named.set(wire.label, record);
    // A declaration printed before the fact it names has been waiting for it.
    for (const held of waiting.get(wire.label) ?? []) held.from = record;
    waiting.delete(wire.label);
  }
  if (wire.kind === 'claim' && wire.label) {
    const intent = named.get(wire.label);
    if (intent) {
      intent.claim = record;
      // A claim is where the taker is named, so the declaration learns its worker here as it does
      // from the file. A stream that already carried the worker leaves it alone.
      if (wire.worker) intent.worker = wire.worker;
    }
  }
  return record;
}

/**
 * One connection, one project. Records are linked as they arrive: a claim attaches itself to the
 * declaration it took, and a conclusion attaches the fact it produced, so the store ends up holding
 * the same graph the file would have produced.
 */
export class RecordStream {
  private socket: WebSocket | null = null;
  private reading: Links = links();

  constructor(
    private readonly url: string,
    private readonly handlers: StreamHandlers,
  ) {}

  open(): void {
    this.handlers.onState('connecting');
    let socket: WebSocket;
    try {
      socket = new WebSocket(this.url);
    } catch (error) {
      this.handlers.onState('error', String(error));
      return;
    }
    this.socket = socket;

    socket.addEventListener('open', () => this.handlers.onState('live'));
    socket.addEventListener('close', () => this.handlers.onState('closed'));
    socket.addEventListener('error', () => this.handlers.onState('error', 'the stream refused'));
    socket.addEventListener('message', (event) => {
      let wire: WireRecord;
      try {
        wire = JSON.parse(String(event.data)) as WireRecord;
      } catch {
        this.handlers.onState('error', 'a record did not parse');
        return;
      }
      const record = linkRecord(this.reading, wire);
      if (record) this.handlers.onRecord(record);
    });
  }

  close(): void {
    this.socket?.close();
    this.socket = null;
  }
}
