import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Workflow, Play, Edit, Trash2, Upload, Users, Eye } from "lucide-react";
import { useLocation } from "wouter";

const flowRuleSchema = z.object({
  system: z.string().min(1, "System is required"),
  currentTask: z.string(),
  status: z.string(),
  nextTask: z.string().min(1, "Next task is required"),
  tat: z.coerce.number().min(0, "TAT must be at least 0"),
  tatType: z.enum(["daytat", "hourtat", "beforetat", "specifytat"]),
  doer: z.string().min(1, "Doer is required"),
  email: z.string().email("Valid email is required"),
  formId: z.string().optional(),
  transferable: z.boolean().default(false),
  transferToEmails: z.string().optional(),
}).refine((data) => {
  // For non-Specify TAT types, minimum is 1
  if (data.tatType !== "specifytat" && data.tat < 1) {
    return false;
  }
  // Validate Specify TAT hour range (0-23)
  if (data.tatType === "specifytat") {
    return data.tat >= 0 && data.tat <= 23;
  }
  return true;
}, {
  message: "For Specify TAT, enter hour in 24-hour format (0-23). For other TAT types, value must be at least 1",
  path: ["tat"],
});

const startFlowSchema = z.object({
  system: z.string().min(1, "System is required"),
  orderNumber: z.string().min(1, "Order Number/Unique ID is required"),
  description: z.string().min(1, "Flow description is required"),
  initialFormData: z.string().optional(), // JSON string of initial form data
});

export default function Flows() {
  const { toast } = useToast();
  const { user, loading, handleTokenExpired } = useAuth();
  const [, setLocation] = useLocation();
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isStartFlowDialogOpen, setIsStartFlowDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [selectedTatType, setSelectedTatType] = useState<string>("daytat");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      handleTokenExpired();
      return;
    }
  }, [user, loading, handleTokenExpired]);

  const { data: flowRules, isLoading: rulesLoading } = useQuery({
    queryKey: ["/api/flow-rules"],
    enabled: !!user,
    staleTime: 60000, // 1 minute - flow rules change less frequently
  });

  // Fetch users for dropdown
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: !!user,
    staleTime: 120000, // 2 minutes - user list changes infrequently
  });

  // Get unique systems and tasks from existing rules for dropdowns
  const availableSystems = Array.from(new Set((flowRules as any[])?.map(rule => rule.system) || []));
  const availableTasks = Array.from(new Set((flowRules as any[])?.map(rule => rule.nextTask).filter(Boolean) || []));
  
  // Get available statuses for a specific task - shows only relevant statuses
  const getAvailableStatuses = (taskName: string) => {
    if (!taskName || taskName === "__start__") return [];
    const taskStatuses = (flowRules as any[])?.filter(rule => rule.currentTask === taskName).map(rule => rule.status) || [];
    return Array.from(new Set(taskStatuses)).filter(status => status && status.trim() !== "");
  };

  const ruleForm = useForm({
    resolver: zodResolver(flowRuleSchema),
    defaultValues: {
      system: "",
      currentTask: "",
      status: "",
      nextTask: "",
      tat: 1,
      tatType: "daytat" as const,
      doer: "",
      email: "",
      formId: "",
      transferable: false,
      transferToEmails: "",
    },
  });

  const startFlowForm = useForm({
    resolver: zodResolver(startFlowSchema),
    defaultValues: {
      system: "",
      orderNumber: "",
      description: "",
      initialFormData: "",
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof flowRuleSchema>) => {
      await apiRequest("POST", "/api/flow-rules", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Flow rule created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
      setIsRuleDialogOpen(false);
      ruleForm.reset();
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.response?.data?.message || "Failed to create flow rule";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Create rule error:", error);
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: z.infer<typeof flowRuleSchema> }) => {
      await apiRequest("PUT", `/api/flow-rules/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Flow rule updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
      setIsRuleDialogOpen(false);
      setEditingRule(null);
      ruleForm.reset();
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.response?.data?.message || "Failed to update flow rule";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Update rule error:", error);
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/flow-rules/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Flow rule deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete flow rule",
        variant: "destructive",
      });
    },
  });

  const startFlowMutation = useMutation({
    mutationFn: async (data: z.infer<typeof startFlowSchema>) => {
      const response = await apiRequest("POST", "/api/flows/start", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Flow started successfully. Flow ID: ${data.flowId}`,
      });
      setIsStartFlowDialogOpen(false);
      startFlowForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to start flow",
        variant: "destructive",
      });
    },
  });

  const handleEditRule = (rule: any) => {
    setEditingRule(rule);
    setSelectedTatType(rule.tatType || "daytat");
    ruleForm.reset({
      system: rule.system,
      currentTask: rule.currentTask || "",
      status: rule.status || "",
      nextTask: rule.nextTask,
      tat: rule.tat,
      tatType: rule.tatType,
      doer: rule.doer,
      email: rule.email,
      formId: rule.formId || "",
      transferable: rule.transferable || false,
      transferToEmails: rule.transferToEmails || "",
    });
    setIsRuleDialogOpen(true);
  };

  const onSubmitRule = (data: z.infer<typeof flowRuleSchema>) => {
    // Handle special values and custom inputs
    const formattedData = {
      ...data,
      currentTask: data.currentTask === "__start__" ? "" : data.currentTask,
      // No need to handle __custom__ since the input already overwrites the field value
    };
    
    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data: formattedData });
    } else {
      createRuleMutation.mutate(formattedData);
    }
  };

  const onSubmitStartFlow = (data: z.infer<typeof startFlowSchema>) => {
    startFlowMutation.mutate(data);
  };

  const handleViewFlowData = (system: string) => {
    // Navigate to flow data page with system filter
    setLocation(`/flow-data?system=${encodeURIComponent(system)}`);
  };

  const importFromFile = async () => {
    try {
      const rules = [

  {
    system: "Dispatch FMS",
    currentTask: "Confirm from Client of Dispatch",
    status: "Dispatched",
    nextTask: "Ask For Feedback And References ",
    tat: 1,
    tatType: "hourtat",
    doer: "Sales Executive",
    email: "jatin@muxro.com",
    formId: "feedback"
  },
  {
    system: "Dispatch FMS",
    currentTask: "Confirm from Client of Dispatch",
    status: "Not Recieved",
    nextTask: "Confirm the dispatch from the courier company",
    tat: 1,
    tatType: "daytat",
    doer: "Sales Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Dispatch FMS",
    currentTask: "Confirm the dispatch from the courier company",
    status: "Done",
    nextTask: "Confirm from Client of Dispatch",
    tat: 1,
    tatType: "hourtat",
    doer: "Sales Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Dispatch FMS",
    currentTask: "Material Gate Out",
    status: "Done",
    nextTask: "Send Invoice and Dispatch Details to Client",
    tat: 1,
    tatType: "hourtat",
    doer: "Account Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Dispatch FMS",
    currentTask: "Prepare Invoice",
    status: "Done",
    nextTask: "Verify Invoice",
    tat: 1,
    tatType: "hourtat",
    doer: "Account Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Dispatch FMS",
    currentTask: "Schedule Dispatch",
    status: "Done",
    nextTask: "Prepare Invoice",
    tat: 1,
    tatType: "hourtat",
    doer: "Account Executive",
    email: "jatin@muxro.com",
    formId: "invoice"
  },
  {
    system: "Dispatch FMS",
    currentTask: "Send Invoice and Dispatch Details to Client",
    status: "Done",
    nextTask: "Confirm the dispatch from the courier company",
    tat: 3,
    tatType: "daytat",
    doer: "Sales Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Dispatch FMS",
    currentTask: "Verify Invoice",
    status: "Done",
    nextTask: "Material Gate Out",
    tat: 1,
    tatType: "daytat",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Dispatch FMS",
    currentTask: "",
    status: "",
    nextTask: "Schedule Dispatch",
    tat: 1,
    tatType: "hourtat",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formId: "dispatch_form"
  },
  {
    system: "Order FMS",
    currentTask: "Ask to Reciever about the Material Location",
    status: "Done",
    nextTask: "Schedule Dispatch",
    tat: 1,
    tatType: "daytat",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order FMS",
    currentTask: "Check Material in Inventory",
    status: "No",
    nextTask: "Ask to Reciever about the Material Location",
    tat: 1,
    tatType: "hourtat",
    doer: "Sales Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order FMS",
    currentTask: "Check Material in Inventory",
    status: "No",
    nextTask: "Raise Indent",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: "raise_indent"
  },
  {
    system: "Order FMS",
    currentTask: "Check Material in Inventory",
    status: "Partial Available",
    nextTask: "Raise Indent",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: "raise_indent"
  },
  {
    system: "Order FMS",
    currentTask: "Check Material in Inventory",
    status: "Partial Available",
    nextTask: "Schedule Dispatch",
    tat: 1,
    tatType: "hourtat",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order FMS",
    currentTask: "Check Material in Inventory",
    status: "Yes",
    nextTask: "Dispatch Material",
    tat: 1,
    tatType: "hourtat",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order FMS",
    currentTask: "Check Material in Inventory",
    status: "Yes",
    nextTask: "Schedule Dispatch",
    tat: 1,
    tatType: "hourtat",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order FMS",
    currentTask: "Check Material Received or Not",
    status: "No",
    nextTask: "Check Material Received or Not",
    tat: 1,
    tatType: "hourtat",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order FMS",
    currentTask: "Check Material Received or Not",
    status: "Yes",
    nextTask: "Check Material in Inventory",
    tat: 1,
    tatType: "daytat",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order FMS",
    currentTask: "Collect Rates form 3 vendors",
    status: "Done",
    nextTask: "Take Approval from MD",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order FMS",
    currentTask: "Inform to Client About Expected time",
    status: "Done",
    nextTask: "Check Material Received or Not",
    tat: 3,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order FMS",
    currentTask: "Order Punch",
    status: "Done",
    nextTask: "Check Material in Inventory",
    tat: 1,
    tatType: "hourtat",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order FMS",
    currentTask: "Raise Indent",
    status: "Done",
    nextTask: "Collect Rates form 3 vendors",
    tat: 2,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order FMS",
    currentTask: "Raise PO for Purchase",
    status: "Done",
    nextTask: "Inform to Client About Expected time",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order FMS",
    currentTask: "Take Approval from MD",
    status: "Approved",
    nextTask: "Raise PO for Purchase",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: "po"
  },
  {
    system: "Order FMS",
    currentTask: "Take Approval from MD",
    status: "Decline",
    nextTask: "Collect Rates form 3 vendors",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: "rates"
  },
  {
    system: "Order FMS",
    currentTask: "",
    status: "",
    nextTask: "Order Punch",
    tat: 1,
    tatType: "hourtat",
    doer: "Sales Executive",
    email: "jatin@muxro.com",
    formId: "order"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Add Sample in Inventory",
    status: "Done",
    nextTask: "Dispatch Schedule for Sample",
    tat: 1,
    tatType: "hourtat",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Ask Customer to Parital Delivery",
    status: "No",
    nextTask: "Create BOM",
    tat: 1,
    tatType: "hourtat",
    doer: "Production Manager",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Ask Customer to Parital Delivery",
    status: "Yes",
    nextTask: "Dispatch Material",
    tat: 1,
    tatType: "hourtat",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Check Material in Inventory",
    status: "No",
    nextTask: "Raise Indent",
    tat: 1,
    tatType: "hourtat",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formId: "raise_indent"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Check Material in Inventory",
    status: "Partial Available",
    nextTask: "Ask Customer to Parital Delivery",
    tat: 1,
    tatType: "hourtat",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Check Material in Inventory",
    status: "Yes",
    nextTask: "Dispatch Material",
    tat: 1,
    tatType: "hourtat",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Check Sample in Inventory",
    status: "No",
    nextTask: "Create Job Card form Sample Production",
    tat: 1,
    tatType: "hourtat",
    doer: "Production Manager",
    email: "jatin@muxro.com",
    formId: "jobcard"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Check Sample in Inventory",
    status: "Yes",
    nextTask: "Dispatch Material",
    tat: 1,
    tatType: "hourtat",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Collect Design Parameter and Production Instruction from Prod. Manager",
    status: "Done",
    nextTask: "Production Complete",
    tat: 1,
    tatType: "hourtat",
    doer: "Production Supervisior",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Collect Design Parameter of sample and Production Instruction from Prod. Manager",
    status: "Done",
    nextTask: "Sample Production Complete",
    tat: 1,
    tatType: "hourtat",
    doer: "Production Supervisior",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Collect Rates form 3 vendors",
    status: "Done",
    nextTask: "Take Approval from MD",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Create BOM",
    status: "Done",
    nextTask: "Raise Indent",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: "raise_indent"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Create Job Card form production",
    status: "Done",
    nextTask: "Get Material From Store",
    tat: 1,
    tatType: "hourtat",
    doer: "Production Manager",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Create Job Card form production",
    status: "Done",
    nextTask: "Issue Material to Production Team",
    tat: 1,
    tatType: "hourtat",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Create Job Card form Sample Production",
    status: "Done",
    nextTask: "Get Material From Store for Sample",
    tat: 1,
    tatType: "hourtat",
    doer: "Production Supervisior",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Create Job Card form Sample Production",
    status: "Done",
    nextTask: "Issue Material to Production Team for Sample",
    tat: 1,
    tatType: "hourtat",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formId: ""
  },

  {
    system: "Order Manufacturer",
    currentTask: "Do Followup with Supplier",
    status: "Done",
    nextTask: "Material Received",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Get Material From Store",
    status: "Done",
    nextTask: "Collect Design Parameter and Production Instruction from Prod. Manager",
    tat: 1,
    tatType: "hourtat",
    doer: "Production Supervisior",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Get Material From Store for Sample",
    status: "Done",
    nextTask: "Collect Design Parameter of sample and Production Instruction from Prod. Manager",
    tat: 1,
    tatType: "hourtat",
    doer: "Production Supervisior",
    email: "jatin@muxro.com",
    formId: ""
  },


  {
    system: "Order Manufacturer",
    currentTask: "Material Received",
    status: "No",
    nextTask: "Do Followup with Supplier",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Material Received",
    status: "Yes",
    nextTask: "Store Material In Store",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Move to Store",
    status: "Done",
    nextTask: "Check Material in Inventory",
    tat: 1,
    tatType: "hourtat",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Order Punch",
    status: "Done",
    nextTask: "Check Material in Inventory",
    tat: 1,
    tatType: "hourtat",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Order Punch",
    status: "Done",
    nextTask: "Sample Required",
    tat: 1,
    tatType: "hourtat",
    doer: "Sales Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Production Complete",
    status: "Done",
    nextTask: "Quality Check",
    tat: 1,
    tatType: "hourtat",
    doer: "QC Engg",
    email: "jatin@muxro.com",
    formId: "qcchecklist"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Quality Check",
    status: "Done",
    nextTask: "Move to Store",
    tat: 1,
    tatType: "hourtat",
    doer: "Production Supervisior",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Quality Check",
    status: "Fail",
    nextTask: "Create Job Card form Sample Production",
    tat: 1,
    tatType: "hourtat",
    doer: "Production Supervisior",
    email: "jatin@muxro.com",
    formId: "jobcardsample"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Quality Check",
    status: "Pass",
    nextTask: "Store Sample",
    tat: 1,
    tatType: "hourtat",
    doer: "Production Supervisior",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Raise Indent",
    status: "Done",
    nextTask: "Collect Rates form 3 vendors",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: "rates"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Raise PO for Purchase",
    status: "Done",
    nextTask: "Do Followup with Supplier",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Sample Production Complete",
    status: "Done",
    nextTask: "Quality Check",
    tat: 1,
    tatType: "hourtat",
    doer: "QC Engg",
    email: "jatin@muxro.com",
    formId: "qcchecklist"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Sample Required",
    status: "No",
    nextTask: "Check Material in Inventory",
    tat: 1,
    tatType: "hourtat",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Sample Required",
    status: "Yes",
    nextTask: "Check Sample in Inventory",
    tat: 1,
    tatType: "hourtat",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Store Material In Store",
    status: "Done",
    nextTask: "Create Job Card form production",
    tat: 1,
    tatType: "hourtat",
    doer: "Production Manager",
    email: "jatin@muxro.com",
    formId: "jobcard"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Store Sample",
    status: "Done",
    nextTask: "Add Sample in Inventory",
    tat: 1,
    tatType: "hourtat",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Take Approval from MD",
    status: "Approved",
    nextTask: "Raise PO for Purchase",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: "po"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Take Approval from MD",
    status: "Decline",
    nextTask: "Collect Rates form 3 vendors",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: "rates"
  },
  {
    system: "Order Manufacturer",
    currentTask: "",
    status: "",
    nextTask: "Order Punch",
    tat: 1,
    tatType: "hourtat",
    doer: "Sales Executive",
    email: "jatin@muxro.com",
    formId: "order"
  },
  {
    system: "Purchase FMS",
    currentTask: "choose Vendor and take rate",
    status: "Done",
    nextTask: "take approval from MD",
    tat: 1,
    tatType: "daytat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Purchase FMS",
    currentTask: "Followup",
    status: "Done",
    nextTask: "Followup 2 daytats before of tat",
    tat: 1,
    tatType: "daytat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Purchase FMS",
    currentTask: "Followup 2 daytats before of tat",
    status: "Done",
    nextTask: "Received Material",
    tat: 1,
    tatType: "hourtat",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Purchase FMS",
    currentTask: "Generate PO",
    status: "Done",
    nextTask: "Followup",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Purchase FMS",
    currentTask: "Quality check",
    status: "Done",
    nextTask: "Dispatch Material",
    tat: 1,
    tatType: "daytat",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formId: "dispatchid"
  },
  {
    system: "Purchase FMS",
    currentTask: "Raise Indent",
    status: "Done",
    nextTask: "choose Vendor and take rate",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: "rate"
  },
  {
    system: "Purchase FMS",
    currentTask: "Received Material",
    status: "Done",
    nextTask: "Store Material",
    tat: 1,
    tatType: "daytat",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formId: ""
  },
  {
    system: "Purchase FMS",
    currentTask: "Store Material",
    status: "Done",
    nextTask: "Quality check",
    tat: 1,
    tatType: "hourtat",
    doer: "QC Engg",
    email: "jatin@muxro.com",
    formId: "qcchecklist"
  },
  {
    system: "Purchase FMS",
    currentTask: "take approval from MD",
    status: "Approved",
    nextTask: "Generate PO",
    tat: 1,
    tatType: "hourtat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: "po"
  },

  {
    system: "Purchase FMS",
    currentTask: "",
    status: "",
    nextTask: "Raise Indent",
    tat: 1,
    tatType: "daytat",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formId: "raise_indent"
  }
]
      // Complete Order Tracker and Purchase workflow rules from PDF
      // const rules = [
      //   // Order Tracker System - Complete workflow (start rule)
      //   { system: "Order Tracker", currentTask: "", status: "", nextTask: "Customer Registration", tat: 1, tatType: "hourtat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
        
      //   // Customer Registration branching
      //   { system: "Order Tracker", currentTask: "Customer Registration", status: "Regular", nextTask: "Choose Box", tat: 1, tatType: "daytat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Customer Registration", status: "Wedding", nextTask: "Get All details of Customisation and take Approval", tat: 1, tatType: "beforetat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
        
      //   // Regular flow - Box and Sweets selection
      //   { system: "Order Tracker", currentTask: "Choose Box", status: "Done", nextTask: "Choose Sweets", tat: 1, tatType: "specifytat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Choose Sweets", status: "Done", nextTask: "Any Basic Customisation", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        
      //   // Customisation branching
      //   { system: "Order Tracker", currentTask: "Any Basic Customisation", status: "Yes", nextTask: "Get All details of Customisation", tat: 1, tatType: "daytat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Any Basic Customisation", status: "No", nextTask: "Create Order for Sweets", tat: 1, tatType: "hourtat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Get All details of Customisation", status: "Done", nextTask: "Create Order for Sweets", tat: 1, tatType: "daytat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        
      //   // Sweet availability and production flow
      //   { system: "Order Tracker", currentTask: "Create Order for Sweets", status: "Done", nextTask: "Check Sweet Availablity in Store", tat: 1, tatType: "hourtat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Check Sweet Availablity in Store", status: "No", nextTask: "Prepare BOM of Sweets", tat: 1, tatType: "daytat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Check Sweet Availablity in Store", status: "Yes", nextTask: "Execute Filling in Store", tat: 1, tatType: "hourtat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
        
      //   // Production preparation flow
      //   { system: "Order Tracker", currentTask: "Prepare BOM of Sweets", status: "Done", nextTask: "Check RM in Store", tat: 1, tatType: "daytat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Check RM in Store", status: "Yes", nextTask: "Plan for Production", tat: 1, tatType: "hourtat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Check RM in Store", status: "No", nextTask: "Raise Indent", tat: 1, tatType: "daytat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
        
      //   // Production execution
      //   { system: "Order Tracker", currentTask: "Plan for Production", status: "Done", nextTask: "Execute Production", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Execute Production", status: "Done", nextTask: "Get Sweet and box from Production and Store", tat: 1, tatType: "daytat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
        
      //   // Vendor and material flow
      //   { system: "Order Tracker", currentTask: "Raise Indent", status: "Done", nextTask: "Choose Vendor", tat: 1, tatType: "hourtat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Choose Vendor", status: "Done", nextTask: "Generate PO", tat: 1, tatType: "daytat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Generate PO", status: "Done", nextTask: "Received Material", tat: 1, tatType: "hourtat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Received Material", status: "Done", nextTask: "Plan for Production", tat: 1, tatType: "daytat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
        
      //   // Approval and demo flow
      //   { system: "Order Tracker", currentTask: "Get Sweet and box from Production and Store", status: "Done", nextTask: "Take Approval from Head", tat: 1, tatType: "hourtat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Take Approval from Head", status: "Yes", nextTask: "Execute Demo filling", tat: 1, tatType: "daytat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Take Approval from Head", status: "No", nextTask: "Get Sweet and box from Production and Store(2)", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Get Sweet and box from Production and Store(2)", status: "Done", nextTask: "Take Approval from Head(2)", tat: 1, tatType: "daytat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Take Approval from Head(2)", status: "Yes", nextTask: "Execute Demo filling", tat: 1, tatType: "hourtat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
        
      //   // Sales approval flow
      //   { system: "Order Tracker", currentTask: "Execute Demo filling", status: "Done", nextTask: "Take Approval from Sales Person", tat: 1, tatType: "daytat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Take Approval from Sales Person", status: "Yes", nextTask: "Execute to Filling in Unit", tat: 1, tatType: "hourtat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Take Approval from Sales Person", status: "No", nextTask: "Execute Demo filling(2)", tat: 1, tatType: "daytat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Execute Demo filling(2)", status: "Done", nextTask: "Take Approval from Sales Person(2)", tat: 1, tatType: "hourtat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Take Approval from Sales Person(2)", status: "Yes", nextTask: "Execute to Filling in Unit", tat: 1, tatType: "daytat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        
      //   // Final execution and dispatch
      //   { system: "Order Tracker", currentTask: "Execute Filling in Store", status: "Done", nextTask: "Final Dispatch", tat: 1, tatType: "hourtat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Execute to Filling in Unit", status: "Done", nextTask: "Dispatch to Store", tat: 1, tatType: "daytat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Dispatch to Store", status: "Done", nextTask: "Final Dispatch", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        
      //   // Wedding customisation flow
      //   { system: "Order Tracker", currentTask: "Get All details of Customisation and take Approval", status: "Done", nextTask: "Explain Timeline to Customer according to Production/Vendor", tat: 1, tatType: "daytat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Explain Timeline to Customer according to Production/Vendor", status: "Done", nextTask: "Customer Box Order Punch", tat: 1, tatType: "hourtat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Customer Box Order Punch", status: "Done", nextTask: "Choose Box Design", tat: 1, tatType: "daytat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Choose Box Design", status: "Done", nextTask: "Explain to Vendor and get Quotation", tat: 1, tatType: "hourtat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Explain to Vendor and get Quotation", status: "Done", nextTask: "Received Quotation from Vendor", tat: 1, tatType: "daytat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
        
      //   // Quotation and approval flow
      //   { system: "Order Tracker", currentTask: "Received Quotation from Vendor", status: "Done", nextTask: "Explain the costing to customer", tat: 1, tatType: "hourtat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Explain the costing to customer", status: "Done", nextTask: "Get Customer Approval for the Box", tat: 1, tatType: "daytat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Get Customer Approval for the Box", status: "Approved", nextTask: "Need Demo?", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Get Customer Approval for the Box", status: "Decline", nextTask: "Any other Customisation", tat: 1, tatType: "daytat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Any other Customisation", status: "Done", nextTask: "Get Customer Approval for the Box", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        
      //   // Demo flow
      //   { system: "Order Tracker", currentTask: "Need Demo?", status: "Yes", nextTask: "Raise PO for Demo", tat: 1, tatType: "hourtat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Need Demo?", status: "No", nextTask: "Raise PO for Boxes", tat: 1, tatType: "daytat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Raise PO for Demo", status: "Done", nextTask: "Received Demo Boxes", tat: 1, tatType: "hourtat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Received Demo Boxes", status: "Done", nextTask: "Customer Approval for Demo", tat: 1, tatType: "daytat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Customer Approval for Demo", status: "Yes", nextTask: "Raise PO for Boxes", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Customer Approval for Demo", status: "No", nextTask: "Get All details of Customisation of final box", tat: 1, tatType: "daytat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
        
      //   // Second demo flow
      //   { system: "Order Tracker", currentTask: "Get All details of Customisation of final box", status: "Done", nextTask: "Need Demo?(2)", tat: 1, tatType: "hourtat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Need Demo?(2)", status: "Yes", nextTask: "Raise PO for Demo(2)", tat: 1, tatType: "daytat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Need Demo?(2)", status: "No", nextTask: "Raise PO for Boxes", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Raise PO for Demo(2)", status: "Done", nextTask: "Received Demo Boxes(2)", tat: 1, tatType: "daytat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Received Demo Boxes(2)", status: "Done", nextTask: "Customer Approval for Demo(2)", tat: 1, tatType: "hourtat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Customer Approval for Demo(2)", status: "Yes", nextTask: "Raise PO for Boxes", tat: 1, tatType: "daytat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        
      //   // Final box processing
      //   { system: "Order Tracker", currentTask: "Raise PO for Boxes", status: "Done", nextTask: "Received Boxes", tat: 1, tatType: "hourtat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Received Boxes", status: "Done", nextTask: "Store Boxes", tat: 1, tatType: "daytat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Order Tracker", currentTask: "Store Boxes", status: "Done", nextTask: "Create Order for Sweets", tat: 1, tatType: "hourtat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
        
      //   // Final completion
      //   { system: "Order Tracker", currentTask: "Final Dispatch", status: "Done", nextTask: "", tat: 1, tatType: "daytat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
        
      //   // Purchase System workflow
      //   { system: "Purchase", currentTask: "", status: "", nextTask: "Raise Indent", tat: 1, tatType: "daytat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
      //   { system: "Purchase", currentTask: "Raise Indent", status: "Done", nextTask: "choose Vendor and take rate", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Purchase", currentTask: "choose Vendor and take rate", status: "Done", nextTask: "take approval from MD", tat: 1, tatType: "daytat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
      //   { system: "Purchase", currentTask: "take approval from MD", status: "Approved", nextTask: "Generate PO", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Purchase", currentTask: "take approval from MD", status: "Decline", nextTask: "", tat: 1, tatType: "daytat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
      //   { system: "Purchase", currentTask: "Generate PO", status: "Done", nextTask: "Followup", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
      //   { system: "Purchase", currentTask: "Followup", status: "Done", nextTask: "Followup 2 days before of tat", tat: 1, tatType: "daytat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" }
      // ];

      await apiRequest("POST", "/api/flow-rules/bulk", { rules });
      
      toast({
        title: "Success",
        description: `Imported comprehensive workflow with ${rules.length} rules (Order Tracker & Purchase systems)`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Error",
        description: "Failed to import comprehensive workflow rules",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-neutral">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Header title="Flow Management" description="Design and manage your workflow rules" />
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm border">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
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
          title="Flow Management" 
          description="Design and manage your workflow rules"
          actions={
            <div className="flex space-x-3">
              <Button 
                variant="secondary" 
                onClick={importFromFile}
                disabled={loading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Complete Workflow
              </Button>
              <Dialog open={isStartFlowDialogOpen} onOpenChange={setIsStartFlowDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Play className="w-4 h-4 mr-2" />
                    Start Flow
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start New Flow</DialogTitle>
                  </DialogHeader>
                  <Form {...startFlowForm}>
                    <form onSubmit={startFlowForm.handleSubmit(onSubmitStartFlow)} className="space-y-4">
                      <FormField
                        control={startFlowForm.control}
                        name="system"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>System</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select system" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableSystems.map((system: string) => (
                                  <SelectItem key={system} value={system}>
                                    {system}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={startFlowForm.control}
                        name="orderNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Order Number/Unique ID *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter unique order/case number" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={startFlowForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flow Description *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="What is this flow for? (e.g., Wedding order for John & Jane)" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={startFlowForm.control}
                        name="initialFormData"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Initial Form Data (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder='Enter key information as JSON: {"customer": "John", "priority": "High"}' />
                            </FormControl>
                            <div className="text-xs text-gray-500">
                              This data will be visible in all tasks of this flow for easy identification
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end space-x-3">
                        <Button type="button" variant="outline" onClick={() => setIsStartFlowDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={startFlowMutation.isPending}>
                          {startFlowMutation.isPending ? "Starting..." : "Start Flow"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <Dialog open={isRuleDialogOpen} onOpenChange={(open) => {
                setIsRuleDialogOpen(open);
                if (!open) {
                  setEditingRule(null);
                  setSelectedTatType("daytat");
                  ruleForm.reset();
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Rule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingRule ? "Edit Flow Rule" : "Create Flow Rule"}</DialogTitle>
                  </DialogHeader>
                  <Form {...ruleForm}>
                    <form onSubmit={ruleForm.handleSubmit(onSubmitRule)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={ruleForm.control}
                          name="system"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>System</FormLabel>
                              <div className="space-y-2">
                                <FormControl>
                                  <Input 
                                    {...field}
                                    placeholder="Enter system name (e.g., Order Tracker, Purchase)"
                                    list="system-options"
                                  />
                                </FormControl>
                                <datalist id="system-options">
                                  {availableSystems.map((system) => (
                                    <option key={system} value={system} />
                                  ))}
                                </datalist>
                                {availableSystems.length > 0 && (
                                  <p className="text-xs text-gray-500">
                                    Available systems: {availableSystems.join(", ")}
                                  </p>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={ruleForm.control}
                          name="currentTask"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Task (empty for start)</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select task or leave empty for start" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="__start__">-- Start Rule (No Previous Task) --</SelectItem>
                                  {availableTasks.map((task) => (
                                    <SelectItem key={task} value={task}>
                                      {task}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="__custom__">Type Custom Task...</SelectItem>
                                </SelectContent>
                              </Select>
                              {field.value === "__custom__" && (
                                <Input 
                                  onChange={(e) => field.onChange(e.target.value)}
                                  placeholder="Enter task name"
                                  className="mt-2"
                                  autoFocus
                                />
                              )}
                              {field.value === "__start__" && (
                                <p className="text-xs text-gray-500 mt-1">
                                  This rule will be the starting point of the workflow
                                </p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={ruleForm.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <div className="space-y-2">
                                <FormControl>
                                  <Input 
                                    {...field}
                                    placeholder="Enter status (e.g., Done, Approved, Pending)"
                                    list="status-options-main"
                                  />
                                </FormControl>
                                <datalist id="status-options-main">
                                  {ruleForm.watch("currentTask") && getAvailableStatuses(ruleForm.watch("currentTask")).length > 0 ? (
                                    getAvailableStatuses(ruleForm.watch("currentTask")).map((status) => (
                                      <option key={status} value={status} />
                                    ))
                                  ) : (
                                    <>
                                      <option value="Done" />
                                      <option value="Yes" />
                                      <option value="No" />
                                      <option value="Approved" />
                                      <option value="Decline" />
                                      <option value="Regular" />
                                      <option value="Wedding" />
                                    </>
                                  )}
                                </datalist>
                                <p className="text-xs text-gray-500">
                                  Common statuses: Done, Approved, Decline, Yes, No
                                </p>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={ruleForm.control}
                          name="nextTask"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Next Task</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="Enter next task name (e.g., Customer Registration)"
                                  list="task-options"
                                />
                              </FormControl>
                              <datalist id="task-options">
                                {availableTasks.map((task) => (
                                  <option key={task} value={task} />
                                ))}
                              </datalist>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={ruleForm.control}
                          name="tat"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>TAT (Turn Around Time)</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" min={selectedTatType === "specifytat" ? "0" : "1"} />
                              </FormControl>
                              {selectedTatType === "specifytat" && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  ℹ️ Enter hour in 24-hour format (0-23). Examples: 9 (9 AM), 14 (2 PM), 17 (5 PM)
                                </p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={ruleForm.control}
                          name="tatType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>TAT Type</FormLabel>
                              <Select onValueChange={(value) => {
                                field.onChange(value);
                                setSelectedTatType(value);
                              }} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="daytat">Day TAT</SelectItem>
                                  <SelectItem value="hourtat">Hour TAT</SelectItem>
                                  <SelectItem value="beforetat">Before TAT (T-2)</SelectItem>
                                  <SelectItem value="specifytat">Specify TAT (Specific Hour Next Day)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={ruleForm.control}
                          name="doer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Doer (Role)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., Sales Executive" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={ruleForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Assign to User</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  // Auto-fill doer name when email is selected
                                  const selectedUser = (users as any[])?.find((user: any) => user.email === value);
                                  if (selectedUser) {
                                    const doerName = `${selectedUser.firstName} ${selectedUser.lastName}`.trim();
                                    ruleForm.setValue('doer', doerName);
                                  }
                                }} 
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select user to assign task" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(users as any[])?.map((user: any) => (
                                    <SelectItem key={user.id} value={user.email}>
                                      {user.firstName} {user.lastName} ({user.email})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={ruleForm.control}
                        name="formId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Form ID (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., f001" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Transfer Options */}
                      <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          <h4 className="text-sm font-semibold text-blue-800">Task Transfer Options</h4>
                        </div>
                        
                        <FormField
                          control={ruleForm.control}
                          name="transferable"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Allow Task Transfer</FormLabel>
                                <div className="text-sm text-gray-600">
                                  Enable users to transfer this task to other team members
                                </div>
                              </div>
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="w-4 h-4 text-blue-600 rounded"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        {ruleForm.watch("transferable") && (
                          <FormField
                            control={ruleForm.control}
                            name="transferToEmails"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Transfer Target Users</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Select users from: {(users as any[])?.map((u: any) => u.email).join(', ')}"
                                  />
                                </FormControl>
                                <div className="text-xs text-gray-500">
                                  Comma-separated list of emails from the dropdown above who can receive transferred tasks
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                      <div className="flex justify-end space-x-3">
                        <Button type="button" variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createRuleMutation.isPending || updateRuleMutation.isPending}>
                          {editingRule ? "Update Rule" : "Create Rule"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          }
        />

        <div className="p-6">
          {/* Flow Rules List */}
          <div className="space-y-6">
            {rulesLoading ? (
              [...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))
            ) : (flowRules as any[])?.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Workflow className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No flow rules found</h3>
                  <p className="text-gray-500 mb-4">
                    Create your first flow rule to start automating your workflows.
                  </p>
                  <Button onClick={() => setIsRuleDialogOpen(true)}>
                    Create Flow Rule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              availableSystems.map((system: string) => (
                <Card key={system}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Workflow className="w-5 h-5 mr-2" />
                        {system}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewFlowData(system)}
                        className="ml-4"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Data
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(flowRules as any[])
                        ?.filter((rule: any) => rule.system === system)
                        .map((rule: any) => (
                          <div key={rule.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4">
                                <div className="text-sm">
                                  <span className="font-medium">
                                    {rule.currentTask || "[START]"} 
                                  </span>
                                  <span className="text-gray-500 mx-2">→</span>
                                  <span className="font-medium">{rule.nextTask}</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  TAT: {rule.tat} {rule.tatType}(s)
                                </div>
                                <div className="text-xs text-gray-500">
                                  Doer: {rule.doer}
                                </div>
                              </div>
                              {rule.status && (
                                <div className="text-xs text-gray-500 mt-1">
                                  When status: {rule.status}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRule(rule)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteRuleMutation.mutate(rule.id)}
                                disabled={deleteRuleMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
