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
  tatType: z.enum(["Day", "Hour"]),
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

  const ruleForm = useForm({
    resolver: zodResolver(flowRuleSchema),
    defaultValues: {
      system: "",
      currentTask: "",
      status: "",
      nextTask: "",
      tat: 1,
      tatType: "Day" as const,
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
    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data });
    } else {
      createRuleMutation.mutate(data);
    }
  };

  const onSubmitStartFlow = (data: z.infer<typeof startFlowSchema>) => {
    startFlowMutation.mutate(data);
  };

  const importOrderTrackerRules = async () => {
    try {
      const orderTrackerRules = [
        // Initial flow
        { system: "Order Tracker", currentTask: "", status: "", nextTask: "Customer Registration", tat: 1, tatType: "Hour", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
        // Customer Registration branches
        { system: "Order Tracker", currentTask: "Customer Registration", status: "Regular", nextTask: "Choose Box", tat: 1, tatType: "Day", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Customer Registration", status: "Wedding", nextTask: "Get All details of Customisation and take Approval", tat: 1, tatType: "Day", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
        // Choose Box flow
        { system: "Order Tracker", currentTask: "Choose Box", status: "Done", nextTask: "Choose Sweets", tat: 1, tatType: "Day", doer: "Ajay", email: "jatin@muxro.com", formId: "" },
        // Choose Sweets flow
        { system: "Order Tracker", currentTask: "Choose Sweets", status: "Done", nextTask: "Any Basic Customisation", tat: 1, tatType: "Hour", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        // Any Basic Customisation branches
        { system: "Order Tracker", currentTask: "Any Basic Customisation", status: "Yes", nextTask: "Get All details of Customisation", tat: 1, tatType: "Day", doer: "Kashsis", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Any Basic Customisation", status: "No", nextTask: "Create Order for Sweets", tat: 1, tatType: "Hour", doer: "Jitendra", email: "jatin@muxro.com", formId: "" },
        // Additional rules...
        { system: "Order Tracker", currentTask: "Get All details of Customisation", status: "Done", nextTask: "Create Order for Sweets", tat: 1, tatType: "Day", doer: "Mohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Create Order for Sweets", status: "Done", nextTask: "Check Sweet Availability in Store", tat: 1, tatType: "Hour", doer: "Kamal", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Check Sweet Availability in Store", status: "No", nextTask: "Prepare BOM of Sweets", tat: 1, tatType: "Day", doer: "Rohit", email: "jatin@muxro.com", formId: "" },
        { system: "Order Tracker", currentTask: "Check Sweet Availability in Store", status: "Yes", nextTask: "Execute Filling in Store", tat: 1, tatType: "Hour", doer: "Ajay", email: "jatin@muxro.com", formId: "" }
      ];

      await apiRequest("POST", "/api/flow-rules/bulk", { rules: orderTrackerRules });
      
      toast({
        title: "Success",
        description: "Order Tracker workflow rules imported successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import Order Tracker rules",
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
                onClick={importOrderTrackerRules}
                disabled={isLoading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Order Tracker
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
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select existing or type new" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availableSystems.map((system) => (
                                    <SelectItem key={system} value={system}>
                                      {system}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="__custom__">Type Custom System...</SelectItem>
                                </SelectContent>
                              </Select>
                              {field.value === "__custom__" && (
                                <Input 
                                  onChange={(e) => field.onChange(e.target.value)}
                                  placeholder="Enter new system name"
                                  className="mt-2"
                                />
                              )}
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
                                  <SelectItem value="">-- Start Rule (No Previous Task) --</SelectItem>
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
                                />
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
                              <FormLabel>Status (empty for start)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., completed" />
                              </FormControl>
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
                                <Input {...field} placeholder="e.g., Step 1" />
                              </FormControl>
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
                                  <SelectItem value="Day">Day</SelectItem>
                                  <SelectItem value="Hour">Hour</SelectItem>
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
