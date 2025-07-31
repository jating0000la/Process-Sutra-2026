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
import { Loader2 } from "lucide-react";

interface FormQuestion {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
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
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: initialData,
  });

  const handleSubmit = (data: any) => {
    onSubmit(data);
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
