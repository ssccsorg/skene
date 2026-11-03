import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background,
  ReactFlow,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import { graphOf } from '@ssccsorg/skene-frame/lib/graph';
import type { Entry } from '@ssccsorg/skene-kernel';
import { UnitNode } from './UnitNode';

// The space as a graph: the participants and the work one declared and another took, laid out left to
// right so the direction an edge runs is the direction the work runs. Dagre lays it out, because the shape
// is a graph and a hand-placed one would be a second opinion about where things are.
//
// There is no store node. Every unit keeps its own store, so one node that every participant runs into
// would draw a central store, which is the reading the board was fixed away from. What each unit's own
// store holds is said on that unit's own plate instead.

const NODE_WIDTH = 176;
const NODE_HEIGHT = 44;
const SIZE = { width: NODE_WIDTH, height: NODE_HEIGHT } as const;

// Defined once, outside the component: ReactFlow reads this map on every render and a new object each
// time would remount every node.
const NODE_TYPES = { unit: UnitNode };

function layout(nodes: Node[], edges: Edge[]): Node[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'LR', nodesep: 22, ranksep: 130, marginx: 8, marginy: 8 });
  for (const node of nodes) graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  for (const edge of edges) graph.setEdge(edge.source, edge.target);
  dagre.layout(graph);
  return nodes.map((node) => {
    const placed = graph.node(node.id);
    return { ...node, position: { x: placed.x - NODE_WIDTH / 2, y: placed.y - NODE_HEIGHT / 2 } };
  });
}

export function EntityGraph({
  received,
  units,
}: {
  received: Entry[];
  units: Record<string, unknown>;
}) {
  const flow = useRef<ReactFlowInstance | null>(null);

  const { nodes, edges } = useMemo(() => {
    const graph = graphOf(received, units);

    const graphNodes: Node[] = graph.nodes.map((node) => ({
      id: node.id,
      type: 'unit',
      position: { x: 0, y: 0 },
      style: SIZE,
      data: { label: node.id, written: node.written },
    }));

    const graphEdges: Edge[] = graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      label: edge.label,
      animated: true,
      style: { stroke: 'var(--intent)' },
      labelStyle: { fill: 'var(--foreground)', fontSize: 11 },
      labelBgStyle: { fill: 'var(--card)' },
    }));

    return { nodes: layout(graphNodes, graphEdges), edges: graphEdges };
  }, [received, units]);

  // The layout is recomputed as the entities arrive, so the graph has to be re-fitted after each change
  // rather than only on the first render, or a node walks off the edge of the panel.
  const refit = useCallback(() => {
    void flow.current?.fitView({ padding: 0.18, maxZoom: 1 });
  }, []);
  useEffect(refit, [nodes, refit]);

  return (
    <div className="min-h-0 flex-1">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onInit={(instance) => {
          flow.current = instance;
          refit();
        }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
