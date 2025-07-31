import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
}

export default function FormRenderer({ 
  template, 
  onSubmit, 
  isSubmitting = false, 
  initialData = {},
  readonly = false 
}: FormRendererProps) {
  
  // Table Input Component
  const TableInput = ({ question, field, readonly }: { 
    question: FormQuestion; 
    field: any; 
    readonly?: boolean;
  }) => {
    const [tableRows, setTableRows] = useState<Record<string, string>[]>(field.value || []);

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
      return <div className="text-gray-500 text-sm">No table columns configured</div>;
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
                            <SelectTrigger size="sm">
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
                            size="sm"
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
  
  // Create proper default values for all form fields
  const getDefaultValues = () => {
    const defaults: Record<string, any> = {};
    template.questions.forEach((question) => {
      const existingValue = initialData[question.id];
      if (existingValue !== undefined) {
        defaults[question.id] = existingValue;
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
  };

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

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
                        defaultValue={field.value}
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
                        defaultValue={field.value}
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
                      <Input
                        type="file"
                        onChange={(e) => field.onChange(e.target.files?.[0])}
                        disabled={readonly}
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
