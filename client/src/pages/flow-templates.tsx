import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Download,
  Globe,
  Loader2,
  Workflow,
  FileText,
  Users,
  Clock,
  ArrowRight,
  Trash2,
} from "lucide-react";

interface PublicFlowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  flowRules: {
    currentTask: string;
    status: string;
    nextTask: string;
    tat: number;
    tatType: string;
    doer: string;
    formId?: string;
    transferable?: boolean;
    mergeCondition?: string;
  }[];
  formTemplates: {
    formId: string;
    title: string;
    description?: string;
    fields: any[];
  }[];
  publishedByOrg: string | null;
  useCount: number | null;
  isActive: boolean | null;
  createdAt: string;
}

const CATEGORIES = ["all", "General", "Sales", "HR", "Operations", "Finance", "Customer Support", "IT", "Marketing", "Legal", "Manufacturing"];

export default function FlowTemplates() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<PublicFlowTemplate | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importName, setImportName] = useState("");

  const { data: templates = [], isLoading } = useQuery<PublicFlowTemplate[]>({
    queryKey: ["/api/public-flow-templates", searchQuery, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      const res = await fetch(`/api/public-flow-templates?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const importMutation = useMutation({
    mutationFn: async ({ id, systemName }: { id: string; systemName: string }) => {
      const res = await apiRequest("POST", `/api/public-flow-templates/${id}/import`, { systemName });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Template Imported!", description: `${data.rulesCreated} rules and ${data.formsImported} forms imported as "${data.systemName}"` });
      setImportDialogOpen(false);
      setSelectedTemplate(null);
      queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-forms"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to import template", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/public-flow-templates/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Template removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/public-flow-templates"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove template", variant: "destructive" });
    },
  });

  const isAdmin = user?.role === "admin";

  const getUniqueRoles = (rules: PublicFlowTemplate["flowRules"]) => {
    return Array.from(new Set(rules.map(r => r.doer)));
  };

  const getTaskCount = (rules: PublicFlowTemplate["flowRules"]) => {
    const allTasks = rules.map(r => r.nextTask).concat(rules.filter(r => r.currentTask).map(r => r.currentTask));
    return new Set(allTasks).size;
  };

  return (
    <AppLayout
      title="Flow Templates"
      description="Browse and import public workflow templates"
    >
      <div className="space-y-6">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-10 h-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48 h-10">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>{c === "all" ? "All Categories" : c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20">
            <Globe className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Templates Found</h3>
            <p className="text-sm text-gray-500">
              {searchQuery || selectedCategory !== "all"
                ? "Try adjusting your search or filters"
                : "No public templates have been published yet. Publish your first flow from the Flow Builder!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="hover:shadow-md transition-shadow cursor-pointer border-gray-200"
                onClick={() => setSelectedTemplate(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{template.name}</CardTitle>
                      {template.publishedByOrg && (
                        <p className="text-xs text-gray-500 mt-1">by {template.publishedByOrg}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-2 text-[10px] shrink-0">
                      {template.category || "General"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Workflow className="w-3.5 h-3.5" /> {getTaskCount(template.flowRules)} tasks
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {getUniqueRoles(template.flowRules).length} roles
                    </span>
                    {template.formTemplates.length > 0 && (
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> {template.formTemplates.length} forms
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" /> {template.useCount || 0}
                    </span>
                  </div>
                  {(template.tags as string[])?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(template.tags as string[]).slice(0, 4).map(tag => (
                        <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Template Detail Dialog */}
      <Dialog open={!!selectedTemplate && !importDialogOpen} onOpenChange={(open) => { if (!open) setSelectedTemplate(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-blue-600" />
                  {selectedTemplate.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {selectedTemplate.description && (
                  <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Badge>{selectedTemplate.category || "General"}</Badge>
                  {selectedTemplate.publishedByOrg && (
                    <Badge variant="outline">by {selectedTemplate.publishedByOrg}</Badge>
                  )}
                  <Badge variant="outline">{selectedTemplate.useCount || 0} imports</Badge>
                </div>

                {(selectedTemplate.tags as string[])?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(selectedTemplate.tags as string[]).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}

                {/* Flow Steps Preview */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <Workflow className="w-4 h-4" /> Flow Steps ({selectedTemplate.flowRules.length} rules)
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedTemplate.flowRules.map((rule, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg p-2">
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {rule.currentTask || "START"}
                        </Badge>
                        {rule.status && (
                          <span className="text-gray-400">({rule.status})</span>
                        )}
                        <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                        <Badge className="text-[10px] shrink-0">{rule.nextTask}</Badge>
                        <span className="text-gray-400 ml-auto flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {rule.tat} {rule.tatType === "hourtat" ? "hrs" : "days"}
                        </span>
                        <span className="text-gray-500">{rule.doer}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Forms Preview */}
                {selectedTemplate.formTemplates.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> Connected Forms ({selectedTemplate.formTemplates.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedTemplate.formTemplates.map((form, i) => (
                        <div key={i} className="text-xs bg-blue-50 rounded-lg p-2">
                          <span className="font-medium">{form.title}</span>
                          <span className="text-gray-500 ml-2">({form.fields.length} fields)</span>
                          {form.description && (
                            <p className="text-gray-500 mt-0.5">{form.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex gap-2">
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Remove this template from public listing?")) {
                        deleteMutation.mutate(selectedTemplate.id);
                        setSelectedTemplate(null);
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Unpublish
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setSelectedTemplate(null)}>Close</Button>
                {isAdmin && (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                    onClick={() => {
                      setImportName(selectedTemplate.name);
                      setImportDialogOpen(true);
                    }}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Import to My Org
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Confirmation Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              This will create a new flow in your organization with all the rules and connected forms from this template.
            </p>
            <div>
              <Label className="text-xs">Flow Name in Your Organization *</Label>
              <Input
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="e.g., My Custom Flow"
                className="h-9 mt-1"
                autoFocus
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• All flow rules will be created under this name</li>
                <li>• Connected forms will be copied to your organization</li>
                <li>• Tasks will be assigned to you (re-assign as needed)</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={!importName.trim() || importMutation.isPending}
              onClick={() => {
                if (selectedTemplate) {
                  importMutation.mutate({ id: selectedTemplate.id, systemName: importName.trim() });
                }
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
            >
              {importMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Importing...</>
              ) : (
                <><Download className="w-3.5 h-3.5 mr-1" /> Import</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
