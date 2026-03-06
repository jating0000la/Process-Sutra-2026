import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Table,
  Hash,
  MessageSquare,
  Mail,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────

interface QuickFormField {
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  tableColumns?: { label: string; type: string; options?: string[] }[];
}

interface QuickFormTemplate {
  _id: string;
  orgId: string;
  formId: string;
  title: string;
  description?: string;
  fields: QuickFormField[];
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
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const fieldTypes = [
  { value: "text", label: "Text Input", icon: Type },
  { value: "textarea", label: "Textarea", icon: AlignLeft },
  { value: "number", label: "Number", icon: Hash },
  { value: "select", label: "Dropdown", icon: List },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
  { value: "radio", label: "Radio Button", icon: Circle },
  { value: "date", label: "Date Picker", icon: Calendar },
  { value: "file", label: "File Upload", icon: Upload },
  { value: "table", label: "Table/Multiple Items", icon: Table },
];

// ─── Component ──────────────────────────────────────────────────────

export default function QuickFormBuilder() {
  const { toast } = useToast();
  const { user, loading, handleTokenExpired, dbUser } = useAuth();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<QuickFormTemplate | null>(null);

  // Form metadata
  const [formId, setFormId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Fields
  const [fields, setFields] = useState<QuickFormField[]>([]);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);

  // Table columns for selected table field
  const [tableColumns, setTableColumns] = useState<{ label: string; type: string; options?: string[] }[]>([]);

  // Communication config
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Refs for communication text fields (used for cursor-position tag insertion)
  const whatsappPhoneRef = useRef<HTMLInputElement>(null);
  const whatsappMessageRef = useRef<HTMLTextAreaElement>(null);
  const emailRecipientRef = useRef<HTMLInputElement>(null);
  const emailSubjectRef = useRef<HTMLInputElement>(null);
  const emailBodyRef = useRef<HTMLTextAreaElement>(null);

  /** Insert {{tag}} at cursor position in a ref'd input/textarea and update state */
  const insertTagAtCursor = useCallback(
    (
      ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
      currentValue: string,
      setter: (v: string) => void,
      tag: string
    ) => {
      const el = ref.current;
      const placeholder = `{{${tag}}}`;
      if (el) {
        const start = el.selectionStart ?? currentValue.length;
        const end = el.selectionEnd ?? currentValue.length;
        const newVal = currentValue.slice(0, start) + placeholder + currentValue.slice(end);
        setter(newVal);
        // Restore cursor after the inserted tag
        requestAnimationFrame(() => {
          const pos = start + placeholder.length;
          el.focus();
          el.setSelectionRange(pos, pos);
        });
      } else {
        setter(currentValue + placeholder);
      }
    },
    []
  );

  // Builder active tab: "fields" | "communication"
  const [builderTab, setBuilderTab] = useState<"fields" | "communication">("fields");

  // Auth guard
  useEffect(() => {
    if (!loading && !user) { handleTokenExpired(); return; }
    if (!loading && dbUser && dbUser.role !== "admin") { window.location.href = "/"; }
  }, [user, loading, handleTokenExpired, dbUser]);

  // ─── Queries & Mutations ────────────────────────────────────────

  const { data: templates, isLoading: templatesLoading } = useQuery<QuickFormTemplate[]>({
    queryKey: ["/api/quick-forms"],
    enabled: !!user,
    staleTime: 120_000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/quick-forms", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Form template created" });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-forms"] });
      closeBuilder();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to create", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/quick-forms/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Form template updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-forms"] });
      closeBuilder();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    },
  });

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async ({ id, force }: { id: string; force?: boolean }) => {
      const url = force ? `/api/quick-forms/${id}?deleteResponses=true` : `/api/quick-forms/${id}`;
      const res = await apiRequest("DELETE", url);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: data?.message || "Deleted" });
      setPendingDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/quick-forms"] });
    },
    onError: async (error: any) => {
      let errorData: any = {};
      try {
        // throwIfResNotOk throws Error with message like "400: {json...}"
        // Extract the JSON body from the error message
        const msg = error?.message || "";
        const jsonStart = msg.indexOf("{");
        if (jsonStart !== -1) {
          errorData = JSON.parse(msg.slice(jsonStart));
        } else {
          errorData = { message: msg };
        }
      } catch {
        errorData = { message: error?.message || "Delete failed" };
      }

      if (errorData.responseCount > 0 && pendingDeleteId) {
        const confirmed = window.confirm(
          `This form has ${errorData.responseCount} response(s).\n\nDelete the form AND all responses?\nThis cannot be undone.`
        );
        if (confirmed) {
          deleteMutation.mutate({ id: pendingDeleteId, force: true });
        } else {
          setPendingDeleteId(null);
        }
      } else {
        setPendingDeleteId(null);
        toast({ title: "Error", description: errorData.message || "Delete failed", variant: "destructive" });
      }
    },
  });

  // ─── Builder Helpers ────────────────────────────────────────────

  const closeBuilder = () => {
    setIsBuilderOpen(false);
    setCurrentTemplate(null);
    setFields([]);
    setSelectedFieldIndex(null);
    setTableColumns([]);
    setFormId("");
    setTitle("");
    setDescription("");
    setWhatsappEnabled(false);
    setWhatsappPhone("");
    setWhatsappMessage("");
    setEmailEnabled(false);
    setEmailRecipient("");
    setEmailSubject("");
    setEmailBody("");
    setBuilderTab("fields");
  };

  const addField = (type: string) => {
    const newField: QuickFormField = {
      label: `New ${fieldTypes.find((t) => t.value === type)?.label || "Field"}`,
      type,
      required: false,
      placeholder: "",
      options: ["select", "radio", "checkbox"].includes(type) ? ["Option 1", "Option 2"] : undefined,
      tableColumns: type === "table" ? [] : undefined,
    };
    const newFields = [...fields, newField];
    setFields(newFields);
    setSelectedFieldIndex(newFields.length - 1);
    if (type === "table") setTableColumns([]);
  };

  const updateField = (index: number, updates: Partial<QuickFormField>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const deleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
    if (selectedFieldIndex === index) { setSelectedFieldIndex(null); setTableColumns([]); }
    else if (selectedFieldIndex !== null && selectedFieldIndex > index) setSelectedFieldIndex(selectedFieldIndex - 1);
  };

  const addTableColumn = () => {
    const nc = [...tableColumns, { label: `Column ${tableColumns.length + 1}`, type: "text" }];
    setTableColumns(nc);
    if (selectedFieldIndex !== null) updateField(selectedFieldIndex, { tableColumns: nc });
  };

  const updateTableColumn = (ci: number, key: string, value: any) => {
    const nc = tableColumns.map((c, i) => (i === ci ? { ...c, [key]: value } : c));
    setTableColumns(nc);
    if (selectedFieldIndex !== null) updateField(selectedFieldIndex, { tableColumns: nc });
  };

  const removeTableColumn = (ci: number) => {
    const nc = tableColumns.filter((_, i) => i !== ci);
    setTableColumns(nc);
    if (selectedFieldIndex !== null) updateField(selectedFieldIndex, { tableColumns: nc });
  };

  const saveForm = () => {
    if (!formId.trim() || !title.trim()) {
      toast({ title: "Validation", description: "Form ID and Title are required", variant: "destructive" });
      return;
    }
    if (fields.length === 0) {
      toast({ title: "Validation", description: "Add at least one field", variant: "destructive" });
      return;
    }
    // Check unique labels
    const labels = fields.map((f) => f.label.trim().toLowerCase());
    const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
    if (dupes.length > 0) {
      toast({ title: "Validation", description: `Duplicate field labels: ${Array.from(new Set(dupes)).join(", ")}`, variant: "destructive" });
      return;
    }

    // Sync table columns to current selected field before saving
    let finalFields = [...fields];
    if (selectedFieldIndex !== null && fields[selectedFieldIndex]?.type === "table") {
      finalFields = finalFields.map((f, i) => (i === selectedFieldIndex ? { ...f, tableColumns } : f));
    }

    const payload: any = { formId: formId.trim(), title: title.trim(), description: description.trim(), fields: finalFields };

    // Include communication config
    if (whatsappEnabled && whatsappPhone.trim() && whatsappMessage.trim()) {
      payload.whatsappConfig = { enabled: true, phoneNumber: whatsappPhone.trim(), messageTemplate: whatsappMessage.trim() };
    } else {
      payload.whatsappConfig = { enabled: false, phoneNumber: "", messageTemplate: "" };
    }
    if (emailEnabled && emailRecipient.trim() && emailSubject.trim() && emailBody.trim()) {
      payload.emailConfig = { enabled: true, recipientEmail: emailRecipient.trim(), subject: emailSubject.trim(), bodyTemplate: emailBody.trim() };
    } else {
      payload.emailConfig = { enabled: false, recipientEmail: "", subject: "", bodyTemplate: "" };
    }

    if (currentTemplate) {
      updateMutation.mutate({ id: currentTemplate._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (tpl: QuickFormTemplate) => {
    setCurrentTemplate(tpl);
    setFormId(tpl.formId);
    setTitle(tpl.title);
    setDescription(tpl.description || "");
    setFields(tpl.fields || []);
    setSelectedFieldIndex(null);
    setTableColumns([]);
    // Load communication config
    setWhatsappEnabled(tpl.whatsappConfig?.enabled || false);
    setWhatsappPhone(tpl.whatsappConfig?.phoneNumber || "");
    setWhatsappMessage(tpl.whatsappConfig?.messageTemplate || "");
    setEmailEnabled(tpl.emailConfig?.enabled || false);
    setEmailRecipient(tpl.emailConfig?.recipientEmail || "");
    setEmailSubject(tpl.emailConfig?.subject || "");
    setEmailBody(tpl.emailConfig?.bodyTemplate || "");
    setBuilderTab("fields");
    setIsBuilderOpen(true);
  };

  const handleDelete = (tpl: QuickFormTemplate) => {
    if (!window.confirm(`Delete form "${tpl.title}"?`)) return;
    setPendingDeleteId(tpl._id);
    deleteMutation.mutate({ id: tpl._id });
  };

  // ─── Field Preview ──────────────────────────────────────────────

  const renderFieldPreview = (field: QuickFormField) => {
    switch (field.type) {
      case "text": return <Input placeholder={field.placeholder || field.label} disabled className="mt-2" />;
      case "number": return <Input type="number" placeholder={field.placeholder || field.label} disabled className="mt-2" />;
      case "textarea": return <Textarea placeholder={field.placeholder || field.label} disabled className="mt-2" />;
      case "date": return <Input type="date" disabled className="mt-2" />;
      case "file": return <Input type="file" disabled className="mt-2" />;
      case "select":
        return (
          <Select disabled>
            <SelectTrigger className="mt-2"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{field.options?.filter(Boolean).map((o, i) => <SelectItem key={i} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        );
      case "radio":
        return (
          <div className="mt-2 space-y-1">
            {field.options?.map((o, i) => (
              <div key={i} className="flex items-center space-x-2"><input type="radio" disabled /><Label>{o}</Label></div>
            ))}
          </div>
        );
      case "checkbox":
        return (
          <div className="mt-2 space-y-1">
            {field.options?.map((o, i) => (
              <div key={i} className="flex items-center space-x-2"><Checkbox disabled /><Label>{o}</Label></div>
            ))}
          </div>
        );
      case "table":
        return (
          <div className="mt-2 border rounded-lg p-2 bg-gray-50">
            {field.tableColumns && field.tableColumns.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr>{field.tableColumns.map((c, i) => <th key={i} className="text-left p-1 border-b">{c.label}</th>)}</tr>
                </thead>
                <tbody>
                  <tr>{field.tableColumns.map((c, i) => <td key={i} className="p-1"><Input placeholder={c.label} disabled className="h-7" /></td>)}</tr>
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 text-xs">Configure table columns in properties</p>
            )}
          </div>
        );
      default: return <Input disabled className="mt-2" />;
    }
  };

  // ─── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen bg-neutral">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Header title="Quick Form Builder" description="Create fast MongoDB-powered forms" />
          <div className="p-6 animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border"><div className="h-4 bg-gray-200 rounded w-1/2 mb-2" /><div className="h-3 bg-gray-200 rounded w-3/4" /></div>
            ))}
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
          title="Quick Form Builder"
          description="Create fast MongoDB-powered forms — simple JSON responses"
          actions={
            <Button onClick={() => { closeBuilder(); setIsBuilderOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />New Form
            </Button>
          }
        />

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templatesLoading ? (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-4 bg-gray-200 rounded w-1/2 mb-2" /><div className="h-3 bg-gray-200 rounded w-3/4 mb-4" /><div className="h-8 bg-gray-200 rounded w-full" /></CardContent></Card>
              ))
            ) : !templates?.length ? (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-12 text-center">
                    <Edit className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No quick forms yet</h3>
                    <p className="text-gray-500 mb-4">Create your first form template to start collecting data directly in MongoDB.</p>
                    <Button onClick={() => { closeBuilder(); setIsBuilderOpen(true); }}>Create Form Template</Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              templates.map((tpl) => (
                <Card key={tpl._id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{tpl.title}</CardTitle>
                    {tpl.description && <p className="text-sm text-gray-600">{tpl.description}</p>}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 mb-4">
                      <p className="text-sm text-gray-500">Form ID: {tpl.formId}</p>
                      <p className="text-sm text-gray-500">{tpl.fields?.length || 0} field(s)</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(tpl)}>
                        <Edit className="w-4 h-4 mr-1" />Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(tpl)} disabled={deleteMutation.isPending}>
                        <Trash2 className="w-4 h-4 mr-1" />Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* ─── Builder Dialog ─────────────────────────────────────── */}
        <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{currentTemplate ? "Edit Form" : "Create Form"}</DialogTitle>
              {/* Tab bar */}
              <div className="flex space-x-1 mt-2 border-b">
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${builderTab === "fields" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                  onClick={() => setBuilderTab("fields")}
                >
                  Form Fields
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${builderTab === "communication" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                  onClick={() => setBuilderTab("communication")}
                >
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Communication
                </button>
              </div>
            </DialogHeader>

            {builderTab === "fields" ? (
            <div className="flex flex-1 min-h-0">
              {/* Left: field palette */}
              <div className="w-1/4 bg-gray-50 p-4 border-r overflow-y-auto">
                <h3 className="text-sm font-semibold mb-3">Form Elements</h3>
                <div className="space-y-2">
                  {fieldTypes.map((ft) => {
                    const Icon = ft.icon;
                    return (
                      <Button key={ft.value} variant="outline" className="w-full justify-start" onClick={() => addField(ft.value)}>
                        <Icon className="w-4 h-4 mr-2" />{ft.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Center: canvas */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="mb-4 space-y-3">
                  <div><Label>Form ID</Label><Input placeholder="e.g., qf001" value={formId} onChange={(e) => setFormId(e.target.value)} /></div>
                  <div><Label>Title</Label><Input placeholder="Form Title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                  <div><Label>Description</Label><Textarea placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                </div>

                <div className="space-y-4 min-h-96 border-2 border-dashed border-gray-300 rounded-lg p-4">
                  {fields.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Plus className="w-8 h-8 mx-auto mb-2" /><p>Add form elements from the left panel</p>
                    </div>
                  ) : (
                    fields.map((field, idx) => (
                      <div
                        key={idx}
                        className={`p-4 border rounded-lg bg-white cursor-pointer ${selectedFieldIndex === idx ? "border-primary" : "border-gray-200"}`}
                        onClick={() => {
                          setSelectedFieldIndex(idx);
                          if (field.type === "table" && field.tableColumns) setTableColumns(field.tableColumns);
                          else setTableColumns([]);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                            <Label className="font-medium">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            <span className="text-xs text-gray-400">({field.type})</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteField(idx); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {renderFieldPreview(field)}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right: properties panel */}
              <div className="w-1/4 bg-gray-50 p-4 border-l overflow-y-auto">
                <h3 className="text-sm font-semibold mb-3">Field Properties</h3>
                {selectedFieldIndex !== null && fields[selectedFieldIndex] ? (() => {
                  const sf = fields[selectedFieldIndex];
                  return (
                    <div className="space-y-4 text-sm">
                      <div>
                        <Label>Label (becomes JSON key)</Label>
                        <Input value={sf.label} onChange={(e) => updateField(selectedFieldIndex, { label: e.target.value })} />
                        <p className="text-xs text-gray-400 mt-1">This label is used as the response key</p>
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select value={sf.type} onValueChange={(v) => updateField(selectedFieldIndex, { type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {fieldTypes.map((ft) => <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Placeholder</Label>
                        <Input value={sf.placeholder || ""} onChange={(e) => updateField(selectedFieldIndex, { placeholder: e.target.value })} />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox checked={sf.required} onCheckedChange={(c) => updateField(selectedFieldIndex, { required: !!c })} />
                        <Label>Required field</Label>
                      </div>

                      {/* Options for select / radio / checkbox */}
                      {["select", "radio", "checkbox"].includes(sf.type) && (
                        <div>
                          <Label>Options</Label>
                          <div className="space-y-2">
                            {(sf.options || []).map((opt, oi) => (
                              <div key={oi} className="flex space-x-2">
                                <Input value={opt} onChange={(e) => {
                                  const no = [...(sf.options || [])]; no[oi] = e.target.value;
                                  updateField(selectedFieldIndex, { options: no });
                                }} />
                                <Button variant="outline" size="sm" onClick={() => {
                                  updateField(selectedFieldIndex, { options: sf.options?.filter((_, i) => i !== oi) });
                                }}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={() => {
                              updateField(selectedFieldIndex, { options: [...(sf.options || []), `Option ${(sf.options?.length || 0) + 1}`] });
                            }}>Add Option</Button>
                          </div>
                        </div>
                      )}

                      {/* Table columns */}
                      {sf.type === "table" && (
                        <div>
                          <Label>Table Columns</Label>
                          <div className="space-y-2">
                            {tableColumns.map((col, ci) => (
                              <div key={ci} className="space-y-2 p-2 border rounded">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-medium">Column {ci + 1}</Label>
                                  <Button variant="ghost" size="sm" onClick={() => removeTableColumn(ci)}><Trash2 className="w-3 h-3" /></Button>
                                </div>
                                <Input value={col.label} onChange={(e) => updateTableColumn(ci, "label", e.target.value)} placeholder="Column label" />
                                <Select value={col.type} onValueChange={(v) => updateTableColumn(ci, "type", v)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="select">Dropdown</SelectItem>
                                  </SelectContent>
                                </Select>
                                {col.type === "select" && (
                                  <div className="space-y-1">
                                    {(col.options || []).map((o, oi) => (
                                      <div key={oi} className="flex space-x-1">
                                        <Input value={o} className="h-7 text-sm" onChange={(e) => {
                                          const no = [...(col.options || [])]; no[oi] = e.target.value;
                                          updateTableColumn(ci, "options", no);
                                        }} />
                                        <Button variant="ghost" size="sm" onClick={() => {
                                          updateTableColumn(ci, "options", (col.options || []).filter((_, i) => i !== oi));
                                        }}><Trash2 className="w-3 h-3" /></Button>
                                      </div>
                                    ))}
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                                      updateTableColumn(ci, "options", [...(col.options || []), `Option ${(col.options?.length || 0) + 1}`]);
                                    }}><Plus className="w-3 h-3 mr-1" />Add Option</Button>
                                  </div>
                                )}
                              </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={addTableColumn}><Plus className="w-4 h-4 mr-1" />Add Column</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <p className="text-gray-500 text-sm">Select a field to edit its properties</p>
                )}
              </div>
            </div>
            ) : (
            /* ─── Communication Settings Tab ───────────────────────── */
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Field tag instructions */}
              {fields.length > 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="font-medium text-blue-800 mb-1">Click tags below each field to auto-insert placeholders</p>
                  <p className="text-blue-600 text-xs">Tags are based on your form fields. The value submitted by the user will replace the tag.</p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <p className="font-medium text-amber-800">Add form fields first</p>
                  <p className="text-amber-600 text-xs">Switch to "Form Fields" tab and add fields — they will appear as clickable tags here.</p>
                </div>
              )}

              {/* WhatsApp Configuration */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="whatsapp-enabled"
                    checked={whatsappEnabled}
                    onChange={(e) => setWhatsappEnabled(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="whatsapp-enabled" className="flex items-center text-sm font-semibold">
                    <MessageSquare className="w-4 h-4 mr-1 text-green-600" />
                    Enable WhatsApp Integration
                  </label>
                </div>
                {whatsappEnabled && (
                  <div className="ml-6 space-y-4 border-l-2 border-green-200 pl-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Phone Number</label>
                      <Input
                        ref={whatsappPhoneRef}
                        placeholder="e.g. 919876543210"
                        value={whatsappPhone}
                        onChange={(e) => setWhatsappPhone(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Country code + number, no + or spaces</p>
                      {fields.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {fields.map((f) => (
                            <button
                              key={f.label}
                              type="button"
                              onClick={() => insertTagAtCursor(whatsappPhoneRef, whatsappPhone, setWhatsappPhone, f.label)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 hover:bg-green-200 border border-green-300 transition cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />{f.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Message Template</label>
                      {fields.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {fields.map((f) => (
                            <button
                              key={f.label}
                              type="button"
                              onClick={() => insertTagAtCursor(whatsappMessageRef, whatsappMessage, setWhatsappMessage, f.label)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 hover:bg-green-200 border border-green-300 transition cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />{f.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <textarea
                        ref={whatsappMessageRef}
                        className="w-full border rounded-md p-2 text-sm min-h-[120px] resize-y"
                        placeholder={"Hello! A new form submission:\n\nName: ...\nEmail: ...\n\nThank you!"}
                        value={whatsappMessage}
                        onChange={(e) => setWhatsappMessage(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Email Configuration */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="email-enabled"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="email-enabled" className="flex items-center text-sm font-semibold">
                    <Mail className="w-4 h-4 mr-1 text-blue-600" />
                    Enable Email Integration
                  </label>
                </div>
                {emailEnabled && (
                  <div className="ml-6 space-y-4 border-l-2 border-blue-200 pl-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Recipient Email</label>
                      <Input
                        ref={emailRecipientRef}
                        placeholder="e.g. admin@example.com"
                        value={emailRecipient}
                        onChange={(e) => setEmailRecipient(e.target.value)}
                      />
                      {fields.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {fields.map((f) => (
                            <button
                              key={f.label}
                              type="button"
                              onClick={() => insertTagAtCursor(emailRecipientRef, emailRecipient, setEmailRecipient, f.label)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300 transition cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />{f.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Subject</label>
                      <Input
                        ref={emailSubjectRef}
                        placeholder={"e.g. New Form Submission"}
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                      />
                      {fields.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {fields.map((f) => (
                            <button
                              key={f.label}
                              type="button"
                              onClick={() => insertTagAtCursor(emailSubjectRef, emailSubject, setEmailSubject, f.label)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300 transition cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />{f.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Body Template</label>
                      {fields.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {fields.map((f) => (
                            <button
                              key={f.label}
                              type="button"
                              onClick={() => insertTagAtCursor(emailBodyRef, emailBody, setEmailBody, f.label)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300 transition cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />{f.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <textarea
                        ref={emailBodyRef}
                        className="w-full border rounded-md p-2 text-sm min-h-[120px] resize-y"
                        placeholder={"Hello,\n\nNew submission received:\n\nRegards"}
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t flex-shrink-0 bg-white sticky bottom-0">
              <Button variant="outline" onClick={() => setIsBuilderOpen(false)}>Cancel</Button>
              <Button onClick={saveForm} disabled={createMutation.isPending || updateMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />{currentTemplate ? "Update Form" : "Save Form"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
