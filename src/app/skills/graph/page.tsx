'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import FilterBar, { type Filters } from '@/components/shared/FilterBar';

const CATEGORY_COLORS: Record<string, string> = {
  Cloud: '#3b82f6',
  AI: '#8b5cf6',
  Data: '#10b981',
  Development: '#f59e0b',
  Domain: '#ec4899',
};

const PROFICIENCY_WIDTH: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

interface RawNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface RawEdge {
  id: string;
  source: string;
  target: string;
  data: Record<string, unknown>;
}

interface GraphData {
  nodes: RawNode[];
  edges: RawEdge[];
}

function getNodePosition(index: number, nodeType: string, total: number, category?: string): { x: number; y: number } {
  // Group nodes by type in vertical bands
  // Skills on left, people in middle, projects on right
  const CATEGORY_Y_OFFSET: Record<string, number> = {
    Cloud: 0,
    AI: 1,
    Data: 2,
    Development: 3,
    Domain: 4,
  };

  if (nodeType === 'skill') {
    const catIdx = CATEGORY_Y_OFFSET[category || 'Cloud'] ?? 0;
    const withinCat = index % 4;
    return { x: 50 + withinCat * 180, y: 50 + catIdx * 120 };
  }

  if (nodeType === 'project') {
    return { x: 900 + (index % 2) * 200, y: 100 + Math.floor(index / 2) * 150 };
  }

  // People - spread them across the middle
  const cols = 4;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: 100 + col * 200, y: 650 + row * 90 };
}

function buildFlowData(rawNodes: RawNode[], rawEdges: RawEdge[]): { nodes: Node[]; edges: Edge[] } {
  let skillIdx = 0;
  let personIdx = 0;
  let projectIdx = 0;

  const nodes: Node[] = rawNodes.map((n) => {
    let bg = '#e5e7eb';
    let fg = '#374151';
    let border = '#d1d5db';
    let pos: { x: number; y: number };

    if (n.type === 'skill') {
      const cat = n.data.category as string;
      bg = CATEGORY_COLORS[cat] || '#6b7280';
      fg = '#ffffff';
      border = bg;
      pos = getNodePosition(skillIdx++, 'skill', rawNodes.length, cat);
    } else if (n.type === 'person') {
      bg = n.data.personType === 'intern' ? '#dbeafe' : '#dcfce7';
      fg = n.data.personType === 'intern' ? '#1e40af' : '#166534';
      border = n.data.personType === 'intern' ? '#93c5fd' : '#86efac';
      pos = getNodePosition(personIdx++, 'person', rawNodes.length);
    } else {
      bg = '#fef3c7';
      fg = '#92400e';
      border = '#fcd34d';
      pos = getNodePosition(projectIdx++, 'project', rawNodes.length);
    }

    return {
      id: n.id,
      position: pos,
      data: { label: String(n.data.label || ''), ...n.data },
      style: {
        background: bg,
        color: fg,
        border: `2px solid ${border}`,
        borderRadius: n.type === 'person' ? '24px' : n.type === 'project' ? '8px' : '12px',
        padding: '8px 14px',
        fontSize: '11px',
        fontWeight: 600,
        whiteSpace: 'nowrap' as const,
      },
    };
  });

  const edges: Edge[] = rawEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    style: {
      strokeWidth: PROFICIENCY_WIDTH[e.data.proficiency as string] || 1,
      stroke: e.data.type === 'project' ? '#fcd34d' : '#94a3b8',
    },
    animated: e.data.type === 'project',
  }));

  return { nodes, edges };
}

export default function SkillsGraphPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [filters, setFilters] = useState<Filters>({ region: '', type: '', stage: '', risk: '' });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const fetchGraph = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.region) params.set('region', filters.region);
    if (filters.type) params.set('type', filters.type);

    const res = await fetch(`/api/skills/graph?${params}`);
    if (res.ok) {
      const data = await res.json();
      setGraphData(data);
    }
  }, [filters]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0) return;
    const { nodes: flowNodes, edges: flowEdges } = buildFlowData(graphData.nodes, graphData.edges);
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [graphData, setNodes, setEdges]);

  const highlightedEdges = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    return new Set(
      edges.filter((e) => e.source === selectedNode || e.target === selectedNode).map((e) => e.id)
    );
  }, [selectedNode, edges]);

  const highlightedNodes = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const connected = new Set<string>([selectedNode]);
    edges.forEach((e) => {
      if (e.source === selectedNode) connected.add(e.target);
      if (e.target === selectedNode) connected.add(e.source);
    });
    return connected;
  }, [selectedNode, edges]);

  const styledNodes = useMemo(() => {
    if (!selectedNode) return nodes;
    return nodes.map((n) => ({
      ...n,
      style: {
        ...n.style,
        opacity: highlightedNodes.has(n.id) ? 1 : 0.15,
        transition: 'opacity 0.2s',
      },
    }));
  }, [nodes, selectedNode, highlightedNodes]);

  const styledEdges = useMemo(() => {
    if (!selectedNode) return edges;
    return edges.map((e) => ({
      ...e,
      style: {
        ...e.style,
        opacity: highlightedEdges.has(e.id) ? 1 : 0.05,
        transition: 'opacity 0.2s',
      },
    }));
  }, [edges, selectedNode, highlightedEdges]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Skills Graph</h2>
        {selectedNode && (
          <button
            onClick={() => setSelectedNode(null)}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-2.5 py-1 rounded-lg"
          >
            Clear Selection
          </button>
        )}
      </div>

      <div className="mb-4">
        <FilterBar filters={filters} onChange={setFilters} showStage={false} showRisk={false} />
      </div>

      <div className="flex gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-4 text-[10px] text-gray-500">
          <span className="font-medium">Legend:</span>
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <span key={cat} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ background: color }} />
              {cat}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-200 border border-blue-400" /> Intern
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-200 border border-green-400" /> FTE
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Project
          </span>
        </div>
      </div>

      <div
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        style={{ width: '100%', height: '550px' }}
      >
        {graphData && graphData.nodes.length > 0 ? (
          <ReactFlow
            nodes={styledNodes}
            edges={styledEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) =>
              setSelectedNode(node.id === selectedNode ? null : node.id)
            }
            onPaneClick={() => setSelectedNode(null)}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.2}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              style={{ width: 120, height: 80 }}
            />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            {graphData ? 'No data matching filters' : 'Loading graph...'}
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-400 mt-2">
        {nodes.length} nodes · {edges.length} edges · Click a node to highlight
        connections · Drag to pan, scroll to zoom
      </p>
    </div>
  );
}
