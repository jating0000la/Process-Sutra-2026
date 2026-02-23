/**
 * Quick Form Fill Page
 *
 * Allows any authenticated user to fill and submit quick forms.
 * Admins can also submit. Response saved as simple JSON to MongoDB.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, FileText } from "lucide-react";
import QuickFormRenderer from "@/components/quick-form-renderer";

interface QuickFormTemplate {
  _id: string;
  formId: string;
  title: string;
  description?: string;
  fields: any[];
}

export default function QuickFormFill() {
  const { toast } = useToast();
  const { user, loading, handleTokenExpired } = useAuth();
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!loading && !user) handleTokenExpired();
  }, [user, loading, handleTokenExpired]);

  const { data: templates = [], isLoading: templatesLoading } = useQuery<QuickFormTemplate[]>({
    queryKey: ["/api/quick-forms"],
    enabled: !!user,
    staleTime: 120_000,
  });

  const selectedTemplate = templates.find((t) => t.formId === selectedFormId);

  const submitMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiRequest("POST", "/api/quick-forms/responses", {
        formId: selectedFormId,
        data,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Form submitted successfully!" });
      setSubmitted(true);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to submit form", variant: "destructive" });
    },
  });

  const handleSubmit = (data: Record<string, any>) => {
    submitMutation.mutate(data);
  };

  const handleNewSubmission = () => {
    setSubmitted(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-neutral">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Header title="Quick Forms" description="Fill and submit forms" />
          <div className="p-6 animate-pulse"><div className="h-20 bg-gray-200 rounded" /></div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header title="Quick Forms" description="Select a form, fill it out, and submit — data saved to MongoDB" />

        <div className="p-6 max-w-3xl mx-auto space-y-6">
          {/* Form Selector */}
          <Card>
            <CardContent className="p-4">
              <Label className="mb-2 block">Select Form</Label>
              <Select value={selectedFormId} onValueChange={(v) => { setSelectedFormId(v); setSubmitted(false); }}>
                <SelectTrigger><SelectValue placeholder="Choose a form to fill..." /></SelectTrigger>
                <SelectContent>
                  {templatesLoading ? (
                    <SelectItem value="__loading" disabled>Loading forms...</SelectItem>
                  ) : templates.length === 0 ? (
                    <SelectItem value="__none" disabled>No forms available</SelectItem>
                  ) : (
                    templates.map((t) => (
                      <SelectItem key={t._id} value={t.formId}>{t.title}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Success State */}
          {submitted && (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Form Submitted Successfully!</h3>
                <p className="text-gray-500 mb-4">Your response has been saved.</p>
                <div className="flex justify-center gap-3">
                  <button
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                    onClick={handleNewSubmission}
                  >Submit Another Response</button>
                  <button
                    className="px-4 py-2 border rounded-md hover:bg-gray-50"
                    onClick={() => { setSelectedFormId(""); setSubmitted(false); }}
                  >Choose Different Form</button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form Renderer */}
          {selectedTemplate && !submitted && (
            <QuickFormRenderer
              template={selectedTemplate}
              onSubmit={handleSubmit}
              isSubmitting={submitMutation.isPending}
              onCancel={() => setSelectedFormId("")}
            />
          )}

          {/* Empty state */}
          {!selectedFormId && !submitted && (
            <Card>
              <CardContent className="p-12 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Select a form above to get started</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
