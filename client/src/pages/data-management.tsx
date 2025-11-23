import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import {
  Download,
  Trash2,
  AlertTriangle,
  FileText,
  Database,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DataManagement() {
  const { dbUser } = useAuth();
  const { toast } = useToast();
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isAdmin = dbUser?.role === "admin";

  if (!isAdmin) {
    return (
      <AppLayout title="Data Management" description="Access Denied">
        <div className="text-center py-12">
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </AppLayout>
    );
  }

  const dataCategories = [
    {
      id: "flows",
      name: "Flow Data",
      description: "Export flow instances and execution history to CSV or delete permanently",
      icon: Database,
      color: "blue",
    },
    {
      id: "forms",
      name: "Form Submissions",
      description: "Export form responses as ZIP with multiple CSV files (one per form) or delete permanently",
      icon: FileText,
      color: "green",
    },
    {
      id: "tasks",
      name: "Task Data",
      description: "Export task records to CSV or delete all task history permanently",
      icon: CheckCircle,
      color: "purple",
    },
    {
      id: "files",
      name: "Uploaded Files",
      description: "Download all uploaded files and form submissions as ZIP archive or delete permanently",
      icon: FileText,
      color: "indigo",
    },
    {
      id: "users",
      name: "User Data",
      description: "Export user information to CSV (deletion requires individual user removal)",
      icon: Database,
      color: "orange",
      deleteDisabled: true,
    },
  ];

  const handleExport = async (categoryId: string, categoryName: string) => {
    setExportLoading(categoryId);
    try {
      // Determine file extension based on category
      const isZipCategory = categoryId === 'files' || categoryId === 'forms';
      const fileExtension = isZipCategory ? 'zip' : 'csv';
      const format = isZipCategory ? '' : '?format=csv';
      
      // Fetch data
      const response = await fetch(`/api/export/${categoryId}${format}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${categoryId}_export_${new Date().toISOString().split("T")[0]}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: `${categoryName} has been exported successfully.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(null);
    }
  };

  const handleDeleteConfirm = async (categoryId: string, categoryName: string) => {
    if (deleteInput !== "DELETE") {
      toast({
        title: "Invalid Confirmation",
        description: 'Please type "DELETE" to confirm.',
        variant: "destructive",
      });
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/delete/${categoryId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      toast({
        title: "Delete Successful",
        description: `${categoryName} has been permanently deleted.`,
      });
      
      setDeleteConfirm(null);
      setDeleteInput("");
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "An error occurred while deleting data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <AppLayout
      title="Data Management"
      description="Export or delete your organization's data"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Warning Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-yellow-900 mb-1">
                Important Notice
              </h3>
              <p className="text-sm text-yellow-800">
                Data deletion is permanent and cannot be undone. Please ensure you
                have exported and backed up any data you wish to keep before
                proceeding with deletion.
              </p>
            </div>
          </div>
        </div>

        {/* Data Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dataCategories.map((category) => {
            const IconComponent = category.icon;
            const isExporting = exportLoading === category.id;
            const showDeleteConfirm = deleteConfirm === category.id;

            return (
              <div
                key={category.id}
                className="bg-white border border-gray-200 rounded-lg p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`bg-${category.color}-50 p-3 rounded-lg flex-shrink-0`}
                    >
                      <IconComponent
                        className={`h-6 w-6 text-${category.color}-600`}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {category.description}
                      </p>
                    </div>
                  </div>
                </div>

                {!showDeleteConfirm ? (
                  <div className="flex items-center space-x-3 mt-4">
                    <button
                      onClick={() => handleExport(category.id, category.name)}
                      disabled={isExporting}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Export Data
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setDeleteConfirm(category.id)}
                      disabled={category.deleteDisabled}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Data
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start mb-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-900 mb-1">
                          Confirm Deletion
                        </p>
                        <p className="text-xs text-red-800 mb-3">
                          This action cannot be undone. Type{" "}
                          <span className="font-mono font-bold">DELETE</span> to
                          confirm.
                        </p>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder="Type DELETE"
                      className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-3"
                    />

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          handleDeleteConfirm(category.id, category.name)
                        }
                        disabled={deleteLoading || deleteInput !== "DELETE"}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {deleteLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Confirm Delete
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setDeleteConfirm(null);
                          setDeleteInput("");
                        }}
                        disabled={deleteLoading}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {category.deleteDisabled && (
                  <p className="text-xs text-gray-500 mt-2">
                    * User data can only be deleted by removing individual users from
                    User Management
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Information Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Data Management Information
          </h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-start">
              <CheckCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <span>
                Exported data is provided in CSV format for easy import into Excel,
                Google Sheets, or other tools
              </span>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <span>
                All export and delete operations are logged for audit purposes
              </span>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <span>
                Data deletion removes all associated records, including history and
                attachments
              </span>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <span>
                For data retention compliance, consider exporting data regularly
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
