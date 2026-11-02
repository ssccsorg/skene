import { Handle, Position, type NodeProps } from '@xyflow/react';
import { TITLE } from '../lib/chrome';
import { cn } from '../lib/utils';

/**
 * A participant's node in the graph: its name, and how much its own store holds. It is a node of its own
 * kind because the plate carries two readings and a ReactFlow label is a string.
 *
 * The count stands on the participant it belongs to and there is no store node for it to point at: an edge
 * into one shared store would say every participant writes into one place, which is the reading the record
 * model does not have. A participant that has written nothing says so, because the place declares it and
 * an empty store is not a missing one.
 *
 * It is a member item, so it is drawn in the member item's own type: the name is the row's title and the count is the
 * row's quiet reading, at the same sizes the rail's list and the space's labels use. A graph is another lay-out of the
 * same members and not another kind of member.
 */
export function UnitNode({ data }: NodeProps) {
  const written = Number(data.written ?? 0);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-md border border-border bg-card px-3 text-[11.5px] leading-tight">
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-border" />
      <span className={cn(TITLE, 'max-w-full truncate')}>{String(data.label)}</span>
      <span className="text-muted-foreground tabular-nums">
        {written ? `${written} in its own store` : 'its store is empty'}
      </span>
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-intent" />
    </div>
  );
}
