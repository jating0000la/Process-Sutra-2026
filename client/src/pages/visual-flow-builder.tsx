import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  X
} from "lucide-react";

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
}

interface FlowChartEdge {
  from: string;
  to: string;
  label?: string;
  ruleId?: string;
}

export default function VisualFlowBuilder() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading, handleTokenExpired } = useAuth();
  const [selectedSystem, setSelectedSystem] = useState<string>("");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedNode, setSelectedNode] = useState<FlowChartNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<FlowChartEdge | null>(null);
  const [isAddRuleDialogOpen, setIsAddRuleDialogOpen] = useState(false);
  const [isEditRuleDialogOpen, setIsEditRuleDialogOpen] = useState(false);
  const [isNewFlowDialogOpen, setIsNewFlowDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FlowRule | null>(null);
  const [newFlowName, setNewFlowName] = useState("");
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState(false);
  const [pendingFormId, setPendingFormId] = useState<string>("");
  const [formIdDebounceTimer, setFormIdDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [formBuilderData, setFormBuilderData] = useState({
    formId: "",
    title: "",
    description: "",
  });
  
  // Form state for new rule
  const [newRule, setNewRule] = useState<{
    currentTask: string;
    status: string;
    nextTask: string;
    tat: number;
    tatType: "daytat" | "hourtat" | "beforetat" | "specifytat";
    doer: string;
    email: string;
    formId: string;
    mergeCondition: "all" | "any";
  }>({
    currentTask: "",
    status: "",
    nextTask: "",
    tat: 1,
    tatType: "daytat",
    doer: "",
    email: "",
    formId: "",
    mergeCondition: "all",
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      handleTokenExpired();
    }
  }, [isAuthenticated, isLoading, handleTokenExpired]);

  // Admin-only access check
  if (isAuthenticated && user?.role !== 'admin') {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Only administrators can access the Visual Flow Builder.
            </p>
            <Button onClick={() => window.location.href = "/"}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (formIdDebounceTimer) {
        clearTimeout(formIdDebounceTimer);
      }
    };
  }, []); // Empty deps - only runs on unmount

  // Fetch flow rules
  const { data: flowRules = [], isLoading: rulesLoading } = useQuery<FlowRule[]>({
    queryKey: ["/api/flow-rules"],
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute - flow rules change less frequently
  });

  // Fetch users for dropdown
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
    staleTime: 120000, // 2 minutes - user list changes infrequently
  });

  // Get unique systems
  const availableSystems = Array.from(
    new Set((flowRules as FlowRule[]).map((rule) => rule.system))
  ).sort();

  // Auto-select first system if available
  useEffect(() => {
    if (availableSystems.length > 0 && !selectedSystem) {
      setSelectedSystem(availableSystems[0]);
    }
  }, [availableSystems, selectedSystem]);

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/flow-rules", {
        ...data,
        system: selectedSystem,
        organizationId: user?.organizationId,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Flow rule created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
      setIsAddRuleDialogOpen(false);
      resetNewRuleForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create flow rule", variant: "destructive" });
    },
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PUT", `/api/flow-rules/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Flow rule updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
      setIsEditRuleDialogOpen(false);
      setEditingRule(null);
    },
    onError: (error: any) => {
      console.error("Update flow rule error:", error);
      const errorMessage = error?.message || "Failed to update flow rule";
      toast({ 
        title: "Error", 
        description: errorMessage, 
        variant: "destructive" 
      });
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/flow-rules/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Flow rule deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete flow rule", variant: "destructive" });
    },
  });

  // Create form template mutation
  const createFormTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      // Backend automatically adds organizationId from session
      await apiRequest("POST", "/api/form-templates", {
        formId: data.formId,
        title: data.title,
        description: data.description,
        questions: data.questions || [],
      });
    },
    onSuccess: () => {
      toast({ 
        title: "Success", 
        description: "Form template created! You can now continue with your flow rule." 
      });
      setIsFormBuilderOpen(false);
      setFormBuilderData({ formId: "", title: "", description: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create form template", variant: "destructive" });
    },
  });

  const resetNewRuleForm = () => {
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
    });
  };

  // Build flowchart data structure (same as flow-chart.tsx)
  const buildFlowChart = (system: string): { nodes: FlowChartNode[]; edges: FlowChartEdge[] } => {
    const systemRules = flowRules.filter((rule) => rule.system === system);
    
    if (systemRules.length === 0) {
      return { nodes: [], edges: [] };
    }

    const edges: FlowChartEdge[] = [];
    const taskMap = new Map<string, FlowChartNode>();
    const nodeId = (task: string) => task || "start";
    const edgeSet = new Set<string>();

    // First pass: Create all unique nodes
    systemRules.forEach((rule) => {
      const currentId = nodeId(rule.currentTask);
      const nextId = nodeId(rule.nextTask);

      if (!taskMap.has(currentId)) {
        taskMap.set(currentId, {
          id: currentId,
          label: rule.currentTask || "Start",
          type: rule.currentTask ? "task" : "start",
          level: 0,
          x: 0,
          y: 0,
          parentIds: [],
          childIds: [],
        });
      }

      if (!taskMap.has(nextId)) {
        taskMap.set(nextId, {
          id: nextId,
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
        });
      } else {
        const existingNode = taskMap.get(nextId)!;
        if (!existingNode.doer) {
          existingNode.doer = rule.doer;
          existingNode.tat = rule.tat;
          existingNode.tatType = rule.tatType;
          existingNode.formId = rule.formId;
          existingNode.mergeCondition = rule.mergeCondition;
        }
      }
    });

    // Second pass: Create relationships and edges
    systemRules.forEach((rule) => {
      const currentId = nodeId(rule.currentTask);
      const nextId = nodeId(rule.nextTask);
      const currentNode = taskMap.get(currentId)!;
      const nextNode = taskMap.get(nextId)!;
      
      if (!currentNode.childIds.includes(nextId)) {
        currentNode.childIds.push(nextId);
      }
      if (!nextNode.parentIds.includes(currentId)) {
        nextNode.parentIds.push(currentId);
      }

      const edgeKey = `${currentId}->${nextId}:${rule.status}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({
          from: currentId,
          to: nextId,
          label: rule.status || "",
          ruleId: rule.id,
        });
      }
    });

    // Calculate levels using BFS
    const calculateLevels = () => {
      const visited = new Set<string>();
      const inProgress = new Set<string>();
      const queue: Array<{ id: string; level: number }> = [{ id: "start", level: 0 }];

      while (queue.length > 0) {
        const { id, level } = queue.shift()!;
        if (visited.has(id)) continue;
        if (inProgress.has(id)) continue;
        
        inProgress.add(id);
        visited.add(id);

        const node = taskMap.get(id);
        if (node) {
          node.level = Math.max(node.level, level);
          node.childIds.forEach((childId) => {
            if (!visited.has(childId)) {
              queue.push({ id: childId, level: level + 1 });
            }
          });
        }
        inProgress.delete(id);
      }
    };

    calculateLevels();

    // Calculate positions
    const levelGroups = new Map<number, FlowChartNode[]>();
    taskMap.forEach((node) => {
      if (!levelGroups.has(node.level)) {
        levelGroups.set(node.level, []);
      }
      levelGroups.get(node.level)!.push(node);
    });

    const nodeWidth = 220;
    const nodeHeight = 100;
    const horizontalSpacing = 80;
    const verticalSpacing = 180;

    levelGroups.forEach((nodesAtLevel, level) => {
      nodesAtLevel.sort((a, b) => {
        const aParentX = a.parentIds.length > 0 
          ? Math.min(...a.parentIds.map(pid => taskMap.get(pid)?.x || 0))
          : 0;
        const bParentX = b.parentIds.length > 0
          ? Math.min(...b.parentIds.map(pid => taskMap.get(pid)?.x || 0))
          : 0;
        return aParentX - bParentX;
      });

      const totalWidth = nodesAtLevel.length * (nodeWidth + horizontalSpacing);
      const startX = -totalWidth / 2 + nodeWidth / 2;

      nodesAtLevel.forEach((node, index) => {
        node.x = startX + index * (nodeWidth + horizontalSpacing);
        node.y = level * (nodeHeight + verticalSpacing);
      });
    });

    // Mark end and decision nodes
    taskMap.forEach((node) => {
      if (node.childIds.length === 0 && node.type !== "start") {
        node.type = "end";
      }
      if (node.childIds.length > 1) {
        node.type = "decision";
      }
    });

    return {
      nodes: Array.from(taskMap.values()),
      edges,
    };
  };

  const { nodes: baseNodes, edges } = selectedSystem ? buildFlowChart(selectedSystem) : { nodes: [], edges: [] };

  // Apply custom positions to nodes
  const nodes = baseNodes.map(node => ({
    ...node,
    x: nodePositions[node.id]?.x ?? node.x,
    y: nodePositions[node.id]?.y ?? node.y,
  }));

  // Get all available tasks from current system for dropdowns
  const availableTasks = selectedSystem 
    ? Array.from(new Set(
        flowRules
          .filter(rule => rule.system === selectedSystem)
          .map(rule => rule.nextTask)
          .filter(Boolean)
      )).sort()
    : [];

  const getNodeColor = (node: FlowChartNode) => {
    switch (node.type) {
      case "start": return "bg-green-100 border-green-400 text-green-800";
      case "end": return "bg-red-100 border-red-400 text-red-800";
      case "decision": return "bg-yellow-100 border-yellow-400 text-yellow-800";
      default: return "bg-blue-100 border-blue-400 text-blue-800";
    }
  };

  const getNodeIcon = (node: FlowChartNode) => {
    switch (node.type) {
      case "start": return <Play className="w-5 h-5" />;
      case "end": return <CheckCircle className="w-5 h-5" />;
      case "decision": return <AlertTriangle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  const handleNodeClick = (node: FlowChartNode) => {
    if (!draggingNode) {
      setSelectedNode(node);
      setSelectedEdge(null);
    }
  };

  const handleEdgeClick = (edge: FlowChartEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    
    // Find and set the rule for editing
    const rule = flowRules.find((r) => r.id === edge.ruleId);
    if (rule) {
      setEditingRule(rule);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return; // Only left click
    e.stopPropagation();
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Get the container element to calculate relative positions
    const target = e.currentTarget as HTMLElement;
    const container = target.parentElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / zoomLevel;
    const clickY = (e.clientY - rect.top) / zoomLevel;
    
    setDragOffset({
      x: clickX - (node.x + 100), // +100 is the offset applied in rendering
      y: clickY - (node.y + 100)
    });
    setDraggingNode(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingNode) return;
    
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    
    const newX = (e.clientX - rect.left) / zoomLevel - dragOffset.x - 100;
    const newY = (e.clientY - rect.top) / zoomLevel - dragOffset.y - 100;
    
    setNodePositions(prev => ({
      ...prev,
      [draggingNode]: { x: newX, y: newY }
    }));
  };

  const handleMouseUp = () => {
    setDraggingNode(null);
  };

  const handleAddFromNode = () => {
    if (selectedNode) {
      setNewRule({
        ...newRule,
        currentTask: selectedNode.id === "start" ? "" : selectedNode.id,
      });
      setIsAddRuleDialogOpen(true);
    }
  };

  const handleUpdateNode = () => {
    if (selectedNode && selectedNode.id !== "start") {
      // Find the rule that creates this node (where nextTask matches this node's id)
      const nodeRule = flowRules.find(rule => 
        rule.system === selectedSystem && rule.nextTask === selectedNode.id
      );
      
      if (nodeRule) {
        setEditingRule(nodeRule);
        setIsEditRuleDialogOpen(true);
      } else {
        toast({
          title: "Cannot Edit",
          description: "Unable to find the rule for this node. Start nodes cannot be edited.",
          variant: "destructive",
        });
      }
    }
  };

  const handleEditEdge = () => {
    if (editingRule) {
      setIsEditRuleDialogOpen(true);
    }
  };

  const handleDeleteEdge = () => {
    if (editingRule && window.confirm("Are you sure you want to delete this flow rule?")) {
      deleteRuleMutation.mutate(editingRule.id);
      setSelectedEdge(null);
      setEditingRule(null);
    }
  };

  const handleDeleteStep = () => {
    if (!selectedNode || selectedNode.type === "start" || selectedNode.type === "end") {
      toast({
        title: "Cannot Delete",
        description: "Start and End nodes cannot be deleted. Delete the flow rules connected to this step instead.",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete the step "${selectedNode.label}"? This will delete all flow rules connected to this step.`)) {
      // Find all rules connected to this step (as currentTask or nextTask)
      const connectedRules = flowRules.filter(
        rule => rule.currentTask === selectedNode.label || rule.nextTask === selectedNode.label
      );

      if (connectedRules.length === 0) {
        toast({
          title: "No Rules Found",
          description: "No flow rules are connected to this step.",
        });
        return;
      }

      // Delete all connected rules
      Promise.all(connectedRules.map(rule => 
        apiRequest("DELETE", `/api/flow-rules/${rule.id}`)
      ))
        .then(() => {
          toast({ 
            title: "Success", 
            description: `Deleted step "${selectedNode.label}" and ${connectedRules.length} connected rule(s)` 
          });
          queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
          setSelectedNode(null);
        })
        .catch(() => {
          toast({ 
            title: "Error", 
            description: "Failed to delete step", 
            variant: "destructive" 
          });
        });
    }
  };

  const handleDeleteFlow = () => {
    if (!selectedSystem) {
      toast({
        title: "No Flow Selected",
        description: "Please select a flow to delete",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete the entire flow "${selectedSystem}"? This will delete all steps and rules in this flow. This action cannot be undone.`)) {
      // Find all rules for this system
      const systemRules = flowRules.filter(rule => rule.system === selectedSystem);

      if (systemRules.length === 0) {
        toast({
          title: "No Rules Found",
          description: "This flow has no rules to delete.",
        });
        return;
      }

      // Delete all rules for this system
      Promise.all(systemRules.map(rule => 
        apiRequest("DELETE", `/api/flow-rules/${rule.id}`)
      ))
        .then(() => {
          toast({ 
            title: "Success", 
            description: `Deleted flow "${selectedSystem}" with ${systemRules.length} rule(s)` 
          });
          queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
          setSelectedSystem("");
          setSelectedNode(null);
          setSelectedEdge(null);
        })
        .catch(() => {
          toast({ 
            title: "Error", 
            description: "Failed to delete flow", 
            variant: "destructive" 
          });
        });
    }
  };

  const handleSaveNewRule = () => {
    // Status is only required when currentTask is not empty (not the first step)
    const isFirstStep = !newRule.currentTask || newRule.currentTask === "";
    const isStatusRequired = !isFirstStep && !newRule.status;
    
    if (!newRule.nextTask || !newRule.doer || !newRule.email || isStatusRequired) {
      const missingFields = [];
      if (!newRule.nextTask) missingFields.push("Next Task");
      if (!newRule.doer) missingFields.push("Doer");
      if (!newRule.email) missingFields.push("Email");
      if (isStatusRequired) missingFields.push("Status");
      
      toast({
        title: "Validation Error",
        description: `Please fill in all required fields: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    createRuleMutation.mutate(newRule);
  };

  const handleSaveEditRule = () => {
    if (!editingRule) return;
    
    // Validate required fields - Status is only required when currentTask is not empty
    const isFirstStep = !editingRule.currentTask || editingRule.currentTask === "";
    const isStatusRequired = !isFirstStep && !editingRule.status;
    
    if (!editingRule.nextTask || !editingRule.doer || !editingRule.email || isStatusRequired) {
      const missingFields = [];
      if (!editingRule.nextTask) missingFields.push("Next Task");
      if (!editingRule.doer) missingFields.push("Doer");
      if (!editingRule.email) missingFields.push("Email");
      if (isStatusRequired) missingFields.push("Status");
      
      toast({
        title: "Validation Error",
        description: `Please fill in all required fields: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    
    // Only send the fields that should be updated
    const updateData = {
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
    };
    
    updateRuleMutation.mutate({
      id: editingRule.id,
      data: updateData,
    });
  };

  const handleCreateNewFlow = () => {
    if (!newFlowName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a flow name",
        variant: "destructive",
      });
      return;
    }
    
    // Set the new system as selected
    setSelectedSystem(newFlowName);
    setIsNewFlowDialogOpen(false);
    setNewFlowName("");
    
    // Auto-open the Add Rule dialog after a brief delay
    setTimeout(() => {
      setIsAddRuleDialogOpen(true);
    }, 500);
  };

  const handleFormIdChange = (formId: string) => {
    setNewRule({ ...newRule, formId });
    
    // Clear existing timer if user is still typing
    if (formIdDebounceTimer) {
      clearTimeout(formIdDebounceTimer);
    }
    
    // If form ID is cleared, don't open dialog
    if (!formId.trim()) {
      setPendingFormId("");
      return;
    }
    
    // Wait for user to stop typing (1.5 seconds of inactivity)
    const timer = setTimeout(() => {
      // Only open dialog if this form ID hasn't been handled yet
      if (formId.trim() && pendingFormId !== formId) {
        setPendingFormId(formId);
        setFormBuilderData({
          formId: formId,
          title: "",
          description: "",
        });
        setIsFormBuilderOpen(true);
      }
    }, 1500); // 1.5 seconds delay after user stops typing
    
    setFormIdDebounceTimer(timer);
  };

  const handleSaveFormTemplate = () => {
    if (!formBuilderData.formId || !formBuilderData.title) {
      toast({
        title: "Validation Error",
        description: "Form ID and Title are required",
        variant: "destructive",
      });
      return;
    }
    
    createFormTemplateMutation.mutate({
      formId: formBuilderData.formId,
      title: formBuilderData.title,
      description: formBuilderData.description,
      questions: [], // Start with empty questions array
    });
    setPendingFormId("");
  };

  const handleSkipFormBuilder = () => {
    setIsFormBuilderOpen(false);
    setPendingFormId("");
    setFormBuilderData({ formId: "", title: "", description: "" });
    toast({
      title: "Form Template Skipped",
      description: "You can create the form template later from the Form Builder page",
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-neutral">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Header title="Visual Flow Builder" description="Build and manage workflows visually" />
          <div className="p-6">
            <div className="animate-pulse">
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header
          title="Visual Flow Builder"
          description="Build and manage your workflows with visual drag-and-drop interface"
          actions={
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => setIsNewFlowDialogOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Flow
              </Button>
              {selectedSystem && (
                <Button 
                  onClick={handleDeleteFlow}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Flow
                </Button>
              )}
              <div className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 border">
                <Filter className="w-4 h-4 text-gray-500" />
                <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                  <SelectTrigger className="w-64 border-0 focus:ring-0">
                    <SelectValue placeholder="Select a system" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSystems.map((system) => (
                      <SelectItem key={system} value={system}>
                        {system}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium">{Math.round(zoomLevel * 100)}%</span>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetZoom}>
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setNodePositions({})}
                disabled={Object.keys(nodePositions).length === 0}
                className="ml-2"
              >
                Reset Positions
              </Button>
            </div>
          }
        />

        <div className="p-6">
          {!selectedSystem ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Workflow className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Get Started
                </h3>
                <p className="text-gray-500 mb-6">
                  Choose a system from the dropdown above or create a new workflow
                </p>
                <Button 
                  size="lg"
                  onClick={() => setIsNewFlowDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Flow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Canvas Area */}
              <div className="lg:col-span-3">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Workflow className="w-5 h-5 mr-2" />
                        {selectedSystem} - Flow Builder
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-xs">
                          💡 Drag boxes to reposition
                        </Badge>
                        <Badge variant="outline">
                          {nodes.length} Steps
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="relative bg-gray-50 overflow-auto" style={{ height: "calc(100vh - 280px)" }}>
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
                          backgroundSize: "20px 20px",
                        }}
                      />
                      
                      <div
                        className="w-full h-full flex items-start justify-center overflow-auto"
                        style={{
                          transform: `scale(${zoomLevel})`,
                          transformOrigin: "center top",
                          transition: "transform 0.2s",
                        }}
                      >
                        <div
                          className="relative"
                          style={{
                            padding: "100px",
                            minWidth: "max-content",
                            minHeight: "max-content",
                          }}
                          onMouseMove={handleMouseMove}
                          onMouseUp={handleMouseUp}
                          onMouseLeave={handleMouseUp}
                        >
                        {/* SVG for connections */}
                        <svg
                          className="absolute top-0 left-0"
                          style={{
                            width: "100%",
                            height: "100%",
                            zIndex: 1,
                            overflow: "visible",
                          }}
                        >
                          <defs>
                            <marker
                              id="arrowhead"
                              markerWidth="10"
                              markerHeight="10"
                              refX="9"
                              refY="5"
                              orient="auto"
                            >
                              <polygon points="0 0, 10 5, 0 10" fill="#6b7280" />
                            </marker>
                            <marker
                              id="arrowhead-selected"
                              markerWidth="10"
                              markerHeight="10"
                              refX="9"
                              refY="5"
                              orient="auto"
                            >
                              <polygon points="0 0, 10 5, 0 10" fill="#3b82f6" />
                            </marker>
                            <marker
                              id="arrowhead-green"
                              markerWidth="10"
                              markerHeight="10"
                              refX="9"
                              refY="5"
                              orient="auto"
                            >
                              <polygon points="0 0, 10 5, 0 10" fill="#10b981" />
                            </marker>
                            <marker
                              id="arrowhead-red"
                              markerWidth="10"
                              markerHeight="10"
                              refX="9"
                              refY="5"
                              orient="auto"
                            >
                              <polygon points="0 0, 10 5, 0 10" fill="#ef4444" />
                            </marker>
                            <marker
                              id="arrowhead-orange"
                              markerWidth="10"
                              markerHeight="10"
                              refX="9"
                              refY="5"
                              orient="auto"
                            >
                              <polygon points="0 0, 10 5, 0 10" fill="#f59e0b" />
                            </marker>
                          </defs>
                          
                          {edges.map((edge, index) => {
                            const fromNode = nodes.find((n) => n.id === edge.from);
                            const toNode = nodes.find((n) => n.id === edge.to);
                            
                            if (!fromNode || !toNode) return null;

                            const isSelected = selectedEdge?.from === edge.from && 
                                             selectedEdge?.to === edge.to && 
                                             selectedEdge?.label === edge.label;
                            const isDecision = fromNode.type === "decision" || fromNode.childIds.length > 1;
                            
                            const statusLower = edge.label?.toLowerCase() || "";
                            let strokeColor = "#6b7280";
                            let markerEnd = "url(#arrowhead)";
                            
                            if (isSelected) {
                              strokeColor = "#3b82f6";
                              markerEnd = "url(#arrowhead-selected)";
                            } else if (isDecision) {
                              if (statusLower.includes("yes") || statusLower.includes("approved") || 
                                  statusLower.includes("done") || statusLower.includes("success") ||statusLower.includes("pass")) {
                                strokeColor = "#10b981";
                                markerEnd = "url(#arrowhead-green)";
                              } else if (statusLower.includes("no") || statusLower.includes("decline")||statusLower.includes("fail")) {
                                strokeColor = "#ef4444";
                                markerEnd = "url(#arrowhead-red)";
                              } else {
                                strokeColor = "#f59e0b";
                                markerEnd = "url(#arrowhead-orange)";
                              }
                            }

                            // Calculate start and end points
                            // Node dimensions: width 220px, positioned at node.x + 100, node.y + 100
                            const nodeWidth = 220;
                            const nodeMinHeight = 100;
                            
                            // Start point: bottom center of from node
                            const x1 = fromNode.x + 100 + nodeWidth / 2; // Center X
                            const y1 = fromNode.y + 100 + nodeMinHeight; // Bottom Y (assuming min height for now)
                            
                            // End point: top center of to node
                            const x2 = toNode.x + 100 + nodeWidth / 2;   // Center X
                            const y2 = toNode.y + 100;                   // Top Y

                            // Create smoother curved path
                            const dx = x2 - x1;
                            const dy = y2 - y1;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            // Adjust curve based on horizontal and vertical distance
                            const horizontalOffset = Math.abs(dx) > 50 ? Math.abs(dx) * 0.3 : 0;
                            const verticalOffset = Math.max(distance * 0.4, 50);
                            
                            const controlY1 = y1 + verticalOffset;
                            const controlY2 = y2 - verticalOffset;
                            
                            // If nodes are horizontally far apart, add horizontal control
                            let pathD;
                            if (Math.abs(dx) > 100) {
                              // S-curve for horizontal separation
                              const controlX1 = x1 + dx * 0.2;
                              const controlX2 = x2 - dx * 0.2;
                              pathD = `M ${x1} ${y1} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${x2} ${y2}`;
                            } else {
                              // Simple vertical curve
                              pathD = `M ${x1} ${y1} C ${x1} ${controlY1}, ${x2} ${controlY2}, ${x2} ${y2}`;
                            }

                            const midY = (y1 + y2) / 2;
                            const labelLength = edge.label?.length || 0;
                            const labelWidth = Math.max(labelLength * 8 + 20, 60);
                            const labelHeight = 28;

                            return (
                              <g 
                                key={`edge-${index}-${edge.from}-${edge.to}`}
                                style={{ cursor: "pointer" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdgeClick(edge);
                                }}
                              >
                                <path
                                  d={pathD}
                                  stroke={strokeColor}
                                  strokeWidth={isSelected ? 3 : 2}
                                  fill="none"
                                  markerEnd={markerEnd}
                                  opacity={isSelected ? 1 : 0.85}
                                  strokeLinecap="round"
                                />
                                {edge.label && edge.label.trim() !== "" && (
                                  <g>
                                    <rect
                                      x={(x1 + x2) / 2 - labelWidth / 2}
                                      y={midY - labelHeight / 2}
                                      width={labelWidth}
                                      height={labelHeight}
                                      fill="white"
                                      stroke={strokeColor}
                                      strokeWidth={isSelected ? 2.5 : 1.5}
                                      rx="8"
                                      filter="drop-shadow(0 2px 6px rgba(0,0,0,0.15))"
                                    />
                                    <text
                                      x={(x1 + x2) / 2}
                                      y={midY + 5}
                                      textAnchor="middle"
                                      style={{ 
                                        fontSize: "13px", 
                                        fontWeight: 600,
                                        fill: strokeColor,
                                        pointerEvents: "none"
                                      }}
                                    >
                                      {edge.label}
                                    </text>
                                  </g>
                                )}
                              </g>
                            );
                          })}
                        </svg>

                        {/* Nodes */}
                        {nodes.map((node) => (
                          <div
                            key={node.id}
                            className={`absolute border-2 rounded-lg shadow-md transition-all hover:shadow-lg ${getNodeColor(
                              node
                            )} ${
                              selectedNode?.id === node.id
                                ? "ring-4 ring-primary ring-offset-2"
                                : ""
                            } ${
                              draggingNode === node.id
                                ? "cursor-grabbing opacity-75"
                                : "cursor-grab hover:scale-105"
                            }`}
                            style={{
                              left: node.x + 100,
                              top: node.y + 100,
                              width: "220px",
                              minHeight: "100px",
                              zIndex: draggingNode === node.id ? 999 : 2,
                            }}
                            onClick={() => handleNodeClick(node)}
                            onMouseDown={(e) => handleMouseDown(e, node.id)}
                          >
                            <div className="p-4">
                              <div className="flex items-start space-x-2 mb-2">
                                {getNodeIcon(node)}
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm leading-tight">
                                    {node.label}
                                  </h4>
                                  {node.type !== "start" && node.type !== "end" && (
                                    <p className="text-xs opacity-75 mt-1">
                                      {node.doer}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {node.tat !== undefined && (
                                <div className="mt-2 pt-2 border-t border-current/20">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center">
                                      <Clock className="w-3 h-3 mr-1" />
                                      TAT
                                    </span>
                                    <span className="font-semibold">
                                      {node.tat} {node.tatType?.replace("tat", "")}
                                    </span>
                                  </div>
                                  {node.formId && (
                                    <div className="flex items-center justify-between text-xs mt-1">
                                      <span>Form</span>
                                      <Badge variant="secondary" className="h-5 text-xs">
                                        {node.formId}
                                      </Badge>
                                    </div>
                                  )}
                                  {node.parentIds.length > 1 && node.mergeCondition && (
                                    <div className="flex items-center justify-between text-xs mt-1">
                                      <span>Merge</span>
                                      <Badge 
                                        variant={node.mergeCondition === "any" ? "default" : "secondary"} 
                                        className={`h-5 text-xs ${node.mergeCondition === "any" ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                                      >
                                        {node.mergeCondition === "any" ? "⚡ Any" : "✓ All"}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Control Panel Sidebar */}
              <div className="lg:col-span-1">
                <Card className="sticky top-6">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {selectedNode ? "Node Actions" : selectedEdge ? "Edge Actions" : "Builder Tools"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedNode ? (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-sm text-gray-600 mb-1">Selected Node</h4>
                          <p className="text-base font-medium">{selectedNode.label}</p>
                          <Badge className={`mt-2 ${getNodeColor(selectedNode)}`}>
                            {selectedNode.type}
                          </Badge>
                        </div>

                        {selectedNode.doer && (
                          <div>
                            <h4 className="font-semibold text-sm text-gray-600 mb-1">Assigned To</h4>
                            <p className="text-sm">{selectedNode.doer}</p>
                          </div>
                        )}

                        <div className="space-y-2 pt-4 border-t">
                          {selectedNode.type !== "start" && (
                            <Button 
                              className="w-full" 
                              variant="default"
                              onClick={handleUpdateNode}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Update Step
                            </Button>
                          )}
                          
                          <Button 
                            className="w-full" 
                            variant={selectedNode.type === "start" ? "default" : "outline"}
                            onClick={handleAddFromNode}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Next Step
                          </Button>
                          
                          {selectedNode.type !== "start" && selectedNode.type !== "end" && (
                            <Button 
                              className="w-full" 
                              variant="destructive"
                              onClick={handleDeleteStep}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Step
                            </Button>
                          )}
                          
                          {/* Show general Add Rule button as alternative */}
                          <Button 
                            className="w-full" 
                            variant="outline"
                            onClick={() => {
                              setNewRule({ ...newRule, currentTask: "" });
                              setIsAddRuleDialogOpen(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Rule
                          </Button>
                        </div>
                      </div>
                    ) : selectedEdge && editingRule ? (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-sm text-gray-600 mb-1">Flow Path</h4>
                          <p className="text-sm">
                            {selectedEdge.from === "start" ? "Start" : selectedEdge.from} 
                            <ArrowRight className="inline w-4 h-4 mx-1" />
                            {selectedEdge.to}
                          </p>
                          {selectedEdge.label && (
                            <Badge className="mt-2">{selectedEdge.label}</Badge>
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold text-sm text-gray-600 mb-1">Details</h4>
                          <p className="text-xs text-gray-600">Doer: {editingRule.doer}</p>
                          <p className="text-xs text-gray-600">TAT: {editingRule.tat} {editingRule.tatType}</p>
                          {editingRule.formId && (
                            <p className="text-xs text-gray-600">Form: {editingRule.formId}</p>
                          )}
                        </div>

                        <div className="space-y-2 pt-4 border-t">
                          <Button 
                            className="w-full" 
                            variant="outline"
                            onClick={handleEditEdge}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Rule
                          </Button>
                          <Button 
                            className="w-full" 
                            variant="destructive"
                            onClick={handleDeleteEdge}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Rule
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <Workflow className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm mb-4">Click on a node or edge to manage</p>
                        <Button 
                          className="w-full" 
                          onClick={() => {
                            setNewRule({ ...newRule, currentTask: "" });
                            setIsAddRuleDialogOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add New Rule
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Flow Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Steps:</span>
                      <span className="font-semibold">{nodes.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Connections:</span>
                      <span className="font-semibold">{edges.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Decision Points:</span>
                      <span className="font-semibold">
                        {nodes.filter(n => n.type === "decision").length}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Add Rule Dialog */}
        <Dialog open={isAddRuleDialogOpen} onOpenChange={setIsAddRuleDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Flow Rule</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Current Task (From)</Label>
                  {availableTasks.length > 0 ? (
                    <Select 
                      value={newRule.currentTask || "__start__"} 
                      onValueChange={(val) => setNewRule({ ...newRule, currentTask: val === "__start__" ? "" : val })}
                      disabled={!newRule.currentTask && availableTasks.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select current task" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__start__">
                          <span className="flex items-center">
                            <Play className="w-4 h-4 mr-2 text-green-600" />
                            Start (No Previous Task)
                          </span>
                        </SelectItem>
                        {availableTasks.map((task) => (
                          <SelectItem key={task} value={task}>
                            {task}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__">
                          <span className="text-blue-600 font-medium">+ Type Custom Task...</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={newRule.currentTask}
                      onChange={(e) => setNewRule({ ...newRule, currentTask: e.target.value })}
                      placeholder="Leave empty for start task"
                      disabled
                      className="bg-gray-100 cursor-not-allowed"
                    />
                  )}
                  {newRule.currentTask === "__custom__" && (
                    <Input
                      className="mt-2"
                      placeholder="Enter custom task name"
                      onChange={(e) => setNewRule({ ...newRule, currentTask: e.target.value })}
                      autoFocus
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {!newRule.currentTask || newRule.currentTask === "" 
                      ? "🔒 Blocked for first task - This will be the start of your flow" 
                      : "Task that leads to next step"}
                  </p>
                </div>
                <div>
                  <Label>Status (When) {newRule.currentTask && newRule.currentTask !== "" ? "*" : ""}</Label>
                  <Input
                    value={newRule.status}
                    onChange={(e) => setNewRule({ ...newRule, status: e.target.value })}
                    placeholder="e.g., Done, Approved, Yes"
                    list="status-suggestions"
                    disabled={!newRule.currentTask}
                    className={!newRule.currentTask ? "bg-gray-100 cursor-not-allowed" : ""}
                  />
                  <datalist id="status-suggestions">
                    <option value="Done" />
                    <option value="Yes" />
                    <option value="No" />
                    <option value="Approved" />
                    <option value="Decline" />
                    <option value="Pending" />
                    <option value="Complete" />
                  </datalist>
                  <p className="text-xs text-gray-500 mt-1">
                    {!newRule.currentTask ? "🔒 Not required for first task" : "* Required - Condition to trigger this path"}
                  </p>
                </div>
              </div>
              <div>
                <Label>Next Task (To) *</Label>
                <Input
                  value={newRule.nextTask}
                  onChange={(e) => setNewRule({ ...newRule, nextTask: e.target.value })}
                  placeholder="Enter next task name"
                  list="task-suggestions"
                />
                <datalist id="task-suggestions">
                  {availableTasks.map((task) => (
                    <option key={task} value={task} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-500 mt-1">
                  Task that will be created after this condition
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>TAT *</Label>
                  <Input
                    type="number"
                    value={newRule.tat}
                    onChange={(e) => setNewRule({ ...newRule, tat: parseInt(e.target.value) || 1 })}
                    min="1"
                  />
                </div>
                <div>
                  <Label>TAT Type *</Label>
                  <Select value={newRule.tatType} onValueChange={(val: any) => setNewRule({ ...newRule, tatType: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                  <Label>Doer (Role) *</Label>
                  <Input
                    value={newRule.doer}
                    onChange={(e) => setNewRule({ ...newRule, doer: e.target.value })}
                    placeholder="e.g., Sales Executive"
                  />
                </div>
                <div>
                  <Label>Assign to User *</Label>
                  <Select value={newRule.email} onValueChange={(val) => {
                    setNewRule({ ...newRule, email: val });
                    const selectedUser = (users as any[])?.find((u: any) => u.email === val);
                    if (selectedUser) {
                      setNewRule({ 
                        ...newRule, 
                        email: val,
                        doer: `${selectedUser.firstName} ${selectedUser.lastName}`.trim()
                      });
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {(users as any[])?.map((user: any) => (
                        <SelectItem key={user.id} value={user.email}>
                          {user.firstName} {user.lastName} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Form ID (Optional)</Label>
                <Input
                  value={newRule.formId}
                  onChange={(e) => handleFormIdChange(e.target.value)}
                  placeholder="e.g., f001, sales-form"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Type complete Form ID - builder will auto-open after you finish typing
                </p>
              </div>
              <div>
                <Label>Merge Condition (For Parallel Steps)</Label>
                <Select 
                  value={newRule.mergeCondition} 
                  onValueChange={(val: "all" | "any") => setNewRule({ ...newRule, mergeCondition: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      All Steps Complete - Next step starts only after ALL parallel steps are completed
                    </SelectItem>
                    <SelectItem value="any">
                      Any Step Complete - Next step starts as soon as ANY parallel step is completed
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  💡 Controls when next task starts at merge points
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddRuleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveNewRule}>
                <Save className="w-4 h-4 mr-2" />
                Save Rule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Rule Dialog */}
        <Dialog open={isEditRuleDialogOpen} onOpenChange={setIsEditRuleDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Flow Rule</DialogTitle>
            </DialogHeader>
            {editingRule && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Current Task (From)</Label>
                    <Select 
                      value={editingRule.currentTask || "__start__"} 
                      onValueChange={(val) => setEditingRule({ ...editingRule, currentTask: val === "__start__" ? "" : val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__start__">
                          <span className="flex items-center">
                            <Play className="w-4 h-4 mr-2 text-green-600" />
                            Start (No Previous Task)
                          </span>
                        </SelectItem>
                        {availableTasks.map((task) => (
                          <SelectItem key={task} value={task}>
                            {task}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status (When) {editingRule.currentTask && editingRule.currentTask !== "" ? "*" : ""}</Label>
                    <Input
                      value={editingRule.status}
                      onChange={(e) => setEditingRule({ ...editingRule, status: e.target.value })}
                      placeholder="e.g., Done, Approved"
                      list="status-suggestions-edit"
                    />
                    <datalist id="status-suggestions-edit">
                      <option value="Done" />
                      <option value="Yes" />
                      <option value="No" />
                      <option value="Approved" />
                      <option value="Decline" />
                      <option value="Pending" />
                      <option value="Complete" />
                    </datalist>
                    <p className="text-xs text-gray-500 mt-1">
                      {!editingRule.currentTask || editingRule.currentTask === "" ? "Not required for first task" : "* Required - Condition to trigger this path"}
                    </p>
                  </div>
                </div>
                <div>
                  <Label>Next Task (To) *</Label>
                  <Input
                    value={editingRule.nextTask}
                    onChange={(e) => setEditingRule({ ...editingRule, nextTask: e.target.value })}
                    list="task-suggestions-edit"
                  />
                  <datalist id="task-suggestions-edit">
                    {availableTasks.map((task) => (
                      <option key={task} value={task} />
                    ))}
                  </datalist>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>TAT *</Label>
                    <Input
                      type="number"
                      value={editingRule.tat}
                      onChange={(e) => setEditingRule({ ...editingRule, tat: parseInt(e.target.value) || 1 })}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label>TAT Type *</Label>
                    <Select 
                      value={editingRule.tatType} 
                      onValueChange={(val: any) => setEditingRule({ ...editingRule, tatType: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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
                    <Label>Doer (Role) *</Label>
                    <Input
                      value={editingRule.doer}
                      onChange={(e) => setEditingRule({ ...editingRule, doer: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Assign to User *</Label>
                    <Select 
                      value={editingRule.email} 
                      onValueChange={(val) => setEditingRule({ ...editingRule, email: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(users as any[])?.map((user: any) => (
                          <SelectItem key={user.id} value={user.email}>
                            {user.firstName} {user.lastName} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Form ID (Optional)</Label>
                  <Input
                    value={editingRule.formId || ""}
                    onChange={(e) => setEditingRule({ ...editingRule, formId: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Merge Condition (For Parallel Steps)</Label>
                  <Select 
                    value={editingRule.mergeCondition || "all"} 
                    onValueChange={(val: "all" | "any") => setEditingRule({ ...editingRule, mergeCondition: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All Steps Complete - Next step starts only after ALL parallel steps are completed
                      </SelectItem>
                      <SelectItem value="any">
                        Any Step Complete - Next step starts as soon as ANY parallel step is completed
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Controls when next task starts at merge points
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditRuleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEditRule}>
                <Save className="w-4 h-4 mr-2" />
                Update Rule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Flow Dialog */}
        <Dialog open={isNewFlowDialogOpen} onOpenChange={setIsNewFlowDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Flow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Flow Name / System Name *</Label>
                <Input
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  placeholder="e.g., Order Management, Customer Onboarding"
                  className="mt-2"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  This will be the name of your new workflow system
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-blue-900 mb-2">What happens next?</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• A new workflow system will be created</li>
                  <li>• You'll be prompted to add your first step</li>
                  <li>• Build your flow by connecting steps visually</li>
                  <li>• Each step can have multiple branches based on status</li>
                </ul>
              </div>

              {availableSystems.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-2">Existing Flows:</p>
                  <div className="flex flex-wrap gap-2">
                    {availableSystems.map((system) => (
                      <Badge key={system} variant="outline" className="text-xs">
                        {system}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsNewFlowDialogOpen(false);
                setNewFlowName("");
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateNewFlow}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Flow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Form Builder Dialog */}
        <Dialog open={isFormBuilderOpen} onOpenChange={setIsFormBuilderOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl">📝</span>
                Create Form Template for "{formBuilderData.formId}"
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-blue-900 mb-2">Quick Form Setup</h4>
                <p className="text-xs text-blue-700">
                  Create a basic form template now. You can add detailed questions and fields later from the Form Builder page.
                </p>
              </div>

              <div>
                <Label>Form ID *</Label>
                <Input
                  value={formBuilderData.formId}
                  onChange={(e) => setFormBuilderData({ ...formBuilderData, formId: e.target.value })}
                  placeholder="e.g., f001, sales-form"
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This matches the Form ID you entered in the flow rule
                </p>
              </div>

              <div>
                <Label>Form Title *</Label>
                <Input
                  value={formBuilderData.title}
                  onChange={(e) => setFormBuilderData({ ...formBuilderData, title: e.target.value })}
                  placeholder="e.g., Sales Information Form"
                  autoFocus
                />
              </div>

              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={formBuilderData.description}
                  onChange={(e) => setFormBuilderData({ ...formBuilderData, description: e.target.value })}
                  placeholder="Brief description of what this form is for..."
                  rows={3}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  <strong>Note:</strong> This creates a blank form template. Visit the <strong>Form Builder</strong> page to add questions, fields, and customize your form.
                </p>
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={handleSkipFormBuilder}>
                Skip for Now
              </Button>
              <Button 
                onClick={handleSaveFormTemplate}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
