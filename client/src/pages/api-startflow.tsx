import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";

export default function ApiStartFlow() {
  const { dbUser } = useAuth();
  const isAdmin = dbUser?.role === 'admin';
  const [token, setToken] = useState<string>("");
  const [orgId, setOrgId] = useState<string | undefined>(dbUser?.organizationId);
  const [system, setSystem] = useState<string>("CRM Onboarding");
  const [orderNumber, setOrderNumber] = useState<string>('ORD-12345');
  const [description, setDescription] = useState<string>("New account setup");
  const [initialFormData, setInitialFormData] = useState<string>("{\n  \"account\": \"Acme\"\n}");
  const [notifyAssignee, setNotifyAssignee] = useState<boolean>(true);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string>("");
  const [testError, setTestError] = useState<string>("");
  const [tokenError, setTokenError] = useState<string>("");

  // Keep local orgId in sync and try fetching it if missing
  useEffect(() => {
    setOrgId(dbUser?.organizationId);
  }, [dbUser?.organizationId]);

  useEffect(() => {
    if (!orgId) {
      (async () => {
        try {
          const res = await fetch('/api/auth/user');
          if (res.ok) {
            const u = await res.json();
            setOrgId(u.organizationId);
          }
        } catch {}
      })();
    }
  }, [orgId]);

  const parsedInitialData = useMemo(() => {
    try {
      if (!initialFormData.trim()) return undefined;
      return JSON.parse(initialFormData);
    } catch {
      return undefined;
    }
  }, [initialFormData]);

  const handleGenerate = async () => {
    if (!isAdmin) return;
    try {
      setTokenError("");
      const res = await fetch('/api/admin/integrations/token', { method: 'POST' });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || 'Failed to generate');
      }
      const data = await res.json();
      setToken(data.token || "");
    } catch (e) {
      console.error(e);
      setToken("");
      setTokenError((e as any)?.message || 'Failed to generate token');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult("");
    setTestError("");
    try {
      if (!token) throw new Error('Provide x-api-key (use your Organization ID)');
      if (!system || !orderNumber || !description) throw new Error('Fill required body fields');
      if (initialFormData.trim() && !parsedInitialData) throw new Error('Initial form data must be valid JSON');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': token,
      };

      const body: any = {
        system,
        orderNumber,
        description,
        notifyAssignee,
      };
      if (parsedInitialData) body.initialFormData = parsedInitialData;

      const res = await fetch('/api/integrations/start-flow', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        setTestResult(JSON.stringify(json, null, 2));
      } catch {
        setTestResult(text);
      }
      if (!res.ok) setTestError(`HTTP ${res.status}`);
    } catch (err: any) {
      setTestError(err?.message || 'Request failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex h-screen bg-neutral">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header title="Start Flow API" description="Trigger flows from external tools and integrations" />
        <div className="p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Access Token</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isAdmin ? (
                <div className="text-sm text-gray-600">Only admins can generate integration tokens.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Your Organization ID</Label>
                      <Input readOnly value={orgId || "Unavailable"} />
                    </div>
                    <div>
                      <Label>API Key (x-api-key)</Label>
                      <Input readOnly value={token || orgId || "(generate or use Org ID)"} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleGenerate}>Generate Token</Button>
                    <Button variant="outline" onClick={() => navigator.clipboard.writeText(token || orgId || "")} disabled={!(token || orgId)}>Copy</Button>
                  </div>
                  {tokenError && (<div className="text-xs text-red-600">{tokenError}</div>)}
                  <div className="text-xs text-gray-500">API accepts header x-api-key. You can use your Organization ID as the key, or map custom keys via FLOW_API_KEYS.</div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Endpoint</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded-md border">POST /api/integrations/start-flow</pre>
              <div className="mt-4 text-sm text-gray-700">
                Use this endpoint to trigger a new flow based on your organization’s configured rules.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Headers</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-gray-50 p-3 rounded-md border">x-api-key: &lt;your_organization_id_or_custom_key&gt;
x-actor-email: bot@yourcompany.com (optional)
x-source: zapier (optional)</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Request Body</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-gray-50 p-3 rounded-md border">{`{
  "system": "CRM Onboarding",            // required
  "orderNumber": "ORD-12345",            // required
  "description": "New account setup",     // required
  "initialFormData": { "account": "Acme" }, // optional (object or JSON string)
  "notifyAssignee": true                  // optional (default true)
}`}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Response</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-gray-50 p-3 rounded-md border">{`{
  "flowId": "...",
  "task": { /* created task */ },
  "orderNumber": "ORD-12345",
  "description": "New account setup",
  "initiatedBy": "bot@yourcompany.com",
  "initiatedAt": "2025-08-23T10:05:00.000Z",
  "message": "Flow started successfully"
}`}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Examples</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <div className="font-medium mb-2">PowerShell</div>
                  <pre className="text-xs bg-gray-50 p-3 rounded-md border">{`$headers = @{ "x-api-key" = "YOUR_ORG_ID"; "x-actor-email" = "bot@yourcompany.com" }
    $body = @{ system = "CRM Onboarding"; orderNumber = "ORD-12345"; description = "New account setup"; initialFormData = @{ account = "Acme" } } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/integrations/start-flow" -Method Post -Headers $headers -Body $body -ContentType "application/json"`}</pre>
                </div>
                <div>
                  <div className="font-medium mb-2">Node fetch</div>
                  <pre className="text-xs bg-gray-50 p-3 rounded-md border">{`await fetch("/api/integrations/start-flow", {
  method: "POST",
  headers: {
    "x-api-key": "YOUR_ORG_ID",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ system: "CRM Onboarding", orderNumber: "ORD-12345", description: "New account setup" })
});`}</pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Try it now (Admin)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>API Key (x-api-key)</Label>
                  <Input placeholder="your-organization-id" value={token || orgId || ""} onChange={(e) => setToken(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>System</Label>
                    <Input value={system} onChange={(e) => setSystem(e.target.value)} />
                  </div>
                  <div>
                    <Label>Order Number</Label>
                    <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div>
                  <Label>Initial Form Data (JSON)</Label>
                  <textarea className="w-full min-h-[120px] text-sm p-2 border rounded-md" value={initialFormData} onChange={(e) => setInitialFormData(e.target.value)} />
                  {initialFormData.trim() && !parsedInitialData && (
                    <div className="text-xs text-red-600 mt-1">Invalid JSON</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="notify" checked={notifyAssignee} onCheckedChange={(v) => setNotifyAssignee(Boolean(v))} />
                  <Label htmlFor="notify">Notify assignee</Label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleTest} disabled={testing}>Send Test Request</Button>
                  {testing && <div className="text-sm text-gray-600 self-center">Sending…</div>}
                </div>
                {(testError || testResult) && (
                  <div>
                    {testError && <div className="text-sm text-red-600 mb-2">{testError}</div>}
                    {testResult && (
                      <pre className="text-xs bg-gray-50 p-3 rounded-md border whitespace-pre-wrap">{testResult}</pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
