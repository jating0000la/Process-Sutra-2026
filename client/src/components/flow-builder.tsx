import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, CheckCircle, Clock, AlertTriangle, RefreshCw } from "lucide-react";

interface FlowRule {
  id: string;
  system: string;
  currentTask: string;
  status: string;
  nextTask: string;
  tat: number;
  tatType: string;
  doer: string;
  email: string;
  formId?: string;
}

interface FlowNode {
  id: string;
  name: string;
  type: "start" | "task" | "end";
  x: number;
  y: number;
  connections: string[];
  status?: string;
  completionRate?: number;
  isPartOfCycle?: boolean;
  repeatCount?: number;
}

interface FlowBuilderProps {
  flowRules: FlowRule[];
  system: string;
  onNodeClick?: (node: FlowNode) => void;
}

export default function FlowBuilder({ flowRules, system, onNodeClick }: FlowBuilderProps) {
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);

  // Detect circular dependencies and build flow path with repeated tasks
  const buildFlowPathWithCycles = useCallback((startTask: string, systemRules: FlowRule[]): { 
    path: Array<{ taskName: string; repeatNumber: number }>;
    hasCycles: boolean;
  } => {
    const path: Array<{ taskName: string; repeatNumber: number }> = [];
    const taskOccurrences = new Map<string, number>();
    const visited = new Set<string>();
    let hasCycles = false;
    const maxDepth = 100; // Prevent infinite loops
    let depth = 0;
    
    function traverse(taskName: string, status?: string) {
      if (!taskName || taskName === "" || depth >= maxDepth) return;
      depth++;
      
      // Track occurrence count for this task
      const currentCount = (taskOccurrences.get(taskName) || 0) + 1;
      taskOccurrences.set(taskName, currentCount);
      
      // If we've seen this task before, it's part of a cycle
      if (visited.has(taskName)) {
        hasCycles = true;
        path.push({ taskName, repeatNumber: currentCount });
        depth--;
        return;
      }
      
      visited.add(taskName);
      path.push({ taskName, repeatNumber: currentCount });
      
      // Find next tasks based on current task and status
      const nextRules = systemRules.filter(r => {
        if (r.currentTask !== taskName) return false;
        if (status && r.status !== status) return false;
        return true;
      });
      
      // Traverse all possible next steps
      nextRules.forEach(rule => {
        if (rule.nextTask) {
          traverse(rule.nextTask, undefined);
        }
      });
      
      visited.delete(taskName);
      depth--;
    }
    
    traverse(startTask);
    return { path, hasCycles };
  }, []);

  // Convert flow rules to nodes for visualization
  const generateFlowNodes = useCallback((): FlowNode[] => {
    const nodes: FlowNode[] = [];
    const systemRules = flowRules.filter(rule => rule.system === system);
    
    if (systemRules.length === 0) return nodes;

    // Find start node
    const startRule = systemRules.find(rule => rule.currentTask === "");
    let flowPath: Array<{ taskName: string; repeatNumber: number }> = [];
    let hasCycles = false;
    
    if (startRule && startRule.nextTask) {
      // Build flow path and detect circular dependencies
      const result = buildFlowPathWithCycles(startRule.nextTask, systemRules);
      flowPath = result.path;
      hasCycles = result.hasCycles;
    }
    
    if (startRule) {
      nodes.push({
        id: "start",
        name: "Start",
        type: "start",
        x: 100,
        y: 100,
        connections: [startRule.nextTask],
        completionRate: 100,
      });
    }

    // Create task nodes with repeat numbers for circular dependencies
    const tasks = new Set<string>();
    systemRules.forEach(rule => {
      if (rule.nextTask) tasks.add(rule.nextTask);
      if (rule.currentTask) tasks.add(rule.currentTask);
    });

    // Create a map to track how many times each task appears in the flow
    const taskRepeatMap = new Map<string, number>();
    flowPath.forEach(item => {
      taskRepeatMap.set(item.taskName, Math.max(taskRepeatMap.get(item.taskName) || 0, item.repeatNumber));
    });

    let yPosition = 200;
    const tasksArray = Array.from(tasks);
    
    tasksArray.forEach((taskName, index) => {
      const rule = systemRules.find(r => r.currentTask === taskName);
      const maxRepeatCount = taskRepeatMap.get(taskName) || 1;
      const isPartOfCycle = maxRepeatCount > 1;
      
      // Add repeat number if there's a circular dependency
      const displayName = isPartOfCycle 
        ? `${taskName} (repeat ${maxRepeatCount})` 
        : taskName;
      
      nodes.push({
        id: taskName,
        name: displayName,
        type: "task",
        x: 300 + (index % 3) * 200,
        y: yPosition + Math.floor(index / 3) * 150,
        connections: rule ? [rule.nextTask].filter(Boolean) : [],
        status: Math.random() > 0.7 ? "completed" : Math.random() > 0.4 ? "in_progress" : "pending",
        completionRate: Math.floor(Math.random() * 40) + 60, // 60-100%
        isPartOfCycle,
        repeatCount: maxRepeatCount,
      });
    });

    // Add end node if there are tasks with no next steps
    const endTasks = systemRules.filter(rule => {
      return !systemRules.some(r => r.currentTask === rule.nextTask);
    });

    if (endTasks.length > 0) {
      nodes.push({
        id: "end",
        name: "End",
        type: "end",
        x: 700,
        y: 300,
        connections: [],
        completionRate: 100,
      });

      // Connect orphaned tasks to end
      endTasks.forEach(endTask => {
        const taskNode = nodes.find(n => n.id === endTask.nextTask);
        if (taskNode && !taskNode.connections.length) {
          taskNode.connections.push("end");
        }
      });
    }

    return nodes;
  }, [flowRules, system, buildFlowPathWithCycles]);

  const nodes = generateFlowNodes();

  const getNodeStatusColor = (node: FlowNode) => {
    if (node.type === "start") return "bg-green-100 border-green-300 text-green-800";
    if (node.type === "end") return "bg-gray-100 border-gray-300 text-gray-800";
    
    switch (node.status) {
      case "completed":
        return "bg-green-100 border-green-300 text-green-800";
      case "in_progress":
        return "bg-blue-100 border-blue-300 text-blue-800";
      case "pending":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  const getStatusIcon = (node: FlowNode) => {
    if (node.type === "start") return <Play className="w-4 h-4" />;
    if (node.type === "end") return <CheckCircle className="w-4 h-4" />;
    
    switch (node.status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "in_progress":
        return <Clock className="w-4 h-4" />;
      case "pending":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handleNodeClick = (node: FlowNode) => {
    setSelectedNode(node);
    onNodeClick?.(node);
  };

  if (nodes.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 01.553-.894L9 2m0 18l6-3m-6 3V2m6 16l5.447-2.724A1 1 0 0021 16.382V5.618a1 1 0 00-.553-.894L15 2m0 18V2m-6 8l6-3" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Flow Visualization Available</h3>
          <p className="text-gray-500">Create flow rules for the "{system}" system to see the workflow visualization.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Flow Map: {system}</span>
          <Badge variant="outline">{nodes.length} nodes</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative bg-gray-50 rounded-lg p-6 min-h-96 overflow-auto">
          <svg
            width="100%"
            height="400"
            className="absolute top-0 left-0 pointer-events-none"
            style={{ zIndex: 1 }}
          >
            {/* Draw connections */}
            {nodes.map(node =>
              node.connections.map(targetId => {
                const target = nodes.find(n => n.id === targetId);
                if (!target) return null;
                
                return (
                  <line
                    key={`${node.id}-${targetId}`}
                    x1={node.x + 50}
                    y1={node.y + 25}
                    x2={target.x + 50}
                    y2={target.y + 25}
                    stroke="#D1D5DB"
                    strokeWidth={2}
                    markerEnd="url(#arrowhead)"
                  />
                );
              })
            )}
            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth={10}
                markerHeight={7}
                refX={9}
                refY={3.5}
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#D1D5DB"
                />
              </marker>
            </defs>
          </svg>
          
          {/* Render nodes */}
          {nodes.map(node => (
            <div
              key={node.id}
              className={`absolute border-2 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${getNodeStatusColor(node)} ${
                selectedNode?.id === node.id ? 'ring-2 ring-primary' : ''
              }`}
              style={{
                left: node.x,
                top: node.y,
                width: 140,
                zIndex: 2,
              }}
              onClick={() => handleNodeClick(node)}
            >
              <div className="flex items-center space-x-2 mb-2">
                {getStatusIcon(node)}
                <span className="text-sm font-medium truncate flex-1">{node.name}</span>
                {node.isPartOfCycle && (
                  <div title="Circular dependency detected">
                    <RefreshCw className="w-3 h-3 text-orange-600 flex-shrink-0" />
                  </div>
                )}
              </div>
              
              {node.completionRate !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Completion</span>
                    <span>{node.completionRate}%</span>
                  </div>
                  <div className="w-full bg-white rounded-full h-1.5">
                    <div
                      className="bg-current h-1.5 rounded-full transition-all"
                      style={{ width: `${node.completionRate}%` }}
                    />
                  </div>
                </div>
              )}
              
              {node.connections.length > 0 && (
                <div className="mt-2 flex justify-end">
                  <ArrowRight className="w-3 h-3 text-gray-500" />
                </div>
              )}
            </div>
          ))}
        </div>
        
        {selectedNode && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              {selectedNode.name} Details
            </h4>
            {selectedNode.isPartOfCycle && (
              <div className="mb-3 p-2 bg-orange-100 border border-orange-300 rounded-md flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-orange-700" />
                <span className="text-sm text-orange-800 font-medium">
                  This task is part of a circular dependency (appears {selectedNode.repeatCount} times in flow)
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Type:</span>
                <span className="ml-2 capitalize">{selectedNode.type}</span>
              </div>
              {selectedNode.status && (
                <div>
                  <span className="text-blue-700">Status:</span>
                  <span className="ml-2 capitalize">{selectedNode.status.replace('_', ' ')}</span>
                </div>
              )}
              {selectedNode.completionRate !== undefined && (
                <div>
                  <span className="text-blue-700">Completion Rate:</span>
                  <span className="ml-2">{selectedNode.completionRate}%</span>
                </div>
              )}
              <div>
                <span className="text-blue-700">Connections:</span>
                <span className="ml-2">{selectedNode.connections.length}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
