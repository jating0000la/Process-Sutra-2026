import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
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
import { Plus, Workflow, Play, Edit, Trash2, Upload } from "lucide-react";

const flowRuleSchema = z.object({
  system: z.string().min(1, "System is required"),
  currentTask: z.string(),
  status: z.string(),
  nextTask: z.string().min(1, "Next task is required"),
  tat: z.coerce.number().min(1, "TAT must be at least 1"),
  tatType: z.enum(["daytat", "hourtat", "beforetat", "specifytat"]),
  doer: z.string().min(1, "Doer is required"),
  email: z.string().email("Valid email is required"),
  formId: z.string().optional(),
});

const startFlowSchema = z.object({
  system: z.string().min(1, "System is required"),
  orderNumber: z.string().optional(),
});

export default function Flows() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isStartFlowDialogOpen, setIsStartFlowDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: flowRules, isLoading: rulesLoading } = useQuery({
    queryKey: ["/api/flow-rules"],
    enabled: isAuthenticated,
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
    },
  });

  const startFlowForm = useForm({
    resolver: zodResolver(startFlowSchema),
    defaultValues: {
      system: "",
      orderNumber: "",
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
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create flow rule",
        variant: "destructive",
      });
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
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update flow rule",
        variant: "destructive",
      });
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
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
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
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to start flow",
        variant: "destructive",
      });
    },
  });

  const handleEditRule = (rule: any) => {
    setEditingRule(rule);
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

  const importFromFile = async () => {
    try {
      // Complete Order Tracker and Purchase workflow rules from PDF
      const rules = [
        // Order Tracker System - Complete workflow (start rule)
        { system: "Order Tracker", currentTask: "", status: "", nextTask: "Customer Registration", tat: 1, tatType: "hourtat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
        
        // Customer Registration branching
        { system: "Order Tracker", currentTask: "Customer Registration", status: "Regular", nextTask: "Choose Box", tat: 1, tatType: "daytat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Customer Registration", status: "Wedding", nextTask: "Get All details of Customisation and take Approval", tat: 1, tatType: "beforetat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
        
        // Regular flow - Box and Sweets selection
        { system: "Order Tracker", currentTask: "Choose Box", status: "Done", nextTask: "Choose Sweets", tat: 1, tatType: "specifytat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Choose Sweets", status: "Done", nextTask: "Any Basic Customisation", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        
        // Customisation branching
        { system: "Order Tracker", currentTask: "Any Basic Customisation", status: "Yes", nextTask: "Get All details of Customisation", tat: 1, tatType: "daytat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Any Basic Customisation", status: "No", nextTask: "Create Order for Sweets", tat: 1, tatType: "hourtat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Get All details of Customisation", status: "Done", nextTask: "Create Order for Sweets", tat: 1, tatType: "daytat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        
        // Sweet availability and production flow
        { system: "Order Tracker", currentTask: "Create Order for Sweets", status: "Done", nextTask: "Check Sweet Availablity in Store", tat: 1, tatType: "hourtat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Check Sweet Availablity in Store", status: "No", nextTask: "Prepare BOM of Sweets", tat: 1, tatType: "daytat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Check Sweet Availablity in Store", status: "Yes", nextTask: "Execute Filling in Store", tat: 1, tatType: "hourtat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
        
        // Production preparation flow
        { system: "Order Tracker", currentTask: "Prepare BOM of Sweets", status: "Done", nextTask: "Check RM in Store", tat: 1, tatType: "daytat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Check RM in Store", status: "Yes", nextTask: "Plan for Production", tat: 1, tatType: "hourtat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Check RM in Store", status: "No", nextTask: "Raise Indent", tat: 1, tatType: "daytat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
        
        // Production execution
        { system: "Order Tracker", currentTask: "Plan for Production", status: "Done", nextTask: "Execute Production", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Execute Production", status: "Done", nextTask: "Get Sweet and box from Production and Store", tat: 1, tatType: "daytat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
        
        // Vendor and material flow
        { system: "Order Tracker", currentTask: "Raise Indent", status: "Done", nextTask: "Choose Vendor", tat: 1, tatType: "hourtat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Choose Vendor", status: "Done", nextTask: "Generate PO", tat: 1, tatType: "daytat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Generate PO", status: "Done", nextTask: "Received Material", tat: 1, tatType: "hourtat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Received Material", status: "Done", nextTask: "Plan for Production", tat: 1, tatType: "daytat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
        
        // Approval and demo flow
        { system: "Order Tracker", currentTask: "Get Sweet and box from Production and Store", status: "Done", nextTask: "Take Approval from Head", tat: 1, tatType: "hourtat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Take Approval from Head", status: "Yes", nextTask: "Execute Demo filling", tat: 1, tatType: "daytat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Take Approval from Head", status: "No", nextTask: "Get Sweet and box from Production and Store(2)", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Get Sweet and box from Production and Store(2)", status: "Done", nextTask: "Take Approval from Head(2)", tat: 1, tatType: "daytat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Take Approval from Head(2)", status: "Yes", nextTask: "Execute Demo filling", tat: 1, tatType: "hourtat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
        
        // Sales approval flow
        { system: "Order Tracker", currentTask: "Execute Demo filling", status: "Done", nextTask: "Take Approval from Sales Person", tat: 1, tatType: "daytat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Take Approval from Sales Person", status: "Yes", nextTask: "Execute to Filling in Unit", tat: 1, tatType: "hourtat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Take Approval from Sales Person", status: "No", nextTask: "Execute Demo filling(2)", tat: 1, tatType: "daytat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Execute Demo filling(2)", status: "Done", nextTask: "Take Approval from Sales Person(2)", tat: 1, tatType: "hourtat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Take Approval from Sales Person(2)", status: "Yes", nextTask: "Execute to Filling in Unit", tat: 1, tatType: "daytat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        
        // Final execution and dispatch
        { system: "Order Tracker", currentTask: "Execute Filling in Store", status: "Done", nextTask: "Final Dispatch", tat: 1, tatType: "hourtat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Execute to Filling in Unit", status: "Done", nextTask: "Dispatch to Store", tat: 1, tatType: "daytat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Dispatch to Store", status: "Done", nextTask: "Final Dispatch", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        
        // Wedding customisation flow
        { system: "Order Tracker", currentTask: "Get All details of Customisation and take Approval", status: "Done", nextTask: "Explain Timeline to Customer according to Production/Vendor", tat: 1, tatType: "daytat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Explain Timeline to Customer according to Production/Vendor", status: "Done", nextTask: "Customer Box Order Punch", tat: 1, tatType: "hourtat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Customer Box Order Punch", status: "Done", nextTask: "Choose Box Design", tat: 1, tatType: "daytat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Choose Box Design", status: "Done", nextTask: "Explain to Vendor and get Quotation", tat: 1, tatType: "hourtat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Explain to Vendor and get Quotation", status: "Done", nextTask: "Received Quotation from Vendor", tat: 1, tatType: "daytat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
        
        // Quotation and approval flow
        { system: "Order Tracker", currentTask: "Received Quotation from Vendor", status: "Done", nextTask: "Explain the costing to customer", tat: 1, tatType: "hourtat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Explain the costing to customer", status: "Done", nextTask: "Get Customer Approval for the Box", tat: 1, tatType: "daytat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Get Customer Approval for the Box", status: "Approved", nextTask: "Need Demo?", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Get Customer Approval for the Box", status: "Decline", nextTask: "Any other Customisation", tat: 1, tatType: "daytat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Any other Customisation", status: "Done", nextTask: "Get Customer Approval for the Box", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        
        // Demo flow
        { system: "Order Tracker", currentTask: "Need Demo?", status: "Yes", nextTask: "Raise PO for Demo", tat: 1, tatType: "hourtat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Need Demo?", status: "No", nextTask: "Raise PO for Boxes", tat: 1, tatType: "daytat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Raise PO for Demo", status: "Done", nextTask: "Received Demo Boxes", tat: 1, tatType: "hourtat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Received Demo Boxes", status: "Done", nextTask: "Customer Approval for Demo", tat: 1, tatType: "daytat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Customer Approval for Demo", status: "Yes", nextTask: "Raise PO for Boxes", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Customer Approval for Demo", status: "No", nextTask: "Get All details of Customisation of final box", tat: 1, tatType: "daytat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
        
        // Second demo flow
        { system: "Order Tracker", currentTask: "Get All details of Customisation of final box", status: "Done", nextTask: "Need Demo?(2)", tat: 1, tatType: "hourtat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Need Demo?(2)", status: "Yes", nextTask: "Raise PO for Demo(2)", tat: 1, tatType: "daytat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Need Demo?(2)", status: "No", nextTask: "Raise PO for Boxes", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Raise PO for Demo(2)", status: "Done", nextTask: "Received Demo Boxes(2)", tat: 1, tatType: "daytat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Received Demo Boxes(2)", status: "Done", nextTask: "Customer Approval for Demo(2)", tat: 1, tatType: "hourtat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Customer Approval for Demo(2)", status: "Yes", nextTask: "Raise PO for Boxes", tat: 1, tatType: "daytat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        
        // Final box processing
        { system: "Order Tracker", currentTask: "Raise PO for Boxes", status: "Done", nextTask: "Received Boxes", tat: 1, tatType: "hourtat", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Received Boxes", status: "Done", nextTask: "Store Boxes", tat: 1, tatType: "daytat", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Store Boxes", status: "Done", nextTask: "Create Order for Sweets", tat: 1, tatType: "hourtat", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
        
        // Final completion
        { system: "Order Tracker", currentTask: "Final Dispatch", status: "Done", nextTask: "", tat: 1, tatType: "daytat", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
        
        // Purchase System workflow
        { system: "Purchase", currentTask: "", status: "", nextTask: "Raise Indent", tat: 1, tatType: "daytat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
        { system: "Purchase", currentTask: "Raise Indent", status: "Done", nextTask: "choose Vendor and take rate", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        { system: "Purchase", currentTask: "choose Vendor and take rate", status: "Done", nextTask: "take approval from MD", tat: 1, tatType: "daytat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
        { system: "Purchase", currentTask: "take approval from MD", status: "Approved", nextTask: "Generate PO", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        { system: "Purchase", currentTask: "take approval from MD", status: "Decline", nextTask: "", tat: 1, tatType: "daytat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
        { system: "Purchase", currentTask: "Generate PO", status: "Done", nextTask: "Followup", tat: 1, tatType: "hourtat", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        { system: "Purchase", currentTask: "Followup", status: "Done", nextTask: "Followup 2 days before of tat", tat: 1, tatType: "daytat", doer: "Kashsis", email: "jatin@muxro.com", formId: "" }
      ];

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

  if (isLoading) {
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
                disabled={isLoading}
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
                            <FormLabel>Order Number (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter order number" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-3">
                        <Button type="button" variant="outline" onClick={() => setIsStartFlowDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={startFlowMutation.isPending}>
                          Start Flow
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
                                <Input {...field} type="number" min="1" />
                              </FormControl>
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
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="daytat">Day TAT</SelectItem>
                                  <SelectItem value="hourtat">Hour TAT</SelectItem>
                                  <SelectItem value="beforetat">Before TAT (T-2)</SelectItem>
                                  <SelectItem value="specifytat">Specify TAT</SelectItem>
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
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" placeholder="assignee@example.com" />
                              </FormControl>
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
                    <CardTitle className="flex items-center">
                      <Workflow className="w-5 h-5 mr-2" />
                      {system}
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
