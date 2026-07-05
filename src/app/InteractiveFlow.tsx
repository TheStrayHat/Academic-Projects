"use client";

import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import ReactFlow, {
  Controls,
  Background,
  type Node as FlowNode,
  type Edge as FlowEdge,
  type ReactFlowInstance,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type OnInit,
} from "reactflow";

function convexHull(points: [number, number][]) {
  if (points.length <= 1) return points.slice();
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function expandPolygon(poly: [number, number][], pad = 20) {
  if (poly.length === 0) return poly;
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
  const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  return poly.map(([x, y]) => {
    const vx = x - cx;
    const vy = y - cy;
    const len = Math.hypot(vx, vy) || 1;
    return [x + (vx / len) * pad, y + (vy / len) * pad] as [number, number];
  });
}

export function InteractiveFlow({
  nodes: initialNodes,
  edges: initialEdges,
  path,
  width = "100%",
  height = 384,
  showSurface = true,
  onNodeClick,
}: {
  nodes: FlowNode[];
  edges: FlowEdge[];
  path: string[];
  width?: string | number;
  height?: string | number;
  showSurface?: boolean;
  onNodeClick?: (id: string) => void;
}) {
  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [edges, setEdges] = useState<FlowEdge[]>(initialEdges);

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
  const onInit = useCallback((inst: ReactFlowInstance) => {
    rfInstanceRef.current = inst;
    inst.fitView();
  }, []);

  useEffect(() => {
    // merge new nodes but keep positions when ids match
    const merged = initialNodes.map((n) => {
      const old = nodes.find((o) => o.id === n.id);
      return old ? { ...n, position: old.position } : n;
    });
    setNodes(merged);
    setEdges(initialEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialNodes), JSON.stringify(initialEdges)]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onNodeClickLocal = useCallback((_: React.MouseEvent, node: FlowNode) => {
    onNodeClick?.(node.id);
  }, [onNodeClick]);

  const pathScreenPoints = useMemo(() => {
    const inst = rfInstanceRef.current;
    return path
      .map((id) => nodes.find((n) => n.id === id))
      .filter(Boolean)
      .map((n) => {
        const pos = n!.position as { x: number; y: number };
        if (inst && typeof inst.project === "function") {
          const p = inst.project(pos);
          return [p.x, p.y] as [number, number];
        }
        return [pos.x, pos.y] as [number, number];
      });
  }, [path.join(","), nodes]);

  const hullPoints = useMemo(() => {
    if (!pathScreenPoints || pathScreenPoints.length === 0) return [] as [number, number][];
    const hull = convexHull(pathScreenPoints);
    return expandPolygon(hull, 24);
  }, [pathScreenPoints]);

  return (
    <div style={{ width, height }} className="relative border rounded-lg bg-muted/30 overflow-hidden">
      {/*<svg className="absolute inset-0 w-full h-full pointer-events-none">
        {showSurface && hullPoints.length > 2 && (
          <polygon
            points={hullPoints.map((p) => `${p[0]},${p[1]}`).join(" ")}
            fill="rgba(239,68,68,0.08)"
            stroke="rgba(220,38,38,0.9)"
            strokeWidth={2}
          />
        )}

        {pathScreenPoints.length > 1 && (
          <polyline
            points={pathScreenPoints.map((p) => `${p[0]},${p[1]}`).join(" ")}
            fill="none"
            stroke="rgba(220,38,38,0.9)"
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-90"
          />
        )}
      </svg>*/}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={onInit as OnInit}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickLocal}
        fitView
        style={{ width: "100%", height: "100%" }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default InteractiveFlow;
