// import { useQuery, useMutation } from "@tanstack/react-query";
// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { Users, Settings, Activity, Shield, Smartphone, Clock, Eye, UserCheck, UserX, Edit2 } from "lucide-react";
// import { queryClient, apiRequest } from "@/lib/queryClient";
// import { useToast } from "@/hooks/use-toast";
// import { format } from "date-fns";
// import type { User, UserLoginLog, UserDevice, PasswordChangeHistory } from "@shared/schema";

// export default function UserManagement() {
//   const [selectedUser, setSelectedUser] = useState<User | null>(null);
//   const [editDialogOpen, setEditDialogOpen] = useState(false);
//   const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
//   const [editFormData, setEditFormData] = useState<Partial<User>>({});
//   const [newUserData, setNewUserData] = useState<Partial<User>>({});
//   const { toast } = useToast();

//   // Fetch users
//   const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
//     queryKey: ["/api/users"],
//   });

//   // Fetch login logs
//   const { data: loginLogs = [], isLoading: logsLoading } = useQuery<UserLoginLog[]>({
//     queryKey: ["/api/login-logs"],
//   });

//   // Fetch devices
//   const { data: devices = [], isLoading: devicesLoading } = useQuery<UserDevice[]>({
//     queryKey: ["/api/devices"],
//   });

//   // Update user mutation
//   const updateUserMutation = useMutation({
//     mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
//       const response = await apiRequest("PUT", `/api/users/${id}`, data);
//       return await response.json();
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["/api/users"] });
//       toast({
//         title: "Success",
//         description: "User updated successfully",
//       });
//       setEditDialogOpen(false);
//     },
//     onError: (error) => {
//       toast({
//         title: "Error",
//         description: error.message,
//         variant: "destructive",
//       });
//     },
//   });

//   // Create user mutation
//   const createUserMutation = useMutation({
//     mutationFn: async (data: Partial<User>) => {
//       const response = await apiRequest("POST", "/api/users", data);
//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.message || "Failed to create user");
//       }
//       return await response.json();
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["/api/users"] });
//       toast({
//         title: "Success",
//         description: "User created successfully",
//       });
//       setAddUserDialogOpen(false);
//       setNewUserData({});
//     },
//     onError: (error: any) => {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to create user",
//         variant: "destructive",
//       });
//     },
//   });

//   // Change user status mutation
//   const changeStatusMutation = useMutation({
//     mutationFn: async ({ id, status }: { id: string; status: string }) => {
//       const response = await apiRequest("PUT", `/api/users/${id}/status`, { status });
//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.message || "Failed to update user status");
//       }
//       return await response.json();
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["/api/users"] });
//       toast({
//         title: "Success",
//         description: "User status updated successfully",
//       });
//     },
//     onError: (error: any) => {
//       toast({
//         title: "Error",
//         description: error.message,
//         variant: "destructive",
//       });
//     },
//   });

//   const handleEditUser = (user: User) => {
//     setSelectedUser(user);
//     setEditFormData({
//       firstName: user.firstName,
//       lastName: user.lastName,
//       email: user.email,
//       username: user.username,
//       phoneNumber: user.phoneNumber,
//       department: user.department,
//       designation: user.designation,
//       employeeId: user.employeeId,
//       address: user.address,
//       emergencyContact: user.emergencyContact,
//       emergencyContactPhone: user.emergencyContactPhone,
//       role: user.role,
//     });
//     setEditDialogOpen(true);
//   };

//   const handleUpdateUser = () => {
//     if (!selectedUser) return;
//     updateUserMutation.mutate({
//       id: selectedUser.id,
//       data: editFormData,
//     });
//   };

//   const handleStatusChange = (userId: string, newStatus: string) => {
//     // Find the user to check their role
//     const targetUser = users.find(u => u.id === userId);
    
//     // Prevent suspending admin users
//     if (targetUser?.role === 'admin' && newStatus === 'suspended') {
//       toast({
//         title: "Action Not Allowed",
//         description: "Cannot suspend admin users. Every organization must have at least one active admin.",
//         variant: "destructive",
//       });
//       return;
//     }
    
//     changeStatusMutation.mutate({ id: userId, status: newStatus });
//   };

//   const handleCreateUser = () => {
//     createUserMutation.mutate(newUserData);
//   };

//   const handleAddUserClick = () => {
//     setNewUserData({
//       firstName: "",
//       lastName: "",
//       email: "",
//       username: "",
//       phoneNumber: "",
//       department: "",
//       designation: "",
//       employeeId: "",
//       address: "",
//       emergencyContact: "",
//       emergencyContactPhone: "",
//       role: "user",
//       status: "active",
//     });
//     setAddUserDialogOpen(true);
//   };

//   const getStatusBadgeVariant = (status: string) => {
//     switch (status) {
//       case "active": return "default";
//       case "inactive": return "secondary";
//       case "suspended": return "destructive";
//       default: return "secondary";
//     }
//   };

//   const getRoleBadgeVariant = (role: string) => {
//     return role === "admin" ? "destructive" : "default";
//   };

//   return (
//     <div className="space-y-6">
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-3xl font-bold">User Management</h1>
//           <p className="text-muted-foreground">
//             Manage user accounts, permissions, and security settings
//           </p>
//         </div>
//       </div>

//       <Tabs defaultValue="users" className="space-y-6">
//         <TabsList>
//           <TabsTrigger value="users" className="flex items-center gap-2">
//             <Users className="w-4 h-4" />
//             Users
//           </TabsTrigger>
//           <TabsTrigger value="logs" className="flex items-center gap-2">
//             <Activity className="w-4 h-4" />
//             Login Logs
//           </TabsTrigger>
//           <TabsTrigger value="devices" className="flex items-center gap-2">
//             <Smartphone className="w-4 h-4" />
//             Devices
//           </TabsTrigger>
//         </TabsList>

//         <TabsContent value="users" className="space-y-6">
//           <Card>
//             <CardHeader>
//               <div className="flex items-center justify-between">
//                 <div>
//                   <CardTitle className="flex items-center gap-2">
//                     <Users className="w-5 h-5" />
//                     User Accounts
//                   </CardTitle>
//                   <CardDescription>
//                     Manage user profiles, roles, and account status
//                   </CardDescription>
//                 </div>
//                 <Button onClick={handleAddUserClick} className="flex items-center gap-2">
//                   <Users className="w-4 h-4" />
//                   Add User
//                 </Button>
//               </div>
//             </CardHeader>
//             <CardContent>
//               {usersLoading ? (
//                 <div className="text-center py-8">Loading users...</div>
//               ) : (
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>Name</TableHead>
//                       <TableHead>Email</TableHead>
//                       <TableHead>Username</TableHead>
//                       <TableHead>Department</TableHead>
//                       <TableHead>Role</TableHead>
//                       <TableHead>Status</TableHead>
//                       <TableHead>Last Login</TableHead>
//                       <TableHead>Actions</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {users.map((user) => (
//                       <TableRow key={user.id}>
//                         <TableCell>
//                           <div className="flex items-center gap-3">
//                             {user.profileImageUrl && (
//                               <img
//                                 src={user.profileImageUrl}
//                                 alt={`${user.firstName} ${user.lastName}`}
//                                 className="w-8 h-8 rounded-full object-cover"
//                               />
//                             )}
//                             <div>
//                               <div className="font-medium">
//                                 {user.firstName} {user.lastName}
//                               </div>
//                               {user.employeeId && (
//                                 <div className="text-sm text-muted-foreground">
//                                   ID: {user.employeeId}
//                                 </div>
//                               )}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell>{user.email}</TableCell>
//                         <TableCell>{user.username || '-'}</TableCell>
//                         <TableCell>{user.department || '-'}</TableCell>
//                         <TableCell>
//                           <Badge variant={getRoleBadgeVariant(user.role || 'user')}>
//                             {user.role || 'user'}
//                           </Badge>
//                         </TableCell>
//                         <TableCell>
//                           <Select
//                             value={user.status || 'active'}
//                             onValueChange={(value) => handleStatusChange(user.id, value)}
//                           >
//                             <SelectTrigger className="w-32">
//                               <SelectValue>
//                                 <Badge variant={getStatusBadgeVariant(user.status || 'active')}>
//                                   {user.status || 'active'}
//                                 </Badge>
//                               </SelectValue>
//                             </SelectTrigger>
//                             <SelectContent>
//                               <SelectItem value="active">Active</SelectItem>
//                               <SelectItem value="inactive">Inactive</SelectItem>
//                               {user.role !== 'admin' && (
//                                 <SelectItem value="suspended">Suspended</SelectItem>
//                               )}
//                             </SelectContent>
//                           </Select>
//                         </TableCell>
//                         <TableCell>
//                           {user.lastLoginAt
//                             ? format(new Date(user.lastLoginAt), "MMM dd, yyyy HH:mm")
//                             : "Never"
//                           }
//                         </TableCell>
//                         <TableCell>
//                           <Button
//                             size="sm"
//                             variant="outline"
//                             onClick={() => handleEditUser(user)}
//                           >
//                             <Edit2 className="w-4 h-4" />
//                           </Button>
//                         </TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="logs" className="space-y-6">
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Activity className="w-5 h-5" />
//                 Login Activity
//               </CardTitle>
//               <CardDescription>
//                 Monitor user login activity and security events
//               </CardDescription>
//             </CardHeader>
//             <CardContent>
//               {logsLoading ? (
//                 <div className="text-center py-8">Loading login logs...</div>
//               ) : (
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>User</TableHead>
//                       <TableHead>Device</TableHead>
//                       <TableHead>IP Address</TableHead>
//                       <TableHead>Location</TableHead>
//                       <TableHead>Status</TableHead>
//                       <TableHead>Login Time</TableHead>
//                       <TableHead>Session Duration</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {loginLogs.map((log) => (
//                       <TableRow key={log.id}>
//                         <TableCell>{log.userId}</TableCell>
//                         <TableCell>
//                           <div>
//                             <div className="font-medium">{log.deviceName || 'Unknown Device'}</div>
//                             <div className="text-sm text-muted-foreground">
//                               {log.operatingSystem} • {log.browserName}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell>{log.ipAddress}</TableCell>
//                         <TableCell>
//                           {log.location 
//                             ? `${(log.location as any).city}, ${(log.location as any).country}`
//                             : '-'
//                           }
//                         </TableCell>
//                         <TableCell>
//                           <Badge variant={log.loginStatus === 'success' ? 'default' : 'destructive'}>
//                             {log.loginStatus}
//                           </Badge>
//                         </TableCell>
//                         <TableCell>
//                           {log.loginTime && format(new Date(log.loginTime), "MMM dd, yyyy HH:mm:ss")}
//                         </TableCell>
//                         <TableCell>
//                           {log.sessionDuration 
//                             ? `${Math.floor(log.sessionDuration / 60)}h ${log.sessionDuration % 60}m`
//                             : 'Active'
//                           }
//                         </TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="devices" className="space-y-6">
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Smartphone className="w-5 h-5" />
//                 Device Management
//               </CardTitle>
//               <CardDescription>
//                 Monitor and manage user devices and trust settings
//               </CardDescription>
//             </CardHeader>
//             <CardContent>
//               {devicesLoading ? (
//                 <div className="text-center py-8">Loading devices...</div>
//               ) : (
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>Device</TableHead>
//                       <TableHead>Type</TableHead>
//                       <TableHead>Browser</TableHead>
//                       <TableHead>OS</TableHead>
//                       <TableHead>Trust Status</TableHead>
//                       <TableHead>First Seen</TableHead>
//                       <TableHead>Last Seen</TableHead>
//                       <TableHead>Status</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {devices.map((device) => (
//                       <TableRow key={device.id}>
//                         <TableCell>
//                           <div className="font-medium">{device.deviceName || 'Unknown Device'}</div>
//                           <div className="text-sm text-muted-foreground">{device.deviceId}</div>
//                         </TableCell>
//                         <TableCell>{device.deviceType}</TableCell>
//                         <TableCell>{device.browserName}</TableCell>
//                         <TableCell>{device.operatingSystem}</TableCell>
//                         <TableCell>
//                           <Badge variant={device.isTrusted ? 'default' : 'secondary'}>
//                             {device.isTrusted ? 'Trusted' : 'Untrusted'}
//                           </Badge>
//                         </TableCell>
//                         <TableCell>
//                           {device.firstSeenAt && format(new Date(device.firstSeenAt), "MMM dd, yyyy")}
//                         </TableCell>
//                         <TableCell>
//                           {device.lastSeenAt && format(new Date(device.lastSeenAt), "MMM dd, yyyy HH:mm")}
//                         </TableCell>
//                         <TableCell>
//                           <Badge variant={device.isActive ? 'default' : 'secondary'}>
//                             {device.isActive ? 'Active' : 'Inactive'}
//                           </Badge>
//                         </TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>

//       {/* Add User Dialog */}
//       <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
//         <DialogContent className="max-w-2xl">
//           <DialogHeader>
//             <DialogTitle>Add New User</DialogTitle>
//             <DialogDescription>
//               Create a new user account with profile information
//             </DialogDescription>
//           </DialogHeader>
//           <div className="grid grid-cols-2 gap-4 py-4">
//             <div className="space-y-2">
//               <Label htmlFor="newFirstName">First Name *</Label>
//               <Input
//                 id="newFirstName"
//                 value={newUserData.firstName || ''}
//                 onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
//                 required
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="newLastName">Last Name *</Label>
//               <Input
//                 id="newLastName"
//                 value={newUserData.lastName || ''}
//                 onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
//                 required
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="newEmail">Email *</Label>
//               <Input
//                 id="newEmail"
//                 type="email"
//                 value={newUserData.email || ''}
//                 onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
//                 required
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="newUsername">Username *</Label>
//               <Input
//                 id="newUsername"
//                 value={newUserData.username || ''}
//                 onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
//                 required
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="newPhoneNumber">Phone Number</Label>
//               <Input
//                 id="newPhoneNumber"
//                 value={newUserData.phoneNumber || ''}
//                 onChange={(e) => setNewUserData({ ...newUserData, phoneNumber: e.target.value })}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="newEmployeeId">Employee ID</Label>
//               <Input
//                 id="newEmployeeId"
//                 value={newUserData.employeeId || ''}
//                 onChange={(e) => setNewUserData({ ...newUserData, employeeId: e.target.value })}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="newDepartment">Department</Label>
//               <Input
//                 id="newDepartment"
//                 value={newUserData.department || ''}
//                 onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="newDesignation">Designation</Label>
//               <Input
//                 id="newDesignation"
//                 value={newUserData.designation || ''}
//                 onChange={(e) => setNewUserData({ ...newUserData, designation: e.target.value })}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="newRole">Role</Label>
//               <Select
//                 value={newUserData.role || 'user'}
//                 onValueChange={(value) => setNewUserData({ ...newUserData, role: value })}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select role" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="user">User</SelectItem>
//                   <SelectItem value="admin">Admin</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="newEmergencyContact">Emergency Contact</Label>
//               <Input
//                 id="newEmergencyContact"
//                 value={newUserData.emergencyContact || ''}
//                 onChange={(e) => setNewUserData({ ...newUserData, emergencyContact: e.target.value })}
//               />
//             </div>
//             <div className="col-span-2 space-y-2">
//               <Label htmlFor="newAddress">Address</Label>
//               <Input
//                 id="newAddress"
//                 value={newUserData.address || ''}
//                 onChange={(e) => setNewUserData({ ...newUserData, address: e.target.value })}
//               />
//             </div>
//           </div>
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setAddUserDialogOpen(false)}
//             >
//               Cancel
//             </Button>
//             <Button
//               onClick={handleCreateUser}
//               disabled={createUserMutation.isPending}
//             >
//               {createUserMutation.isPending ? "Creating..." : "Create User"}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Edit User Dialog */}
//       <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
//         <DialogContent className="max-w-2xl">
//           <DialogHeader>
//             <DialogTitle>Edit User Details</DialogTitle>
//             <DialogDescription>
//               Update user information and account settings
//             </DialogDescription>
//           </DialogHeader>
//           <div className="grid grid-cols-2 gap-4 py-4">
//             <div className="space-y-2">
//               <Label htmlFor="firstName">First Name</Label>
//               <Input
//                 id="firstName"
//                 value={editFormData.firstName || ''}
//                 onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="lastName">Last Name</Label>
//               <Input
//                 id="lastName"
//                 value={editFormData.lastName || ''}
//                 onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="email">Email</Label>
//               <Input
//                 id="email"
//                 type="email"
//                 value={editFormData.email || ''}
//                 onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="username">Username</Label>
//               <Input
//                 id="username"
//                 value={editFormData.username || ''}
//                 onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="phoneNumber">Phone Number</Label>
//               <Input
//                 id="phoneNumber"
//                 value={editFormData.phoneNumber || ''}
//                 onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="employeeId">Employee ID</Label>
//               <Input
//                 id="employeeId"
//                 value={editFormData.employeeId || ''}
//                 onChange={(e) => setEditFormData({ ...editFormData, employeeId: e.target.value })}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="department">Department</Label>
//               <Input
//                 id="department"
//                 value={editFormData.department || ''}
//                 onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="designation">Designation</Label>
//               <Input
//                 id="designation"
//                 value={editFormData.designation || ''}
//                 onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="role">Role</Label>
//               <Select
//                 value={editFormData.role || 'user'}
//                 onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select role" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="user">User</SelectItem>
//                   <SelectItem value="admin">Admin</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="emergencyContact">Emergency Contact</Label>
//               <Input
//                 id="emergencyContact"
//                 value={editFormData.emergencyContact || ''}
//                 onChange={(e) => setEditFormData({ ...editFormData, emergencyContact: e.target.value })}
//               />
//             </div>
//             <div className="col-span-2 space-y-2">
//               <Label htmlFor="address">Address</Label>
//               <Input
//                 id="address"
//                 value={editFormData.address || ''}
//                 onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
//               />
//             </div>
//           </div>
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setEditDialogOpen(false)}
//             >
//               Cancel
//             </Button>
//             <Button
//               onClick={handleUpdateUser}
//               disabled={updateUserMutation.isPending}
//             >
//               {updateUserMutation.isPending ? "Updating..." : "Update User"}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }

import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Settings, Activity, Shield, Smartphone, Clock, Eye, UserCheck, UserX, Edit2, Plus, Trash2, Mail, XCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { User, UserLoginLog, UserDevice, PasswordChangeHistory } from "@shared/schema";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { useAuth as useAuthContext } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function UserManagement() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [inviteUserDialogOpen, setInviteUserDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<User>>({});
  const [newUserData, setNewUserData] = useState<Partial<User>>({});
  const [inviteData, setInviteData] = useState({ email: '', firstName: '', lastName: '', role: 'user' });
  const { toast } = useToast();
  const { user: authUser, loading, handleTokenExpired } = useAuthContext();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !authUser) {
      handleTokenExpired();
    }
  }, [authUser, loading, handleTokenExpired]);

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch login logs
  const { data: loginLogs = [], isLoading: logsLoading } = useQuery<UserLoginLog[]>({
    queryKey: ["/api/login-logs"],
  });

  // Fetch devices
  const { data: devices = [], isLoading: devicesLoading } = useQuery<UserDevice[]>({
    queryKey: ["/api/devices"],
  });

  // Fetch invitations
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ["/api/invitations"],
    queryFn: async () => {
      const response = await fetch("/api/invitations");
      if (!response.ok) throw new Error("Failed to fetch invitations");
      return response.json();
    },
  });

  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: async (data: typeof inviteData) => {
      const response = await apiRequest("POST", "/api/invitations", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create invitation");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      toast({
        title: "Invitation Sent! 📧",
        description: "The user will receive an email to accept the invitation.",
      });
      setInviteUserDialogOpen(false);
      setInviteData({ email: '', firstName: '', lastName: '', role: 'user' });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await apiRequest("DELETE", `/api/invitations/${invitationId}`);
      if (!response.ok) throw new Error("Failed to cancel invitation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      toast({
        title: "Invitation Cancelled",
        description: "The invitation has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel invitation",
        variant: "destructive",
      });
    },
  });

  // Resend invitation mutation
  const resendInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await apiRequest("POST", `/api/invitations/${invitationId}/resend`, {});
      if (!response.ok) throw new Error("Failed to resend invitation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      toast({
        title: "Invitation Resent! 📧",
        description: "The invitation email has been sent again.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resend invitation",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await apiRequest("POST", "/api/users", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create user");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setAddUserDialogOpen(false);
      setNewUserData({});
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Change user status mutation
  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PUT", `/api/users/${id}/status`, { status });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update user status");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/users/${userId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete user");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      phoneNumber: user.phoneNumber,
      department: user.department,
      designation: user.designation,
      employeeId: user.employeeId,
      address: user.address,
      emergencyContact: user.emergencyContact,
      emergencyContactPhone: user.emergencyContactPhone,
      role: user.role,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    updateUserMutation.mutate({
      id: selectedUser.id,
      data: editFormData,
    });
  };

  const handleStatusChange = (userId: string, newStatus: string) => {
    // Find the user to check their role
    const targetUser = users.find(u => u.id === userId);
    
    // Prevent suspending admin users
    if (targetUser?.role === 'admin' && newStatus === 'suspended') {
      toast({
        title: "Action Not Allowed",
        description: "Cannot suspend admin users. Every organization must have at least one active admin.",
        variant: "destructive",
      });
      return;
    }
    
    changeStatusMutation.mutate({ id: userId, status: newStatus });
  };

  const handleCreateUser = () => {
    createUserMutation.mutate(newUserData);
  };

  const handleInviteUser = () => {
    if (!inviteData.email) {
      toast({
        title: "Validation Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }
    createInvitationMutation.mutate(inviteData);
  };

  const handleCancelInvitation = (invitationId: string) => {
    if (window.confirm("Are you sure you want to cancel this invitation?")) {
      cancelInvitationMutation.mutate(invitationId);
    }
  };

  const handleResendInvitation = (invitationId: string) => {
    resendInvitationMutation.mutate(invitationId);
  };

  const handleAddUserClick = () => {
    setNewUserData({
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      phoneNumber: "",
      department: "",
      designation: "",
      employeeId: "",
      address: "",
      emergencyContact: "",
      emergencyContactPhone: "",
      role: "user",
      status: "active",
    });
    setAddUserDialogOpen(true);
  };

  const handleInviteUserClick = () => {
    setInviteData({ email: '', firstName: '', lastName: '', role: 'user' });
    setInviteUserDialogOpen(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "inactive": return "secondary";
      case "suspended": return "destructive";
      default: return "secondary";
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === "admin" ? "destructive" : "default";
  };

  // Loading state with proper layout
  if (loading) {
    return (
      <div className="flex h-screen bg-neutral">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Header title="User Management" description="Manage organization users, roles, and access control" />
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm border">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
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
          title="User Management" 
          description="Manage organization users, roles, and access control"
          actions={
            <div className="flex gap-2">
              <Button onClick={handleInviteUserClick} variant="default">
                <Mail className="w-4 h-4 mr-2" />
                Invite User
              </Button>
              <Button onClick={handleAddUserClick} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
          }
        />
        
        <div className="p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
          <div className="max-w-7xl mx-auto space-y-6">

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Invitations
            {invitations.filter((inv: any) => inv.status === 'pending').length > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                {invitations.filter((inv: any) => inv.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Login Logs
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Devices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    User Accounts
                  </CardTitle>
                  <CardDescription>
                    Manage user profiles, roles, and account status
                  </CardDescription>
                </div>
                <Button onClick={handleAddUserClick} className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {user.profileImageUrl && (
                              <img
                                src={user.profileImageUrl}
                                alt={`${user.firstName} ${user.lastName}`}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <div className="font-medium">
                                {user.firstName} {user.lastName}
                              </div>
                              {user.employeeId && (
                                <div className="text-sm text-muted-foreground">
                                  ID: {user.employeeId}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.username || '-'}</TableCell>
                        <TableCell>{user.department || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role || 'user')}>
                            {user.role || 'user'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.email === authUser?.email ? (
                            <Badge variant={getStatusBadgeVariant(user.status || 'active')}>
                              {user.status || 'active'}
                            </Badge>
                          ) : (
                            <Select
                              value={user.status || 'active'}
                              onValueChange={(value) => handleStatusChange(user.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue>
                                  <Badge variant={getStatusBadgeVariant(user.status || 'active')}>
                                    {user.status || 'active'}
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                {user.role !== 'admin' && (
                                  <SelectItem value="suspended">Suspended</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.lastLoginAt
                            ? format(new Date(user.lastLoginAt), "MMM dd, yyyy HH:mm")
                            : "Never"
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditUser(user)}
                              title="Edit user"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(user)}
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Pending Invitations
                  </CardTitle>
                  <CardDescription>
                    Manage user invitations and invitation status
                  </CardDescription>
                </div>
                <Button onClick={handleInviteUserClick} className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Invite User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invitationsLoading ? (
                <div className="text-center py-8">Loading invitations...</div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No invitations yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start by inviting users to join your organization
                  </p>
                  <Button onClick={handleInviteUserClick}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send First Invitation
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Expires At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation: any) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>
                          {invitation.firstName} {invitation.lastName}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(invitation.role)}>
                            {invitation.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              invitation.status === 'pending' ? 'default' :
                              invitation.status === 'accepted' ? 'default' :
                              invitation.status === 'rejected' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {invitation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(invitation.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invitation.expiresAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          {invitation.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResendInvitation(invitation.id)}
                                disabled={resendInvitationMutation.isPending}
                                title="Resend invitation"
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleCancelInvitation(invitation.id)}
                                disabled={cancelInvitationMutation.isPending}
                                title="Cancel invitation"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Login Activity
              </CardTitle>
              <CardDescription>
                Monitor user login activity and security events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-8">Loading login logs...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Login Time</TableHead>
                      <TableHead>Session Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{(log as any).userName || 'Unknown User'}</div>
                            <div className="text-sm text-muted-foreground">{(log as any).userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.deviceName || 'Unknown Device'}</div>
                            <div className="text-sm text-muted-foreground">
                              {log.operatingSystem} • {log.browserName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{log.ipAddress}</TableCell>
                        <TableCell>
                          {log.location 
                            ? `${(log.location as any).city}, ${(log.location as any).country}`
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.loginStatus === 'success' ? 'default' : 'destructive'}>
                            {log.loginStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.loginTime && format(new Date(log.loginTime), "MMM dd, yyyy HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          {log.sessionDuration 
                            ? `${Math.floor(log.sessionDuration / 60)}h ${log.sessionDuration % 60}m`
                            : 'Active'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Device Management
              </CardTitle>
              <CardDescription>
                Monitor and manage user devices and trust settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {devicesLoading ? (
                <div className="text-center py-8">Loading devices...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Browser</TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead>Trust Status</TableHead>
                      <TableHead>First Seen</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell>
                          <div className="font-medium">{device.deviceName || 'Unknown Device'}</div>
                          <div className="text-sm text-muted-foreground">{device.deviceId}</div>
                        </TableCell>
                        <TableCell>{device.deviceType}</TableCell>
                        <TableCell>{device.browserName}</TableCell>
                        <TableCell>{device.operatingSystem}</TableCell>
                        <TableCell>
                          <Badge variant={device.isTrusted ? 'default' : 'secondary'}>
                            {device.isTrusted ? 'Trusted' : 'Untrusted'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {device.firstSeenAt && format(new Date(device.firstSeenAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          {device.lastSeenAt && format(new Date(device.lastSeenAt), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={device.isActive ? 'default' : 'secondary'}>
                            {device.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with profile information
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newFirstName">First Name *</Label>
              <Input
                id="newFirstName"
                value={newUserData.firstName || ''}
                onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newLastName">Last Name *</Label>
              <Input
                id="newLastName"
                value={newUserData.lastName || ''}
                onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmail">Email *</Label>
              <Input
                id="newEmail"
                type="email"
                value={newUserData.email || ''}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newUsername">Username *</Label>
              <Input
                id="newUsername"
                value={newUserData.username || ''}
                onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPhoneNumber">Phone Number</Label>
              <Input
                id="newPhoneNumber"
                value={newUserData.phoneNumber || ''}
                onChange={(e) => setNewUserData({ ...newUserData, phoneNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmployeeId">Employee ID</Label>
              <Input
                id="newEmployeeId"
                value={newUserData.employeeId || ''}
                onChange={(e) => setNewUserData({ ...newUserData, employeeId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newDepartment">Department</Label>
              <Input
                id="newDepartment"
                value={newUserData.department || ''}
                onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newDesignation">Designation</Label>
              <Input
                id="newDesignation"
                value={newUserData.designation || ''}
                onChange={(e) => setNewUserData({ ...newUserData, designation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newRole">Role</Label>
              <Select
                value={newUserData.role || 'user'}
                onValueChange={(value) => setNewUserData({ ...newUserData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmergencyContact">Emergency Contact</Label>
              <Input
                id="newEmergencyContact"
                value={newUserData.emergencyContact || ''}
                onChange={(e) => setNewUserData({ ...newUserData, emergencyContact: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="newAddress">Address</Label>
              <Input
                id="newAddress"
                value={newUserData.address || ''}
                onChange={(e) => setNewUserData({ ...newUserData, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddUserDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={inviteUserDialogOpen} onOpenChange={setInviteUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Invite User
            </DialogTitle>
            <DialogDescription>
              Send an invitation email to a new user to join your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email Address *</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="user@example.com"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteFirstName">First Name (Optional)</Label>
              <Input
                id="inviteFirstName"
                placeholder="John"
                value={inviteData.firstName}
                onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteLastName">Last Name (Optional)</Label>
              <Input
                id="inviteLastName"
                placeholder="Doe"
                value={inviteData.lastName}
                onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteRole">Role</Label>
              <Select
                value={inviteData.role}
                onValueChange={(value) => setInviteData({ ...inviteData, role: value })}
              >
                <SelectTrigger id="inviteRole">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                📧 The user will receive an email with a secure link to accept the invitation. The invitation will expire in 7 days.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteUserDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteUser}
              disabled={createInvitationMutation.isPending}
            >
              {createInvitationMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
            <DialogDescription>
              Update user information and account settings
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={editFormData.firstName || ''}
                onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={editFormData.lastName || ''}
                onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editFormData.email || ''}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={editFormData.username || ''}
                onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={editFormData.phoneNumber || ''}
                onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                value={editFormData.employeeId || ''}
                onChange={(e) => setEditFormData({ ...editFormData, employeeId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={editFormData.department || ''}
                onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={editFormData.designation || ''}
                onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={editFormData.role || 'user'}
                onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              <Input
                id="emergencyContact"
                value={editFormData.emergencyContact || ''}
                onChange={(e) => setEditFormData({ ...editFormData, emergencyContact: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={editFormData.address || ''}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </div>
        </div>
      </main>
    </div>
  );
}