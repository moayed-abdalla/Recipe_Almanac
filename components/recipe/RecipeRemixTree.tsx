'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  Position,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';
import type { RecipeRemixTreeNode } from '@/types';
import RemixTreeNode, {
  type RemixTreeFlowNode,
  type RemixTreeNodeData,
} from '@/components/recipe/RemixTreeNode';

const NODE_WIDTH = 168;
const NODE_HEIGHT = 132;
const nodeTypes: NodeTypes = { remix: RemixTreeNode };

function layoutTree(
  nodes: RemixTreeFlowNode[],
  edges: Edge[]
): { nodes: RemixTreeFlowNode[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    nodesep: 40,
    ranksep: 64,
    marginx: 24,
    marginy: 24,
  });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const layoutedNodes: RemixTreeFlowNode[] = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  });

  return { nodes: layoutedNodes, edges };
}

type RecipeRemixTreeProps = {
  nodes: RecipeRemixTreeNode[];
};

export default function RecipeRemixTree({ nodes: treeNodes }: RecipeRemixTreeProps) {
  const router = useRouter();

  const onNavigate = useCallback(
    (slug: string) => {
      router.push(`/recipe/${slug}`);
    },
    [router]
  );

  const { flowNodes, flowEdges, isTruncated } = useMemo(() => {
    const idSet = new Set(treeNodes.map((n) => n.id));
    const truncated = treeNodes.some((n) => n.is_truncated);

    const rawNodes: RemixTreeFlowNode[] = treeNodes.map((n) => ({
      id: n.id,
      type: 'remix',
      position: { x: 0, y: 0 },
      data: {
        slug: n.slug,
        title: n.title,
        image_url: n.image_url,
        username: n.username,
        is_current: n.is_current,
        onNavigate,
      } satisfies RemixTreeNodeData,
      draggable: false,
      selectable: !n.is_current,
    }));

    const rawEdges: Edge[] = treeNodes
      .filter(
        (n) =>
          n.copied_from_recipe_id != null && idSet.has(n.copied_from_recipe_id)
      )
      .map((n) => ({
        id: `${n.copied_from_recipe_id}->${n.id}`,
        source: n.copied_from_recipe_id as string,
        target: n.id,
        type: 'smoothstep',
        animated: false,
        style: { stroke: 'hsl(var(--p) / 0.55)', strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: 'hsl(var(--p) / 0.7)',
        },
      }));

    const { nodes, edges } = layoutTree(rawNodes, rawEdges);
    return { flowNodes: nodes, flowEdges: edges, isTruncated: truncated };
  }, [treeNodes, onNavigate]);

  if (treeNodes.length <= 1) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl sm:text-2xl font-bold mb-1 special-elite-regular">
        Remix tree
      </h2>
      <p className="text-sm text-base-content/70 mb-3 arial-font">
        Versions copied from this recipe&apos;s lineage. Pan and zoom to explore;
        click a card to open it.
      </p>
      <div className="h-[360px] sm:h-[400px] w-full rounded-lg border border-base-300 bg-base-200/40 overflow-hidden">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.35}
          maxZoom={1.75}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          panOnScroll
          zoomOnPinch
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={18} size={1} color="hsl(var(--bc) / 0.08)" />
          <Controls showInteractive={false} className="!bg-base-100 !border-base-300 !shadow-sm" />
        </ReactFlow>
      </div>
      {isTruncated && (
        <p className="mt-2 text-xs text-base-content/60 arial-font">
          Showing first 100 versions
        </p>
      )}
    </div>
  );
}
