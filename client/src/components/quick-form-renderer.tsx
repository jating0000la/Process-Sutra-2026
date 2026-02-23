/**
 * Quick Form Renderer
 *
 * Renders a Quick Form template and collects responses as simple JSON:
 *   { "Customer Name": "John", "Email": "a@b.com", "File": "https://drive..." }
 *
 * No question IDs — field labels ARE the JSON keys.
 * File uploads go to Google Drive via existing /api/uploads endpoint.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Loader2, Plus, Trash2, MessageSquare, Mail, CheckCircle2 } from "lucide-react";
import { FileUploadField } from "@/components/file-upload-field";
import {
  generateQuickFormWhatsAppURL,
  generateQuickFormEmailURL,
  isQuickFormWhatsAppEnabled,
  isQuickFormEmailEnabled,
} from "@/lib/communicationUtils";

// ─── Types (mirror server types) ────────────────────────────────────

interface QuickFormField {
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  tableColumns?: { label: string; type: string; options?: string[] }[];
}

interface QuickFormTemplate {
  _id?: string;
  formId: string;
  title: string;
  description?: string;
  fields: QuickFormField[];
  whatsappConfig?: { enabled: boolean; phoneNumber: string; messageTemplate: string };
  emailConfig?: { enabled: boolean; recipientEmail: string; subject: string; bodyTemplate: string };
}

interface QuickFormRendererProps {
  template: QuickFormTemplate;
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  initialData?: Record<string, any>;
  readonly?: boolean;
}

// ─── Table Sub-Component ────────────────────────────────────────────

function TableInput({
  field: formField,
  fieldDef,
  readonly,
}: {
  field: any;
  fieldDef: QuickFormField;
  readonly?: boolean;
}) {
  const [rows, setRows] = useState<Record<string, string>[]>(() =>
    Array.isArray(formField.value) ? formField.value : []
  );

  useEffect(() => {
    if (Array.isArray(formField.value)) setRows(formField.value);
  }, [formField.value]);

  const addRow = () => {
    const empty: Record<string, string> = {};
    fieldDef.tableColumns?.forEach((c) => (empty[c.label] = ""));
    const next = [...rows, empty];
    setRows(next);
    formField.onChange(next);
  };

  const updateCell = (ri: number, colLabel: string, val: string) => {
    const next = rows.map((r, i) => (i === ri ? { ...r, [colLabel]: val } : r));
    setRows(next);
    formField.onChange(next);
  };

  const removeRow = (ri: number) => {
    const next = rows.filter((_, i) => i !== ri);
    setRows(next);
    formField.onChange(next);
  };

  if (!fieldDef.tableColumns?.length) {
    return <p className="text-gray-500 text-sm">No columns configured.</p>;
  }

  return (
    <div className="border rounded-lg">
      <div className="p-3 bg-gray-50 border-b">
        <h4 className="text-sm font-medium">{fieldDef.label}</h4>
      </div>
      <div className="p-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {fieldDef.tableColumns.map((c, i) => (
                <th key={i} className="text-left p-2 border-b">{c.label}</th>
              ))}
              {!readonly && <th className="text-left p-2 border-b">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {fieldDef.tableColumns!.map((col, ci) => (
                  <td key={ci} className="p-2 border-b border-gray-100">
                    {col.type === "select" ? (
                      <Select value={row[col.label] || ""} onValueChange={(v) => updateCell(ri, col.label, v)} disabled={readonly}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {col.options?.filter(Boolean).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={col.type === "number" ? "number" : col.type === "date" ? "date" : "text"}
                        value={row[col.label] || ""}
                        onChange={(e) => updateCell(ri, col.label, e.target.value)}
                        placeholder={col.label}
                        className="h-8 text-sm"
                        disabled={readonly}
                      />
                    )}
                  </td>
                ))}
                {!readonly && (
                  <td className="p-2 border-b border-gray-100">
                    <Button type="button" size="sm" variant="outline" onClick={() => removeRow(ri)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!readonly && (
          <div className="mt-3">
            <Button type="button" size="sm" variant="outline" onClick={addRow}>
              <Plus className="w-4 h-4 mr-1" />Add Row
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Renderer ──────────────────────────────────────────────────

export default function QuickFormRenderer({
  template,
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialData = {},
  readonly = false,
}: QuickFormRendererProps) {
  const fields = useMemo(() => {
    if (!template?.fields || !Array.isArray(template.fields)) return [];
    return template.fields.filter((f) => f && f.label);
  }, [template]);

  // Build zod schema using field labels as keys
  const formSchema = useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};
    fields.forEach((f) => {
      let s: z.ZodTypeAny;
      switch (f.type) {
        case "checkbox":
          s = z.array(z.string());
          break;
        case "table":
          s = z.array(z.record(z.string()));
          break;
        case "file":
          s = z.any();
          break;
        case "number":
          s = z.string(); // keep as string in form, convert later if needed
          break;
        default:
          s = z.string();
      }
      if (f.required) {
        if (f.type === "checkbox") s = (s as z.ZodArray<any>).min(1, `${f.label} is required`);
        else if (f.type !== "file" && f.type !== "table") s = (s as z.ZodString).min(1, `${f.label} is required`);
      } else {
        s = s.optional();
      }
      shape[f.label] = s;
    });
    return z.object(shape);
  }, [fields]);

  // Default values
  const defaultValues = useMemo(() => {
    const dv: Record<string, any> = {};
    fields.forEach((f) => {
      const existing = initialData[f.label];
      if (existing !== undefined) {
        dv[f.label] = existing;
      } else {
        switch (f.type) {
          case "checkbox": dv[f.label] = []; break;
          case "table": dv[f.label] = []; break;
          case "file": dv[f.label] = null; break;
          default: dv[f.label] = "";
        }
      }
    });
    return dv;
  }, [fields, initialData]);

  const form = useForm({ resolver: zodResolver(formSchema), defaultValues });

  // Communication state
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [submittedFormData, setSubmittedFormData] = useState<Record<string, any>>({});

  const showWhatsApp = isQuickFormWhatsAppEnabled(template as any);
  const showEmail = isQuickFormEmailEnabled(template as any);

  const handleSubmit = (data: any) => {
    // Build clean response: { label: value } — only include non-empty values
    const clean: Record<string, any> = {};
    fields.forEach((f) => {
      const val = data[f.label];
      if (f.required || (val !== "" && val !== null && val !== undefined && !(Array.isArray(val) && val.length === 0))) {
        clean[f.label] = val;
      }
    });
    setSubmittedFormData(clean);
    setIsFormSubmitted(true);
    onSubmit(clean);
  };

  const handleWhatsAppSend = () => {
    const url = generateQuickFormWhatsAppURL(template as any, submittedFormData);
    if (url) window.open(url, "_blank");
  };

  const handleEmailSend = () => {
    const url = generateQuickFormEmailURL(template as any, submittedFormData);
    if (url) window.open(url, "_blank");
  };

  // ─── Render Field ─────────────────────────────────────────────

  const renderField = (fieldDef: QuickFormField) => (
    <FormField
      key={fieldDef.label}
      control={form.control}
      name={fieldDef.label}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {fieldDef.label}
            {fieldDef.required && <span className="text-red-500 ml-1">*</span>}
          </FormLabel>
          <FormControl>
            {(() => {
              switch (fieldDef.type) {
                case "text":
                  return <Input {...field} placeholder={fieldDef.placeholder} disabled={readonly} />;
                case "number":
                  return <Input {...field} type="number" placeholder={fieldDef.placeholder} disabled={readonly} />;
                case "textarea":
                  return <Textarea {...field} placeholder={fieldDef.placeholder} disabled={readonly} />;
                case "date":
                  return <Input {...field} type="date" disabled={readonly} />;
                case "select":
                  return (
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={readonly}>
                      <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
                      <SelectContent>
                        {fieldDef.options?.filter(Boolean).map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                case "radio":
                  return (
                    <RadioGroup onValueChange={field.onChange} value={field.value || ""} disabled={readonly}>
                      {fieldDef.options?.map((o) => (
                        <div key={o} className="flex items-center space-x-2">
                          <RadioGroupItem value={o} id={`${fieldDef.label}_${o}`} />
                          <Label htmlFor={`${fieldDef.label}_${o}`}>{o}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  );
                case "checkbox":
                  return (
                    <div className="space-y-2">
                      {fieldDef.options?.map((o) => (
                        <div key={o} className="flex items-center space-x-2">
                          <Checkbox
                            checked={field.value?.includes(o)}
                            onCheckedChange={(checked) => {
                              const cur = field.value || [];
                              field.onChange(checked ? [...cur, o] : cur.filter((v: string) => v !== o));
                            }}
                            disabled={readonly}
                          />
                          <Label>{o}</Label>
                        </div>
                      ))}
                    </div>
                  );
                case "file":
                  return (
                    <FileUploadField
                      formId={template.formId}
                      fieldId={fieldDef.label}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={readonly}
                      accept={undefined}
                      label={undefined}
                      description={fieldDef.placeholder || "Max 10MB. Stored in Google Drive."}
                    />
                  );
                case "table":
                  return <TableInput field={field} fieldDef={fieldDef} readonly={readonly} />;
                default:
                  return <Input {...field} placeholder={fieldDef.placeholder} disabled={readonly} />;
              }
            })()}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  if (!fields.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Form has no fields</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{template.title}</CardTitle>
        {template.description && <p className="text-sm text-gray-600">{template.description}</p>}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {fields.map(renderField)}
            {!readonly && !isFormSubmitted && (
              <div className="flex justify-end space-x-3 pt-4">
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                )}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Form
                </Button>
              </div>
            )}
          </form>
        </Form>

        {/* Post-submit success state */}
        {isFormSubmitted && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                {(showWhatsApp || showEmail) ? 'Form submitted! Send notification:' : 'Form submitted successfully!'}
              </span>
            </div>
            {(showWhatsApp || showEmail) && (
              <div className="flex flex-wrap gap-3 mb-4">
                {showWhatsApp && (
                  <Button
                    type="button"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleWhatsAppSend}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send via WhatsApp
                  </Button>
                )}
                {showEmail && (
                  <Button
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleEmailSend}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send via Email
                  </Button>
                )}
              </div>
            )}
            {onCancel && (
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
