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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Plus, 
  Save, 
  Edit, 
  Trash2, 
  Type, 
  AlignLeft, 
  List, 
  CheckSquare, 
  Circle, 
  Calendar, 
  Upload,
  GripVertical,
  Table
} from "lucide-react";

interface FormQuestion {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  tableColumns?: { id: string; label: string; type: string }[];
}

const formTemplateSchema = z.object({
  formId: z.string().min(1, "Form ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  questions: z.array(z.object({
    id: z.string(),
    label: z.string().min(1, "Label is required"),
    type: z.string(),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
    placeholder: z.string().optional(),
    tableColumns: z.array(z.object({
      id: z.string(),
      label: z.string(),
      type: z.string(),
    })).optional(),
  })),
});

const questionTypes = [
  { value: "text", label: "Text Input", icon: Type },
  { value: "textarea", label: "Textarea", icon: AlignLeft },
  { value: "select", label: "Dropdown", icon: List },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
  { value: "radio", label: "Radio Button", icon: Circle },
  { value: "date", label: "Date Picker", icon: Calendar },
  { value: "file", label: "File Upload", icon: Upload },
  { value: "table", label: "Table/Multiple Items", icon: Table },
];

export default function FormBuilder() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [currentForm, setCurrentForm] = useState<any>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<FormQuestion | null>(null);
  const [tableColumns, setTableColumns] = useState<{ id: string; label: string; type: string }[]>([]);

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

  const { data: formTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/form-templates"],
    enabled: isAuthenticated,
  });

  const form = useForm({
    resolver: zodResolver(formTemplateSchema),
    defaultValues: {
      formId: "",
      title: "",
      description: "",
      questions: [],
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formTemplateSchema>) => {
      await apiRequest("POST", "/api/form-templates", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Form template created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      setIsBuilderOpen(false);
      resetBuilder();
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
        description: "Failed to create form template",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: z.infer<typeof formTemplateSchema> }) => {
      await apiRequest("PUT", `/api/form-templates/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Form template updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      setIsBuilderOpen(false);
      resetBuilder();
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
        description: "Failed to update form template",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/form-templates/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Form template deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
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
        description: "Failed to delete form template",
        variant: "destructive",
      });
    },
  });

  const resetBuilder = () => {
    setCurrentForm(null);
    setQuestions([]);
    setSelectedQuestion(null);
    setTableColumns([]);
    form.reset();
  };

  const addTableColumn = () => {
    const newColumn = {
      id: `col_${Date.now()}`,
      label: `Column ${tableColumns.length + 1}`,
      type: "text"
    };
    setTableColumns([...tableColumns, newColumn]);
  };

  const updateTableColumn = (id: string, field: string, value: string) => {
    setTableColumns(tableColumns.map(col => 
      col.id === id ? { ...col, [field]: value } : col
    ));
  };

  const removeTableColumn = (id: string) => {
    setTableColumns(tableColumns.filter(col => col.id !== id));
  };

  const addQuestion = (type: string) => {
    const newQuestion: FormQuestion = {
      id: `q_${Date.now()}`,
      label: `New ${questionTypes.find(t => t.value === type)?.label}`,
      type,
      required: false,
      placeholder: "",
      options: type === "select" || type === "radio" ? ["Option 1", "Option 2"] : undefined,
      tableColumns: type === "table" ? [] : undefined,
    };
    setQuestions([...questions, newQuestion]);
    setSelectedQuestion(newQuestion);
    
    // Reset table columns for new table question
    if (type === "table") {
      setTableColumns([]);
    }
  };

  const updateQuestion = (id: string, updates: Partial<FormQuestion>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
    if (selectedQuestion?.id === id) {
      setSelectedQuestion({ ...selectedQuestion, ...updates });
    }
    
    // If updating table columns for the selected question
    if (selectedQuestion?.id === id && updates.tableColumns) {
      setTableColumns(updates.tableColumns);
    }
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    if (selectedQuestion?.id === id) {
      setSelectedQuestion(null);
    }
  };

  const saveForm = () => {
    // Update current selected question with table columns before saving
    if (selectedQuestion?.type === "table") {
      updateQuestion(selectedQuestion.id, { tableColumns });
    }
    
    const formData = {
      formId: form.getValues("formId"),
      title: form.getValues("title"),
      description: form.getValues("description"),
      questions,
    };

    if (currentForm) {
      updateTemplateMutation.mutate({ id: currentForm.id, data: formData });
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  const editTemplate = (template: any) => {
    setCurrentForm(template);
    setQuestions(template.questions || []);
    setTableColumns([]);
    form.reset({
      formId: template.formId,
      title: template.title,
      description: template.description || "",
      questions: template.questions || [],
    });
    setIsBuilderOpen(true);
  };

  const renderQuestionPreview = (question: FormQuestion) => {
    switch (question.type) {
      case "text":
        return (
          <Input 
            placeholder={question.placeholder || question.label} 
            disabled 
            className="mt-2"
          />
        );
      case "textarea":
        return (
          <Textarea 
            placeholder={question.placeholder || question.label} 
            disabled 
            className="mt-2"
          />
        );
      case "select":
        return (
          <Select disabled>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option, index) => (
                <SelectItem key={index} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "checkbox":
        return (
          <div className="mt-2 space-y-2">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox disabled />
                <Label>{option}</Label>
              </div>
            ))}
          </div>
        );
      case "radio":
        return (
          <div className="mt-2 space-y-2">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input type="radio" disabled />
                <Label>{option}</Label>
              </div>
            ))}
          </div>
        );
      case "date":
        return (
          <Input 
            type="date" 
            disabled 
            className="mt-2"
          />
        );
      case "file":
        return (
          <Input 
            type="file" 
            disabled 
            className="mt-2"
          />
        );
      case "table":
        return (
          <div className="mt-2 border border-gray-200 rounded-lg">
            <div className="p-3 bg-gray-50 border-b">
              <h4 className="text-sm font-medium">Multiple Items Table</h4>
            </div>
            <div className="p-3">
              {question.tableColumns && question.tableColumns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {question.tableColumns.map((col) => (
                          <th key={col.id} className="text-left p-2 border-b border-gray-200">
                            {col.label}
                          </th>
                        ))}
                        <th className="text-left p-2 border-b border-gray-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {question.tableColumns.map((col) => (
                          <td key={col.id} className="p-2 border-b border-gray-100">
                            <Input 
                              placeholder={`Enter ${col.label.toLowerCase()}`} 
                              disabled 
                              size="sm"
                            />
                          </td>
                        ))}
                        <td className="p-2 border-b border-gray-100">
                          <Button size="sm" variant="outline" disabled>Add</Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Configure table columns to see preview</p>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-neutral">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Header title="Form Builder" description="Create and manage form templates" />
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
          title="Form Builder" 
          description="Create and manage form templates"
          actions={
            <Button onClick={() => {
              resetBuilder();
              setIsBuilderOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              New Form
            </Button>
          }
        />

        <div className="p-6">
          {/* Form Templates List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templatesLoading ? (
              [...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-full"></div>
                  </CardContent>
                </Card>
              ))
            ) : formTemplates?.length === 0 ? (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-12 text-center">
                    <Edit className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No form templates found</h3>
                    <p className="text-gray-500 mb-4">
                      Create your first form template to start collecting structured data.
                    </p>
                    <Button onClick={() => {
                      resetBuilder();
                      setIsBuilderOpen(true);
                    }}>
                      Create Form Template
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              formTemplates?.map((template: any) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{template.title}</CardTitle>
                    {template.description && (
                      <p className="text-sm text-gray-600">{template.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-500">Form ID: {template.formId}</p>
                      <p className="text-sm text-gray-500">
                        {template.questions?.length || 0} questions
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editTemplate(template)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTemplateMutation.mutate(template.id)}
                        disabled={deleteTemplateMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Form Builder Modal */}
        <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                {currentForm ? "Edit Form Template" : "Create Form Template"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex h-[70vh]">
              {/* Form Elements Palette */}
              <div className="w-1/4 bg-gray-50 p-4 border-r border-gray-200 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Form Elements</h3>
                <div className="space-y-2">
                  {questionTypes.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <Button
                        key={type.value}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => addQuestion(type.value)}
                      >
                        <IconComponent className="w-4 h-4 mr-2" />
                        {type.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Form Canvas */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="mb-4 space-y-4">
                  <div>
                    <Label htmlFor="formId">Form ID</Label>
                    <Input
                      id="formId"
                      placeholder="e.g., f001"
                      {...form.register("formId")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="title">Form Title</Label>
                    <Input
                      id="title"
                      placeholder="Form Title"
                      {...form.register("title")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Form Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Form Description"
                      {...form.register("description")}
                    />
                  </div>
                </div>
                
                <div className="space-y-4 min-h-96 border-2 border-dashed border-gray-300 rounded-lg p-4">
                  {questions.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Plus className="w-8 h-8 mx-auto mb-2" />
                      <p>Add form elements from the left panel to build your form</p>
                    </div>
                  ) : (
                    questions.map((question) => (
                      <div
                        key={question.id}
                        className={`p-4 border rounded-lg bg-white cursor-pointer ${
                          selectedQuestion?.id === question.id ? 'border-primary' : 'border-gray-200'
                        }`}
                        onClick={() => {
                          setSelectedQuestion(question);
                          if (question.type === "table" && question.tableColumns) {
                            setTableColumns(question.tableColumns);
                          } else if (question.type !== "table") {
                            setTableColumns([]);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                            <Label className="font-medium">
                              {question.label}
                              {question.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteQuestion(question.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {renderQuestionPreview(question)}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Properties Panel */}
              <div className="w-1/4 bg-gray-50 p-4 border-l border-gray-200 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Element Properties</h3>
                {selectedQuestion ? (
                  <div className="space-y-4 text-sm">
                    <div>
                      <Label>Label</Label>
                      <Input
                        value={selectedQuestion.label}
                        onChange={(e) => updateQuestion(selectedQuestion.id, { label: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={selectedQuestion.type}
                        onValueChange={(value) => updateQuestion(selectedQuestion.id, { type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {questionTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Placeholder</Label>
                      <Input
                        value={selectedQuestion.placeholder || ""}
                        onChange={(e) => updateQuestion(selectedQuestion.id, { placeholder: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedQuestion.required}
                        onCheckedChange={(checked) => 
                          updateQuestion(selectedQuestion.id, { required: !!checked })
                        }
                      />
                      <Label>Required field</Label>
                    </div>
                    {(selectedQuestion.type === "select" || selectedQuestion.type === "radio" || selectedQuestion.type === "checkbox") && (
                      <div>
                        <Label>Options</Label>
                        <div className="space-y-2">
                          {selectedQuestion.options?.map((option, index) => (
                            <div key={index} className="flex space-x-2">
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...(selectedQuestion.options || [])];
                                  newOptions[index] = e.target.value;
                                  updateQuestion(selectedQuestion.id, { options: newOptions });
                                }}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newOptions = selectedQuestion.options?.filter((_, i) => i !== index) || [];
                                  updateQuestion(selectedQuestion.id, { options: newOptions });
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newOptions = [...(selectedQuestion.options || []), `Option ${(selectedQuestion.options?.length || 0) + 1}`];
                              updateQuestion(selectedQuestion.id, { options: newOptions });
                            }}
                          >
                            Add Option
                          </Button>
                        </div>
                      </div>
                    )}
                    {selectedQuestion.type === "table" && (
                      <div>
                        <Label>Table Columns</Label>
                        <div className="space-y-2">
                          {tableColumns.map((column) => (
                            <div key={column.id} className="space-y-2 p-3 border border-gray-200 rounded">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium">Column {tableColumns.indexOf(column) + 1}</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTableColumn(column.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                              <div>
                                <Label className="text-xs">Label</Label>
                                <Input
                                  value={column.label}
                                  onChange={(e) => updateTableColumn(column.id, 'label', e.target.value)}
                                  placeholder="Column label"
                                  size="sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Type</Label>
                                <Select
                                  value={column.type}
                                  onValueChange={(value) => updateTableColumn(column.id, 'type', value)}
                                >
                                  <SelectTrigger size="sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="select">Dropdown</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addTableColumn}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Column
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Select a form element to edit its properties</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsBuilderOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={saveForm}
                disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {currentForm ? "Update Form" : "Save Form"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
