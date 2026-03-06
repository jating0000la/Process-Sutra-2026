import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Play,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Workflow,
  Filter,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Download,
  Search,
  Keyboard,
  Loader2,
  Undo2,
  Redo2,
  Crosshair,
  MoreVertical,
  Copy,
  GitBranch,
  Globe,
} from "lucide-react";

/* ═══════════════════ TYPES ═══════════════════ */

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
  transferable?: boolean;
  transferToEmails?: string;
  mergeCondition?: "all" | "any";
}

interface FlowChartNode {
  id: string;
  label: string;
  type: "start" | "task" | "decision" | "end";
  level: number;
  x: number;
  y: number;
  parentIds: string[];
  childIds: string[];
  doer?: string;
  tat?: number;
  tatType?: string;
  formId?: string;
  status?: string;
  mergeCondition?: "all" | "any";
  transferable?: boolean;
}

interface FlowChartEdge {
  from: string;
  to: string;
  label?: string;
  ruleId?: string;
}

interface UndoAction {
  type: "create" | "update" | "delete";
  ruleId: string;
  before?: FlowRule;
  after?: FlowRule;
}

/* ═══════════════════ HELPERS ═══════════════════ */

const NODE_W = 220;
const NODE_H = 100;
const H_GAP = 100;
const V_GAP = 160;

function getNodeColor(node: FlowChartNode) {
  switch (node.type) {
    case "start":
      return "bg-emerald-50 border-emerald-400 text-emerald-800";
    case "end":
      return "bg-rose-50 border-rose-400 text-rose-800";
    case "decision":
      return "bg-amber-50 border-amber-400 text-amber-800";
    default:
      return "bg-sky-50 border-sky-400 text-sky-800";
  }
}

function getNodeIcon(node: FlowChartNode) {
  switch (node.type) {
    case "start":
      return <Play className="w-4 h-4" />;
    case "end":
      return <CheckCircle className="w-4 h-4" />;
    case "decision":
      return <GitBranch className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

/* ═══════════════════ COMPONENT ═══════════════════ */

export default function VisualFlowBuilder() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading, handleTokenExpired } = useAuth();

  /* ── Selection & UI state ── */
  const [selectedSystem, setSelectedSystem] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedNode, setSelectedNode] = useState<FlowChartNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<FlowChartEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  /* ── Dialogs ── */
  const [isAddRuleDialogOpen, setIsAddRuleDialogOpen] = useState(false);
  const [isEditRuleDialogOpen, setIsEditRuleDialogOpen] = useState(false);
  const [isNewFlowDialogOpen, setIsNewFlowDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FlowRule | null>(null);
  const [inlineFormCreate, setInlineFormCreate] = useState<"add" | "edit" | null>(null);
  const [newFlowName, setNewFlowName] = useState("");
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [publishForm, setPublishForm] = useState({ name: "", description: "", category: "General", tags: "" });

  /* ── Context menu ── */
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node?: FlowChartNode;
    edge?: FlowChartEdge;
  } | null>(null);

  /* ── Drag ── */
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  /* ── Undo / redo ── */
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);

  /* ── Inline form builder ── */
  const [formBuilderData, setFormBuilderData] = useState({
    formId: "",
    title: "",
    description: "",
  });

  /* ── New rule form ── */
  const [newRule, setNewRule] = useState({
    currentTask: "",
    status: "",
    nextTask: "",
    tat: 1,
    tatType: "daytat" as
      | "daytat"
      | "hourtat"
      | "beforetat"
      | "specifytat",
    doer: "",
    email: "",
    formId: "",
    mergeCondition: "all" as "all" | "any",
    transferable: false,
    transferToEmails: "",
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  /* ── Auth redirects ── */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) handleTokenExpired();
  }, [isAuthenticated, isLoading, handleTokenExpired]);

  /* ── Queries ── */
  const { data: flowRules = [] } = useQuery<FlowRule[]>({
    queryKey: ["/api/flow-rules"],
    enabled: isAuthenticated,
    staleTime: 60000,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
    staleTime: 120000,
  });

  const { data: quickFormTemplates = [] } = useQuery<any[]>({
    queryKey: ["/api/quick-forms"],
    enabled: isAuthenticated,
    staleTime: 120000,
  });

  const availableSystems = useMemo(
    () =>
      Array.from(new Set(flowRules.map((r) => r.system))).sort(),
    [flowRules]
  );

  useEffect(() => {
    if (availableSystems.length > 0 && !selectedSystem)
      setSelectedSystem(availableSystems[0]);
  }, [availableSystems, selectedSystem]);

  /* ── Mutations ── */
  const createRuleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/flow-rules", {
        ...data,
        system: selectedSystem,
        organizationId: user?.organizationId,
      });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      pushUndo({ type: "create", ruleId: _data?.id || "", after: { ...variables, system: selectedSystem } as any });
      toast({ title: "Rule created" });
      queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
      setIsAddRuleDialogOpen(false);
      resetNewRuleForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create rule", variant: "destructive" });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PUT", `/api/flow-rules/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Rule updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
      setIsEditRuleDialogOpen(false);
      setEditingRule(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to update rule", variant: "destructive" });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/flow-rules/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Rule deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete rule", variant: "destructive" });
    },
  });

  const createFormTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/quick-forms", {
        formId: data.formId,
        title: data.title,
        description: data.description || "",
        fields: [{ label: "Notes", type: "text", required: false }],
      });
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Form template created" });
      // Auto-select the newly created form in whichever dialog triggered creation
      if (inlineFormCreate === "add") {
        setNewRule((prev) => ({ ...prev, formId: data.formId }));
      } else if (inlineFormCreate === "edit" && editingRule) {
        setEditingRule({ ...editingRule, formId: data.formId });
      }
      setInlineFormCreate(null);
      setFormBuilderData({ formId: "", title: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-forms"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create form", variant: "destructive" });
    },
  });

  const publishTemplateMutation = useMutation({
    mutationFn: async (data: { system: string; name: string; description: string; category: string; tags: string[] }) => {
      const res = await apiRequest("POST", "/api/public-flow-templates/publish", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Published!", description: "Flow published as a public template" });
      setIsPublishDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to publish template", variant: "destructive" });
    },
  });

  /* ── Undo / Redo helpers ── */
  const pushUndo = useCallback(
    (action: UndoAction) => {
      setUndoStack((prev) => [...prev.slice(-29), action]);
      setRedoStack([]);
    },
    []
  );

  const handleUndo = useCallback(async () => {
    const action = undoStack[undoStack.length - 1];
    if (!action) return;
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, action]);
    try {
      if (action.type === "create" && action.ruleId) {
        await apiRequest("DELETE", `/api/flow-rules/${action.ruleId}`);
      } else if (action.type === "delete" && action.before) {
        await apiRequest("POST", "/api/flow-rules", action.before);
      } else if (action.type === "update" && action.before) {
        await apiRequest("PUT", `/api/flow-rules/${action.ruleId}`, action.before);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
      toast({ title: "Undone" });
    } catch {
      toast({ title: "Undo failed", variant: "destructive" });
    }
  }, [undoStack, toast]);

  const handleRedo = useCallback(async () => {
    const action = redoStack[redoStack.length - 1];
    if (!action) return;
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, action]);
    try {
      if (action.type === "create" && action.after) {
        await apiRequest("POST", "/api/flow-rules", action.after);
      } else if (action.type === "delete" && action.ruleId) {
        await apiRequest("DELETE", `/api/flow-rules/${action.ruleId}`);
      } else if (action.type === "update" && action.after) {
        await apiRequest("PUT", `/api/flow-rules/${action.ruleId}`, action.after);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
      toast({ title: "Redone" });
    } catch {
      toast({ title: "Redo failed", variant: "destructive" });
    }
  }, [redoStack, toast]);

  /* ── Reset form ── */
  const resetNewRuleForm = () =>
    setNewRule({
      currentTask: "",
      status: "",
      nextTask: "",
      tat: 1,
      tatType: "daytat",
      doer: "",
      email: "",
      formId: "",
      mergeCondition: "all",
      transferable: false,
      transferToEmails: "",
    });

  /* ═══════════════ BUILD FLOW CHART ═══════════════ */

  const buildFlowChart = useCallback(
    (system: string): { nodes: FlowChartNode[]; edges: FlowChartEdge[] } => {
      const systemRules = flowRules.filter((r) => r.system === system);
      if (!systemRules.length) return { nodes: [], edges: [] };

      const edges: FlowChartEdge[] = [];
      const taskMap: Record<string, FlowChartNode> = {};
      const nodeId = (task: string) => task || "start";
      const edgeSet: Record<string, boolean> = {};

      // Pass 1: create unique nodes
      systemRules.forEach((rule) => {
        const cId = nodeId(rule.currentTask);
        const nId = nodeId(rule.nextTask);
        if (!taskMap[cId])
          taskMap[cId] = {
            id: cId,
            label: rule.currentTask || "Start",
            type: rule.currentTask ? "task" : "start",
            level: 0,
            x: 0,
            y: 0,
            parentIds: [],
            childIds: [],
          };
        if (!taskMap[nId])
          taskMap[nId] = {
            id: nId,
            label: rule.nextTask,
            type: "task",
            level: 0,
            x: 0,
            y: 0,
            parentIds: [],
            childIds: [],
            doer: rule.doer,
            tat: rule.tat,
            tatType: rule.tatType,
            formId: rule.formId,
            mergeCondition: rule.mergeCondition,
            transferable: rule.transferable,
          };
        else {
          const n = taskMap[nId];
          if (!n.doer) {
            n.doer = rule.doer;
            n.tat = rule.tat;
            n.tatType = rule.tatType;
            n.formId = rule.formId;
            n.mergeCondition = rule.mergeCondition;
            n.transferable = rule.transferable;
          }
        }
      });

      // Pass 2: edges & relationships
      systemRules.forEach((rule) => {
        const cId = nodeId(rule.currentTask);
        const nId = nodeId(rule.nextTask);
        const cNode = taskMap[cId];
        const nNode = taskMap[nId];
        if (cNode && !cNode.childIds.includes(nId)) cNode.childIds.push(nId);
        if (nNode && !nNode.parentIds.includes(cId)) nNode.parentIds.push(cId);
        const key = `${cId}->${nId}:${rule.status}`;
        if (!edgeSet[key]) {
          edgeSet[key] = true;
          edges.push({ from: cId, to: nId, label: rule.status || "", ruleId: rule.id });
        }
      });

      // Topological-sort longest-path leveling (correct for merges)
      // 1. Compute in-degrees
      const inDeg: Record<string, number> = {};
      Object.keys(taskMap).forEach((id) => (inDeg[id] = 0));
      Object.values(taskMap).forEach((n) =>
        n.childIds.forEach((c) => {
          inDeg[c] = (inDeg[c] || 0) + 1;
        })
      );

      // 2. Seed queue with all source nodes (in-degree 0)
      const topoQueue: string[] = [];
      Object.keys(taskMap).forEach((id) => {
        if (inDeg[id] === 0) topoQueue.push(id);
      });

      // 3. Process in topological order; each child level = max(parent levels) + 1
      const processed: Record<string, boolean> = {};
      while (topoQueue.length) {
        const id = topoQueue.shift()!;
        if (processed[id]) continue;
        processed[id] = true;
        const n = taskMap[id];
        if (!n) continue;
        n.childIds.forEach((cId: string) => {
          const child = taskMap[cId];
          if (child) child.level = Math.max(child.level, n.level + 1);
          inDeg[cId]--;
          if (inDeg[cId] <= 0 && !processed[cId]) topoQueue.push(cId);
        });
      }

      // Handle any unvisited nodes (cycles / disconnected) — place after max level
      const maxLevel = Object.values(taskMap).reduce((m, n) => Math.max(m, n.level), 0);
      Object.values(taskMap).forEach((n) => {
        if (!processed[n.id]) n.level = maxLevel + 1;
      });

      // Improved layout: Sugiyama-inspired positioning
      const levelGroups: Record<number, FlowChartNode[]> = {};
      Object.values(taskMap).forEach((n: FlowChartNode) => {
        if (!levelGroups[n.level]) levelGroups[n.level] = [];
        levelGroups[n.level].push(n);
      });

      // Sort nodes in each level by average parent X for cleaner crossings
      const levels: [number, FlowChartNode[]][] = Object.entries(levelGroups)
        .map(([k, v]) => [Number(k), v] as [number, FlowChartNode[]])
        .sort((a, b) => a[0] - b[0]);
      levels.forEach(([, nodesAtLevel]) => {
        nodesAtLevel.sort((a: FlowChartNode, b: FlowChartNode) => {
          const avgParentX = (n: FlowChartNode) =>
            n.parentIds.length
              ? n.parentIds.reduce(
                  (s, pid) => s + (taskMap[pid]?.x || 0),
                  0
                ) / n.parentIds.length
              : 0;
          return avgParentX(a) - avgParentX(b);
        });
        const totalW = nodesAtLevel.length * (NODE_W + H_GAP);
        const startX = -totalW / 2 + NODE_W / 2;
        nodesAtLevel.forEach((n: FlowChartNode, i: number) => {
          n.x = startX + i * (NODE_W + H_GAP);
          n.y = n.level * (NODE_H + V_GAP);
        });
      });

      // 2nd pass: center children under parents
      levels.forEach(([, nodesAtLevel]) => {
        nodesAtLevel.forEach((n: FlowChartNode) => {
          if (n.parentIds.length === 1) {
            const parent = taskMap[n.parentIds[0]];
            if (parent && parent.childIds.length === 1) {
              n.x = parent.x; // direct alignment
            }
          }
        });
      });

      // Mark types
      Object.values(taskMap).forEach((n: FlowChartNode) => {
        if (n.childIds.length === 0 && n.type !== "start") n.type = "end";
        if (n.childIds.length > 1) n.type = "decision";
      });

      // Normalize positions so min x/y = 0
      const allNodes = Object.values(taskMap);
      if (allNodes.length) {
        let minX = Infinity, minY = Infinity;
        allNodes.forEach((n) => { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); });
        allNodes.forEach((n) => { n.x -= minX; n.y -= minY; });
      }

      return { nodes: allNodes, edges };
    },
    [flowRules]
  );

  const { nodes: baseNodes, edges } = useMemo(
    () => (selectedSystem ? buildFlowChart(selectedSystem) : { nodes: [], edges: [] }),
    [selectedSystem, buildFlowChart]
  );

  const nodes = useMemo(
    () =>
      baseNodes.map((n) => ({
        ...n,
        x: nodePositions[n.id]?.x ?? n.x,
        y: nodePositions[n.id]?.y ?? n.y,
      })),
    [baseNodes, nodePositions]
  );

  // Compute total content bounds for the canvas container sizing
  const CANVAS_PAD = 80; // padding around content
  const contentBounds = useMemo(() => {
    if (!nodes.length) return { width: 0, height: 0 };
    let maxX = 0, maxY = 0;
    nodes.forEach((n) => {
      maxX = Math.max(maxX, n.x + NODE_W);
      maxY = Math.max(maxY, n.y + NODE_H);
    });
    return {
      width: maxX + CANVAS_PAD * 2,
      height: maxY + CANVAS_PAD * 2,
    };
  }, [nodes]);

  const availableTasks = useMemo(
    () =>
      selectedSystem
        ? Array.from(
            new Set(
              flowRules
                .filter((r) => r.system === selectedSystem)
                .flatMap((r) => [r.currentTask, r.nextTask])
                .filter(Boolean)
            )
          ).sort()
        : [],
    [selectedSystem, flowRules]
  );

  /* ═══════════════ ZOOM / PAN ═══════════════ */

  const handleZoomIn = () => setZoomLevel((p) => Math.min(p + 0.15, 2.5));
  const handleZoomOut = () => setZoomLevel((p) => Math.max(p - 0.15, 0.3));
  const handleResetZoom = () => {
    setZoomLevel(1);
    if (canvasRef.current) {
      canvasRef.current.scrollTop = 0;
      canvasRef.current.scrollLeft = 0;
    }
  };

  const handleFitToScreen = useCallback(() => {
    if (!nodes.length || !canvasRef.current) return;
    const container = canvasRef.current;
    const rect = container.getBoundingClientRect();
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    nodes.forEach((n) => {
      const nx = n.x + CANVAS_PAD;
      const ny = n.y + CANVAS_PAD;
      minX = Math.min(minX, nx);
      minY = Math.min(minY, ny);
      maxX = Math.max(maxX, nx + NODE_W);
      maxY = Math.max(maxY, ny + NODE_H);
    });
    const padding = 80;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const scaleX = rect.width / contentW;
    const scaleY = rect.height / contentH;
    const zoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.5);
    setZoomLevel(zoom);
    // scroll to top-left of content
    container.scrollTop = 0;
    container.scrollLeft = 0;
  }, [nodes]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel((p) => Math.max(0.3, Math.min(2.5, p + delta)));
    }
    // Otherwise normal scroll (native scrollbar handles it)
  };

  /* ── Canvas mouse handlers (context menu close, etc.) ── */
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (contextMenu) {
      setContextMenu(null);
      return;
    }
  };
  const handleCanvasMouseMove = (_e: React.MouseEvent) => {};
  const handleCanvasMouseUp = () => {};

  /* ── Node drag ── */
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const target = e.currentTarget as HTMLElement;
    const container = target.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / zoomLevel;
    const cy = (e.clientY - rect.top) / zoomLevel;
    setDragOffset({ x: cx - (node.x + CANVAS_PAD), y: cy - (node.y + CANVAS_PAD) });
    setDraggingNode(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingNode) return;
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const newX = (e.clientX - rect.left) / zoomLevel - dragOffset.x - CANVAS_PAD;
    const newY = (e.clientY - rect.top) / zoomLevel - dragOffset.y - CANVAS_PAD;
    setNodePositions((prev) => ({
      ...prev,
      [draggingNode]: { x: newX, y: newY },
    }));
  };

  const handleMouseUp = () => setDraggingNode(null);

  /* ── Context menu ── */
  const handleContextMenu = (
    e: React.MouseEvent,
    node?: FlowChartNode,
    edge?: FlowChartEdge
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node, edge });
  };

  /* ── Export PNG ── */
  const handleExportPNG = async () => {
    if (!nodes.length) return toast({ title: "Nothing to export", variant: "destructive" });
    const canvasContainer = document.querySelector("#flow-canvas-container") as HTMLElement;
    if (!canvasContainer) return;
    try {
      const domtoimage = (await import("dom-to-image-more")).default;
      const orig = canvasContainer.style.transform;
      const origT = canvasContainer.style.transition;
      canvasContainer.style.transform = "scale(1) translate(0px, 0px)";
      canvasContainer.style.transition = "none";
      await new Promise((r) => setTimeout(r, 200));
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach((n) => {
        const x = n.x + CANVAS_PAD, y = n.y + CANVAS_PAD;
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + NODE_W); maxY = Math.max(maxY, y + NODE_H);
      });
      const pad = 100;
      const url = await domtoimage.toPng(canvasContainer, {
        width: maxX - minX + pad * 2,
        height: maxY - minY + pad * 2,
        quality: 1,
        bgcolor: "#f8fafc",
      });
      canvasContainer.style.transform = orig;
      canvasContainer.style.transition = origT;
      const link = document.createElement("a");
      link.download = `${selectedSystem}-flow.png`;
      link.href = url;
      link.click();
      toast({ title: "Exported as PNG" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  /* ═══════════════ NODE / EDGE ACTIONS ═══════════════ */

  const handleNodeClick = (node: FlowChartNode) => {
    if (!draggingNode) {
      setSelectedNode(node);
      setSelectedEdge(null);
      setEditingRule(null);
    }
  };

  const handleNodeDoubleClick = (node: FlowChartNode) => {
    if (node.type === "start") return;
    const rule = flowRules.find(
      (r) => r.system === selectedSystem && r.nextTask === node.id
    );
    if (rule) {
      setEditingRule(rule);
      setIsEditRuleDialogOpen(true);
    }
  };

  const handleEdgeClick = (edge: FlowChartEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    const rule = flowRules.find((r) => r.id === edge.ruleId);
    if (rule) setEditingRule(rule);
  };

  const handleAddFromNode = () => {
    if (selectedNode) {
      const isStart = selectedNode.id === "start";
      setNewRule({
        ...newRule,
        currentTask: isStart ? "" : selectedNode.id,
        status: isStart ? "" : "Done",
      });
      setIsAddRuleDialogOpen(true);
    }
  };

  const handleUpdateNode = () => {
    if (!selectedNode || selectedNode.id === "start") return;
    const rule = flowRules.find(
      (r) => r.system === selectedSystem && r.nextTask === selectedNode.id
    );
    if (rule) {
      setEditingRule(rule);
      setIsEditRuleDialogOpen(true);
    }
  };

  const handleEditEdge = () => {
    if (editingRule) setIsEditRuleDialogOpen(true);
  };

  const handleDeleteEdge = () => {
    if (editingRule && window.confirm("Delete this flow rule?")) {
      pushUndo({ type: "delete", ruleId: editingRule.id, before: editingRule });
      deleteRuleMutation.mutate(editingRule.id);
      setSelectedEdge(null);
      setEditingRule(null);
    }
  };

  const handleDeleteStep = () => {
    if (!selectedNode || selectedNode.type === "start") {
      toast({ title: "Cannot delete start node", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Delete step "${selectedNode.label}" and all its rules?`)) return;
    const connected = flowRules.filter(
      (r) =>
        r.system === selectedSystem &&
        (r.currentTask === selectedNode.label || r.nextTask === selectedNode.label)
    );
    if (!connected.length) return;
    Promise.all(connected.map((r) => apiRequest("DELETE", `/api/flow-rules/${r.id}`)))
      .then(() => {
        toast({ title: `Deleted "${selectedNode.label}" (${connected.length} rules)` });
        queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
        setSelectedNode(null);
      })
      .catch(() => toast({ title: "Delete failed", variant: "destructive" }));
  };

  const handleDeleteFlow = () => {
    if (!selectedSystem) return;
    if (!window.confirm(`Delete entire flow "${selectedSystem}"? This cannot be undone.`)) return;
    const systemRules = flowRules.filter((r) => r.system === selectedSystem);
    if (!systemRules.length) return;
    Promise.all(systemRules.map((r) => apiRequest("DELETE", `/api/flow-rules/${r.id}`)))
      .then(() => {
        toast({ title: `Flow "${selectedSystem}" deleted` });
        queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
        setSelectedSystem("");
        setSelectedNode(null);
        setSelectedEdge(null);
      })
      .catch(() => toast({ title: "Delete failed", variant: "destructive" }));
  };

  const handleDuplicateRule = (rule: FlowRule) => {
    createRuleMutation.mutate({
      currentTask: rule.currentTask,
      status: rule.status + " (copy)",
      nextTask: rule.nextTask + " Copy",
      tat: rule.tat,
      tatType: rule.tatType,
      doer: rule.doer,
      email: rule.email,
      formId: rule.formId,
      mergeCondition: rule.mergeCondition,
      transferable: rule.transferable,
      transferToEmails: rule.transferToEmails,
    });
  };

  /* ── Save handlers ── */
  const handleSaveNewRule = () => {
    const isFirst = !newRule.currentTask;
    if (!newRule.nextTask || !newRule.doer || !newRule.email || (!isFirst && !newRule.status)) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    createRuleMutation.mutate(newRule);
  };

  const handleSaveEditRule = () => {
    if (!editingRule) return;
    const isFirst = !editingRule.currentTask;
    if (!editingRule.nextTask || !editingRule.doer || !editingRule.email || (!isFirst && !editingRule.status)) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    pushUndo({ type: "update", ruleId: editingRule.id, before: flowRules.find((r) => r.id === editingRule.id), after: editingRule });
    updateRuleMutation.mutate({
      id: editingRule.id,
      data: {
        system: editingRule.system,
        currentTask: editingRule.currentTask,
        status: editingRule.status,
        nextTask: editingRule.nextTask,
        tat: editingRule.tat,
        tatType: editingRule.tatType,
        doer: editingRule.doer,
        email: editingRule.email,
        formId: editingRule.formId || undefined,
        transferable: editingRule.transferable || false,
        transferToEmails: editingRule.transferToEmails || undefined,
        mergeCondition: editingRule.mergeCondition || "all",
      },
    });
  };

  const handleCreateNewFlow = () => {
    if (!newFlowName.trim()) {
      toast({ title: "Enter a flow name", variant: "destructive" });
      return;
    }
    if (availableSystems.includes(newFlowName.trim())) {
      toast({ title: "Flow name already exists", variant: "destructive" });
      return;
    }
    setSelectedSystem(newFlowName.trim());
    setIsNewFlowDialogOpen(false);
    setNewFlowName("");
    setTimeout(() => setIsAddRuleDialogOpen(true), 400);
  };

  const handleSaveFormTemplate = () => {
    if (!formBuilderData.formId || !formBuilderData.title) {
      toast({ title: "Form ID and Title required", variant: "destructive" });
      return;
    }
    createFormTemplateMutation.mutate(formBuilderData);
  };

  /* ═══════════════ KEYBOARD SHORTCUTS ═══════════════ */

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const ctrl = e.ctrlKey || e.metaKey;
      switch (e.key) {
        case "Delete":
        case "Backspace":
          if (selectedNode) handleDeleteStep();
          else if (selectedEdge && editingRule) handleDeleteEdge();
          break;
        case "Escape":
          setSelectedNode(null);
          setSelectedEdge(null);
          setEditingRule(null);
          setContextMenu(null);
          setSearchQuery("");
          break;
        case "+": case "=":
          if (ctrl) { e.preventDefault(); handleZoomIn(); }
          break;
        case "-": case "_":
          if (ctrl) { e.preventDefault(); handleZoomOut(); }
          break;
        case "0":
          if (ctrl) { e.preventDefault(); handleResetZoom(); }
          break;
        case "z":
          if (ctrl && !e.shiftKey) { e.preventDefault(); handleUndo(); }
          if (ctrl && e.shiftKey) { e.preventDefault(); handleRedo(); }
          break;
        case "y":
          if (ctrl) { e.preventDefault(); handleRedo(); }
          break;
        case "?":
          if (e.shiftKey) setShowKeyboardHelp((p) => !p);
          break;
        case "f":
          if (ctrl) { e.preventDefault(); document.getElementById("flow-search-input")?.focus(); }
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedNode, selectedEdge, editingRule, handleUndo, handleRedo]);

  /* ═══════════════ EDGE PATH RENDERER ═══════════════ */

  const renderEdgePath = useCallback(
    (edge: FlowChartEdge, index: number) => {
      const fromNode = nodes.find((n) => n.id === edge.from);
      const toNode = nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) return null;

      const isSelected =
        selectedEdge?.from === edge.from &&
        selectedEdge?.to === edge.to &&
        selectedEdge?.label === edge.label;
      const edgeKey = `${edge.from}-${edge.to}-${edge.label}`;
      const isHovered = hoveredEdge === edgeKey;
      const isDecision =
        fromNode.type === "decision" || fromNode.childIds.length > 1;

      const statusLow = edge.label?.toLowerCase() || "";
      let strokeColor = "#94a3b8";
      let markerEnd = "url(#arr)";

      if (isSelected) {
        strokeColor = "#3b82f6";
        markerEnd = "url(#arr-sel)";
      } else if (isDecision) {
        if (/yes|approved|done|success|pass/.test(statusLow)) {
          strokeColor = "#10b981";
          markerEnd = "url(#arr-green)";
        } else if (/no|decline|fail|reject/.test(statusLow)) {
          strokeColor = "#ef4444";
          markerEnd = "url(#arr-red)";
        } else {
          strokeColor = "#f59e0b";
          markerEnd = "url(#arr-amber)";
        }
      }

      const x1 = fromNode.x + CANVAS_PAD + NODE_W / 2;
      const y1 = fromNode.y + CANVAS_PAD + NODE_H;
      const x2 = toNode.x + CANVAS_PAD + NODE_W / 2;
      const y2 = toNode.y + CANVAS_PAD;
      const dx = x2 - x1;
      const vOff = Math.max(Math.sqrt(dx * dx + (y2 - y1) ** 2) * 0.4, 50);
      const pathD =
        Math.abs(dx) > 100
          ? `M ${x1} ${y1} C ${x1 + dx * 0.2} ${y1 + vOff}, ${x2 - dx * 0.2} ${y2 - vOff}, ${x2} ${y2}`
          : `M ${x1} ${y1} C ${x1} ${y1 + vOff}, ${x2} ${y2 - vOff}, ${x2} ${y2}`;

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const lLen = edge.label?.length || 0;
      const lW = Math.max(lLen * 7 + 20, 50);

      return (
        <g
          key={`edge-${index}`}
          className="cursor-pointer"
          onClick={(e) => { e.stopPropagation(); handleEdgeClick(edge); }}
          onContextMenu={(e) => {
            const rule = flowRules.find((r) => r.id === edge.ruleId);
            if (rule) {
              setEditingRule(rule);
              handleContextMenu(e, undefined, edge);
            }
          }}
          onMouseEnter={() => setHoveredEdge(edgeKey)}
          onMouseLeave={() => setHoveredEdge(null)}
        >
          {/* Invisible wider path for easier clicking */}
          <path d={pathD} stroke="transparent" strokeWidth={16} fill="none" />
          {/* Glow/shadow layer for selected */}
          {isSelected && (
            <path
              d={pathD}
              stroke={strokeColor}
              strokeWidth={6}
              fill="none"
              opacity={0.2}
              strokeLinecap="round"
              filter="url(#edge-glow)"
            />
          )}
          {/* Main edge path */}
          <path
            d={pathD}
            stroke={strokeColor}
            strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.8}
            fill="none"
            markerEnd={markerEnd}
            opacity={isSelected || isHovered ? 1 : 0.75}
            strokeLinecap="round"
            strokeDasharray={isHovered && !isSelected ? "6 3" : "none"}
            className="transition-all duration-300"
          />
          {/* Animated flowing dot along the path */}
          <circle
            r={isSelected ? 4 : 3}
            fill={strokeColor}
            className={isSelected ? "flow-dot-fast" : "flow-dot"}
            style={{
              offsetPath: `path('${pathD}')`,
              animationDelay: `${index * 0.4}s`,
            } as React.CSSProperties}
          />
          {edge.label?.trim() && (
            <g>
              <rect
                x={midX - lW / 2}
                y={midY - 12}
                width={lW}
                height={24}
                fill="white"
                stroke={strokeColor}
                strokeWidth={isSelected || isHovered ? 2 : 1}
                rx={6}
                filter="drop-shadow(0 1px 3px rgba(0,0,0,0.1))"
              />
              <text
                x={midX}
                y={midY + 4}
                textAnchor="middle"
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  fill: strokeColor,
                  pointerEvents: "none",
                }}
              >
                {edge.label}
              </text>
            </g>
          )}
        </g>
      );
    },
    [nodes, selectedEdge, hoveredEdge, flowRules]
  );

  /* ═══════════════ RENDER ═══════════════ */

  if (isAuthenticated && user?.role !== "admin") {
    return (
      <AppLayout title="Visual Flow Builder" description="Access denied">
        <div className="text-center py-20 text-gray-500">
          Only administrators can access the Visual Flow Builder.
        </div>
      </AppLayout>
    );
  }

  const toolbarActions = (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        size="sm"
        onClick={() => setIsNewFlowDialogOpen(true)}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
      >
        <Plus className="w-3.5 h-3.5 mr-1" /> New Flow
      </Button>
      {selectedSystem && (
        <Button size="sm" variant="destructive" onClick={handleDeleteFlow}>
          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
        </Button>
      )}
      <div className="h-6 w-px bg-gray-200" />
      <Select value={selectedSystem} onValueChange={setSelectedSystem}>
        <SelectTrigger className="w-52 h-8 text-sm">
          <Filter className="w-3.5 h-3.5 mr-1 text-gray-400" />
          <SelectValue placeholder="Select flow" />
        </SelectTrigger>
        <SelectContent>
          {availableSystems.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedSystem && (
        <>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center bg-white border rounded-md px-2 h-8">
            <Search className="w-3.5 h-3.5 text-gray-400 mr-1" />
            <input
              id="flow-search-input"
              className="w-36 text-sm outline-none bg-transparent"
              placeholder="Search... (Ctrl+F)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}>
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>
          <div className="h-6 w-px bg-gray-200" />
          <Button size="sm" variant="ghost" onClick={handleUndo} disabled={!undoStack.length} title="Undo (Ctrl+Z)">
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleRedo} disabled={!redoStack.length} title="Redo (Ctrl+Y)">
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
          <div className="h-6 w-px bg-gray-200" />
          <Button size="sm" variant="ghost" onClick={handleZoomOut} title="Zoom Out"><ZoomOut className="w-3.5 h-3.5" /></Button>
          <span className="text-xs font-medium w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
          <Button size="sm" variant="ghost" onClick={handleZoomIn} title="Zoom In"><ZoomIn className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={handleFitToScreen} title="Fit to Screen"><Crosshair className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={handleResetZoom} title="Reset View"><Maximize2 className="w-3.5 h-3.5" /></Button>
          <div className="h-6 w-px bg-gray-200" />
          <Button size="sm" variant="ghost" onClick={handleExportPNG} title="Export PNG"><Download className="w-3.5 h-3.5" /></Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setPublishForm({ name: selectedSystem, description: "", category: "General", tags: "" }); setIsPublishDialogOpen(true); }}
            title="Publish as Public Template"
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
          >
            <Globe className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowKeyboardHelp(true)} title="Shortcuts"><Keyboard className="w-3.5 h-3.5" /></Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setNodePositions({}); if (canvasRef.current) { canvasRef.current.scrollTop = 0; canvasRef.current.scrollLeft = 0; } }}
            disabled={!Object.keys(nodePositions).length}
            title="Reset Layout"
          >
            Reset
          </Button>
        </>
      )}
    </div>
  );

  return (
    <AppLayout
      title="Visual Flow Builder"
      description="Build and manage workflows visually"
      actions={toolbarActions}
    >
      {/* Close context menu on any click */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setContextMenu(null)}
        />
      )}

      <div className="h-[calc(100vh-140px)]">
        {!selectedSystem ? (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center">
              <Workflow className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Get Started</h3>
              <p className="text-gray-500 mb-6 text-sm">Select a flow or create a new one</p>
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                onClick={() => setIsNewFlowDialogOpen(true)}
              >
                <Plus className="w-5 h-5 mr-2" /> Create New Flow
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 h-full">
            {/* ═══ CANVAS ═══ */}
            <Card className="relative" style={{ overflow: "visible" }}>
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-normal">
                  <Workflow className="w-3 h-3 mr-1" />
                  {selectedSystem}
                </Badge>
                <Badge variant="outline" className="text-xs font-normal">
                  {nodes.length} steps · {edges.length} connections
                </Badge>
              </div>

              <div
                ref={canvasRef}
                className="relative w-full h-full bg-slate-50 select-none"
                style={{ overflow: "auto" }}
                onWheel={handleWheel}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onContextMenu={(e) => handleContextMenu(e)}
              >
                {/* Centering wrapper: uses flexbox to center content when smaller than viewport */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    minWidth: "100%",
                    minHeight: "100%",
                    paddingTop: "40px",
                  }}
                >
                <div
                  id="flow-canvas-container"
                  className="relative pointer-events-auto"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: "top center",
                    transition: draggingNode ? "none" : "transform 0.15s ease-out",
                    width: contentBounds.width || 400,
                    height: contentBounds.height || 400,
                    backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
                    backgroundSize: `${20}px ${20}px`,
                  }}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                    {/* SVG edges */}
                    <svg
                      className="absolute top-0 left-0"
                      style={{ width: "100%", height: "100%", zIndex: 1, overflow: "visible" }}
                    >
                      <defs>
                        {/* Animated flow dot styles */}
                        <style>{`
                          @keyframes flowDot {
                            0% { offset-distance: 0%; opacity: 0; }
                            10% { opacity: 1; }
                            90% { opacity: 1; }
                            100% { offset-distance: 100%; opacity: 0; }
                          }
                          .flow-dot {
                            animation: flowDot 2.5s linear infinite;
                          }
                          .flow-dot-fast {
                            animation: flowDot 1.8s linear infinite;
                          }
                          @keyframes edgePulse {
                            0%, 100% { opacity: 0.7; }
                            50% { opacity: 1; }
                          }
                          .edge-pulse {
                            animation: edgePulse 2s ease-in-out infinite;
                          }
                        `}</style>
                        {/* Glow filter for selected edges */}
                        <filter id="edge-glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                        {/* Arrowhead markers — sleeker design */}
                        {[
                          ["arr", "#94a3b8"],
                          ["arr-sel", "#3b82f6"],
                          ["arr-green", "#10b981"],
                          ["arr-red", "#ef4444"],
                          ["arr-amber", "#f59e0b"],
                        ].map(([id, color]) => (
                          <marker key={id} id={id} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
                            <path d="M 0 1 L 10 5 L 0 9 L 2 5 Z" fill={color} />
                          </marker>
                        ))}
                      </defs>
                      {edges.map((edge, i) => renderEdgePath(edge, i))}
                    </svg>

                    {/* Nodes - all rendered, search only highlights */}
                    {nodes
                      .filter(
                        (n) =>
                          !searchQuery ||
                          n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          n.doer?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((node) => {
                        const isMatch =
                          searchQuery &&
                          (node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            node.doer?.toLowerCase().includes(searchQuery.toLowerCase()));
                        return (
                          <div
                            key={node.id}
                            className={`absolute border-2 rounded-xl shadow-sm transition-all duration-150 ${getNodeColor(node)} ${
                              selectedNode?.id === node.id ? "ring-2 ring-blue-500 ring-offset-2 shadow-lg" : ""
                            } ${hoveredNode === node.id ? "shadow-md scale-[1.03]" : "hover:shadow-md"} ${
                              draggingNode === node.id ? "cursor-grabbing opacity-70 scale-105" : "cursor-grab"
                            } ${isMatch ? "ring-2 ring-yellow-400 ring-offset-1" : ""}`}
                            style={{
                              left: node.x + CANVAS_PAD,
                              top: node.y + CANVAS_PAD,
                              width: NODE_W,
                              minHeight: NODE_H,
                              zIndex: draggingNode === node.id ? 999 : selectedNode?.id === node.id ? 10 : 2,
                            }}
                            onClick={() => handleNodeClick(node)}
                            onDoubleClick={() => handleNodeDoubleClick(node)}
                            onMouseDown={(e) => handleMouseDown(e, node.id)}
                            onMouseEnter={() => setHoveredNode(node.id)}
                            onMouseLeave={() => setHoveredNode(null)}
                            onContextMenu={(e) => handleContextMenu(e, node)}
                          >
                            <div className="p-3">
                              <div className="flex items-start gap-2 mb-1">
                                <div className="mt-0.5">{getNodeIcon(node)}</div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-xs leading-tight truncate">{node.label}</h4>
                                  {node.type !== "start" && node.doer && (
                                    <p className="text-[10px] opacity-70 mt-0.5 truncate">{node.doer}</p>
                                  )}
                                </div>
                                {node.transferable && (
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 flex-shrink-0 border-orange-300 text-orange-600">
                                    Transfer
                                  </Badge>
                                )}
                              </div>
                              {node.tat != null && (
                                <div className="mt-1.5 pt-1.5 border-t border-current/10 space-y-0.5">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> TAT</span>
                                    <span className="font-semibold">{node.tat} {node.tatType?.replace("tat", "")}</span>
                                  </div>
                                  {node.formId && (
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span>Form</span>
                                      <Badge variant="secondary" className="h-4 text-[9px] px-1">{node.formId}</Badge>
                                    </div>
                                  )}
                                  {node.parentIds.length > 1 && node.mergeCondition && (
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span>Merge</span>
                                      <Badge
                                        variant={node.mergeCondition === "any" ? "default" : "secondary"}
                                        className={`h-4 text-[9px] px-1 ${node.mergeCondition === "any" ? "bg-orange-500" : ""}`}
                                      >
                                        {node.mergeCondition === "any" ? "Any" : "All"}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                </div>
                </div>

              </div>
            </Card>

            {/* ═══ SIDEBAR PANEL ═══ */}
            <div className="space-y-4 overflow-y-auto max-h-full pr-1">
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">
                    {selectedNode ? "Node Actions" : selectedEdge ? "Edge Actions" : "Builder Tools"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  {selectedNode ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-sm">{selectedNode.label}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-[10px] ${getNodeColor(selectedNode)}`}>
                            {selectedNode.type}
                          </Badge>
                          {selectedNode.transferable && (
                            <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600">Transferable</Badge>
                          )}
                        </div>
                        {selectedNode.doer && (
                          <p className="text-xs text-gray-500 mt-1">{selectedNode.doer}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {selectedNode.type !== "start" && (
                          <Button className="w-full h-8 text-xs" onClick={handleUpdateNode}>
                            <Edit className="w-3 h-3 mr-1.5" /> Edit Step
                          </Button>
                        )}
                        <Button className="w-full h-8 text-xs" variant={selectedNode.type === "start" ? "default" : "outline"} onClick={handleAddFromNode}>
                          <Plus className="w-3 h-3 mr-1.5" /> Add Next Step
                        </Button>
                        {selectedNode.type !== "start" && (
                          <Button className="w-full h-8 text-xs" variant="destructive" onClick={handleDeleteStep}>
                            <Trash2 className="w-3 h-3 mr-1.5" /> Delete Step
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : selectedEdge && editingRule ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs">
                          {selectedEdge.from === "start" ? "Start" : selectedEdge.from}{" "}
                          <ArrowRight className="inline w-3 h-3 mx-1" />{" "}
                          {selectedEdge.to}
                        </p>
                        {selectedEdge.label && <Badge className="mt-1 text-[10px]">{selectedEdge.label}</Badge>}
                        <div className="mt-2 text-[10px] text-gray-500 space-y-0.5">
                          <p>Doer: {editingRule.doer}</p>
                          <p>TAT: {editingRule.tat} {editingRule.tatType}</p>
                          {editingRule.formId && <p>Form: {editingRule.formId}</p>}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Button className="w-full h-8 text-xs" variant="outline" onClick={handleEditEdge}>
                          <Edit className="w-3 h-3 mr-1.5" /> Edit Rule
                        </Button>
                        <Button className="w-full h-8 text-xs" variant="outline" onClick={() => handleDuplicateRule(editingRule)}>
                          <Copy className="w-3 h-3 mr-1.5" /> Duplicate
                        </Button>
                        <Button className="w-full h-8 text-xs" variant="destructive" onClick={handleDeleteEdge}>
                          <Trash2 className="w-3 h-3 mr-1.5" /> Delete Rule
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Workflow className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-xs text-gray-400 mb-3">Click a node or edge</p>
                      <Button
                        className="w-full h-8 text-xs"
                        onClick={() => { resetNewRuleForm(); setIsAddRuleDialogOpen(true); }}
                      >
                        <Plus className="w-3 h-3 mr-1.5" /> Add Rule
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Flow Stats */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">Flow Stats</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0 space-y-1.5">
                  {[
                    ["Steps", nodes.length],
                    ["Connections", edges.length],
                    ["Decision Points", nodes.filter((n) => n.type === "decision").length],
                    ["End Points", nodes.filter((n) => n.type === "end").length],
                    ["Transferable", nodes.filter((n) => n.transferable).length],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between text-xs">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quick help */}
              <Card>
                <CardContent className="px-4 py-3 text-[10px] text-gray-400 space-y-1">
                  <p><kbd className="bg-gray-100 px-1 rounded">Ctrl+Z</kbd> Undo · <kbd className="bg-gray-100 px-1 rounded">Ctrl+Y</kbd> Redo</p>
                  <p><kbd className="bg-gray-100 px-1 rounded">Scroll</kbd> Pan · <kbd className="bg-gray-100 px-1 rounded">Ctrl+Scroll</kbd> Zoom</p>
                  <p><kbd className="bg-gray-100 px-1 rounded">Double-click</kbd> node to edit · <kbd className="bg-gray-100 px-1 rounded">Right-click</kbd> for menu</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* ═══ CONTEXT MENU ═══ */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border rounded-lg shadow-xl py-1 min-w-[160px] animate-in fade-in-0 zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.node ? (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-gray-400 border-b mb-1 truncate max-w-[200px]">
                {contextMenu.node.label}
              </div>
              {contextMenu.node.type !== "start" && (
                <button
                  className="flex items-center w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
                  onClick={() => {
                    handleNodeDoubleClick(contextMenu.node!);
                    setContextMenu(null);
                  }}
                >
                  <Edit className="w-3.5 h-3.5 mr-2 text-gray-500" /> Edit Step
                </button>
              )}
              <button
                className="flex items-center w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
                onClick={() => {
                  setSelectedNode(contextMenu.node!);
                  handleAddFromNode();
                  setContextMenu(null);
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-2 text-gray-500" /> Add Next Step
              </button>
              {contextMenu.node.type !== "start" && (
                <button
                  className="flex items-center w-full px-3 py-1.5 text-sm text-left hover:bg-red-50 text-red-600"
                  onClick={() => {
                    setSelectedNode(contextMenu.node!);
                    handleDeleteStep();
                    setContextMenu(null);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Step
                </button>
              )}
            </>
          ) : contextMenu.edge ? (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-gray-400 border-b mb-1">Rule</div>
              <button
                className="flex items-center w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
                onClick={() => { handleEditEdge(); setContextMenu(null); }}
              >
                <Edit className="w-3.5 h-3.5 mr-2 text-gray-500" /> Edit Rule
              </button>
              {editingRule && (
                <button
                  className="flex items-center w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
                  onClick={() => { handleDuplicateRule(editingRule); setContextMenu(null); }}
                >
                  <Copy className="w-3.5 h-3.5 mr-2 text-gray-500" /> Duplicate
                </button>
              )}
              <button
                className="flex items-center w-full px-3 py-1.5 text-sm text-left hover:bg-red-50 text-red-600"
                onClick={() => { handleDeleteEdge(); setContextMenu(null); }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Rule
              </button>
            </>
          ) : (
            <>
              <button
                className="flex items-center w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
                onClick={() => { resetNewRuleForm(); setIsAddRuleDialogOpen(true); setContextMenu(null); }}
              >
                <Plus className="w-3.5 h-3.5 mr-2 text-gray-500" /> Add New Rule
              </button>
              <button
                className="flex items-center w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
                onClick={() => { handleFitToScreen(); setContextMenu(null); }}
              >
                <Crosshair className="w-3.5 h-3.5 mr-2 text-gray-500" /> Fit to Screen
              </button>
              <button
                className="flex items-center w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
                onClick={() => { handleExportPNG(); setContextMenu(null); }}
              >
                <Download className="w-3.5 h-3.5 mr-2 text-gray-500" /> Export PNG
              </button>
            </>
          )}
        </div>
      )}

      {/* ═══ ADD RULE DIALOG ═══ */}
      <Dialog open={isAddRuleDialogOpen} onOpenChange={setIsAddRuleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-500" /> Add Flow Rule
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Current Task (From)</Label>
                {availableTasks.length > 0 ? (
                  <Select
                    value={newRule.currentTask || "__start__"}
                    onValueChange={(v) => setNewRule({ ...newRule, currentTask: v === "__start__" ? "" : v })}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__start__">
                        <span className="flex items-center"><Play className="w-3.5 h-3.5 mr-2 text-green-600" /> Start</span>
                      </SelectItem>
                      {availableTasks.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value="" disabled className="h-9 bg-gray-50" placeholder="Start (first task)" />
                )}
                <p className="text-[10px] text-gray-400 mt-1">
                  {!newRule.currentTask ? "First task in flow" : "Previous step"}
                </p>
              </div>
              <div>
                <Label className="text-xs">Status (When) {newRule.currentTask ? "*" : ""}</Label>
                <Input
                  value={newRule.status}
                  onChange={(e) => setNewRule({ ...newRule, status: e.target.value })}
                  placeholder="e.g., Done, Approved"
                  className="h-9"
                  list="status-suggestions"
                  disabled={!newRule.currentTask}
                />
                <datalist id="status-suggestions">
                  {["Done", "Yes", "No", "Approved", "Decline", "Complete", "Pending"].map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <Label className="text-xs">Next Task (To) *</Label>
              <Input
                value={newRule.nextTask}
                onChange={(e) => {
                  const val = e.target.value;
                  // If selecting an existing step, auto-fill its TAT, doer, email, form from existing rule
                  const existingRule = flowRules.find(
                    (r) => r.system === selectedSystem && r.nextTask === val
                  );
                  if (existingRule && availableTasks.includes(val)) {
                    setNewRule({
                      ...newRule,
                      nextTask: val,
                      tat: existingRule.tat,
                      tatType: existingRule.tatType as any,
                      doer: existingRule.doer,
                      email: existingRule.email,
                      formId: existingRule.formId || "",
                      transferable: existingRule.transferable || false,
                      transferToEmails: existingRule.transferToEmails || "",
                      mergeCondition: (existingRule.mergeCondition as any) || "all",
                    });
                  } else {
                    setNewRule({
                      ...newRule,
                      nextTask: val,
                    });
                  }
                }}
                placeholder="Task name"
                className="h-9"
                list="task-suggestions"
              />
              <datalist id="task-suggestions">
                {availableTasks.map((t) => (<option key={t} value={t} />))}
              </datalist>
              {availableTasks.includes(newRule.nextTask) && (
                <p className="text-[10px] text-amber-600 mt-1">Connecting to existing step — fields auto-filled</p>
              )}
            </div>

            {availableTasks.includes(newRule.nextTask) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <p className="text-xs text-blue-700 font-medium">Existing step selected — TAT, Doer, User &amp; Form auto-filled from existing rule</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">TAT *</Label>
                <Input
                  type="number"
                  value={newRule.tat}
                  onChange={(e) => setNewRule({ ...newRule, tat: parseInt(e.target.value) || 1 })}
                  min={1}
                  className={`h-9 ${availableTasks.includes(newRule.nextTask) ? "bg-gray-50" : ""}`}
                  disabled={availableTasks.includes(newRule.nextTask)}
                />
              </div>
              <div>
                <Label className="text-xs">TAT Type *</Label>
                <Select value={newRule.tatType} onValueChange={(v: any) => setNewRule({ ...newRule, tatType: v })} disabled={availableTasks.includes(newRule.nextTask)}>
                  <SelectTrigger className={`h-9 ${availableTasks.includes(newRule.nextTask) ? "bg-gray-50" : ""}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daytat">Day TAT</SelectItem>
                    <SelectItem value="hourtat">Hour TAT</SelectItem>
                    <SelectItem value="beforetat">Before TAT</SelectItem>
                    <SelectItem value="specifytat">Specify TAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Doer (Role) *</Label>
                <Input
                  value={newRule.doer}
                  onChange={(e) => setNewRule({ ...newRule, doer: e.target.value })}
                  placeholder="e.g., Manager"
                  className={`h-9 ${availableTasks.includes(newRule.nextTask) ? "bg-gray-50" : ""}`}
                  disabled={availableTasks.includes(newRule.nextTask)}
                />
              </div>
              <div>
                <Label className="text-xs">Assign to User *</Label>
                <Select
                  value={newRule.email}
                  onValueChange={(v) => {
                    const u = (users as any[])?.find((u: any) => u.email === v);
                    setNewRule({
                      ...newRule,
                      email: v,
                      doer: u ? `${u.firstName} ${u.lastName}`.trim() : newRule.doer,
                    });
                  }}
                  disabled={availableTasks.includes(newRule.nextTask)}
                >
                  <SelectTrigger className={`h-9 ${availableTasks.includes(newRule.nextTask) ? "bg-gray-50" : ""}`}><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {(users as any[])?.map((u: any) => (
                      <SelectItem key={u.id} value={u.email}>
                        {u.firstName} {u.lastName} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Form Attachment</Label>
              <div className="flex gap-2">
                <Select
                  value={newRule.formId || "__none__"}
                  onValueChange={(v) => {
                    if (v === "__create_new__") {
                      setInlineFormCreate("add");
                      setFormBuilderData({ formId: "", title: "", description: "" });
                    } else {
                      setNewRule({ ...newRule, formId: v === "__none__" ? "" : v });
                    }
                  }}
                  disabled={availableTasks.includes(newRule.nextTask)}
                >
                  <SelectTrigger className="h-9 flex-1"><SelectValue placeholder="No form" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Form</SelectItem>
                    {(quickFormTemplates as any[])?.map((t: any) => (
                      <SelectItem key={t.formId} value={t.formId}>{t.title} ({t.formId})</SelectItem>
                    ))}
                    <SelectItem value="__create_new__">
                      <span className="flex items-center text-blue-600 font-medium"><Plus className="w-3.5 h-3.5 mr-1" /> Create New Form</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {!availableTasks.includes(newRule.nextTask) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => {
                      setInlineFormCreate("add");
                      setFormBuilderData({ formId: "", title: "", description: "" });
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              {inlineFormCreate === "add" && (
                <div className="mt-3 p-3 border border-blue-200 bg-blue-50/50 rounded-lg space-y-3">
                  <p className="text-xs font-semibold text-blue-700 flex items-center gap-1"><Plus className="w-3 h-3" /> Create New Form</p>
                  <div>
                    <Label className="text-[11px]">Form ID *</Label>
                    <Input
                      value={formBuilderData.formId}
                      onChange={(e) => setFormBuilderData({ ...formBuilderData, formId: e.target.value })}
                      placeholder="e.g., intake-form"
                      className="h-8 text-sm"
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Form Title *</Label>
                    <Input
                      value={formBuilderData.title}
                      onChange={(e) => setFormBuilderData({ ...formBuilderData, title: e.target.value })}
                      placeholder="e.g., Customer Intake Form"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Description</Label>
                    <Textarea
                      value={formBuilderData.description}
                      onChange={(e) => setFormBuilderData({ ...formBuilderData, description: e.target.value })}
                      rows={2}
                      className="text-sm"
                      placeholder="Optional description"
                    />
                  </div>
                  <p className="text-[10px] text-amber-600">Add fields later in the Form Builder page.</p>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setInlineFormCreate(null); setFormBuilderData({ formId: "", title: "", description: "" }); }}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={handleSaveFormTemplate} disabled={createFormTemplateMutation.isPending}>
                      {createFormTemplateMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                      Create Form
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Merge Condition</Label>
                <Select
                  value={newRule.mergeCondition}
                  onValueChange={(v: "all" | "any") => setNewRule({ ...newRule, mergeCondition: v })}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Complete</SelectItem>
                    <SelectItem value="any">Any Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 mt-5">
                  <Checkbox
                    id="new-transferable"
                    checked={newRule.transferable}
                    onCheckedChange={(v) => setNewRule({ ...newRule, transferable: Boolean(v) })}
                  />
                  <Label htmlFor="new-transferable" className="text-xs">Transferable task</Label>
                </div>
              </div>
            </div>

            {newRule.transferable && (
              <div>
                <Label className="text-xs">Transfer To (comma-separated emails)</Label>
                <Input
                  value={newRule.transferToEmails}
                  onChange={(e) => setNewRule({ ...newRule, transferToEmails: e.target.value })}
                  placeholder="user1@example.com, user2@example.com"
                  className="h-9"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddRuleDialogOpen(false)} disabled={createRuleMutation.isPending}>Cancel</Button>
            <Button size="sm" onClick={handleSaveNewRule} disabled={createRuleMutation.isPending}>
              {createRuleMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              {createRuleMutation.isPending ? "Saving..." : "Save Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ EDIT RULE DIALOG ═══ */}
      <Dialog open={isEditRuleDialogOpen} onOpenChange={setIsEditRuleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-500" /> Edit Flow Rule
            </DialogTitle>
          </DialogHeader>
          {editingRule && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Current Task (From)</Label>
                  <Select
                    value={editingRule.currentTask || "__start__"}
                    onValueChange={(v) => setEditingRule({ ...editingRule, currentTask: v === "__start__" ? "" : v })}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__start__">
                        <span className="flex items-center"><Play className="w-3.5 h-3.5 mr-2 text-green-600" /> Start</span>
                      </SelectItem>
                      {availableTasks.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status (When) {editingRule.currentTask ? "*" : ""}</Label>
                  <Input
                    value={editingRule.status}
                    onChange={(e) => setEditingRule({ ...editingRule, status: e.target.value })}
                    placeholder="e.g., Done, Approved"
                    className="h-9"
                    list="status-suggestions-edit"
                  />
                  <datalist id="status-suggestions-edit">
                    {["Done", "Yes", "No", "Approved", "Decline", "Complete", "Pending"].map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <Label className="text-xs">Next Task (To) *</Label>
                <Input
                  value={editingRule.nextTask}
                  onChange={(e) => setEditingRule({ ...editingRule, nextTask: e.target.value })}
                  className="h-9"
                  list="task-suggestions-edit"
                />
                <datalist id="task-suggestions-edit">
                  {availableTasks.map((t) => (<option key={t} value={t} />))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">TAT *</Label>
                  <Input
                    type="number"
                    value={editingRule.tat}
                    onChange={(e) => setEditingRule({ ...editingRule, tat: parseInt(e.target.value) || 1 })}
                    min={1}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">TAT Type *</Label>
                  <Select value={editingRule.tatType} onValueChange={(v: any) => setEditingRule({ ...editingRule, tatType: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daytat">Day TAT</SelectItem>
                      <SelectItem value="hourtat">Hour TAT</SelectItem>
                      <SelectItem value="beforetat">Before TAT</SelectItem>
                      <SelectItem value="specifytat">Specify TAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Doer (Role) *</Label>
                  <Input value={editingRule.doer} onChange={(e) => setEditingRule({ ...editingRule, doer: e.target.value })} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Assign to User *</Label>
                  <Select value={editingRule.email} onValueChange={(v) => setEditingRule({ ...editingRule, email: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(users as any[])?.map((u: any) => (
                        <SelectItem key={u.id} value={u.email}>{u.firstName} {u.lastName} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Form Attachment</Label>
                <div className="flex gap-2">
                  <Select
                    value={editingRule.formId || "__none__"}
                    onValueChange={(v) => {
                      if (v === "__create_new__") {
                        setInlineFormCreate("edit");
                        setFormBuilderData({ formId: "", title: "", description: "" });
                      } else {
                        setEditingRule({ ...editingRule, formId: v === "__none__" ? "" : v });
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 flex-1"><SelectValue placeholder="No form" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Form</SelectItem>
                      {(quickFormTemplates as any[])?.map((t: any) => (
                        <SelectItem key={t.formId} value={t.formId}>{t.title} ({t.formId})</SelectItem>
                      ))}
                      <SelectItem value="__create_new__">
                        <span className="flex items-center text-blue-600 font-medium"><Plus className="w-3.5 h-3.5 mr-1" /> Create New Form</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => {
                      setInlineFormCreate("edit");
                      setFormBuilderData({ formId: "", title: "", description: "" });
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {inlineFormCreate === "edit" && (
                  <div className="mt-3 p-3 border border-blue-200 bg-blue-50/50 rounded-lg space-y-3">
                    <p className="text-xs font-semibold text-blue-700 flex items-center gap-1"><Plus className="w-3 h-3" /> Create New Form</p>
                    <div>
                      <Label className="text-[11px]">Form ID *</Label>
                      <Input
                        value={formBuilderData.formId}
                        onChange={(e) => setFormBuilderData({ ...formBuilderData, formId: e.target.value })}
                        placeholder="e.g., intake-form"
                        className="h-8 text-sm"
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Form Title *</Label>
                      <Input
                        value={formBuilderData.title}
                        onChange={(e) => setFormBuilderData({ ...formBuilderData, title: e.target.value })}
                        placeholder="e.g., Customer Intake Form"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Description</Label>
                      <Textarea
                        value={formBuilderData.description}
                        onChange={(e) => setFormBuilderData({ ...formBuilderData, description: e.target.value })}
                        rows={2}
                        className="text-sm"
                        placeholder="Optional description"
                      />
                    </div>
                    <p className="text-[10px] text-amber-600">Add fields later in the Form Builder page.</p>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setInlineFormCreate(null); setFormBuilderData({ formId: "", title: "", description: "" }); }}>
                        Cancel
                      </Button>
                      <Button type="button" size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={handleSaveFormTemplate} disabled={createFormTemplateMutation.isPending}>
                        {createFormTemplateMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                        Create Form
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Merge Condition</Label>
                  <Select
                    value={editingRule.mergeCondition || "all"}
                    onValueChange={(v: "all" | "any") => setEditingRule({ ...editingRule, mergeCondition: v })}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Complete</SelectItem>
                      <SelectItem value="any">Any Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mt-5">
                    <Checkbox
                      id="edit-transferable"
                      checked={editingRule.transferable || false}
                      onCheckedChange={(v) => setEditingRule({ ...editingRule, transferable: Boolean(v) })}
                    />
                    <Label htmlFor="edit-transferable" className="text-xs">Transferable task</Label>
                  </div>
                </div>
              </div>

              {editingRule.transferable && (
                <div>
                  <Label className="text-xs">Transfer To (comma-separated emails)</Label>
                  <Input
                    value={editingRule.transferToEmails || ""}
                    onChange={(e) => setEditingRule({ ...editingRule, transferToEmails: e.target.value })}
                    placeholder="user1@example.com, user2@example.com"
                    className="h-9"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditRuleDialogOpen(false)} disabled={updateRuleMutation.isPending}>Cancel</Button>
            <Button size="sm" onClick={handleSaveEditRule} disabled={updateRuleMutation.isPending}>
              {updateRuleMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              {updateRuleMutation.isPending ? "Updating..." : "Update Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ NEW FLOW DIALOG ═══ */}
      <Dialog open={isNewFlowDialogOpen} onOpenChange={setIsNewFlowDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Flow</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Flow Name *</Label>
              <Input
                value={newFlowName}
                onChange={(e) => setNewFlowName(e.target.value)}
                placeholder="e.g., Order Management"
                autoFocus
                className="h-9 mt-1"
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <ul className="text-xs text-blue-700 space-y-0.5">
                <li>A new workflow will be created</li>
                <li>You'll add the first step next</li>
                <li>Build branches based on status outcomes</li>
              </ul>
            </div>
            {availableSystems.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {availableSystems.map((s) => (
                  <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setIsNewFlowDialogOpen(false); setNewFlowName(""); }}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleCreateNewFlow}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ KEYBOARD SHORTCUTS DIALOG ═══ */}
      <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" /> Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            {[
              { section: "Navigation", items: [["Scroll", "Pan/Navigate"], ["Scrollbar", "Drag to move"]] },
              { section: "Zoom", items: [["Ctrl + +", "Zoom In"], ["Ctrl + -", "Zoom Out"], ["Ctrl + 0", "Reset"]] },
              { section: "Actions", items: [["Del", "Delete Selected"], ["Esc", "Deselect"], ["Ctrl+F", "Search"], ["Dbl-Click", "Edit Node"]] },
              { section: "History", items: [["Ctrl+Z", "Undo"], ["Ctrl+Y/Shift+Z", "Redo"], ["Right-Click", "Context Menu"], ["Shift+?", "This Help"]] },
            ].map(({ section, items }) => (
              <div key={section} className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-600">{section}</h4>
                {items.map(([key, desc]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-gray-500">{desc}</span>
                    <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-[10px]">{key}</kbd>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setShowKeyboardHelp(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ PUBLISH AS TEMPLATE DIALOG ═══ */}
      <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600" /> Publish as Public Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                This will publish your flow structure and connected forms as a public template. 
                <strong> Your email, organization ID, and user data will NOT be shared.</strong> Only the flow structure, role names, and form fields are published.
              </p>
            </div>
            <div>
              <Label className="text-xs">Template Name *</Label>
              <Input
                value={publishForm.name}
                onChange={(e) => setPublishForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., CRM Onboarding Flow"
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={publishForm.description}
                onChange={(e) => setPublishForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this flow does..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={publishForm.category} onValueChange={(v) => setPublishForm(prev => ({ ...prev, category: v }))}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["General", "Sales", "HR", "Operations", "Finance", "Customer Support", "IT", "Marketing", "Legal", "Manufacturing"].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tags (comma-separated)</Label>
              <Input
                value={publishForm.tags}
                onChange={(e) => setPublishForm(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="e.g., onboarding, crm, automation"
                className="h-9 mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsPublishDialogOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={!publishForm.name.trim() || publishTemplateMutation.isPending}
              onClick={() => {
                publishTemplateMutation.mutate({
                  system: selectedSystem,
                  name: publishForm.name.trim(),
                  description: publishForm.description.trim(),
                  category: publishForm.category,
                  tags: publishForm.tags.split(",").map(t => t.trim()).filter(Boolean),
                });
              }}
              className="bg-gradient-to-r from-emerald-600 to-green-600 text-white"
            >
              {publishTemplateMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Publishing...</>
              ) : (
                <><Globe className="w-3.5 h-3.5 mr-1" /> Publish</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
