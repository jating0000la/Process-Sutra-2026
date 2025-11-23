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
  Fingerprint,
  Clock,
  Activity,
  Globe,
  FileSignature,
  Scroll
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

This Non-Disclosure Agreement ("Agreement") is entered into as of ${organizationCreatedAt || new Date().toLocaleDateString()} by and between:

DISCLOSING PARTY: ProcessSutra by Muxro Technologies
RECEIVING PARTY: ${dbUser?.firstName && dbUser?.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : dbUser?.email}
Organization: ${organizationName}

1. PURPOSE
ProcessSutra by Muxro Technologies is a workflow management platform. In connection with the use 
of this platform, Disclosing Party may share certain confidential technical and business information that 
the Receiving Party is required to maintain in confidence.

2. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means all information disclosed by Disclosing Party to Receiving Party, including:
- Business processes and workflow configurations
- Technical documentation and system architecture
- User data and analytics
- Security protocols and authentication methods
- Database schemas and API specifications
- Form templates and workflow rules
- Performance metrics and analytics
- Any information marked as "Confidential"

3. OBLIGATIONS OF RECEIVING PARTY
The Receiving Party agrees to:
a) Hold all Confidential Information in strict confidence
b) Not disclose Confidential Information to any third parties
c) Use Confidential Information solely for the agreed business purpose
d) Protect Confidential Information with the same degree of care used for their own confidential information
e) Limit access to Confidential Information to employees or agents with a legitimate need to know

4. EXCEPTIONS
This Agreement does not apply to information that:
a) Was publicly known at the time of disclosure
b) Becomes publicly known through no breach of this Agreement
c) Was rightfully known by Receiving Party prior to disclosure
d) Is independently developed by Receiving Party without use of Confidential Information
e) Is required to be disclosed by law or court order

5. TERM AND TERMINATION
This Agreement shall remain in effect for a period of 3 years from the date of signing. 
Upon termination, Receiving Party shall:
- Return or destroy all Confidential Information
- Cease all use of Confidential Information
- Provide written certification of compliance

6. REMEDIES
Receiving Party acknowledges that breach of this Agreement may cause irreparable harm and that 
Disclosing Party shall be entitled to seek injunctive relief in addition to all other available remedies.

7. GOVERNING LAW
This Agreement shall be governed by the laws of the jurisdiction in which Disclosing Party is registered.

ACKNOWLEDGED AND AGREED:

Receiving Party: ${dbUser?.firstName && dbUser?.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : dbUser?.email}
Email: ${dbUser?.email}
Date: ${organizationCreatedAt || new Date().toLocaleDateString()}
Organization: ${organizationName}

Disclosing Party: ProcessSutra by Muxro Technologies
Date: ${organizationCreatedAt || new Date().toLocaleDateString()}

CONFIDENTIAL AND PROPRIETARY INFORMATION
© ${new Date().getFullYear()} Muxro Technologies. All Rights Reserved.
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

  // Security documentation is available for viewing only - no download needed
  const handleViewSecurityDoc = () => {
    // Scroll to security tab or show information
    setActiveTab("security");
  };

  // Removed security doc download functionality
  const handleDownloadSecurityDoc_OLD = () => {
    const securityDoc = `
SECURITY DOCUMENTATION
ProcessSutra by Muxro Technologies
Security Rating: LOW RISK / ENTERPRISE-GRADE

Generated for: ${dbUser?.firstName && dbUser?.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : dbUser?.email}
Organization: ${organizationName}
Date: ${organizationCreatedAt || new Date().toLocaleDateString()}
NDA Agreement Date: ${organizationCreatedAt || new Date().toLocaleDateString()}

==============================================================================
TABLE OF CONTENTS
==============================================================================
1. Security Overview
2. Authentication & Authorization
3. Data Protection
4. Infrastructure Security
5. Compliance & Standards
6. Security Monitoring
7. Incident Response
8. Best Practices

==============================================================================
1. SECURITY OVERVIEW
==============================================================================

ProcessSutra by Muxro Technologies implements enterprise-grade security measures to protect 
your data and ensure system integrity. Our multi-layered security approach includes:

✓ Firebase OAuth 2.0 Authentication
✓ Enhanced Token Validation
✓ Secure Session Management
✓ Rate Limiting
✓ CSRF Protection
✓ Role-Based Access Control (RBAC)
✓ Data Encryption (at rest and in transit)
✓ Regular Security Audits

Security Rating: 🟢 LOW RISK / ENTERPRISE-GRADE
Last Security Audit: October 21, 2025

==============================================================================
2. AUTHENTICATION & AUTHORIZATION
==============================================================================

2.1 Authentication Methods:
- Google OAuth 2.0 via Firebase
- Enhanced token validation (audience, issuer, age verification)
- Secure session management with 4-hour TTL
- Device fingerprinting for enhanced security

2.2 Authorization:
- Role-Based Access Control (RBAC)
- Granular permissions per role
- Organization-level isolation
- Activity audit trail

2.3 Session Security:
- Cryptographically secure session tokens
- HttpOnly cookies
- SameSite=strict policy
- Automatic session timeout
- Session invalidation on logout

2.4 Rate Limiting:
- Authentication endpoints: 25 attempts per 15 minutes
- Prevents brute-force attacks
- IP-based tracking
- Automatic blocking of suspicious activity

==============================================================================
3. DATA PROTECTION
==============================================================================

3.1 Data Encryption:
- HTTPS/TLS encryption for all data in transit
- Database encryption at rest
- Secure file storage (GridFS/S3)
- Encrypted backup storage

3.2 Data Privacy:
- No sensitive data logging in production
- Password hashing (Firebase)
- PII protection
- GDPR compliance measures

3.3 Data Isolation:
- Organization-level data isolation
- Query-level security filters
- Role-based data access
- No cross-organization data leakage

3.4 Backup & Recovery:
- Daily automated backups
- 7-day retention policy
- Encrypted backup storage
- Disaster recovery plan

==============================================================================
4. INFRASTRUCTURE SECURITY
==============================================================================

4.1 Hosting:
- Cloud hosting (AWS/DigitalOcean)
- SSL/TLS certificates (Let's Encrypt)
- CDN with DDoS protection (Cloudflare)
- Load balancing for high availability

4.2 Database Security:
- Managed PostgreSQL (primary)
- MongoDB for document storage
- Connection encryption
- Access control lists (ACLs)
- Regular security patches

4.3 Network Security:
- Firewall protection
- VPC isolation
- Restricted port access
- Regular vulnerability scanning

==============================================================================
5. COMPLIANCE & STANDARDS
==============================================================================

5.1 Standards:
✓ Data Privacy Laws
✓ Secure Development Practices
✓ Regular Security Audits
✓ Incident Response Procedures

5.2 Documentation:
✓ Security Audit Reports
✓ Customer Security Documentation
✓ NDA Templates
✓ Best Practices Guides

==============================================================================
6. SECURITY MONITORING
==============================================================================

6.1 Activity Logging:
- User login/logout tracking
- Failed authentication attempts
- Data access logs
- System modifications
- Administrative actions

6.2 Alert System:
- Suspicious activity detection
- Failed login alerts
- System error notifications
- Performance monitoring

6.3 Audit Trail:
- Comprehensive activity logs
- User action tracking
- 90-day log retention
- Exportable audit reports

==============================================================================
7. INCIDENT RESPONSE
==============================================================================

7.1 Incident Handling:
- 24/7 security monitoring
- Immediate incident response
- Root cause analysis
- Corrective action implementation
- Post-incident review

7.2 Notification:
- Prompt notification of security incidents
- Transparent communication
- Regular status updates
- Detailed incident reports

7.3 Recovery:
- Fast recovery procedures
- Backup restoration
- Service continuity plans
- Minimal downtime

==============================================================================
8. SECURITY BEST PRACTICES FOR USERS
==============================================================================

8.1 Password Security:
✓ Use strong, unique passwords
✓ Enable Google OAuth when available
✓ Never share credentials
✓ Log out when done

8.2 Access Control:
✓ Use appropriate role assignments
✓ Review user access regularly
✓ Remove inactive users
✓ Monitor suspicious activity

8.3 Data Handling:
✓ Mark sensitive information appropriately
✓ Use secure channels for communication
✓ Follow data retention policies
✓ Report security concerns immediately

8.4 Device Security:
✓ Keep devices updated
✓ Use secure networks
✓ Enable device locks
✓ Review active sessions regularly

==============================================================================
SUPPORT & CONTACT
==============================================================================

Security Inquiries: security@muxrotechnologies.com
Support: support@muxrotechnologies.com
Emergency: Available 24/7

For NDA Agreements: Refer to NDA section of this portal
For Security Updates: Check documentation regularly

==============================================================================

This document is confidential and proprietary. Distribution is restricted to
authorized personnel only.

© ${new Date().getFullYear()} Muxro Technologies. All Rights Reserved.
Product: ProcessSutra
Security Rating: 🟢 LOW RISK / ENTERPRISE-GRADE
Last Updated: ${new Date().toLocaleDateString()}
`;

    const blob = new Blob([securityDoc], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Security_Documentation_ProcessSutra_${new Date().toISOString().split('T')[0]}.txt`;
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
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
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
                <Lock className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">LOW RISK</p>
                  <p className="text-sm text-gray-600">Security Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">99.9%</p>
                  <p className="text-sm text-gray-600">Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Database className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">Encrypted</p>
                  <p className="text-sm text-gray-600">All Data</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">24/7</p>
                  <p className="text-sm text-gray-600">Monitoring</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="nda">NDA Agreement</TabsTrigger>
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
                  <Card className="border-2 border-blue-100">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileSignature className="w-5 h-5 text-blue-600" />
                        Non-Disclosure Agreement
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Official NDA for confidential information protection. Download and review
                        the agreement that covers all confidential data and business processes.
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Covers all confidential information</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>3-year validity period</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Legal protection for both parties</span>
                      </div>
                      <Button onClick={handleDownloadNDA} className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Download NDA
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Security Documentation Card */}
                  <Card className="border-2 border-green-100">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <ShieldCheck className="w-5 h-5 text-green-600" />
                        Security Documentation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-600">
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
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Your Information
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <p className="font-medium">{dbUser?.firstName && dbUser?.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="font-medium">{dbUser?.email}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Role:</span>
                      <p className="font-medium capitalize">{dbUser?.role}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Organization:</span>
                      <p className="font-medium">{loadingOrg ? 'Loading...' : organizationName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Access Level:</span>
                      <p className="font-medium">Administrator</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Organization Created:</span>
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
                <div className="bg-gray-50 rounded-lg p-6 border space-y-4 max-h-96 overflow-y-auto">
                  <div>
                    <h3 className="font-bold text-lg mb-2">NON-DISCLOSURE AGREEMENT</h3>
                    <p className="text-sm text-gray-600">ProcessSutra by Muxro Technologies</p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-2">1. PURPOSE</h4>
                    <p className="text-sm text-gray-700">
                      ProcessSutra by Muxro Technologies is a workflow management platform. In connection with the use 
                      of this platform, Disclosing Party may share certain confidential technical and business information that 
                      the Receiving Party is required to maintain in confidence.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">2. DEFINITION OF CONFIDENTIAL INFORMATION</h4>
                    <p className="text-sm text-gray-700 mb-2">
                      "Confidential Information" means all information disclosed by Disclosing Party to Receiving Party, including:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-4">
                      <li>Business processes and workflow configurations</li>
                      <li>Technical documentation and system architecture</li>
                      <li>User data and analytics</li>
                      <li>Security protocols and authentication methods</li>
                      <li>Database schemas and API specifications</li>
                      <li>Form templates and workflow rules</li>
                      <li>Performance metrics and analytics</li>
                      <li>Any information marked as "Confidential"</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">3. OBLIGATIONS OF RECEIVING PARTY</h4>
                    <p className="text-sm text-gray-700 mb-2">The Receiving Party agrees to:</p>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-4">
                      <li>Hold all Confidential Information in strict confidence</li>
                      <li>Not disclose Confidential Information to any third parties</li>
                      <li>Use Confidential Information solely for the agreed business purpose</li>
                      <li>Protect Confidential Information with the same degree of care used for their own confidential information</li>
                      <li>Limit access to Confidential Information to employees or agents with a legitimate need to know</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">4. TERM AND TERMINATION</h4>
                    <p className="text-sm text-gray-700">
                      This Agreement shall remain in effect for a period of <strong>3 years</strong> from the date of signing.
                    </p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-xs text-gray-600">
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
                      <p className="text-gray-600">Firebase authentication integration</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Token Validation</strong>
                      <p className="text-gray-600">Enhanced validation (audience, issuer, age)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Session Management</strong>
                      <p className="text-gray-600">Secure 4-hour TTL sessions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Rate Limiting</strong>
                      <p className="text-gray-600">25 attempts per 15 minutes</p>
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
                      <p className="text-gray-600">All data in transit encrypted</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Database Encryption</strong>
                      <p className="text-gray-600">Data at rest encryption enabled</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Secure Cookies</strong>
                      <p className="text-gray-600">HttpOnly, SameSite=strict</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Daily Backups</strong>
                      <p className="text-gray-600">7-day retention, encrypted storage</p>
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
                      <p className="text-gray-600">AWS/DigitalOcean secure infrastructure</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>CDN Protection</strong>
                      <p className="text-gray-600">Cloudflare DDoS protection</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Load Balancing</strong>
                      <p className="text-gray-600">High availability architecture</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Firewall Protection</strong>
                      <p className="text-gray-600">Network security & VPC isolation</p>
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
                      <p className="text-gray-600">Comprehensive audit trail</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Failed Login Tracking</strong>
                      <p className="text-gray-600">Suspicious activity detection</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>24/7 Monitoring</strong>
                      <p className="text-gray-600">Real-time security alerts</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <strong>Device Fingerprinting</strong>
                      <p className="text-gray-600">Enhanced session security</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <ShieldCheck className="w-5 h-5" />
                  Security Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-800">🟢 LOW RISK / ENTERPRISE-GRADE</p>
                    <p className="text-sm text-green-700 mt-1">Last Security Audit: October 21, 2025</p>
                    <p className="text-xs text-green-600 mt-2">All security documentation is available for review on this page</p>
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
                          <p className="text-gray-600">GDPR compliance measures</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <strong>Secure Development</strong>
                          <p className="text-gray-600">Following industry best practices</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <strong>Regular Audits</strong>
                          <p className="text-gray-600">Quarterly security assessments</p>
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
                          <p className="text-gray-600">High availability commitment</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <strong>Incident Response</strong>
                          <p className="text-gray-600">&lt; 1 hour for critical issues</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <strong>Regular Updates</strong>
                          <p className="text-gray-600">Monthly security patches</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Available Documentation
                  </h3>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="text-sm">
                      <p className="font-medium">✓ Security Audit Reports</p>
                      <p className="text-gray-600 text-xs">Quarterly assessments</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">✓ Customer Security Docs</p>
                      <p className="text-gray-600 text-xs">Public-facing information</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">✓ NDA Templates</p>
                      <p className="text-gray-600 text-xs">Legal agreements</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">✓ Best Practices</p>
                      <p className="text-gray-600 text-xs">Security guidelines</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">✓ Incident Reports</p>
                      <p className="text-gray-600 text-xs">Transparency reports</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">✓ Compliance Certificates</p>
                      <p className="text-gray-600 text-xs">Standards compliance</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-semibold">Contact Information</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Security Inquiries:</p>
                      <p className="font-medium">security@muxrotechnologies.com</p>
                    </div>
                    <div>
                      <p className="text-gray-600">General Support:</p>
                      <p className="font-medium">support@muxrotechnologies.com</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Emergency Contact:</p>
                      <p className="font-medium">24/7 Available</p>
                    </div>
                    <div>
                      <p className="text-gray-600">NDA Agreements:</p>
                      <p className="font-medium">Download from this portal</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Notice */}
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">Confidential Information</p>
                <p>
                  This documentation contains confidential and proprietary information. By accessing this page, 
                  you acknowledge that you are bound by confidentiality obligations as outlined in the NDA. 
                  Unauthorized disclosure or distribution is strictly prohibited and may result in legal action.
                </p>
                <p className="mt-2 text-xs text-gray-600">
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
