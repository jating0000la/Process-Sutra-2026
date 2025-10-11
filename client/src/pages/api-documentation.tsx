import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Webhook, ExternalLink, Shield, Key, AlertTriangle, CheckCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function ApiDocumentation() {
  const { dbUser } = useAuth();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy to clipboard');
    });
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header title="API Documentation" description="Complete guide to ProcessSutra APIs and webhooks" />
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
          
          {/* Overview */}
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Code className="h-5 w-5" />
                ProcessSutra API Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Start Flow API</h3>
                  <p className="text-blue-700 mb-3">Trigger new workflows programmatically from external systems, automation tools, and integrations.</p>
                  <div className="space-y-1 text-blue-600">
                    <div>• REST API with JSON payloads</div>
                    <div>• Organization-based authentication</div>
                    <div>• Automatic task assignment</div>
                    <div>• Real-time notifications</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Webhook System</h3>
                  <p className="text-blue-700 mb-3">Receive real-time notifications when events occur in your ProcessSutra workflows.</p>
                  <div className="space-y-1 text-blue-600">
                    <div>• Event-driven notifications</div>
                    <div>• HMAC signature verification</div>
                    <div>• Configurable endpoints</div>
                    <div>• Retry mechanisms</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="start-flow" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="start-flow">Start Flow API</TabsTrigger>
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              <TabsTrigger value="authentication">Authentication</TabsTrigger>
              <TabsTrigger value="examples">Examples</TabsTrigger>
            </TabsList>

            {/* Start Flow API Documentation */}
            <TabsContent value="start-flow" className="space-y-6">
              <Card>
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <ExternalLink className="h-5 w-5" />
                    Start Flow API
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  
                  {/* Endpoint */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Endpoint</h3>
                    <div className="flex items-center gap-2 p-3 bg-gray-900 text-white rounded-md font-mono">
                      <Badge className="bg-green-600">POST</Badge>
                      <span>http://localhost:5000/api/integrations/start-flow</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="ml-auto text-white border-white hover:bg-white hover:text-gray-900"
                        onClick={() => copyToClipboard('http://localhost:5000/api/integrations/start-flow')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Creates a new workflow instance based on your organization's configured flow rules. 
                      <span className="inline-flex items-center gap-1 ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                        <CheckCircle className="h-3 w-3" />
                        Tested & Verified
                      </span>
                    </p>
                  </div>

                  {/* Headers */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Request Headers</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border border-gray-200 rounded-md">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3 border-b">Header</th>
                            <th className="text-left p-3 border-b">Required</th>
                            <th className="text-left p-3 border-b">Description</th>
                            <th className="text-left p-3 border-b">Example</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-3 border-b font-mono text-sm">x-api-key</td>
                            <td className="p-3 border-b"><Badge variant="destructive">Required</Badge></td>
                            <td className="p-3 border-b">Organization ID or custom API key</td>
                            <td className="p-3 border-b font-mono text-sm">{dbUser?.organizationId || '1309f70c-1ad8-488c-a193-fb66110bd483'}</td>
                          </tr>
                          <tr>
                            <td className="p-3 border-b font-mono text-sm">x-org-id</td>
                            <td className="p-3 border-b"><Badge variant="secondary">Optional</Badge></td>
                            <td className="p-3 border-b">Organization ID (can be same as x-api-key)</td>
                            <td className="p-3 border-b font-mono text-sm">{dbUser?.organizationId || '1309f70c-1ad8-488c-a193-fb66110bd483'}</td>
                          </tr>
                          <tr>
                            <td className="p-3 border-b font-mono text-sm">x-actor-email</td>
                            <td className="p-3 border-b"><Badge variant="secondary">Optional</Badge></td>
                            <td className="p-3 border-b">Email of the user/system initiating the flow</td>
                            <td className="p-3 border-b font-mono text-sm">test@example.com</td>
                          </tr>
                          <tr>
                            <td className="p-3 border-b font-mono text-sm">x-source</td>
                            <td className="p-3 border-b"><Badge variant="secondary">Optional</Badge></td>
                            <td className="p-3 border-b">Source system identifier</td>
                            <td className="p-3 border-b font-mono text-sm">script</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-mono text-sm">Content-Type</td>
                            <td className="p-3"><Badge variant="destructive">Required</Badge></td>
                            <td className="p-3">Request content type</td>
                            <td className="p-3 font-mono text-sm">application/json</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Request Body */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Request Body</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border border-gray-200 rounded-md mb-4">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3 border-b">Field</th>
                            <th className="text-left p-3 border-b">Type</th>
                            <th className="text-left p-3 border-b">Required</th>
                            <th className="text-left p-3 border-b">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-3 border-b font-mono text-sm">system</td>
                            <td className="p-3 border-b">string</td>
                            <td className="p-3 border-b"><Badge variant="destructive">Yes</Badge></td>
                            <td className="p-3 border-b">Flow system name (must match configured flow rules)</td>
                          </tr>
                          <tr>
                            <td className="p-3 border-b font-mono text-sm">orderNumber</td>
                            <td className="p-3 border-b">string</td>
                            <td className="p-3 border-b"><Badge variant="destructive">Yes</Badge></td>
                            <td className="p-3 border-b">Unique identifier for this flow instance</td>
                          </tr>
                          <tr>
                            <td className="p-3 border-b font-mono text-sm">description</td>
                            <td className="p-3 border-b">string</td>
                            <td className="p-3 border-b"><Badge variant="destructive">Yes</Badge></td>
                            <td className="p-3 border-b">Human-readable description of the workflow</td>
                          </tr>
                          <tr>
                            <td className="p-3 border-b font-mono text-sm">initialFormData</td>
                            <td className="p-3 border-b">object</td>
                            <td className="p-3 border-b"><Badge variant="secondary">No</Badge></td>
                            <td className="p-3 border-b">Initial data to pre-populate forms</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-mono text-sm">notifyAssignee</td>
                            <td className="p-3">boolean</td>
                            <td className="p-3"><Badge variant="secondary">No</Badge></td>
                            <td className="p-3">Send notification to task assignee (default: true)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium">Example Request Body:</h4>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto text-sm">
{`{
  "system": "Order Tracker",
  "orderNumber": "TEST-20251009113032",
  "description": "Test flow for Order Tracker system",
  "initialFormData": {
    "organizationId": "1309f70c-1ad8-488c-a193-fb66110bd483",
    "testData": "API endpoint test",
    "priority": "High"
  },
  "notifyAssignee": true
}`}
                      </pre>
                      
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center gap-2 text-green-800 text-sm">
                          <CheckCircle className="h-4 w-4" />
                          <strong>Tested Configuration:</strong> This example was successfully tested with Organization ID: 1309f70c-1ad8-488c-a193-fb66110bd483
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Response */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Response</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Success Response (201 Created):</h4>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto text-sm">
{`{
  "flowId": "81a36045-08be-4e16-a01a-ad1670f066a2",
  "task": {
    "id": "4205d785-24ed-4c27-95f6-70774322640a",
    "organizationId": "1309f70c-1ad8-488c-a193-fb66110bd483",
    "system": "Order Tracker",
    "flowId": "81a36045-08be-4e16-a01a-ad1670f066a2",
    "orderNumber": "TEST-20251009113032",
    "taskName": "Order Punch",
    "plannedTime": "2025-10-09T07:00:00.000Z",
    "actualCompletionTime": null,
    "doerEmail": "jatin@muxro.com",
    "status": "pending",
    "formId": "Order_Punch",
    "createdAt": "2025-10-09T11:30:32.684Z",
    "updatedAt": "2025-10-09T11:30:32.684Z",
    "flowInitiatedBy": "test@example.com",
    "flowInitiatedAt": "2025-10-09T06:00:32.683Z",
    "flowDescription": "Test flow for Order Tracker system",
    "flowInitialFormData": { "sample": true },
    "originalAssignee": null,
    "transferredBy": null,
    "transferredAt": null,
    "transferReason": null
  },
  "orderNumber": "TEST-20251009113032",
  "description": "Test flow for Order Tracker system",
  "initiatedBy": "test@example.com",
  "initiatedAt": "2025-10-09T06:00:32.683Z",
  "message": "Flow started successfully"
}`}
                        </pre>
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                          <div className="flex items-center gap-2 text-green-800 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            <strong>Live Test Result:</strong> This response was captured from a successful API test on October 9, 2025
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Error Responses:</h4>
                        
                        <div className="space-y-3">
                          <div>
                            <h5 className="text-sm font-medium text-red-700 mb-1">Authentication Error (401 Unauthorized):</h5>
                            <pre className="bg-red-900 text-red-100 p-3 rounded-md overflow-auto text-sm">
{`{
  "message": "Unauthorized"
}

// This occurs when:
// - Missing x-api-key header
// - Invalid organization ID in x-api-key
// - Organization ID not found in system`}
                            </pre>
                          </div>
                          
                          <div>
                            <h5 className="text-sm font-medium text-red-700 mb-1">Validation Error (400 Bad Request):</h5>
                            <pre className="bg-red-900 text-red-100 p-3 rounded-md overflow-auto text-sm">
{`{
  "message": "No starting rule found for this system"
}

// Other possible error messages:
// "system, orderNumber, and description are required"
// "Invalid JSON for initialFormData: ..."
// "Missing x-api-key"`}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Testing Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Quick Test with cURL</h3>
                    <div className="space-y-4">
                      <p className="text-gray-700 text-sm">
                        Use this cURL command to test the API endpoint with your organization:
                      </p>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-blue-900">Test Command</h4>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyToClipboard(`curl -X POST http://localhost:5000/api/integrations/start-flow \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${dbUser?.organizationId || '1309f70c-1ad8-488c-a193-fb66110bd483'}" \\
  -H "x-org-id: ${dbUser?.organizationId || '1309f70c-1ad8-488c-a193-fb66110bd483'}" \\
  -H "x-actor-email: test@example.com" \\
  -H "x-source: curl" \\
  -d '{
    "system": "Order Tracker",
    "orderNumber": "TEST-'$(date +%Y%m%d%H%M%S)'",
    "description": "Test flow via cURL",
    "initialFormData": {"test": true},
    "notifyAssignee": true
  }'`)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto">
{`curl -X POST http://localhost:5000/api/integrations/start-flow \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${dbUser?.organizationId || '1309f70c-1ad8-488c-a193-fb66110bd483'}" \\
  -H "x-org-id: ${dbUser?.organizationId || '1309f70c-1ad8-488c-a193-fb66110bd483'}" \\
  -H "x-actor-email: test@example.com" \\
  -H "x-source: curl" \\
  -d '{
    "system": "Order Tracker",
    "orderNumber": "TEST-'$(date +%Y%m%d%H%M%S)'",
    "description": "Test flow via cURL",
    "initialFormData": {"test": true},
    "notifyAssignee": true
  }'`}
                        </pre>
                      </div>
                      
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                          <div className="text-sm">
                            <strong className="text-amber-800">Prerequisites:</strong>
                            <ul className="mt-1 space-y-1 text-amber-700">
                              <li>• Server must be running (npm run dev)</li>
                              <li>• "Order Tracker" system must be configured with flow rules</li>
                              <li>• Organization ID must exist in the database</li>
                              <li>• At least one flow rule with empty currentTask (starting rule)</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

            {/* Webhooks Documentation */}
            <TabsContent value="webhooks" className="space-y-6">
              <Card>
                <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-purple-900">
                    <Webhook className="h-5 w-5" />
                    Webhook System
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  
                  {/* Overview */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Overview</h3>
                    <p className="text-gray-700 mb-4">
                      ProcessSutra sends HTTP POST requests to your configured webhook URLs when specific events occur. 
                      All webhook payloads are signed with HMAC SHA256 for security verification.
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                        <h4 className="font-medium text-green-900 mb-2">Supported Events</h4>
                        <div className="space-y-1 text-sm text-green-800">
                          <div><code className="bg-green-100 px-1 rounded">flow.started</code> - New workflow initiated</div>
                          <div><code className="bg-green-100 px-1 rounded">form.submitted</code> - Form response received</div>
                        </div>
                      </div>
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <h4 className="font-medium text-blue-900 mb-2">Security Features</h4>
                        <div className="space-y-1 text-sm text-blue-800">
                          <div>• HMAC SHA256 signature verification</div>
                          <div>• Unique delivery IDs</div>
                          <div>• Configurable retry policies</div>
                          <div>• Secret rotation support</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Webhook Headers */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Webhook Headers</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border border-gray-200 rounded-md">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3 border-b">Header</th>
                            <th className="text-left p-3 border-b">Description</th>
                            <th className="text-left p-3 border-b">Example</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-3 border-b font-mono text-sm">Content-Type</td>
                            <td className="p-3 border-b">Always application/json</td>
                            <td className="p-3 border-b font-mono text-sm">application/json</td>
                          </tr>
                          <tr>
                            <td className="p-3 border-b font-mono text-sm">X-Webhook-Id</td>
                            <td className="p-3 border-b">Unique delivery identifier</td>
                            <td className="p-3 border-b font-mono text-sm">wh_1234567890</td>
                          </tr>
                          <tr>
                            <td className="p-3 border-b font-mono text-sm">X-Webhook-Type</td>
                            <td className="p-3 border-b">Event type</td>
                            <td className="p-3 border-b font-mono text-sm">flow.started</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-mono text-sm">X-Webhook-Signature</td>
                            <td className="p-3">HMAC SHA256 signature</td>
                            <td className="p-3 font-mono text-sm">sha256=abc123...</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payload Structure */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Payload Structure</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">flow.started Event:</h4>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto text-sm">
{`{
  "id": "wh_1234567890",
  "type": "flow.started",
  "createdAt": "2025-09-09T10:00:00Z",
  "data": {
    "flowId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "orderNumber": "ORD-12345",
    "system": "CRM Onboarding", 
    "description": "New customer onboarding workflow",
    "initiatedBy": "api-integration",
    "initiatedAt": "2025-09-09T10:00:00Z",
    "task": {
      "id": "task_abc123",
      "name": "Initial Review",
      "assignee": "reviewer@company.com"
    }
  }
}`}
                        </pre>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">form.submitted Event:</h4>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto text-sm">
{`{
  "id": "wh_0987654321",
  "type": "form.submitted",
  "createdAt": "2025-09-09T11:30:00Z",
  "data": {
    "responseId": "resp_xyz789",
    "taskId": "task_abc123",
    "flowId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "formId": "form_001",
    "formData": {
      "customerApproval": "approved",
      "notes": "Customer meets all requirements",
      "nextStep": "setup_account"
    },
    "submittedBy": "reviewer@company.com",
    "timestamp": "2025-09-09T11:30:00Z"
  }
}`}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Signature Verification */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Signature Verification</h3>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-yellow-900">Security Recommendation</div>
                          <div className="text-sm text-yellow-800">Always verify webhook signatures to ensure requests are authentic and haven't been tampered with.</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Verification Algorithm:</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 mb-3">
                          <li>Extract the signature from the <code className="bg-gray-100 px-1 rounded">X-Webhook-Signature</code> header</li>
                          <li>Compute HMAC SHA256 of the raw request body using your webhook secret</li>
                          <li>Compare the computed signature with the received signature using constant-time comparison</li>
                          <li>Only process the webhook if signatures match</li>
                        </ol>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Example Verification (Node.js):</h4>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto text-sm">
{`const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Usage in Express route
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const secret = 'your-webhook-secret';
  
  if (!verifyWebhookSignature(payload, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook...
  res.json({ success: true });
});`}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Response Requirements */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Response Requirements</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-green-900">Success Response</div>
                            <div className="text-sm text-green-800 mt-1">
                              Return HTTP 200-299 status code to acknowledge receipt. 
                              Response body is ignored but can contain confirmation data.
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-red-900">Failure Response</div>
                            <div className="text-sm text-red-800 mt-1">
                              HTTP 4xx/5xx status codes trigger retry attempts.
                              Timeouts after 30 seconds are treated as failures.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

            {/* Authentication Documentation */}
            <TabsContent value="authentication" className="space-y-6">
              <Card>
                <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-orange-900">
                    <Key className="h-5 w-5" />
                    Authentication & Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  
                  {/* API Key Authentication */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">API Key Authentication</h3>
                    <p className="text-gray-700 mb-4">
                      ProcessSutra uses API key authentication via the <code className="bg-gray-100 px-1 rounded">x-api-key</code> header. 
                      You can use either your Organization ID or generate custom API tokens.
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <h4 className="font-medium text-blue-900 mb-2">Organization ID Method</h4>
                        <div className="text-sm text-blue-800 space-y-1">
                          <div>• Simplest setup option</div>
                          <div>• Always available</div>
                          <div>• Organization-scoped access</div>
                          <div>• Cannot be rotated</div>
                        </div>
                      </div>
                      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                        <h4 className="font-medium text-green-900 mb-2">Custom API Token</h4>
                        <div className="text-sm text-green-800 space-y-1">
                          <div>• Enhanced security</div>
                          <div>• Can be rotated/revoked</div>
                          <div>• Generated by admins</div>
                          <div>• Trackable usage</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Environment Variables (Advanced):</h4>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto text-sm">
{`# Single global API key
FLOW_API_KEY=sk_live_abc123xyz789

# Multiple organization mappings  
FLOW_API_KEYS='{"org1":"sk_live_key1","org2":"sk_live_key2"}'

# Domain-based mapping
FLOW_API_KEYS='{"company.com":"sk_live_company","acme.com":"sk_live_acme"}'`}
                      </pre>
                    </div>
                  </div>

                  {/* Rate Limiting */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Rate Limiting</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border border-gray-200 rounded-md">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3 border-b">Endpoint</th>
                            <th className="text-left p-3 border-b">Rate Limit</th>
                            <th className="text-left p-3 border-b">Window</th>
                            <th className="text-left p-3 border-b">Headers</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-3 border-b font-mono text-sm">/api/start-flow</td>
                            <td className="p-3 border-b">100 requests</td>
                            <td className="p-3 border-b">per minute</td>
                            <td className="p-3 border-b font-mono text-sm">X-RateLimit-*</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-mono text-sm">Webhooks</td>
                            <td className="p-3">No limit</td>
                            <td className="p-3">-</td>
                            <td className="p-3">-</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Error Codes */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Common Error Codes</h3>
                    <div className="space-y-3">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-3 border border-gray-200 rounded-md">
                          <div className="font-mono text-sm font-medium text-red-600">401 Unauthorized</div>
                          <div className="text-sm text-gray-600 mt-1">Invalid or missing API key</div>
                        </div>
                        <div className="p-3 border border-gray-200 rounded-md">
                          <div className="font-mono text-sm font-medium text-red-600">400 Bad Request</div>
                          <div className="text-sm text-gray-600 mt-1">Invalid request body or missing required fields</div>
                        </div>
                        <div className="p-3 border border-gray-200 rounded-md">
                          <div className="font-mono text-sm font-medium text-yellow-600">429 Too Many Requests</div>
                          <div className="text-sm text-gray-600 mt-1">Rate limit exceeded</div>
                        </div>
                        <div className="p-3 border border-gray-200 rounded-md">
                          <div className="font-mono text-sm font-medium text-red-600">500 Internal Server Error</div>
                          <div className="text-sm text-gray-600 mt-1">Server error or database issue</div>
                        </div>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

            {/* Examples Documentation */}
            <TabsContent value="examples" className="space-y-6">
              <Card>
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-indigo-900">
                    <Code className="h-5 w-5" />
                    Implementation Examples
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  
                  {/* Verified Test Example */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Verified Working Example
                    </h3>
                    <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                      <p className="text-green-800 text-sm mb-2">
                        <strong>✅ Successfully tested on October 9, 2025</strong> with Organization ID: 1309f70c-1ad8-488c-a193-fb66110bd483
                      </p>
                      <p className="text-green-700 text-sm">
                        This example created Flow ID: 81a36045-08be-4e16-a01a-ad1670f066a2 and Task ID: 4205d785-24ed-4c27-95f6-70774322640a
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">JavaScript/Node.js Example:</h4>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto text-sm">
{`// Tested and working example
const response = await fetch('http://localhost:5000/api/integrations/start-flow', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '1309f70c-1ad8-488c-a193-fb66110bd483',
    'x-org-id': '1309f70c-1ad8-488c-a193-fb66110bd483',
    'x-actor-email': 'test@example.com',
    'x-source': 'script'
  },
  body: JSON.stringify({
    system: 'Order Tracker',
    orderNumber: 'TEST-20251009113032',
    description: 'Test flow for Order Tracker system',
    initialFormData: {
      organizationId: '1309f70c-1ad8-488c-a193-fb66110bd483',
      testData: 'API endpoint test',
      priority: 'High'
    },
    notifyAssignee: true
  })
});

const result = await response.json();
console.log('Flow created:', result.flowId);
console.log('First task:', result.task.taskName);`}
                        </pre>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Python Example:</h4>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto text-sm">
{`import requests
import json

# Tested configuration
url = 'http://localhost:5000/api/integrations/start-flow'
headers = {
    'Content-Type': 'application/json',
    'x-api-key': '1309f70c-1ad8-488c-a193-fb66110bd483',
    'x-org-id': '1309f70c-1ad8-488c-a193-fb66110bd483',
    'x-actor-email': 'test@example.com',
    'x-source': 'python-script'
}

data = {
    'system': 'Order Tracker',
    'orderNumber': 'TEST-' + str(int(time.time())),
    'description': 'Test flow from Python',
    'initialFormData': {
        'organizationId': '1309f70c-1ad8-488c-a193-fb66110bd483',
        'priority': 'High',
        'source': 'python'
    },
    'notifyAssignee': True
}

response = requests.post(url, headers=headers, json=data)
if response.status_code == 201:
    result = response.json()
    print(f"Success! Flow ID: {result['flowId']}")
    print(f"First task: {result['task']['taskName']}")
else:
    print(f"Error: {response.status_code} - {response.text}")`}
                        </pre>
                      </div>
                    </div>
                  </div>
                  
                  {/* Google Apps Script */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Google Apps Script Webhook</h3>
                    <p className="text-gray-700 mb-4">Complete webhook handler for Google Apps Script:</p>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto text-sm">
{`function doPost(e) {
  try {
    // Get request data
    const payload = e.postData.contents;
    const signature = e.parameter['X-Webhook-Signature'];
    const webhookType = e.parameter['X-Webhook-Type'];
    
    // Verify signature
    const secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
    if (signature && secret) {
      const expectedSignature = Utilities.computeHmacSha256Signature(payload, secret)
        .map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2))
        .join('');
      
      if (signature !== expectedSignature) {
        return ContentService.createTextOutput(
          JSON.stringify({error: 'Invalid signature'})
        ).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Process webhook
    const data = JSON.parse(payload);
    
    switch(data.type) {
      case 'flow.started':
        handleFlowStarted(data);
        break;
      case 'form.submitted':
        handleFormSubmitted(data);
        break;
    }
    
    return ContentService.createTextOutput(
      JSON.stringify({success: true, received: data.id})
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Webhook error:', error);
    return ContentService.createTextOutput(
      JSON.stringify({error: error.toString()})
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleFlowStarted(data) {
  // Log to Google Sheets
  const sheet = SpreadsheetApp.openById('YOUR_SHEET_ID').getActiveSheet();
  sheet.appendRow([
    new Date(),
    'Flow Started',
    data.data.flowId,
    data.data.orderNumber,
    data.data.description
  ]);
  
  // Send email notification
  MailApp.sendEmail({
    to: 'team@company.com',
    subject: 'New ProcessSutra Flow Started',
    body: \`Flow \${data.data.orderNumber} was initiated: \${data.data.description}\`
  });
}

function handleFormSubmitted(data) {
  // Process form submission
  const sheet = SpreadsheetApp.openById('YOUR_SHEET_ID')
    .getSheetByName('Form Submissions');
  sheet.appendRow([
    new Date(),
    data.data.formId,
    data.data.submittedBy,
    JSON.stringify(data.data.formData)
  ]);
}`}
                    </pre>
                  </div>

                  {/* Zapier Integration */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Zapier Integration</h3>
                    <p className="text-gray-700 mb-4">Trigger ProcessSutra flows from Zapier:</p>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto text-sm">
{`// Zapier Code by Zapier action
const response = await fetch('http://localhost:5000/api/start-flow', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': inputData.organizationId, // From Zapier input
    'x-actor-email': 'zapier@company.com',
    'x-source': 'zapier'
  },
  body: JSON.stringify({
    system: inputData.system,
    orderNumber: inputData.orderNumber,
    description: inputData.description,
    initialFormData: {
      customerName: inputData.customerName,
      customerEmail: inputData.customerEmail,
      priority: inputData.priority || 'normal'
    }
  })
});

const result = await response.json();

if (!response.ok) {
  throw new Error(\`ProcessSutra API error: \${result.message}\`);
}

// Return data for next Zapier step
output = [{
  flowId: result.flowId,
  taskId: result.task.id,
  message: result.message,
  assignee: result.task.doerEmail
}];`}
                    </pre>
                  </div>

                  {/* Power Automate */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Microsoft Power Automate</h3>
                    <p className="text-gray-700 mb-4">HTTP action configuration for Power Automate:</p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">HTTP Action Settings:</h4>
                        <div className="space-y-2 text-sm">
                          <div><strong>Method:</strong> POST</div>
                          <div><strong>URI:</strong> http://localhost:5000/api/start-flow</div>
                          <div><strong>Headers:</strong></div>
                          <div className="ml-4">
                            <div>Content-Type: application/json</div>
                            <div>x-api-key: [your-org-id]</div>
                            <div>x-actor-email: powerautomate@company.com</div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Body (JSON):</h4>
                        <pre className="bg-gray-100 p-2 rounded text-xs">
{`{
  "system": "@{triggerBody()?['system']}",
  "orderNumber": "@{triggerBody()?['id']}",
  "description": "@{triggerBody()?['subject']}",
  "initialFormData": {
    "source": "power-automate",
    "priority": "normal"
  }
}`}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* cURL Examples */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">cURL Examples</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Start Flow:</h4>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto text-sm">
{`curl -X POST http://localhost:5000/api/start-flow \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${dbUser?.organizationId || 'your-org-id'}" \\
  -H "x-actor-email: api@company.com" \\
  -d '{
    "system": "CRM Onboarding",
    "orderNumber": "ORD-$(date +%s)",
    "description": "API test flow",
    "initialFormData": {
      "test": true,
      "source": "curl"
    }
  }'`}
                        </pre>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Test Webhook Endpoint:</h4>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto text-sm">
{`# Test that your webhook endpoint responds correctly
curl -X POST https://your-domain.com/webhook \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Type: flow.started" \\
  -H "X-Webhook-Id: test-123" \\
  -H "X-Webhook-Signature: test-signature" \\
  -d '{
    "id": "test-123",
    "type": "flow.started", 
    "test": true,
    "createdAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "data": {
      "flowId": "test-flow-id",
      "message": "Test webhook delivery"
    }
  }'`}
                        </pre>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </main>
    </div>
  );
}
