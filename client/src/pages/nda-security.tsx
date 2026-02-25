import { useState, useEffect } from "react";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  FileText, 
  Lock, 
  Eye, 
  Download, 
  CheckCircle, 
  AlertTriangle,
  Key,
  Database,
  Server,
  Users,
  FileCheck,
  ShieldCheck,
  Clock,
  Activity,
  Globe,
  FileSignature,
  Scroll,
  Brain,
  HardDrive,
  Trash2,
  CloudOff
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";

export default function NDASecurityPage() {
  const { dbUser } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [organizationName, setOrganizationName] = useState<string>("");
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [organizationCreatedAt, setOrganizationCreatedAt] = useState<string>("");

  // Fetch organization details including creation date
  useEffect(() => {
    const fetchData = async () => {
      // Fetch organization
      if (dbUser?.organizationId) {
        try {
          const response = await fetch('/api/organizations/current');
          if (response.ok) {
            const org = await response.json();
            setOrganizationName(org.name || org.companyName || 'Not Specified');
            // Set organization creation date (when organization first logged in/was created)
            if (org.createdAt) {
              setOrganizationCreatedAt(new Date(org.createdAt).toLocaleDateString());
            } else {
              setOrganizationCreatedAt(new Date().toLocaleDateString());
            }
          } else {
            setOrganizationName('Not Found');
            setOrganizationCreatedAt(new Date().toLocaleDateString());
          }
        } catch (error) {
          console.error('Error fetching organization:', error);
          setOrganizationName('Error Loading');
          setOrganizationCreatedAt(new Date().toLocaleDateString());
        }
      } else {
        setOrganizationName('Not Assigned');
        setOrganizationCreatedAt(new Date().toLocaleDateString());
      }

      setLoadingOrg(false);
    };

    fetchData();
  }, [dbUser?.organizationId]);

  // Check if user is admin
  const isAdmin = dbUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <AppLayout title="Access Denied">
        <Card className="max-w-2xl mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              Admin Access Required
            </CardTitle>
            <CardDescription>
              This page is only accessible to administrators.
            </CardDescription>
          </CardHeader>
        </Card>
      </AppLayout>
    );
  }

  const handleDownloadNDA = () => {
    // Create NDA content
    const ndaContent = `
NON-DISCLOSURE AGREEMENT (NDA)

This Non-Disclosure Agreement ("Agreement") is made between:

1. Muxro Technologies, operating ProcessSutra ("Service Provider"),
and
2. ${organizationName} represented by ${dbUser?.firstName && dbUser?.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : dbUser?.email} ("Client").

Both are collectively referred to as the "Parties."

Effective Date: ${organizationCreatedAt || new Date().toLocaleDateString()}

================================================================================

1. PURPOSE

The Client may share certain information with the Service Provider while using ProcessSutra, such as:

• Workflow designs
• Forms and form responses
• Organization information (GST, PAN, address, business data)
• Employee data (name, email, phone, designation, etc.)
• Documents and files uploaded
• Any dynamic data provided voluntarily or optionally

This Agreement ensures that all such information remains confidential.

================================================================================

2. DEFINITION OF CONFIDENTIAL INFORMATION

"Confidential Information" includes, but is not limited to:

• Organization data
• Employee or personal data
• Business workflows, processes, or operational details
• Files/documents uploaded by the Client
• Any form data submitted by users
• Any information not publicly available and provided through ProcessSutra

Even if the Client provides only partial, optional, or dynamic data, it is still 
protected under this NDA.

================================================================================

3. OBLIGATIONS OF THE SERVICE PROVIDER

The Service Provider agrees to:

a. Maintain confidentiality
   Not disclose, share, sell, lease, or make available the Client's data to any third party.

b. Use data only for service functionality
   Data may only be used to operate features such as workflow execution, task creation, 
   or technical support.

c. Restrict access internally
   Only authorized personnel who require access for system operation or troubleshooting 
   may access the data—and they are bound by confidentiality.

d. Prevent unauthorized access
   Implement reasonable technical and administrative safeguards to protect all Client data.

e. Not use data for marketing or external purposes
   No data may be used for promotion, training, or external analysis without explicit 
   written consent from the Client.

================================================================================

4. AI & LLM DATA ACCESS POLICY

ProcessSutra integrates optional AI-powered features (e.g., "Voice of Business" 
reporting, AI assistant). The following rules apply:

a. Organization-Owned API Keys
   All AI API keys (Google Gemini, OpenAI) are provided and owned by the Client's 
   organization. ProcessSutra does NOT provide, share, or manage any AI API keys.

b. Data NEVER Shared with AI/LLM
   The following data is NEVER sent to any AI or LLM provider:
   • Flow rules and workflow definitions
   • Individual task records and task details
   • Form templates and form submission data
   • Employee/doer personal information (emails, names, phone numbers)
   • Uploaded files and documents
   • Customer or third-party personal data
   • Organization credentials, API keys, or secrets
   • Database records, IDs, or raw operational data

c. What AI Receives (Reporting Only)
   When the Client explicitly enables AI analysis in the Voice of Business report, 
   ONLY pre-computed, aggregated statistical summaries are shared:
   • Total task counts and completion percentages
   • Average cycle times and throughput rates
   • System-level aggregate performance (no individual records)
   • Anonymous team size counts (no emails or names)
   These are reporting parameters derived from data the Client fully owns.

d. Why Reporting Parameters Can Be Shared
   Since all form data, task data, and workflow data are the sole property of the 
   Client organization, the aggregated performance metrics derived from this data 
   also belong to the Client. The Client's own AI API key is used, meaning the data 
   flows from the Client's system through the Client's own AI account.

e. No AI Training
   No Client data is used to train, fine-tune, or improve any AI model. Both Google 
   and OpenAI confirm that API data is not used for model training.

================================================================================

5. FILE STORAGE & GOOGLE DRIVE POLICY

a. All files uploaded through ProcessSutra are stored directly in the Client's own 
   Google Drive account, inside a designated "ProcessSutra" folder.

b. ProcessSutra does NOT store, copy, cache, or retain any uploaded files on its 
   own servers.

c. The Service Provider has no access to files stored in the Client's Google Drive 
   unless explicitly granted by the Client.

d. File ownership, access control, and retention are fully governed by the Client's 
   Google Workspace policies.

e. If the Client revokes Google Drive access, ProcessSutra immediately loses the 
   ability to read or write any files.

================================================================================

6. EXCLUSIONS

Confidential Information does not include data that:

• Becomes publicly available through no fault of the Service Provider
• Is legally required to be disclosed (only after notifying the Client)
• The Client has already made publicly available

================================================================================

7. DATA OWNERSHIP

All data provided through ProcessSutra will always remain the sole property of the Client.
The Service Provider holds no ownership rights over this data.

This includes but is not limited to:
• Workflow rules and flow definitions
• Task records and completion history
• Form templates and all form submission responses
• Uploaded files (stored in Client's Google Drive)
• Organization settings and configurations
• Employee and team member data

Because the Client owns all data, the Client has full authority to decide whether to 
enable AI-powered features using their own API keys.

================================================================================

8. DATA DELETION & REMOVAL

ProcessSutra provides comprehensive self-service data deletion capabilities:

a. User-Initiated Deletion
   • Administrators can delete individual tasks, forms, and workflows from the platform
   • Users can remove their own data through the application interface

b. Organization-Wide Data Removal
   • Administrators can request complete deletion of all organization data
   • This includes: all tasks, flow rules, form templates, form responses, 
     employee records, organization settings, and AI API key configurations

c. Upon request, the Service Provider will:
   • Permanently delete all workflow and task data
   • Delete all forms and submitted form responses
   • Remove all user and employee information
   • Clear all organization configuration and settings
   • Remove all AI API keys stored for the organization
   • Provide a written confirmation of complete deletion

d. Files stored in the Client's Google Drive remain under the Client's control 
   and are not affected by ProcessSutra data deletion.

e. Data deletion is irreversible. The Service Provider is not responsible for 
   any data loss resulting from Client-initiated deletions.

================================================================================

9. DURATION

This Agreement:

• Begins from the date the Client uses ProcessSutra
• Remains in effect for as long as the Client uses the service
• Continues for 3 years after account deletion, unless otherwise requested in writing

================================================================================

10. REMEDIES

Unauthorized disclosure of Client data may result in:

• Legal action
• Compensation for damages
• Immediate termination of access to the system

================================================================================

11. GOVERNING LAW

This Agreement is governed by the laws of India.

================================================================================

12. ACCEPTANCE

By using ProcessSutra, the Client agrees to the terms of this NDA automatically.

================================================================================

CLIENT DETAILS:

Organization: ${organizationName}
Representative: ${dbUser?.firstName && dbUser?.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : dbUser?.email}
Email: ${dbUser?.email}
Role: ${dbUser?.role || 'Administrator'}
Agreement Date: ${organizationCreatedAt || new Date().toLocaleDateString()}

================================================================================

SERVICE PROVIDER:

Muxro Technologies
ProcessSutra – Workflow & Automation Platform
Date: ${organizationCreatedAt || new Date().toLocaleDateString()}

================================================================================

CONFIDENTIAL AND PROPRIETARY INFORMATION
© ${new Date().getFullYear()} Muxro Technologies. All Rights Reserved.

This NDA protects all Client data and ensures complete confidentiality.
For questions: security@muxrotechnologies.com
`;

    // Create blob and download
    const blob = new Blob([ndaContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NDA_ProcessSutra_${dbUser?.email}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <AppLayout 
      title="NDA & Security Documentation" 
      description="Confidential legal and security information for administrators"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Card */}
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Security & Legal Documentation</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Official NDA and security documentation for ProcessSutra by Muxro Technologies
                  </CardDescription>
                </div>
              </div>
              <Badge variant="default" className="bg-green-600 text-white">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Enterprise-Grade
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50">
                  <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">LOW RISK</p>
                  <p className="text-xs text-muted-foreground">Security Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">99.9%</p>
                  <p className="text-xs text-muted-foreground">Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/50">
                  <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">Encrypted</p>
                  <p className="text-xs text-muted-foreground">All Data</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/50">
                  <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">24/7</p>
                  <p className="text-xs text-muted-foreground">Monitoring</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="nda">NDA Agreement</TabsTrigger>
            <TabsTrigger value="ai-data">AI & Data</TabsTrigger>
            <TabsTrigger value="security">Security Details</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Documentation Overview
                </CardTitle>
                <CardDescription>
                  Quick access to all legal and security documentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* NDA Card */}
                  <Card className="border-2 border-blue-100 dark:border-blue-900">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileSignature className="w-5 h-5 text-blue-600" />
                        Non-Disclosure Agreement
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Official NDA protecting your organization's confidential data. This agreement ensures 
                        all workflow designs, forms, employee data, documents, and business information remain 
                        strictly confidential and are owned solely by your organization.
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Complete data ownership protection</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>No third-party data sharing</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Data deletion rights guaranteed</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>3-year validity period</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>AI data never shared without consent</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Files stored on your Google Drive only</span>
                      </div>
                      <Button onClick={handleDownloadNDA} className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Download NDA
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Security Documentation Card */}
                  <Card className="border-2 border-green-100 dark:border-green-900">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <ShieldCheck className="w-5 h-5 text-green-600" />
                        Security Documentation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Comprehensive security implementation details, including authentication,
                        encryption, monitoring, and compliance measures.
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Enterprise-grade security</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Complete security audit</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Best practices included</span>
                      </div>
                      <Button onClick={() => setActiveTab("security")} className="w-full" variant="secondary">
                        <Eye className="w-4 h-4 mr-2" />
                        View Security Details
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* User Information */}
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Your Information
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">{dbUser?.firstName && dbUser?.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{dbUser?.email}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Role:</span>
                      <p className="font-medium capitalize">{dbUser?.role}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Organization:</span>
                      <p className="font-medium">{loadingOrg ? 'Loading...' : organizationName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Access Level:</span>
                      <p className="font-medium">Administrator</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Organization Created:</span>
                      <p className="font-medium">{organizationCreatedAt || 'Loading...'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* NDA Tab */}
          <TabsContent value="nda" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scroll className="w-5 h-5" />
                  Non-Disclosure Agreement (NDA)
                </CardTitle>
                <CardDescription>
                  Detailed NDA terms and conditions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* NDA Content Preview */}
                <div className="rounded-lg border bg-muted/50 p-6 space-y-4 max-h-96 overflow-y-auto">
                  <div>
                    <h3 className="font-bold text-lg mb-2">NON-DISCLOSURE AGREEMENT (NDA)</h3>
                    <p className="text-sm text-muted-foreground">
                      This Agreement is made between Muxro Technologies (ProcessSutra) and {organizationName}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-2">1. PURPOSE</h4>
                    <p className="text-sm mb-2">
                      The Client may share certain information with the Service Provider while using ProcessSutra, such as:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                      <li>Workflow designs</li>
                      <li>Forms and form responses</li>
                      <li>Organization information (GST, PAN, address, business data)</li>
                      <li>Employee data (name, email, phone, designation, etc.)</li>
                      <li>Documents and files uploaded</li>
                      <li>Any dynamic data provided voluntarily or optionally</li>
                    </ul>
                    <p className="text-sm mt-2">
                      This Agreement ensures that all such information remains confidential.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">2. DEFINITION OF CONFIDENTIAL INFORMATION</h4>
                    <p className="text-sm mb-2">
                      "Confidential Information" includes, but is not limited to:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                      <li>Organization data</li>
                      <li>Employee or personal data</li>
                      <li>Business workflows, processes, or operational details</li>
                      <li>Files/documents uploaded by the Client</li>
                      <li>Any form data submitted by users</li>
                      <li>Any information not publicly available and provided through ProcessSutra</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      Even if the Client provides only partial, optional, or dynamic data, it is still protected under this NDA.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">3. OBLIGATIONS OF THE SERVICE PROVIDER</h4>
                    <p className="text-sm mb-2">The Service Provider agrees to:</p>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                      <li><strong>Maintain confidentiality:</strong> Not disclose, share, sell, lease, or make available the Client's data to any third party</li>
                      <li><strong>Use data only for service functionality:</strong> Data may only be used to operate features such as workflow execution, task creation, or technical support</li>
                      <li><strong>Restrict access internally:</strong> Only authorized personnel who require access for system operation or troubleshooting may access the data</li>
                      <li><strong>Prevent unauthorized access:</strong> Implement reasonable technical and administrative safeguards to protect all Client data</li>
                      <li><strong>Not use data for marketing or external purposes:</strong> No data may be used for promotion, training, or external analysis without explicit written consent</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Brain className="w-4 h-4 text-blue-600" /> 4. AI & LLM DATA ACCESS POLICY</h4>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                      <li><strong>Organization-owned API keys:</strong> All AI keys (Gemini, OpenAI) are provided by the Client. ProcessSutra does NOT provide or manage AI keys</li>
                      <li><strong>Flow rules, task data, and form data are NEVER shared with any AI/LLM</strong></li>
                      <li><strong>Only aggregated reporting parameters</strong> (total counts, percentages, averages) may be sent when Client explicitly enables AI analysis</li>
                      <li><strong>Form data belongs entirely to the organization</strong> — this is why aggregated metrics can be derived and shared with Client's own AI</li>
                      <li><strong>No AI training:</strong> No Client data is used to train or improve any AI model</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2"><HardDrive className="w-4 h-4 text-purple-600" /> 5. FILE STORAGE & GOOGLE DRIVE</h4>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                      <li>All uploaded files are stored in the <strong>Client's own Google Drive</strong> (ProcessSutra folder)</li>
                      <li><strong>ProcessSutra does NOT store, copy, or retain any files</strong> on its servers</li>
                      <li>File ownership and access control are governed by Client's Google Workspace policies</li>
                      <li>Revoking Google Drive access immediately stops ProcessSutra from reading/writing files</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">7. DATA OWNERSHIP</h4>
                    <p className="text-sm">
                      All data provided through ProcessSutra will always remain the <strong>sole property of the Client</strong>.
                      The Service Provider holds no ownership rights over this data. This includes flow rules, task records,
                      form templates, form responses, uploaded files, and all organization configurations.
                    </p>
                  </div>

                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-600" /> 8. DATA DELETION & REMOVAL</h4>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                      <li><strong>Self-service deletion:</strong> Admins can delete individual tasks, forms, and workflows directly</li>
                      <li><strong>Organization-wide removal:</strong> Complete deletion of all organization data on request</li>
                      <li>Includes: all tasks, flow rules, form templates, form responses, employee records, settings, and AI API keys</li>
                      <li>Written confirmation of complete deletion provided</li>
                      <li>Google Drive files remain under Client's control independently</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">9. DURATION</h4>
                    <p className="text-sm">
                      This Agreement begins from the date the Client uses ProcessSutra, remains in effect for as long 
                      as the Client uses the service, and continues for <strong>3 years</strong> after account deletion, 
                      unless otherwise requested in writing.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">11. GOVERNING LAW</h4>
                    <p className="text-sm">
                      This Agreement is governed by the <strong>laws of India</strong>.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">12. ACCEPTANCE</h4>
                    <p className="text-sm">
                      By using ProcessSutra, the Client agrees to the terms of this NDA automatically.
                    </p>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                    <p className="text-xs text-muted-foreground">
                      <strong>Note:</strong> This is a preview. Download the complete NDA document using the button below
                      for the full agreement including all terms, conditions, and legal provisions.
                    </p>
                  </div>
                </div>

                <Button onClick={handleDownloadNDA} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Complete NDA
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI & Data Tab */}
          <TabsContent value="ai-data" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* AI Data Policy */}
              <Card className="border-2 border-blue-100 dark:border-blue-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="w-5 h-5 text-blue-600" />
                    AI & LLM Data Policy
                  </CardTitle>
                  <CardDescription>How your data interacts with AI features</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Your Organization Uses Your Own AI API Keys</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">ProcessSutra does NOT provide, manage, or have access to any AI API keys. All AI calls use your organization's own Gemini or OpenAI API key.</p>
                  </div>

                  <h4 className="font-semibold text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                    <CloudOff className="w-4 h-4" />
                    Data NEVER Shared with AI/LLM
                  </h4>
                  <div className="space-y-2">
                    {[
                      'Flow rules and workflow definitions',
                      'Individual task records and task details',
                      'Form templates and form submission data',
                      'Employee/doer personal information (emails, names, phones)',
                      'Uploaded files and documents',
                      'Customer or third-party personal data',
                      'Organization credentials, API keys, or secrets',
                      'Database records, IDs, or raw operational data',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Lock className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <h4 className="font-semibold text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    What AI Receives (Only When Enabled)
                  </h4>
                  <p className="text-xs text-muted-foreground">Only pre-computed, aggregated statistical summaries — when you explicitly enable AI analysis:</p>
                  <div className="space-y-2">
                    {[
                      'Total task counts and completion percentages',
                      'Average cycle times and throughput rates',
                      'System-level aggregate performance (no individual records)',
                      'Anonymous team size counts (no emails or names)',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      <strong>Why reporting parameters can be shared:</strong> Since all form data, task data, and workflow data are the sole property of your organization, the aggregated performance metrics derived from this data also belong to you. Your own AI API key is used, meaning data flows from your system through your own AI account.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* File Storage Policy */}
              <Card className="border-2 border-purple-100 dark:border-purple-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <HardDrive className="w-5 h-5 text-purple-600" />
                    File Storage & Google Drive
                  </CardTitle>
                  <CardDescription>Where your files are actually stored</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-3">
                    <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">Files Live in YOUR Google Drive</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">ProcessSutra does NOT store, copy, cache, or retain any uploaded files on its servers.</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <strong>Client's Google Drive</strong>
                        <p className="text-muted-foreground">All files stored in a designated "ProcessSutra" folder in your Google Drive</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <strong>Zero Server Storage</strong>
                        <p className="text-muted-foreground">ProcessSutra has no copy of your files on its infrastructure</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <strong>Your Access Controls</strong>
                        <p className="text-muted-foreground">File access governed by your Google Workspace policies</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <strong>Instant Revocation</strong>
                        <p className="text-muted-foreground">Revoking Google Drive access immediately stops all file operations</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-500" />
                    Data Deletion & Removal
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">ProcessSutra provides comprehensive self-service data deletion:</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <strong>Self-Service Deletion</strong>
                        <p className="text-muted-foreground">Admins can delete individual tasks, forms, workflows, and flow rules directly</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <strong>Complete Organization Wipe</strong>
                        <p className="text-muted-foreground">Request deletion of ALL organization data: tasks, flow rules, forms, responses, employee records, settings, and AI API keys</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <strong>Google Drive Independence</strong>
                        <p className="text-muted-foreground">Files in your Google Drive are not affected by ProcessSutra data deletion — you manage them independently</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <strong>Written Confirmation</strong>
                        <p className="text-muted-foreground">Confirmation of complete deletion provided upon request</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Ownership Summary */}
            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-400">
                  <ShieldCheck className="w-5 h-5" />
                  Complete Data Ownership Guarantee
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white/60 dark:bg-white/5 rounded-lg border border-green-200 dark:border-green-800">
                    <Database className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="font-bold text-green-800 dark:text-green-300">Your Data</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">All workflow, task, and form data is 100% owned by your organization</p>
                  </div>
                  <div className="text-center p-4 bg-white/60 dark:bg-white/5 rounded-lg border border-green-200 dark:border-green-800">
                    <HardDrive className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="font-bold text-green-800 dark:text-green-300">Your Files</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">All files stored in your Google Drive, never on ProcessSutra servers</p>
                  </div>
                  <div className="text-center p-4 bg-white/60 dark:bg-white/5 rounded-lg border border-green-200 dark:border-green-800">
                    <Key className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="font-bold text-green-800 dark:text-green-300">Your AI Keys</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">Your own Gemini/OpenAI API keys — ProcessSutra never provides AI keys</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Authentication Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Key className="w-5 h-5 text-blue-600" />
                    Authentication & Authorization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Google OAuth 2.0</strong>
                      <p className="text-muted-foreground">Google OAuth 2.0 authentication integration</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Token Validation</strong>
                      <p className="text-muted-foreground">Enhanced validation (audience, issuer, age)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Session Management</strong>
                      <p className="text-muted-foreground">Secure 4-hour TTL sessions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Rate Limiting</strong>
                      <p className="text-muted-foreground">25 attempts per 15 minutes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Data Protection Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Database className="w-5 h-5 text-purple-600" />
                    Data Protection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>HTTPS/TLS Encryption</strong>
                      <p className="text-muted-foreground">All data in transit encrypted</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Database Encryption</strong>
                      <p className="text-muted-foreground">Data at rest encryption enabled</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Secure Cookies</strong>
                      <p className="text-muted-foreground">HttpOnly, SameSite=strict</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Daily Backups</strong>
                      <p className="text-muted-foreground">7-day retention, encrypted storage</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Infrastructure Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Server className="w-5 h-5 text-orange-600" />
                    Infrastructure Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Cloud Hosting</strong>
                      <p className="text-muted-foreground">AWS/DigitalOcean secure infrastructure</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>CDN Protection</strong>
                      <p className="text-muted-foreground">Cloudflare DDoS protection</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Load Balancing</strong>
                      <p className="text-muted-foreground">High availability architecture</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Firewall Protection</strong>
                      <p className="text-muted-foreground">Network security & VPC isolation</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monitoring Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5 text-red-600" />
                    Security Monitoring
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Activity Logging</strong>
                      <p className="text-muted-foreground">Comprehensive audit trail</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Failed Login Tracking</strong>
                      <p className="text-muted-foreground">Suspicious activity detection</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>24/7 Monitoring</strong>
                      <p className="text-muted-foreground">Real-time security alerts</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Device Fingerprinting</strong>
                      <p className="text-muted-foreground">Enhanced session security</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-400">
                  <ShieldCheck className="w-5 h-5" />
                  Security Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-800 dark:text-green-300">🟢 LOW RISK / ENTERPRISE-GRADE</p>
                    <p className="text-sm text-green-700 dark:text-green-400 mt-1">Last Security Audit: October 21, 2025</p>
                    <p className="text-xs text-green-600 dark:text-green-500 mt-2">All security documentation is available for review on this page</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5" />
                  Compliance & Standards
                </CardTitle>
                <CardDescription>
                  Our commitment to security standards and regulatory compliance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Standards Compliance
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <strong>Data Privacy Laws</strong>
                          <p className="text-muted-foreground">GDPR compliance measures</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <strong>Secure Development</strong>
                          <p className="text-muted-foreground">Following industry best practices</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <strong>Regular Audits</strong>
                          <p className="text-muted-foreground">Quarterly security assessments</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Operational Standards
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <strong>99.9% Uptime SLA</strong>
                          <p className="text-muted-foreground">High availability commitment</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <strong>Incident Response</strong>
                          <p className="text-muted-foreground">&lt; 1 hour for critical issues</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <strong>Regular Updates</strong>
                          <p className="text-muted-foreground">Monthly security patches</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Available Documentation
                  </h3>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="text-sm">
                      <p className="font-medium">✓ Security Audit Reports</p>
                      <p className="text-muted-foreground text-xs">Quarterly assessments</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">✓ Customer Security Docs</p>
                      <p className="text-muted-foreground text-xs">Public-facing information</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">✓ NDA Templates</p>
                      <p className="text-muted-foreground text-xs">Legal agreements</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">✓ Best Practices</p>
                      <p className="text-muted-foreground text-xs">Security guidelines</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">✓ Incident Reports</p>
                      <p className="text-muted-foreground text-xs">Transparency reports</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">✓ Compliance Certificates</p>
                      <p className="text-muted-foreground text-xs">Standards compliance</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-semibold">Contact Information</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Security Inquiries:</p>
                      <p className="font-medium">security@muxrotechnologies.com</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">General Support:</p>
                      <p className="font-medium">support@muxrotechnologies.com</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Emergency Contact:</p>
                      <p className="font-medium">24/7 Available</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">NDA Agreements:</p>
                      <p className="font-medium">Download from this portal</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Notice */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Confidential Information</p>
                <p className="text-muted-foreground">
                  This documentation contains confidential and proprietary information. By accessing this page, 
                  you acknowledge that you are bound by confidentiality obligations as outlined in the NDA. 
                  Unauthorized disclosure or distribution is strictly prohibited and may result in legal action.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  © {new Date().getFullYear()} Muxro Technologies. All Rights Reserved. | Product: ProcessSutra | Last Updated: {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
