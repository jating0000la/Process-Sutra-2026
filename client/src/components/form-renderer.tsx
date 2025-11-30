import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Plus, Trash2, MessageSquare, Mail, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  generateWhatsAppURL, 
  generateEmailURL, 
  isWhatsAppEnabled, 
  isEmailEnabled 
} from "@/lib/communicationUtils";
import { FileUploadField } from "@/components/file-upload-field";

interface FormQuestion {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  tableColumns?: { id: string; label: string; type: string; options?: string[] }[];
}

interface FormTemplate {
  id: string;
  formId: string;
  title: string;
  description?: string;
  questions: FormQuestion[];
  whatsappConfig?: {
    enabled: boolean;
    phoneNumber: string;
    messageTemplate: string;
  };
  emailConfig?: {
    enabled: boolean;
    recipientEmail: string;
    subject: string;
    bodyTemplate: string;
  };
}

interface FormRendererProps {
  template: FormTemplate;
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  initialData?: Record<string, any>;
  readonly?: boolean;
  flowId?: string; // Add flowId to fetch previous responses
}

export default function FormRenderer({ 
  template, 
  onSubmit,
  onCancel,
  isSubmitting = false, 
  initialData = {},
  readonly = false,
  flowId 
}: FormRendererProps) {
  const { user } = useAuth();
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [submittedFormData, setSubmittedFormData] = useState<Record<string, any>>({});
  
  // Fetch previous form responses from the same flow for auto-prefill
  const { data: flowResponses, error: prefillError, isLoading: prefillLoading } = useQuery({
    queryKey: ["/api/flows", flowId, "responses"],
    queryFn: async () => {
      const response = await fetch(`/api/flows/${flowId}/responses`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch flow responses: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!flowId,
    retry: 2,  // Retry twice before failing
    staleTime: 30000, // Cache for 30 seconds
  });

  // Create auto-prefill data by matching field labels from previous responses
  const autoPrefillData = useMemo(() => {
    if (!flowResponses || !Array.isArray(flowResponses)) {
      return {};
    }

    const prefillData: Record<string, any> = {};

    // Iterate through ALL previous responses to find matching field labels
    // This allows prefilling from ANY previous form in the same flow
    flowResponses.forEach((response: any) => {
      if (!response.formData || typeof response.formData !== 'object') {
        return;
      }

      // For each question in current template, search for matching label in previous responses
      template.questions.forEach((question) => {
        // Skip if we already found a value for this question
        if (prefillData[question.id] !== undefined) {
          return;
        }

        let value: any = undefined;
        
        // Search through all fields in the response formData
        Object.entries(response.formData).forEach(([key, fieldData]) => {
          if (value !== undefined) return; // Skip if already found
          
          // Normalize for better matching
          const normalizedKey = key.toLowerCase().trim();
          const normalizedQuestionLabel = question.label.toLowerCase().trim();
          
          // Check if the key matches the question label (direct match)
          if (normalizedKey === normalizedQuestionLabel) {
            // Extract the value based on data structure
            if (typeof fieldData === 'object' && fieldData !== null) {
              // Check for enhanced structure: { questionId, questionTitle, answer }
              if ('answer' in fieldData) {
                value = fieldData.answer;
              } 
              // Check if it's a file object
              else if ('type' in fieldData && fieldData.type === 'file') {
                value = fieldData;
              }
              // Check if it's an array (checkbox, table)
              else if (Array.isArray(fieldData)) {
                value = fieldData;
              }
              // Otherwise use the whole object
              else {
                value = fieldData;
              }
            } else {
              // Simple structure: direct value
              value = fieldData;
            }
          }
          // Also try matching by question ID (exact match)
          else if (key === question.id) {
            if (typeof fieldData === 'object' && fieldData !== null && 'answer' in fieldData) {
              value = fieldData.answer;
            } else {
              value = fieldData;
            }
          }
          // Try matching if the fieldData has questionId property that matches
          else if (typeof fieldData === 'object' && fieldData !== null && 'questionId' in fieldData) {
            if ((fieldData as any).questionId === question.id) {
              value = (fieldData as any).answer;
            }
          }
        });
        
        // Set the value if found
        if (value !== undefined) {
          // Validate the value is appropriate for the question type
          const isValidValue = (() => {
            switch (question.type) {
              case 'checkbox':
                return Array.isArray(value);
              case 'table':
                return Array.isArray(value);
              case 'file':
                return typeof value === 'object' || value === null;
              default:
                return true; // Accept any value for other types
            }
          })();
          
          if (isValidValue) {
            // Clean table data by removing metadata fields
            let cleanedValue = value;
            if (question.type === 'table' && Array.isArray(value)) {
              cleanedValue = value.map((row: any) => {
                if (typeof row === 'object' && row !== null) {
                  const cleanRow: Record<string, any> = {};
                  Object.entries(row).forEach(([key, val]) => {
                    // Skip metadata fields that start with _
                    if (!key.startsWith('_')) {
                      cleanRow[key] = val;
                    }
                  });
                  return cleanRow;
                }
                return row;
              });
            }
            
            prefillData[question.id] = cleanedValue;
          }
        }
      });
    });

    return prefillData;
  }, [flowResponses, template.questions, flowId]);

  // Auto-prefill success notification
  useEffect(() => {
    if (flowId && flowResponses) {
      // Show success toast if fields were prefilled
      if (Object.keys(autoPrefillData).length > 0) {
        toast({
          title: "Form auto-filled",
          description: `${Object.keys(autoPrefillData).length} field(s) filled from previous responses.`,
          variant: "default",
        });
      }
    }
  }, [flowId, flowResponses, autoPrefillData]);

  // Show user feedback if auto-prefill fails
  useEffect(() => {
    if (prefillError && flowId) {
      console.error('[FormRenderer] Prefill error:', prefillError);
      toast({
        title: "Auto-fill unavailable",
        description: "Could not load previous form data. You can still fill the form manually.",
        variant: "default"
      });
    }
  }, [prefillError, flowId]);
  
  // Merge initialData with auto-prefill data (initialData takes precedence)
  const combinedInitialData = {
    ...autoPrefillData,
    ...initialData
  };
  
  // Table Input Component
  const TableInput = ({ question, field, readonly }: {
    question: FormQuestion; 
    field: any; 
    readonly?: boolean;
  }) => {
    const [tableRows, setTableRows] = useState<Record<string, string>[]>(() => {
      // Ensure we always have an array
      if (Array.isArray(field.value)) {
        // Filter out metadata fields when initializing from prefilled data
        return field.value.map((row: any) => {
          const cleanRow: Record<string, string> = {};
          Object.entries(row).forEach(([key, value]) => {
            // Skip metadata fields that start with _
            if (!key.startsWith('_')) {
              cleanRow[key] = value as string;
            }
          });
          return cleanRow;
        });
      }
      return [];
    });

    // Sync with field value changes (for pre-populated forms)
    useEffect(() => {
      if (Array.isArray(field.value)) {
        // Clean metadata fields from rows
        const cleanedRows = field.value.map((row: any) => {
          const cleanRow: Record<string, string> = {};
          Object.entries(row).forEach(([key, value]) => {
            // Skip metadata fields that start with _
            if (!key.startsWith('_')) {
              cleanRow[key] = value as string;
            }
          });
          return cleanRow;
        });
        setTableRows(cleanedRows);
      } else if (field.value === null || field.value === undefined) {
        setTableRows([]);
      }
    }, [field.value]);

    const addRow = () => {
      const newRow: Record<string, string> = {};
      question.tableColumns?.forEach(col => {
        newRow[col.id] = '';
      });
      const updatedRows = [...tableRows, newRow];
      setTableRows(updatedRows);
      field.onChange(updatedRows);
    };

    const updateRow = (rowIndex: number, columnId: string, value: string) => {
      const updatedRows = tableRows.map((row, index) => 
        index === rowIndex ? { ...row, [columnId]: value } : row
      );
      setTableRows(updatedRows);
      field.onChange(updatedRows);
    };

    const removeRow = (rowIndex: number) => {
      const updatedRows = tableRows.filter((_, index) => index !== rowIndex);
      setTableRows(updatedRows);
      field.onChange(updatedRows);
    };

    if (!question.tableColumns || question.tableColumns.length === 0) {
      return (
        <div className="border border-gray-200 rounded-lg">
          <div className="p-3 bg-gray-50 border-b">
            <h4 className="text-sm font-medium">{question.label}</h4>
          </div>
          <div className="p-6 text-center">
            <div className="text-gray-500 text-sm">
              This table has no columns configured yet. Please contact the administrator to configure the table columns.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="border border-gray-200 rounded-lg">
        <div className="p-3 bg-gray-50 border-b">
          <h4 className="text-sm font-medium">{question.label}</h4>
        </div>
        <div className="p-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {question.tableColumns.map((col) => (
                    <th key={col.id} className="text-left p-2 border-b border-gray-200">
                      {col.label}
                    </th>
                  ))}
                  {!readonly && <th className="text-left p-2 border-b border-gray-200">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {question.tableColumns?.map((col) => (
                      <td key={col.id} className="p-2 border-b border-gray-100">
                        {col.type === "select" ? (
                          <Select
                            value={row[col.id] || ""}
                            onValueChange={(value) => updateRow(rowIndex, col.id, value)}
                            disabled={readonly}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {col.options && col.options.filter(opt => opt && opt.trim() !== '').length > 0 ? (
                                col.options
                                  .filter(opt => opt && opt.trim() !== '')
                                  .map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))
                              ) : (
                                <SelectItem value="__no_options__" disabled>
                                  No options configured
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={col.type === "number" ? "number" : col.type === "date" ? "date" : "text"}
                            value={row[col.id] || ""}
                            onChange={(e) => updateRow(rowIndex, col.id, e.target.value)}
                            placeholder={`Enter ${col.label.toLowerCase()}`}
                            className="h-8 text-sm"
                            disabled={readonly}
                          />
                        )}
                      </td>
                    ))}
                    {!readonly && (
                      <td className="p-2 border-b border-gray-100">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => removeRow(rowIndex)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!readonly && (
            <div className="mt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addRow}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Row
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };
  // Create dynamic schema based on form questions
  const createFormSchema = () => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};
    
    template.questions.forEach((question) => {
      let fieldSchema: z.ZodTypeAny;
      
      switch (question.type) {
        case "text":
        case "textarea":
          fieldSchema = z.string();
          break;
        case "select":
        case "radio":
          fieldSchema = z.string();
          break;
        case "checkbox":
          fieldSchema = z.array(z.string());
          break;
        case "date":
          fieldSchema = z.string();
          break;
        case "file":
          fieldSchema = z.any();
          break;
        case "table":
          fieldSchema = z.array(z.record(z.string()));
          break;
        default:
          fieldSchema = z.string();
      }
      
      if (question.required) {
        if (question.type === "checkbox") {
          fieldSchema = (fieldSchema as z.ZodArray<any>).min(1, `${question.label} is required`);
        } else {
          fieldSchema = (fieldSchema as z.ZodString).min(1, `${question.label} is required`);
        }
      } else {
        fieldSchema = fieldSchema.optional();
      }
      
      schemaFields[question.id] = fieldSchema;
    });
    
    return z.object(schemaFields);
  };

  const formSchema = createFormSchema();
  
  // Create proper default values for all form fields with auto-prefill
  const getDefaultValues = useCallback(() => {
    const defaults: Record<string, any> = {};
    template.questions.forEach((question) => {
      // Priority: initialData > autoPrefillData > default empty values
      const existingValue = initialData[question.id];
      const prefillValue = autoPrefillData[question.id]; // Use question ID for matching
      
      if (existingValue !== undefined) {
        defaults[question.id] = existingValue;
      } else if (prefillValue !== undefined) {
        // Auto-prefill from previous form responses with matching question ID
        defaults[question.id] = prefillValue;
      } else {
        switch (question.type) {
          case "text":
          case "textarea":
          case "select":
          case "radio":
          case "date":
            defaults[question.id] = "";
            break;
          case "checkbox":
            defaults[question.id] = [];
            break;
          case "file":
            defaults[question.id] = null;
            break;
          case "table":
            defaults[question.id] = [];
            break;
          default:
            defaults[question.id] = "";
        }
      }
    });
    return defaults;
  }, [initialData, autoPrefillData, template.questions]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  // Track if form has been initialized to prevent loops
  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // Reset initialization flag when template or flowId changes (new form)
  useEffect(() => {
    setIsFormInitialized(false);
  }, [template.id, flowId]);

  // Update form when auto-prefill data becomes available
  useEffect(() => {
    if (!isFormInitialized && Object.keys(autoPrefillData).length > 0) {
      // Set individual field values instead of resetting entire form
      // This approach maintains field editability better
      template.questions.forEach((question) => {
        const initialValue = initialData[question.id];
        const prefillValue = autoPrefillData[question.id];
        
        if (initialValue !== undefined) {
          form.setValue(question.id, initialValue);
        } else if (prefillValue !== undefined) {
          form.setValue(question.id, prefillValue, { 
            shouldDirty: false, 
            shouldTouch: false,
            shouldValidate: false 
          });
        }
      });
      
      setIsFormInitialized(true);
    }
  }, [autoPrefillData, initialData, template.questions, form, isFormInitialized]);

  const handleSubmit = (data: any) => {
    // Clean up the data by removing empty optional fields
    const cleanedData: Record<string, any> = {};
    
    template.questions.forEach((question) => {
      const value = data[question.id];
      
      // Only include the field if it has a meaningful value or is required
      if (question.required || (value !== "" && value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0))) {
        cleanedData[question.id] = value;
      }
    });
    
    // Store the submitted data for communication buttons
    setSubmittedFormData(cleanedData);
    setIsFormSubmitted(true);
    
    onSubmit(cleanedData);
  };

  const handleWhatsAppSend = () => {
    const url = generateWhatsAppURL(template, submittedFormData);
    if (url) {
      window.open(url, '_blank');
      toast({
        title: "Opening WhatsApp",
        description: "WhatsApp will open with the pre-filled message",
      });
    } else {
      toast({
        title: "Error",
        description: "Could not generate WhatsApp message",
        variant: "destructive",
      });
    }
  };

  const handleEmailSend = () => {
    const url = generateEmailURL(template, submittedFormData);
    if (url) {
      window.open(url, '_blank');
      toast({
        title: "Opening Email",
        description: "Gmail will open with the pre-filled email",
      });
    } else {
      toast({
        title: "Error",
        description: "Could not generate email",
        variant: "destructive",
      });
    }
  };

  const renderField = (question: FormQuestion) => {
    return (
      <FormField
        key={question.id}
        control={form.control}
        name={question.id}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {question.label}
              {question.required && <span className="text-red-500 ml-1">*</span>}
              {autoPrefillData[question.id] !== undefined && !initialData[question.id] && (
                <span className="text-blue-500 ml-2 text-xs">(Auto-filled from previous form)</span>
              )}
            </FormLabel>
            <FormControl>
              {(() => {
                switch (question.type) {
                  case "text":
                    return (
                      <Input
                        {...field}
                        placeholder={question.placeholder}
                        disabled={readonly}
                      />
                    );
                  case "textarea":
                    return (
                      <Textarea
                        {...field}
                        placeholder={question.placeholder}
                        disabled={readonly}
                      />
                    );
                  case "select":
                    return (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={readonly}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {question.options?.filter(opt => opt && opt.trim() !== '').map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  case "radio":
                    return (
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={readonly}
                      >
                        {question.options?.map((option) => (
                          <div key={option} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`${question.id}_${option}`} />
                            <Label htmlFor={`${question.id}_${option}`}>{option}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    );
                  case "checkbox":
                    return (
                      <div className="space-y-2">
                        {question.options?.map((option) => (
                          <div key={option} className="flex items-center space-x-2">
                            <Checkbox
                              checked={field.value?.includes(option)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, option]);
                                } else {
                                  field.onChange(current.filter((item: string) => item !== option));
                                }
                              }}
                              disabled={readonly}
                            />
                            <Label>{option}</Label>
                          </div>
                        ))}
                      </div>
                    );
                  case "date":
                    return (
                      <Input
                        {...field}
                        type="date"
                        disabled={readonly}
                      />
                    );
                  case "file":
                    return (
                      <FileUploadField
                        formId={template.formId}
                        fieldId={question.id}
                        taskId={undefined}
                        value={field.value}
                        onChange={field.onChange}
                        disabled={readonly}
                        accept={undefined}
                        label={undefined}
                        description={question.placeholder}
                      />
                    );
                  case "table":
                    return <TableInput question={question} field={field} readonly={readonly} />;
                  default:
                    return (
                      <Input
                        {...field}
                        placeholder={question.placeholder}
                        disabled={readonly}
                      />
                    );
                }
              })()}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{template.title}</CardTitle>
        {template.description && (
          <p className="text-sm text-gray-600">{template.description}</p>
        )}
        {prefillLoading && flowId && (
          <div className="flex items-center text-sm text-blue-600 mt-2">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading previous responses for auto-fill...
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {template.questions.map((question) => renderField(question))}
            
            {!readonly && !isFormSubmitted && (
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Form
                </Button>
              </div>
            )}

            {/* Communication buttons after form submission */}
            {!readonly && isFormSubmitted && (
              <div className="border-t pt-4 mt-6">
                {(isWhatsAppEnabled(template) || isEmailEnabled(template)) && (
                  <>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">
                      Send notification about this submission
                    </h3>
                    <div className="flex flex-wrap gap-3 mb-4">
                      {isWhatsAppEnabled(template) && (
                        <Button 
                          type="button"
                          variant="outline"
                          className="bg-green-50 hover:bg-green-100 border-green-200"
                          onClick={handleWhatsAppSend}
                        >
                          <MessageSquare className="w-4 h-4 mr-2 text-green-600" />
                          Send via WhatsApp
                        </Button>
                      )}
                      {isEmailEnabled(template) && (
                        <Button 
                          type="button"
                          variant="outline"
                          className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                          onClick={handleEmailSend}
                        >
                          <Mail className="w-4 h-4 mr-2 text-blue-600" />
                          Send via Email
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Click a button to open WhatsApp or Gmail with a pre-filled message
                    </p>
                  </>
                )}
                <div className="flex justify-end">
                  <Button 
                    type="button"
                    variant="default"
                    onClick={onCancel}
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
