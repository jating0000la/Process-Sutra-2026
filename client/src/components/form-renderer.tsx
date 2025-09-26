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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface FormQuestion {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  tableColumns?: { id: string; label: string; type: string }[];
}

interface FormTemplate {
  id: string;
  formId: string;
  title: string;
  description?: string;
  questions: FormQuestion[];
}

interface FormRendererProps {
  template: FormTemplate;
  onSubmit: (data: Record<string, any>) => void;
  isSubmitting?: boolean;
  initialData?: Record<string, any>;
  readonly?: boolean;
  flowId?: string; // Add flowId to fetch previous responses
}

export default function FormRenderer({ 
  template, 
  onSubmit, 
  isSubmitting = false, 
  initialData = {},
  readonly = false,
  flowId 
}: FormRendererProps) {
  const { user } = useAuth();
  
  // Fetch previous form responses from the same flow for auto-prefill
  const { data: flowResponses } = useQuery({
    queryKey: ["/api/flows", flowId, "responses"],
    enabled: !!flowId,
  });

  // Create auto-prefill data by matching field labels from previous responses
  const autoPrefillData = useMemo(() => {
    if (!flowResponses || !Array.isArray(flowResponses)) {
      console.log('FormRenderer: No flow responses available for auto-prefill', { flowResponses, flowId });
      return {};
    }

    console.log('FormRenderer: Processing flow responses for auto-prefill', {
      flowId,
      responseCount: flowResponses.length,
      responses: flowResponses
    });

    const prefillData: Record<string, any> = {};

    // Iterate through previous responses to find matching field labels
    flowResponses.forEach((response: any) => {
      if (response.formData && typeof response.formData === 'object') {
        template.questions.forEach((question) => {
          // Handle both old simple structure and new enhanced structure
          let value = undefined;
          
          // First check if there's a direct match by question label (enhanced structure)
          if (response.formData[question.label]) {
            const fieldData = response.formData[question.label];
            if (typeof fieldData === 'object' && fieldData.answer !== undefined) {
              // Enhanced structure: { questionId, questionTitle, answer }
              value = fieldData.answer;
            } else {
              // Simple structure: direct value
              value = fieldData;
            }
          } 
          // Also check by question ID for backwards compatibility
          else if (response.formData[question.id]) {
            const fieldData = response.formData[question.id];
            if (typeof fieldData === 'object' && fieldData.answer !== undefined) {
              value = fieldData.answer;
            } else {
              value = fieldData;
            }
          }
          
          // Set the value if found and not already set (first match wins)
          if (value !== undefined && prefillData[question.id] === undefined) {
            prefillData[question.id] = value;
            console.log('FormRenderer: Auto-prefill match found', {
              questionId: question.id,
              questionLabel: question.label,
              prefillValue: value
            });
          }
        });
      }
    });

    console.log('FormRenderer: Final auto-prefill data', prefillData);
    return prefillData;
  }, [flowResponses, template.questions]);
  
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
        return field.value;
      }
      return [];
    });

    // Sync with field value changes (for pre-populated forms)
    useEffect(() => {
      if (Array.isArray(field.value)) {
        setTableRows(field.value);
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
                              <SelectItem value="option1">Option 1</SelectItem>
                              <SelectItem value="option2">Option 2</SelectItem>
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
      console.log('FormRenderer: Updating form with auto-prefill data', autoPrefillData);
      
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
          console.log(`FormRenderer: Setting ${question.id} to prefilled value:`, prefillValue);
        }
      });
      
      setIsFormInitialized(true);
      console.log('FormRenderer: Auto-prefill complete, fields should be editable');
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
    
    onSubmit(cleanedData);
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
              {autoPrefillData[question.label] && !initialData[question.id] && (
                <span className="text-blue-500 ml-2 text-xs">(Auto-filled)</span>
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
                          {question.options?.map((option) => (
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
                      <div className="space-y-2">
                        <Input
                          type="file"
                          onChange={async (e) => {
                            const inputEl = e.currentTarget as HTMLInputElement;
                            const file = inputEl.files?.[0];
                            if (!file) {
                              field.onChange(null);
                              return;
                            }
                            try {
                              const fd = new FormData();
                              fd.append("formId", template.formId);
                              fd.append("fieldId", question.id);
                              // taskId is optional; include if provided via prop in future
                              fd.append("file", file);
                              const res = await fetch("/api/uploads", {
                                method: "POST",
                                body: fd,
                                credentials: "include",
                              });
                              if (!res.ok) throw new Error(`${res.status}`);
                              const descriptor = await res.json();
                              // descriptor: { type:'file', gridFsId, originalName, mimeType, size, ... }
                              field.onChange(descriptor);
                              toast({ title: "Uploaded", description: descriptor.originalName || "File uploaded" });
                            } catch (err) {
                              console.error("Upload failed", err);
                              toast({ title: "Upload failed", description: "Could not upload file", variant: "destructive" });
                              field.onChange(null);
                            } finally {
                              // clear the input to allow re-uploading same file if needed
                              if (inputEl) {
                                try { inputEl.value = ""; } catch {}
                              }
                            }
                          }}
                          disabled={readonly}
                        />
                        {field.value && typeof field.value === 'object' && field.value.type === 'file' && field.value.gridFsId && (
                          <a
                            href={`/api/uploads/${field.value.gridFsId}`}
                            className="text-blue-600 hover:underline text-sm"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {field.value.originalName || 'Download file'}
                          </a>
                        )}
                      </div>
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
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {template.questions.map((question) => renderField(question))}
            
            {!readonly && (
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Form
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
