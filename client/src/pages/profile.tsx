import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Building2, User, Mail, Phone, MapPin, FileText, Briefcase, Users, Globe, Save, Edit3, X, Check } from "lucide-react";
import { z } from "zod";
import { GoogleDriveSettings } from "@/components/google-drive-settings";

// Types for organization data
interface OrganizationData {
  id?: string;
  name?: string;
  domain?: string;
  companyName?: string;
  address?: string;
  phone?: string;
  gstNumber?: string;
  industry?: string;
  customerType?: "B2B" | "B2C" | "B2G";
  businessType?: "Trading" | "Manufacturing" | "Wholesaler" | "Retailer" | "Service Provider";
  planType?: string;
  maxUsers?: number;
  isActive?: boolean;
}

interface EditedData {
  name?: string;
  companyName?: string;
  address?: string;
  phone?: string;
  gstNumber?: string;
  industry?: string;
  customerType?: "B2B" | "B2C" | "B2G";
  businessType?: "Trading" | "Manufacturing" | "Wholesaler" | "Retailer" | "Service Provider";
}

const organizationUpdateSchema = z.object({
  name: z.string().optional(),
  companyName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  gstNumber: z.string().optional(),
  industry: z.string().optional(),
  customerType: z.enum(["B2B", "B2C", "B2G"]).optional(),
  businessType: z.enum(["Trading", "Manufacturing", "Wholesaler", "Retailer", "Service Provider"]).optional(),
});

export default function Profile() {
  const { user, dbUser, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<EditedData>({});

  // Fetch current organization details
  const { data: organization, isLoading: orgLoading } = useQuery<OrganizationData>({
    queryKey: ["/api/organizations/current"],
    enabled: !!dbUser?.organizationId,
  });

  // Update organization mutation
  const updateOrgMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", "/api/organizations/current", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organization details updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      setIsEditing(false);
      setEditedData({});
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update organization details",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    try {
      const validatedData = organizationUpdateSchema.parse(editedData);
      updateOrgMutation.mutate(validatedData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Please check all fields",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({});
  };

  const handleInputChange = (field: keyof EditedData, value: string) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const industries = [
    "Technology", "Healthcare", "Finance", "Education", "Retail", "Manufacturing",
    "Agriculture", "Real Estate", "Transportation", "Entertainment", "Food & Beverage",
    "Textile", "Pharmaceutical", "Automotive", "Energy", "Construction", "Other"
  ];

  return (
    <AppLayout title="Profile" description="Your account and organization information">
      <div className="max-w-6xl mx-auto space-y-6">
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Personal Info
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Organization
            </TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600">Display Name</Label>
                    <div className="p-3 bg-gray-50 rounded-md border">
                      {user?.displayName ?? "—"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600">Email</Label>
                    <div className="p-3 bg-gray-50 rounded-md border flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      {user?.email ?? dbUser?.email ?? "—"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600">Role</Label>
                    <div className="p-3 bg-gray-50 rounded-md border">
                      <Badge variant="secondary" className="capitalize">
                        {dbUser?.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600">User ID</Label>
                    <div className="p-3 bg-gray-50 rounded-md border font-mono text-sm">
                      {dbUser?.id}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="pt-2">
                  <Button variant="outline" onClick={() => logout()}>
                    Log out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <div className="space-y-6">
              <GoogleDriveSettings />
              
              {/* Placeholder for future integrations */}
              <Card className="opacity-60">
                <CardHeader>
                  <CardTitle className="text-gray-500">More Integrations Coming Soon</CardTitle>
                  <CardDescription>
                    We're working on adding more integration options like Dropbox, OneDrive, and more.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          {/* Organization Details Tab */}
          <TabsContent value="organization">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Organization Details
                </CardTitle>
                {dbUser?.role === "admin" && (
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button 
                          size="sm" 
                          onClick={handleSave}
                          disabled={updateOrgMutation.isPending}
                          className="flex items-center gap-1"
                        >
                          <Check className="w-4 h-4" />
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleCancel}
                          className="flex items-center gap-1"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {orgLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded-md"></div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Basic Organization Info */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Basic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Organization Name</Label>
                          {isEditing ? (
                            <Input
                              value={editedData.name || organization?.name || ""}
                              onChange={(e) => handleInputChange("name", e.target.value)}
                              placeholder="Enter organization name"
                            />
                          ) : (
                            <div className="p-3 bg-gray-50 rounded-md border">
                              {organization?.name || "—"}
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Company Name</Label>
                          {isEditing ? (
                            <Input
                              value={editedData.companyName || organization?.companyName || ""}
                              onChange={(e) => handleInputChange("companyName", e.target.value)}
                              placeholder="Enter company name"
                            />
                          ) : (
                            <div className="p-3 bg-gray-50 rounded-md border">
                              {organization?.companyName || "—"}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Email Domain</Label>
                          <div className="p-3 bg-gray-50 rounded-md border flex items-center gap-2">
                            <Globe className="w-4 h-4 text-gray-500" />
                            {organization?.domain || "—"}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Phone</Label>
                          {isEditing ? (
                            <Input
                              value={editedData.phone || organization?.phone || ""}
                              onChange={(e) => handleInputChange("phone", e.target.value)}
                              placeholder="Enter phone number"
                              type="tel"
                            />
                          ) : (
                            <div className="p-3 bg-gray-50 rounded-md border flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-500" />
                              {organization?.phone || "—"}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Address</Label>
                        {isEditing ? (
                          <Textarea
                            value={editedData.address || organization?.address || ""}
                            onChange={(e) => handleInputChange("address", e.target.value)}
                            placeholder="Enter complete address"
                            rows={3}
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-md border flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                            <span>{organization?.address || "—"}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Business Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Business Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>GST Number</Label>
                          {isEditing ? (
                            <Input
                              value={editedData.gstNumber || organization?.gstNumber || ""}
                              onChange={(e) => handleInputChange("gstNumber", e.target.value)}
                              placeholder="Enter GST number"
                            />
                          ) : (
                            <div className="p-3 bg-gray-50 rounded-md border flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-500" />
                              {organization?.gstNumber || "—"}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Industry</Label>
                          {isEditing ? (
                            <Select 
                              value={editedData.industry || organization?.industry || ""} 
                              onValueChange={(value) => handleInputChange("industry", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select industry" />
                              </SelectTrigger>
                              <SelectContent>
                                {industries.map((industry) => (
                                  <SelectItem key={industry} value={industry}>
                                    {industry}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="p-3 bg-gray-50 rounded-md border flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-gray-500" />
                              {organization?.industry || "—"}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Customer Type</Label>
                          {isEditing ? (
                            <Select 
                              value={editedData.customerType || organization?.customerType || ""} 
                              onValueChange={(value) => handleInputChange("customerType", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select customer type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="B2B">B2B (Business to Business)</SelectItem>
                                <SelectItem value="B2C">B2C (Business to Consumer)</SelectItem>
                                <SelectItem value="B2G">B2G (Business to Government)</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="p-3 bg-gray-50 rounded-md border flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-500" />
                              {organization?.customerType ? (
                                <Badge variant="outline">
                                  {organization.customerType}
                                </Badge>
                              ) : "—"}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Business Type</Label>
                          {isEditing ? (
                            <Select 
                              value={editedData.businessType || organization?.businessType || ""} 
                              onValueChange={(value) => handleInputChange("businessType", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select business type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Trading">Trading</SelectItem>
                                <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                                <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                                <SelectItem value="Retailer">Retailer</SelectItem>
                                <SelectItem value="Service Provider">Service Provider</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="p-3 bg-gray-50 rounded-md border flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-500" />
                              {organization?.businessType ? (
                                <Badge variant="outline">
                                  {organization.businessType}
                                </Badge>
                              ) : "—"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Subscription Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Subscription Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label>Plan Type</Label>
                          <div className="p-3 bg-gray-50 rounded-md border">
                            <Badge variant="secondary" className="capitalize">
                              {organization?.planType || "Free"}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Max Users</Label>
                          <div className="p-3 bg-gray-50 rounded-md border">
                            {organization?.maxUsers || "50"}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Status</Label>
                          <div className="p-3 bg-gray-50 rounded-md border">
                            <Badge variant={organization?.isActive ? "default" : "destructive"}>
                              {organization?.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {dbUser?.role !== "admin" && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-800">
                          Only administrators can edit organization details. Contact your admin to make changes.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
