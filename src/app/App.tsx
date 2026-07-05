import { useState } from "react";
import ReactFlow, {
  Controls,
  Background,
  type Node as FlowNode,
  type Edge as FlowEdge,
  MarkerType,
  Handle,
  Position,
} from "reactflow";
import dagre from "dagre";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Toaster } from "./components/ui/sonner";
import {
  Network,
  Play,
  Trash2,
  Plus,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import InteractiveFlow from "./InteractiveFlow";

interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

interface PathResult {
  node: string;
  distance: number;
  predecessor: string | null;
}

const nodeWidth = 30;
const nodeHeight = 30;

// Helper function to generate nodes for React Flow with dagre layout
const generateNodes = (
  nodeList: string[],
  edgeList: GraphEdge[],
  path: string[],
): FlowNode[] => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: "LR",
    nodesep: 50,
    ranksep: 80,
    marginx: 20,
    marginy: 20,
  });

  nodeList.forEach((node) => {
    dagreGraph.setNode(node, { width: nodeWidth, height: nodeHeight });
  });

  edgeList.forEach((edge) => {
    dagreGraph.setEdge(edge.from, edge.to);
  });

  dagre.layout(dagreGraph);

  return nodeList.map((node) => {
    const dagreNode = dagreGraph.node(node);
    return {
      id: node,
      data: { label: node },
      position: {
        x: dagreNode.x - nodeWidth / 2,
        y: dagreNode.y - nodeHeight / 2,
      },
      sourcePosition: Position.Right,   // ← ajouter
      targetPosition: Position.Left,    // ← ajouter
      style: {
        background: path.includes(node) ? "#3b82f6" : "#e5e7eb",
        color: path.includes(node) ? "#ffffff" : "#000000",
        border: path.includes(node) ? "2px solid #1e40af" : "1px solid #d1d5db",
        borderRadius: "50%",
        width: `${nodeWidth}px`,
        height: `${nodeHeight}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        fontWeight: "bold",
      },
    };
  });
};

// Helper function to generate edges for React Flow
const generateEdges = (edgeList: GraphEdge[], path: string[]): FlowEdge[] => {
  
  return edgeList.map((edge) => {
    const isInPath =
      path.includes(edge.from) &&
      path.includes(edge.to) &&
      path.indexOf(edge.from) === path.indexOf(edge.to) - 1;

    return {
      id: `${edge.from}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      sourceHandle: "right",
      targetHandle: "left",
      label: `${edge.weight}`,
      type: "Straight",
     
      markerEnd: {
        type: MarkerType.Arrow,
        color: isInPath ? "#3b82f6" : "#d1d5db",
        width: 15,
        height: 15,   
        orient: "auto",
      },
      
      style: {
        stroke: isInPath ? "#3b82f6" : "#d1d5db",
        strokeWidth: isInPath ? 3 : 2,
        

      },
      labelStyle: {
        fill: isInPath ? "#3b82f6" : "#6b7280",
        fontSize: "12px",
        fontWeight: "bold",
        
      },
      
    };
  });
};

export default function App() {
  const [mode, setMode] = useState<'min' | 'max'>('min');
  const [nodes, setNodes] = useState<string>("");
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [startNode, setStartNode] = useState<string>("");
  const [endNode, setEndNode] = useState<string>("");
  const [currentEdge, setCurrentEdge] = useState<GraphEdge>({
    from: "",
    to: "",
    weight: 0,
  });
  const [result, setResult] = useState<{
    distances: Record<string, number>;
    predecessors: Record<string, string | null>;
    path: string[];
    iterations: number;
    algo: 'min' | 'max';
    perIterations: Array<{
      k: number;
      distances: Record<string, number>;
      predecessors: Record<string, string | null>;
    
    }>;
  } | null>(null);

  const addEdge = () => {
    if (!currentEdge.from || !currentEdge.to) {
      toast.error("Please fill in all edge fields");
      return;
    }

    const nodeList = nodes
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    if (
      !nodeList.includes(currentEdge.from) ||
      !nodeList.includes(currentEdge.to)
    ) {
      toast.error("Edge nodes must exist in the node list");
      return;
    }

    setEdges([...edges, currentEdge]);
    setCurrentEdge({ from: "", to: "", weight: 0 });
    toast.success("Edge added successfully");
  };

  const removeEdge = (index: number) => {
    setEdges(edges.filter((_, i) => i !== index));
    toast.success("Edge removed");
  };

  const clearAll = () => {
    setNodes("");
    setEdges([]);
    setStartNode("");
    setEndNode("");
    setCurrentEdge({ from: "", to: "", weight: 0 });
    setResult(null);
    toast.success("All data cleared");
  };

  const bellmanKalaba = (modeoverride?: 'min' | 'max') => {
    const algo = modeoverride ?? mode;
    if (
      !nodes ||
      edges.length === 0 ||
      !startNode ||
      !endNode
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const nodeList = nodes
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    if (
      !nodeList.includes(startNode) ||
      !nodeList.includes(endNode)
    ) {
      toast.error(
        "Start and end nodes must exist in the node list",
      );
      return;
    }
    // Initialize distances and predecessors from endNode
    // For minimisation: others = +Infinity and use min rule
    // For maximisation: others = -Infinity and use max rule
    const distances: Record<string, number> = {};
    const predecessors: Record<string, string | null> = {};

    nodeList.forEach((node) => {
      distances[node] = node === endNode ? 0 : algo === 'min' ? Infinity : -Infinity;
      predecessors[node] = null;
    });

    // Bellman-Kalaba: Vk[i] = min_j (w(i,j) + Vk-1[j]) or max_j for maximisation
    let iterations = 0;
    const maxIterations = nodeList.length - 1;

    const perIterations: Array<{
      k: number;
      distances: Record<string, number>;
      predecessors: Record<string, string | null>;
    }> = [];

    // push initial snapshot (k=0)
    perIterations.push({
      k: 0,
      distances: { ...distances },
      predecessors: { ...predecessors },
    });

    for (let i = 0; i < maxIterations; i++) {
      let updated = false;
      iterations++;

        // ✅ snapshot de k-1 AVANT de modifier quoi que ce soit
      const prev = { ...distances };

     {/*for (const edge of edges) {
      if (prev[edge.to] !== Infinity) {
      const newDistance = edge.weight + prev[edge.to]; // V_{k-1}(j)
      if (newDistance > distances[edge.from]) {
        distances[edge.from] = newDistance;
        predecessors[edge.from] = edge.to;
        updated = true;
      }
    }
  }*/}


      // For every directed edge i->j, try to improve distance of i using j
      for (const edge of edges) {
       {/*} if (prev[edge.to] !== Infinity) {
      const newDistance = edge.weight + prev[edge.to]; // V_{k-1}(j)
          if (newDistance > distances[edge.from]) {
          distances[edge.from] = newDistance;
          predecessors[edge.from] = edge.to;
          updated = true;
       }
     }*/}

       if (algo === 'min') {
          if (distances[edge.to] !== Infinity) {
            const newDistance = edge.weight + distances[edge.to];
            if (newDistance < distances[edge.from]) {
              distances[edge.from] = newDistance;
              predecessors[edge.from] = edge.to; // from -> next towards end
              updated = true;
            }
          }
      } else {
          if (distances[edge.to] !== -Infinity) {
         const newDistance = edge.weight + distances[edge.to];
            if (newDistance > distances[edge.from]) {
            distances[edge.from] = newDistance;
            predecessors[edge.from] = edge.to;
            updated = true;
     }
   }
        }
      }

      // capture snapshot after this k-iteration
      perIterations.push({
        k: i + 1,
        distances: { ...distances },
        predecessors: { ...predecessors },
      });

      if (!updated) break;
    }

    // Check for cycles that allow infinite improvement
    for (const edge of edges) {
      if (algo === 'min') {
        if (distances[edge.to] !== Infinity) {
          const newDistance = edge.weight + distances[edge.to];
          if (newDistance < distances[edge.from]) {
            toast.error("Negative cycle detected in the graph!");
            return;
          }
        }
      } else {
        if (distances[edge.to] !== -Infinity) {
          const newDistance = edge.weight + distances[edge.to];
          if (newDistance > distances[edge.from]) {
            toast.error("Positive cycle detected (unbounded maximum)!");
            return;
          }
        }
      }
    }

    // Reconstruct path from startNode following predecessors until endNode
    const path: string[] = [];
    let current: string | null = startNode;

    if ((algo === 'min' && distances[startNode] === Infinity) || (algo === 'max' && distances[startNode] === -Infinity)) {
      toast.error("No path exists between the start and end nodes");
      return;
    }

    // follow next pointers (predecessors hold next node towards end)
    const visited = new Set<string>();
    while (current !== null && !visited.has(current)) {
      path.push(current);
      if (current === endNode) break;
      visited.add(current);
      current = predecessors[current];
    }

    setResult({ distances, predecessors, path, iterations, perIterations, algo});
    toast.success("Optimal path calculated successfully!");
  };

  const nodeList = nodes
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background p-8">
      <Toaster />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary text-primary-foreground">
            <Network className="size-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Bellman-Kalaba Algorithm
            </h1>
            <p className="text-muted-foreground">
              Optimal path finder for weighted directed graphs
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="size-5" />
                  Graph Configuration
                </CardTitle>
                <CardDescription>
                  Define nodes and edges for your graph
                  structure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Nodes Input */}
                <div className="space-y-2">
                  <Label htmlFor="nodes">
                    Nodes (comma-separated)
                  </Label>
                  <Input
                    id="nodes"
                    placeholder="e.g., A, B, C, D, E"
                    value={nodes}
                    onChange={(e) => setNodes(e.target.value)}
                    className="font-mono"
                  />
                  {nodeList.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {nodeList.map((node) => (
                        <Badge key={node} variant="secondary">
                          {node}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Edge Input */}
                <div className="space-y-4" id='edges'>
                  <Label>Add Edge</Label>
                  <div className="grid grid-cols-[1fr,auto,1fr,1fr,auto] gap-2 items-end">
                    <div className="space-y-2">
                      <Label
                        htmlFor="from"
                        className="text-xs text-muted-foreground"
                      >
                        From
                      </Label>
                      <select
                         id="from"
                         value={currentEdge.from}
                           onChange={(e) =>
                           setCurrentEdge({
                            ...currentEdge,
                            from: e.target.value,
                           })
                           }
                           className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                           >
                           <option value="">Select node</option>
                           {nodeList.map((node) => (
                          <option key={node} value={node}>
                              {node}
                          </option>
                            ))}
                     </select>
                    </div>

                    <ArrowRight className="size-5 text-muted-foreground mb-2" />

                    <div className="space-y-2">
                      <Label
                        htmlFor="to"
                        className="text-xs text-muted-foreground"
                      >
                        To
                      </Label>
                      <select
                        id="to"
                        value={currentEdge.to}
                        onChange={(e) =>
                          setCurrentEdge({
                            ...currentEdge,
                            to: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                      >
                        <option value="">Select node</option>
                        {nodeList.map((node) => (
                          <option key={node} value={node}>
                            {node}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="weight"
                        className="text-xs text-muted-foreground"
                      >
                        Weight
                      </Label>
                      <Input
                        id="weight"
                        type="number"
                        placeholder="0"
                        value={currentEdge.weight || ""}
                        onChange={(e) =>
                          setCurrentEdge({
                            ...currentEdge,
                            weight:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                        className="font-mono"
                      />
                    </div>

                    <Button
                      onClick={addEdge}
                      size="icon"
                      className="shrink-0"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Edges List */}
                {edges.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Current Edges ({edges.length})
                    </Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-muted/30">
                      {edges.map((edge, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-2 p-2 bg-card rounded border"
                        >
                          <div className="flex items-center gap-2 font-mono text-sm">
                            <Badge variant="outline">
                              {edge.from}
                            </Badge>
                            <ArrowRight className="size-4 text-muted-foreground" />
                            <Badge variant="outline">
                              {edge.to}
                            </Badge>
                            <span className="text-muted-foreground">
                              ·
                            </span>
                            <span className="font-semibold text-primary">
                              {edge.weight}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEdge(index)}
                            className="size-8 shrink-0"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Path Parameters</CardTitle>
                <CardDescription>
                  Select start and end nodes for path
                  calculation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start">Start Node</Label>
                    <Input
                      id="start"
                      placeholder="e.g., A"
                      value={startNode}
                      onChange={(e) =>
                        setStartNode(e.target.value)
                      }
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">End Node</Label>
                    <Input
                      id="end"
                      placeholder="e.g., E"
                      value={endNode}
                      onChange={(e) =>
                        setEndNode(e.target.value)
                      }
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => bellmanKalaba()}
                    className="flex-1 gap-2"
                  >
                    <Play className="size-4" />
                    Calculate Path
                  </Button>
                  <Button
                    onClick={clearAll}
                    variant="outline"
                    className="gap-2"
                  >
                    <Trash2 className="size-4" />
                    Clear All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            <Card className="lg:sticky lg:top-8">
              <CardHeader>
                <CardTitle>Results & Schema</CardTitle>
                <CardDescription>
                  Optimal path and distance calculations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result ? (
                  <Tabs defaultValue="path" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="path">Path</TabsTrigger>
                      <TabsTrigger value="tablek">k Table({result?.algo === 'min' ? 'Min' : 'Max'})</TabsTrigger>
                    </TabsList>

                    <TabsContent
                      value="path"
                      className="space-y-4 pt-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground">Total Distance (CHO)({result?.algo === 'min' ? 'Min' : 'Max'})</span>
                            <Button
                              size="sm"
                              variant="outline"
                             onClick={() => {
                             const newMode: 'min' | 'max' = result?.algo === 'min' ? 'max' : 'min';
                             setMode(newMode);
                             bellmanKalaba(newMode);
                              }}
                            >
                              {result?.algo === 'min' ? 'Passer en Max' : 'Passer en Min'}
                            </Button>
                          </div>
                          {/* TARGET SPAN: Total Distance value (id="total-distance") */}
                          <span className="text-2xl font-bold text-primary">
                            {result.distances[endNode] === Infinity ? (
                              <span id="total-distance" className="text-muted-foreground">∞</span>
                            ) : result.distances[endNode] === -Infinity ? (
                              <span id="total-distance" className="text-muted-foreground">∞</span>
                            ) : (
                              <span id="total-distance">{result.distances[startNode]}</span>
                            )}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Graph Visualization
                          </Label>
                          <div className="h-96 border rounded-lg bg-muted/30 overflow-hidden">
                            <InteractiveFlow
                              nodes={generateNodes(nodeList, edges, result.path)}
                              edges={generateEdges(edges, result.path)}
                              path={result.path}
                              height={384}
                              showSurface={true}
                              onNodeClick={(id) => toast(`Clicked ${id}`)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">
                              Nodes in Path
                            </p>
                            <p className="text-xl font-semibold">
                              {result.path.length}
                            </p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">
                              Iterations
                            </p>
                            <p className="text-xl font-semibold">
                              {result.iterations}
                            </p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
 
                    <TabsContent
                      value="tablek"
                      className="flex justify-start items-start"
                    >
                      <div className="w-full text-sm">
                        <label className="font-medium">k visualization</label>
                        <div className="overflow-x-auto mt-2">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr>
                                <th className="border-b p-2">k</th>
                                {nodeList.map((n) => (
                                  <th key={n} className="border-b p-2">{n}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {result.perIterations && result.perIterations.length > 0 ? (
                                <>
                                  <tr>
                                    <td className="border-b p-2 font-mono">Initial</td>
                                    {nodeList.map((n) => (
                                      <td key={n} className="border-b p-2">
                                        <div className="font-mono">
                                          {result.perIterations[0].distances[n] === Infinity ? (
                                            <span className="text-muted-foreground">∞</span>
                                          ) : result.perIterations[0].distances[n] === Infinity ? (
                                            <span className="text-muted-foreground">∞</span>
                                          ) : (
                                            <span>{result.perIterations[0].distances[n]}</span>
                                          )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {result.perIterations[0].predecessors[n] ?? "-"}
                                        </div>
                                      </td>
                                    ))}
                                  </tr>

                                  {result.perIterations.slice(1).map((it) => (
                                    <tr key={it.k} className="align-top">
                                      <td className="border-b p-2 font-mono">K={it.k}</td>
                                      {nodeList.map((n) => (
                                        <td key={n} className="border-b p-2">
                                          <div className="font-mono">
                                            {it.distances[n] === Infinity ? (
                                              <span className="text-muted-foreground">∞</span>
                                            ) : it.distances[n] === Infinity ? (
                                              <span className="text-muted-foreground">∞</span>
                                            ) : (
                                              <span>{it.distances[n]}</span>
                                            )}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {it.predecessors[n] ?? "-"}
                                          </div>
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </>
                              ) : (
                                <tr>
                                  <td colSpan={nodeList.length + 1} className="p-2 text-muted-foreground">
                                    No k iterations recorded
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) :(
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <Network className="size-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">
                      No results yet
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Configure your graph and click "Calculate
                      Path" to see the optimal path using the
                      Bellman-Kalaba algorithm
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}