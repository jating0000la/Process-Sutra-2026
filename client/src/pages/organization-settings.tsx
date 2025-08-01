import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Building2, Users, Plus, Settings } from "lucide-react";

export default function OrganizationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orgForm, setOrgForm] = useState({
    name: "",
    domain: "",
    maxUsers: 50
  });
  const [userForm, setUserForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "user"
  });

  // Get current organization
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  // Get organization details
  const { data: organization } = useQuery<any>({
    queryKey: ["/api/organizations/current"],
  });

  // Get organization users
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/organizations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({ title: "Organization created successfully" });
      setOrgForm({ name: "", domain: "", maxUsers: 50 });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error creating organization", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({ title: "User added successfully" });
      setUserForm({ email: "", firstName: "", lastName: "", role: "user" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error adding user", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    createOrgMutation.mutate(orgForm);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.organizationId) {
      addUserMutation.mutate({
        ...userForm,
        organizationId: currentUser.organizationId,
        status: "active"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Organization Settings</h1>
      </div>

      {/* Current Organization Info */}
      {organization && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Current Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Organization Name</Label>
                <p className="text-lg">{organization.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Domain</Label>
                <p className="text-lg">{organization.domain}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Max Users</Label>
                <p className="text-lg">{organization.maxUsers}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Plan</Label>
                <Badge variant="outline">{organization.planType}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Organization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Organization
          </CardTitle>
          <CardDescription>
            Add a new organization domain for multi-tenant management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={orgForm.name}
                  onChange={(e) => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter organization name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="orgDomain">Email Domain</Label>
                <Input
                  id="orgDomain"
                  value={orgForm.domain}
                  onChange={(e) => setOrgForm(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="maxUsers">Max Users</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={orgForm.maxUsers}
                  onChange={(e) => setOrgForm(prev => ({ ...prev, maxUsers: parseInt(e.target.value) }))}
                  min="1"
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={createOrgMutation.isPending}>
              {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Add new users to your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add User Form */}
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="userEmail">Email Address</Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@yourcompany.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="userRole">Role</Label>
                <select
                  id="userRole"
                  value={userForm.role}
                  onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={userForm.firstName}
                  onChange={(e) => setUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="First name"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={userForm.lastName}
                  onChange={(e) => setUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
            </div>
            <Button type="submit" disabled={addUserMutation.isPending}>
              {addUserMutation.isPending ? "Adding..." : "Add User"}
            </Button>
          </form>

          {/* Current Users List */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Current Users</h3>
            <div className="space-y-2">
              {users.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                    <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                      {user.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}