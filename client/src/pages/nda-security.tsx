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
CONFIDENTIALITY & DATA AGREEMENT

This Confidentiality and Data Agreement ("Agreement") is made between:

1. Muxro Technologies, operating ProcessSutra ("Service Provider"),
and
2. ${organizationName} represented by ${dbUser?.firstName && dbUser?.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : dbUser?.email} ("Client").

Both are collectively referred to as the "Parties."

Effective Date: ${organizationCreatedAt || new Date().toLocaleDateString()}

================================================================================

SECTION 1: INTRODUCTION / AGREEMENT OVERVIEW

1.1 Purpose of the Agreement
This Agreement establishes the terms and conditions governing the confidentiality, 
data handling, security, and usage policies between the Service Provider and the 
Client in connection with the Client's use of ProcessSutra, a workflow and process 
automation platform.

1.2 Parties to the Agreement
• "Service Provider" refers to Muxro Technologies, the company operating ProcessSutra.
• "Client" refers to ${organizationName} and its authorized users who access and 
  use the ProcessSutra platform.

1.3 Definitions
• "Confidential Information" — Any non-public information shared by either Party.
• "Platform" — The ProcessSutra application, APIs, and related services.
• "Client Data" — All data, files, and content created, uploaded, or managed by the 
  Client through the Platform.
• "Aggregated Data" — Pre-computed, anonymized statistical summaries derived from 
  Client Data containing no identifiable records.
• "AI Provider" — Third-party AI services (e.g., Google Gemini, OpenAI) accessed 
  using the Client's own API keys.

================================================================================

SECTION 2: CONFIDENTIAL INFORMATION

2.1 Definition of Confidential Information
"Confidential Information" includes any and all non-public information disclosed by 
either Party to the other, whether orally, in writing, electronically, or through use 
of the Platform.

2.2 Scope of Confidential Information
Confidential Information includes, but is not limited to:
• Organization data (company name, GST, PAN, address, business details)
• Employee or personal data (names, emails, phone numbers, designations)
• Business workflows, processes, and operational details
• Files and documents uploaded by the Client
• Form templates and form submission data
• Task records and completion history
• Any information not publicly available and provided through ProcessSutra

2.3 Information Covered Under the Agreement
Even if the Client provides only partial, optional, or dynamic data, it is still 
protected under this Agreement. All data entered into ProcessSutra — regardless of 
format or completeness — is treated as Confidential Information.

================================================================================

SECTION 3: OBLIGATIONS OF THE SERVICE PROVIDER

3.1 Confidentiality Commitment
The Service Provider shall not disclose, share, sell, lease, or make available the 
Client's Confidential Information to any third party without the Client's prior 
written consent.

3.2 Permitted Use of Data
Client Data may only be used for the purpose of delivering the Platform's services, 
including workflow execution, task management, form processing, reporting, and 
technical support. No data may be used for marketing, promotion, training, or 
external analysis without explicit written consent.

3.3 Internal Access Restrictions
Only authorized Service Provider personnel who require access for system operation, 
maintenance, or troubleshooting may access Client Data. All such personnel are bound 
by confidentiality obligations.

3.4 Data Protection Measures
The Service Provider shall implement reasonable technical and administrative 
safeguards to protect all Client Data against unauthorized access, disclosure, 
alteration, or destruction.

================================================================================

SECTION 4: AI & LLM DATA ACCESS POLICY

4.1 Organization-Owned API Keys
All AI API keys (such as Google Gemini or OpenAI) are provided, owned, and managed 
by the Client's organization. ProcessSutra does not provide, generate, store, or 
manage any AI API keys.

4.2 AI Data Access Restrictions
The following data is NEVER transmitted to any AI or LLM provider under any 
circumstance:
• Workflow definitions and flow rules
• Individual task records and task-level data
• Form templates and form submission data
• Employee or user personal information (emails, names, phone numbers)
• Uploaded documents or files
• Customer or third-party personal data
• Organization credentials, API keys, or secrets
• Raw database records or operational data

4.3 Aggregated Data for AI Analysis
AI services may only receive aggregated and pre-computed reporting metrics, and only 
when the Client explicitly enables AI-powered analysis. These metrics may include:
• Total task counts
• Completion percentages
• Average process cycle times
• Throughput rates
• Aggregate performance indicators
• Anonymous team size counts
These values contain no identifiable records, no personal data, and no raw 
operational data.

4.4 AI Processing Transparency
ProcessSutra acts only as a technical interface between the Client and their chosen 
AI provider. All AI processing occurs using the Client's own API account and under 
the policies of that AI provider. Since all workflow data, form data, and operational 
data belong entirely to the Client, aggregated reporting metrics derived from this 
data also belong to the Client.

4.5 No AI Training on Client Data
Client data is never used to train, fine-tune, or improve any AI models. AI requests 
are processed only for real-time responses, and ProcessSutra does not retain AI input 
or output beyond the immediate request unless the Client explicitly saves it.

================================================================================

SECTION 5: DATA OWNERSHIP

5.1 Client Data Ownership
All data provided through ProcessSutra will always remain the sole property of the 
Client. The Service Provider holds no ownership rights over this data. This includes:
• Workflow rules and flow definitions
• Task records and completion history
• Form templates and all form submission responses
• Uploaded files (stored in Client's Google Drive)
• Organization settings and configurations
• Employee and team member data

5.2 Platform Processing Rights
The Platform is granted only a limited, revocable right to process Client Data as 
necessary to deliver its services. This right terminates upon the Client's cessation 
of use or termination of this Agreement.

5.3 Intellectual Property Rights
All intellectual property created by the Client's organization within the Platform 
(including workflow designs, form templates, and process configurations) remains the 
exclusive property of the Client.

================================================================================

SECTION 6: FILE STORAGE & EXTERNAL INTEGRATIONS

6.1 Google Drive Storage Policy
a. All files uploaded through ProcessSutra are stored directly in the Client's own 
   Google Drive account, inside a designated "ProcessSutra" folder.
b. ProcessSutra does NOT store, copy, cache, or retain any uploaded files on its 
   own servers.
c. The Service Provider has no access to files stored in the Client's Google Drive 
   unless explicitly granted by the Client.
d. File ownership, access control, and retention are fully governed by the Client's 
   Google Workspace policies.

6.2 Third-Party Service Integrations
Third-party integrations (including Google Drive, email services, and AI providers) 
operate under their respective provider terms and privacy policies. ProcessSutra 
is not responsible for the data handling practices of third-party services.

6.3 API Access & Permissions
ProcessSutra integrates with Google Drive using OAuth 2.0 authentication. Access 
permissions are granted by the Client and can be revoked at any time through Google 
Account settings. If the Client revokes Google Drive access, ProcessSutra immediately 
loses the ability to read or write any files.

================================================================================

SECTION 7: USER RESPONSIBILITIES

7.1 Account Security
The Client is responsible for maintaining the security of all account credentials 
and ensuring that login information is not shared with unauthorized individuals.

7.2 Role & Permission Management
ProcessSutra provides role-based access controls. The organization administrator is 
responsible for assigning appropriate roles and permissions to users within the 
organization.

7.3 Responsible Use of the Platform
The Client agrees to use the Platform in a responsible manner consistent with its 
intended purpose as a workflow and process automation tool.

================================================================================

SECTION 8: DATA SECURITY & PROTECTION

8.1 Security Safeguards
ProcessSutra implements appropriate security safeguards including:
• HTTPS/TLS encryption for all data in transit
• Google OAuth 2.0 authentication with ID token validation
• Cryptographic CSRF protection
• Secure session management with HttpOnly, SameSite=strict cookies
• Content Security Policy (CSP) and security headers

8.2 Access Control Measures
• Multi-layer rate limiting (login, API, and admin endpoints)
• Role-based access control with strict middleware enforcement
• Organization-level data isolation (every query scoped by organizationId)
• Field-level whitelisting to prevent privilege escalation
• Database port isolation (PostgreSQL, MongoDB, Redis bound to localhost)

8.3 Data Breach Handling
In the event of a data breach affecting Client Data, the Service Provider will:
• Notify affected Clients promptly in accordance with applicable laws
• Investigate the breach and take corrective measures
• Provide a summary of findings and remediation steps taken

================================================================================

SECTION 9: DATA DELETION & DATA RETENTION

9.1 User-Initiated Deletion
Administrators can delete individual tasks, forms, workflows, and flow rules 
directly from the platform. Users can remove their own data through the application 
interface.

9.2 Organization-Wide Data Removal
Administrators may request complete deletion of all organization data, including:
• All tasks, flow rules, form templates, and form responses
• All employee records and user information
• All organization configuration and settings
• All AI API key configurations stored for the organization

Upon request, the Service Provider will provide written confirmation of complete 
deletion.

9.3 Permanent Data Deletion Policy
• Data deletion is irreversible. The Service Provider is not responsible for any 
  data loss resulting from Client-initiated deletions.
• Files stored in the Client's Google Drive remain under the Client's control and 
  are not affected by ProcessSutra data deletion.
• ProcessSutra does not create backups of Client files on its own servers.

================================================================================

SECTION 10: SERVICE AVAILABILITY

10.1 Platform Availability
ProcessSutra is provided "as is" without warranties of any kind, express or implied. 
While the Service Provider strives for 99.9% uptime, uninterrupted or error-free 
service is not guaranteed.

10.2 Maintenance & Updates
The Platform may undergo scheduled maintenance, updates, and improvements. The Service 
Provider will provide reasonable advance notice for planned maintenance windows.

10.3 Service Interruptions
ProcessSutra reserves the right to modify, suspend, or discontinue the service at 
any time with reasonable notice. The Service Provider is not liable for any damages 
resulting from service interruptions.

================================================================================

SECTION 11: LIMITATION OF LIABILITY

11.1 No Liability for Data Loss
ProcessSutra assumes no liability for any data loss, unauthorized access to the 
Client's Google Drive, or any damages arising from the use of the Platform. All data 
management responsibilities rest with the Client and their organization.

11.2 No Liability for User Actions
The Service Provider is not liable for any consequences arising from the Client's 
configuration of workflows, assignment of roles, or use of automated features. 
Automated communications (task assignments, reminders, etc.) are initiated by the 
Client's workflow configuration.

11.3 Limitation of Financial Responsibility
ProcessSutra's total aggregate financial liability shall not exceed the fees paid by 
the Client in the twelve (12) months preceding the claim.

================================================================================

SECTION 12: EXCLUSIONS

12.1 Publicly Available Information
Confidential Information does not include data that:
• Is or becomes publicly available through no fault of the Service Provider
• Was already known to the receiving Party prior to disclosure
• Is independently developed without use of Confidential Information

12.2 Legal Disclosure Requirements
The Service Provider may disclose Confidential Information if required by law, 
regulation, or court order, provided that the Service Provider gives the Client 
prompt written notice (where legally permissible) to allow the Client to seek 
protective measures.

================================================================================

SECTION 13: TERM & DURATION

13.1 Effective Date
This Agreement becomes effective on the date the Client first uses ProcessSutra 
or accepts this Agreement, whichever occurs first.

13.2 Duration of Agreement
This Agreement remains in effect for as long as the Client uses the Platform and 
maintains an active account.

13.3 Post-Term Confidentiality
Confidentiality obligations under this Agreement shall survive termination and 
continue for a period of three (3) years after account deletion or termination, 
unless otherwise agreed in writing.

================================================================================

SECTION 14: TERMINATION

14.1 Termination by Client
The Client may terminate this Agreement at any time by discontinuing use of the 
Platform and requesting account deletion.

14.2 Termination by Service Provider
The Service Provider may terminate this Agreement with reasonable written notice if 
the Client materially breaches any terms, engages in prohibited use, or fails to 
maintain an active subscription (where applicable).

14.3 Effects of Termination
Upon termination:
• The Client's access to the Platform will be suspended
• Client Data will be retained for a reasonable period to allow data export
• Upon request, all Client Data will be permanently deleted
• Files in the Client's Google Drive are not affected by termination

================================================================================

SECTION 15: GOVERNING LAW

15.1 Applicable Jurisdiction
This Agreement is governed by and construed in accordance with the laws of India.

15.2 Legal Compliance
Both Parties agree to comply with all applicable local, state, national, and 
international laws and regulations in connection with their performance under 
this Agreement.

================================================================================

SECTION 16: DISPUTE RESOLUTION

16.1 Negotiation Process
In the event of any dispute arising out of or relating to this Agreement, the Parties 
shall first attempt to resolve the matter through good-faith negotiation within 
thirty (30) days.

16.2 Arbitration / Legal Proceedings
If negotiation fails, the dispute shall be submitted to binding arbitration under the 
Arbitration and Conciliation Act, 1996 (India), or resolved through the competent 
courts of the applicable jurisdiction.

================================================================================

SECTION 17: MODIFICATIONS TO THE AGREEMENT

17.1 Right to Update Terms
ProcessSutra reserves the right to modify, amend, or update the terms of this 
Agreement at any time.

17.2 Notification of Changes
The Service Provider will provide reasonable notice of material changes through the 
Platform or via email. Continued use of the Platform after changes constitutes 
acceptance of the updated terms.

================================================================================

SECTION 18: ACCEPTANCE OF TERMS

18.1 Agreement by Use of Service
By accessing or using ProcessSutra, the Client acknowledges that they have read, 
understood, and agree to be bound by the terms of this Agreement.

18.2 Digital Acceptance
Acceptance of this Agreement via the Platform's digital acceptance mechanism (checkbox 
and confirmation) constitutes a valid and binding acceptance equivalent to a written 
signature.

================================================================================

SECTION 19: CONTACT INFORMATION

19.1 Security Contact
For security-related inquiries, vulnerability reports, or data breach notifications:
Email: security@muxro.com
Response Time: Within 24 hours for critical issues

19.2 Support Contact
For general support, account inquiries, or data deletion requests:
Email: support@muxro.com
Availability: Business hours (Monday–Friday)

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

This Agreement protects all Client data and ensures complete confidentiality.
For questions: security@muxro.com
`;

    // Create blob and download
    const blob = new Blob([ndaContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Confidentiality_Data_Agreement_ProcessSutra_${dbUser?.email}_${new Date().toISOString().split('T')[0]}.txt`;
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
                        Confidentiality & Data Agreement
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Official 19-section agreement protecting your organization's confidential data. Covers 
                        confidentiality, data ownership, AI policy, file storage, security, data deletion, 
                        liability, compliance, and legal provisions.
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Complete data ownership protection</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Comprehensive AI & LLM data policy</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Data deletion rights guaranteed</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>3-year post-term confidentiality</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Files stored on your Google Drive only</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Governing law & dispute resolution</span>
                      </div>
                      <Button onClick={() => setActiveTab("nda")} className="w-full" variant="secondary">
                        <Eye className="w-4 h-4 mr-2" />
                        View Agreement
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
                        Comprehensive security implementation details covering authentication, input validation,
                        infrastructure hardening, monitoring, and compliance.
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Zod validation + field whitelisting</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>HSTS, CSP, and security headers enforced</span>
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
                  Confidentiality & Data Agreement
                </CardTitle>
                <CardDescription>
                  Full 19-section agreement — simplified preview below
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* NDA Content Preview */}
                <div className="rounded-lg border bg-muted/50 p-6 space-y-4 max-h-96 overflow-y-auto">
                  <div>
                    <h3 className="font-bold text-lg mb-2">CONFIDENTIALITY & DATA AGREEMENT</h3>
                    <p className="text-sm text-muted-foreground">
                      This Agreement is made between Muxro Technologies (ProcessSutra) and {organizationName}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-2">1. Confidentiality</h4>
                    <p className="text-sm mb-2">
                      All information exchanged during your use of ProcessSutra is treated as Confidential Information. This includes:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                      <li>Workflow designs and process configurations</li>
                      <li>Forms, form responses, and task records</li>
                      <li>Organization information (GST, PAN, address, business data)</li>
                      <li>Employee data (name, email, phone, designation)</li>
                      <li>Documents and files uploaded</li>
                      <li>Any dynamic data provided voluntarily or optionally</li>
                    </ul>
                    <p className="text-sm mt-2">
                      The Service Provider commits to protecting this information with appropriate safeguards, restricting internal access on a need-to-know basis, and using it solely for delivering the Platform's services. Confidentiality obligations survive termination.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">2. Data Ownership</h4>
                    <p className="text-sm">
                      All workflow data, form data, task records, and operational data generated in ProcessSutra belongs <strong>entirely to your organization</strong>. ProcessSutra retains no ownership rights. The Platform is granted only a limited, revocable right to process your data as necessary to deliver services. All intellectual property created within the Platform remains your property.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">3. Google Drive Storage Policy</h4>
                    <p className="text-sm">
                      All uploaded files are stored in <strong>your own Google Drive</strong> (ProcessSutra folder). ProcessSutra does NOT store, copy, or retain any files on its servers. Integration uses OAuth 2.0 — access can be revoked at any time. File ownership is governed by your Google Workspace policies.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">4. User Responsibilities</h4>
                    <p className="text-sm">
                      You are responsible for maintaining the security of your account credentials and managing user access. ProcessSutra provides role-based access controls, but the <strong>organization administrator</strong> is responsible for assigning appropriate roles and permissions.
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Brain className="w-4 h-4 text-blue-600" /> 5. AI & LLM Data Policy</h4>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                      <li><strong>Organization-owned API keys:</strong> All AI keys (Gemini, OpenAI) are provided by your organization. ProcessSutra does NOT provide or manage AI keys</li>
                      <li><strong>Data NEVER shared:</strong> Workflow definitions, task records, form data, personal information, uploaded files, credentials, and raw database records are never sent to any AI provider</li>
                      <li><strong>Aggregated data only:</strong> Only pre-computed reporting metrics (counts, percentages, averages) may be sent when you explicitly enable AI analysis</li>
                      <li><strong>No AI training:</strong> Your data is never used to train, fine-tune, or improve any AI model</li>
                      <li><strong>Technical interface only:</strong> ProcessSutra acts only as a technical interface between you and your chosen AI provider using your own API account</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">6. Data Security</h4>
                    <p className="text-sm">
                      ProcessSutra implements HTTPS/TLS encryption, OAuth 2.0 authentication, CSRF protection, secure session management, Content Security Policy, multi-layer rate limiting, organization-level data isolation, and field-level whitelisting. In the event of a data breach, affected users will be notified promptly.
                    </p>
                  </div>

                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-600" /> 7. Data Deletion</h4>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                      <li><strong>Self-service deletion:</strong> Admins can delete individual tasks, forms, and workflows directly</li>
                      <li><strong>Organization-wide removal:</strong> Complete deletion of all organization data on request</li>
                      <li>Includes: all tasks, flow rules, form templates, form responses, employee records, settings, and AI API keys</li>
                      <li>Written confirmation of complete deletion provided</li>
                      <li>Google Drive files remain under your control independently</li>
                      <li>Data deletion is irreversible</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">8. Service Availability</h4>
                    <p className="text-sm">
                      ProcessSutra is provided <strong>"as is"</strong> without warranties of any kind. The Platform may undergo scheduled maintenance with advance notice. ProcessSutra reserves the right to modify, suspend, or discontinue the service at any time with reasonable notice.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">9. Limitation of Liability</h4>
                    <p className="text-sm">
                      ProcessSutra assumes <strong>no liability</strong> for data loss, unauthorized access, or damages arising from platform use. Automated communications are initiated by your workflow configuration. Total financial liability is limited to fees paid in the preceding 12 months.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">10. Acceptance of Terms</h4>
                    <p className="text-sm">
                      This Agreement is effective from the date of first use and remains in force during active use. Confidentiality obligations survive for <strong>3 years</strong> after termination. Either party may terminate with written notice. This Agreement is governed by the <strong>laws of India</strong>. Disputes are resolved through negotiation, then arbitration. Continued use after changes constitutes acceptance.
                    </p>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                    <p className="text-xs text-muted-foreground">
                      <strong>Note:</strong> This is a simplified 10-section preview. The downloadable document contains the full 19-section Confidentiality & Data Agreement including detailed provisions for exclusions, termination, governing law, dispute resolution, modifications, and contact information.
                    </p>
                  </div>
                </div>

                <Button onClick={handleDownloadNDA} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Complete Agreement (19 Sections)
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
                      <p className="text-muted-foreground">Secure Google OAuth 2.0 authentication with ID token validation (audience, issuer, expiry)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Cryptographic CSRF Protection</strong>
                      <p className="text-muted-foreground">OAuth state tokens generated with crypto.randomBytes(32) — not predictable</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Session Management</strong>
                      <p className="text-muted-foreground">Secure 4-hour TTL sessions with HttpOnly, SameSite=strict cookies, PostgreSQL-backed session store</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Multi-Layer Rate Limiting</strong>
                      <p className="text-muted-foreground">Login: 25 attempts/15 min, API: 1000 req/15 min, Super Admin: 30 req/min — per authenticated user</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Role-Based Access Control</strong>
                      <p className="text-muted-foreground">Admin, User, and Super Admin roles with strict middleware enforcement on every route</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Organization Isolation</strong>
                      <p className="text-muted-foreground">Every data query is scoped by organizationId — users cannot access data from other organizations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Data Protection Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Database className="w-5 h-5 text-purple-600" />
                    Data Protection & Validation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>HTTPS/TLS Encryption</strong>
                      <p className="text-muted-foreground">All data in transit encrypted via TLS with automatic certificate management (Caddy + Let's Encrypt)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Strict Input Validation (Zod)</strong>
                      <p className="text-muted-foreground">All API inputs validated with Zod schemas — user creation, login logs, devices, form data, and flow rules are type-checked and sanitized</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Field-Level Whitelisting</strong>
                      <p className="text-muted-foreground">User creation and update APIs use explicit field allowlists — sensitive fields (isSuperAdmin, tokens) cannot be injected</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Injection Prevention</strong>
                      <p className="text-muted-foreground">MongoDB regex injection blocked with character escaping; SQL injection prevented via parameterized queries (Drizzle ORM)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Content-Disposition Sanitization</strong>
                      <p className="text-muted-foreground">File download headers sanitized to prevent header injection attacks</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Atomic Database Transactions</strong>
                      <p className="text-muted-foreground">Critical multi-table operations (e.g., organization deletion) wrapped in database transactions to prevent partial data corruption</p>
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
                      <strong>Security Response Headers</strong>
                      <p className="text-muted-foreground">Helmet.js + Caddy enforce HSTS (2-year max-age, preload), X-Content-Type-Options: nosniff, X-Frame-Options: DENY, strict Referrer-Policy</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Content Security Policy</strong>
                      <p className="text-muted-foreground">CSP restricts script/style/connect/frame sources to trusted origins only (self, Google, Analytics) — blocks XSS injection vectors</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Cloudflare CDN & DDoS Protection</strong>
                      <p className="text-muted-foreground">All traffic routed through Cloudflare with WAF rules, bot management, and automatic DDoS mitigation</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Database Port Isolation</strong>
                      <p className="text-muted-foreground">PostgreSQL, MongoDB, and Redis bound to localhost only — not accessible from external network</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Zero-Downtime Deployments</strong>
                      <p className="text-muted-foreground">PM2 cluster mode (4 workers) with graceful shutdown, connection draining, and ready-signal handshake</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Environment Secret Management</strong>
                      <p className="text-muted-foreground">All database passwords, API keys, and session secrets loaded from environment variables — never hardcoded in source code</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monitoring Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5 text-red-600" />
                    Monitoring & Resilience
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Health Check Endpoint</strong>
                      <p className="text-muted-foreground">DB-aware health check (returns 503 if database is down) — used by Caddy, PM2, and Docker for auto-recovery</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Login & Device Audit Trail</strong>
                      <p className="text-muted-foreground">Every login attempt logged with device fingerprint, IP address, browser, OS, and geo-location — admins can review all activity</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Failed Login Detection</strong>
                      <p className="text-muted-foreground">Suspicious login attempts tracked and flagged — rate-limited to prevent brute-force attacks</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Device Trust Management</strong>
                      <p className="text-muted-foreground">Admins can review, trust, or revoke device access for any user in the organization</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Graceful Error Handling</strong>
                      <p className="text-muted-foreground">Unhandled errors are caught without crashing — no internal details leaked in API responses. React ErrorBoundary protects the UI from render failures</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Password Change History</strong>
                      <p className="text-muted-foreground">All password changes logged with timestamp, reason, and initiator (admin or self-service)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

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
                      <p className="font-medium">security@muxro.com</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">General Support:</p>
                      <p className="font-medium">support@muxro.com</p>
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
