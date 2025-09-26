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

  // Webhook state
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [hooksLoading, setHooksLoading] = useState<boolean>(false);
  const [hookError, setHookError] = useState<string>("");
  const [creatingHook, setCreatingHook] = useState<boolean>(false);
  const [newEvent, setNewEvent] = useState<string>('flow.started');
  const [newTargetUrl, setNewTargetUrl] = useState<string>('https://example.com/webhooks/processsutra');
  const [newSecret, setNewSecret] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newActive, setNewActive] = useState<boolean>(true);
  const [revealSecretId, setRevealSecretId] = useState<string | null>(null);
  const [testHookUrl, setTestHookUrl] = useState<string>('');
  const [hookTestResult, setHookTestResult] = useState<string>('');
  const [hookTesting, setHookTesting] = useState<boolean>(false);

  const generateSecret = () => {
    const random = cryptoRandomString(48);
    setNewSecret(random);
  };

  // Simple random secret without external deps
  function cryptoRandomString(length: number) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      out += chars[array[i] % chars.length];
    }
    return out;
  }

  const loadWebhooks = async () => {
    if (!isAdmin) return;
    setHooksLoading(true); setHookError('');
    try {
      const res = await fetch('/api/webhooks');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setWebhooks(data);
    } catch (e:any) {
      setHookError(e.message || 'Failed to load webhooks');
    } finally { setHooksLoading(false); }
  };

  useEffect(() => { loadWebhooks(); }, [isAdmin]);

  const handleCreateWebhook = async () => {
    if (!isAdmin) return;
    if (!newEvent || !newTargetUrl || !newSecret) {
      setHookError('Event, Target URL, Secret required');
      return;
    }
    setCreatingHook(true); setHookError('');
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: newEvent, targetUrl: newTargetUrl, secret: newSecret, description: newDescription, isActive: newActive })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Reset form minimal
      setNewDescription('');
      // keep secret so user can copy again
      await loadWebhooks();
    } catch (e:any) {
      setHookError(e.message || 'Failed to create webhook');
    } finally { setCreatingHook(false); }
  };

  const toggleHookActive = async (hook: any) => {
    try {
      const res = await fetch(`/api/webhooks/${hook.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !hook.isActive }) });
      if (res.ok) await loadWebhooks();
    } catch {}
  };

  const deleteHook = async (hook: any) => {
    if (!window.confirm('Delete this webhook?')) return;
    try {
      const res = await fetch(`/api/webhooks/${hook.id}`, { method: 'DELETE' });
      if (res.ok) await loadWebhooks();
    } catch {}
  };

  const sendWebhookTest = async (opts: { url?: string; id?: string; event?: string }) => {
    setHookTesting(true); setHookTestResult('');
    try {
      const res = await fetch('/api/webhooks/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUrl: opts.url, webhookId: opts.id, event: opts.event }) });
      const json = await res.json();
      setHookTestResult(JSON.stringify(json, null, 2));
    } catch (e:any) {
      setHookTestResult(e.message || 'Test failed');
    } finally { setHookTesting(false); }
  };

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

// Call the working backend API directly
      const res = await fetch('http://localhost:5000/api/start-flow', {
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
                    <Button
                      variant="outline"
                      onClick={() => {
                        const value = token || orgId || "";
                        if (value) {
                          navigator.clipboard.writeText(value).then(() => {
                            alert("API Key copied to clipboard");
                          }).catch(() => {
                            alert("Failed to copy API Key");
                          });
                        }
                      }}
                      disabled={!(token || orgId)}
                    >
                      Copy
                    </Button>
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
// Update endpoint display
              <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded-md border">POST http://localhost:5000/api/start-flow</pre>
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
// Update example to match working API
Invoke-RestMethod -Uri "http://localhost:5000/api/start-flow" -Method Post -Headers $headers -Body $body -ContentType "application/json"`}</pre>
                </div>
                <div>
                  <div className="font-medium mb-2">Node fetch</div>
                  <pre className="text-xs bg-gray-50 p-3 rounded-md border">{`await fetch("http://localhost:5000/api/start-flow", {
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
                  <Input placeholder="your-organization-id" value={orgId || ""} onChange={(e) => setToken(e.target.value)} />
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
// Ensure Try it now button always works
                  <Button onClick={handleTest} disabled={testing || !(token || orgId)}>Send Test Request</Button>
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

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Webhooks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-sm text-gray-600">Configure outbound webhooks for events: <code className="bg-gray-100 px-1 rounded">flow.started</code>, <code className="bg-gray-100 px-1 rounded">form.submitted</code>. Your server must verify signatures (HMAC SHA256) sent in <code className="bg-gray-100 px-1 rounded">X-Webhook-Signature</code>.</div>
                <div className="border rounded-md p-4 space-y-4 bg-white/50">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Event</Label>
                      <select className="w-full border rounded-md h-9 px-2 text-sm" value={newEvent} onChange={e=>setNewEvent(e.target.value)}>
                        <option value="flow.started">flow.started</option>
                        <option value="form.submitted">form.submitted</option>
                      </select>
                    </div>
                    <div>
                      <Label>Target URL</Label>
                      <Input value={newTargetUrl} onChange={e=>setNewTargetUrl(e.target.value)} placeholder="https://..." />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 items-end">
                    <div>
                      <Label>Secret</Label>
                      <Input value={newSecret} onChange={e=>setNewSecret(e.target.value)} placeholder="Generate secret" />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={generateSecret}>Generate Secret</Button>
                      <Button type="button" onClick={()=>{ if(newSecret){navigator.clipboard.writeText(newSecret);} }}>Copy Secret</Button>
                    </div>
                  </div>
                  <div>
                    <Label>Description (optional)</Label>
                    <Input value={newDescription} onChange={e=>setNewDescription(e.target.value)} placeholder="Webhook description" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="activeHook" checked={newActive} onCheckedChange={(v)=>setNewActive(Boolean(v))} />
                    <Label htmlFor="activeHook">Active</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button disabled={creatingHook || !newSecret || !newTargetUrl} onClick={handleCreateWebhook}>{creatingHook? 'Creating...' : 'Add Webhook'}</Button>
                    <Button variant="outline" type="button" onClick={loadWebhooks} disabled={hooksLoading}>{hooksLoading? 'Refreshing...' : 'Refresh'}</Button>
                  </div>
                  {hookError && <div className="text-xs text-red-600">{hookError}</div>}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Existing Webhooks</div>
                  {hooksLoading && <div className="text-sm text-gray-500">Loading...</div>}
                  {!hooksLoading && webhooks.length === 0 && <div className="text-xs text-gray-500">No webhooks configured.</div>}
                  <div className="space-y-2">
                    {webhooks.map(hook => (
                      <div key={hook.id} className="border rounded-md p-3 bg-white/70 flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2 items-center justify-between">
                          <div className="font-mono text-xs break-all max-w-[55ch]">{hook.targetUrl}</div>
                          <div className="flex gap-2 items-center">
                            <Button size="sm" variant="outline" onClick={()=>sendWebhookTest({ id: hook.id, event: hook.event })}>Test</Button>
                            <Button size="sm" variant={hook.isActive? 'secondary':'outline'} onClick={()=>toggleHookActive(hook)}>{hook.isActive? 'Disable':'Enable'}</Button>
                            <Button size="sm" variant="destructive" onClick={()=>deleteHook(hook)}>Delete</Button>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-4 gap-2 text-xs">
                          <div><span className="font-semibold">Event:</span> {hook.event}</div>
                          <div className="truncate"><span className="font-semibold">Secret:</span> {revealSecretId===hook.id? hook.secret : '••••••••••'} <button className="underline ml-1" onClick={()=> setRevealSecretId(revealSecretId===hook.id? null : hook.id)}>{revealSecretId===hook.id? 'hide':'show'}</button></div>
                          <div><span className="font-semibold">Created:</span> {hook.createdAt ? new Date(hook.createdAt).toLocaleString() : ''}</div>
                          <div className="truncate"><span className="font-semibold">Desc:</span> {hook.description || '-'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {webhooks.length > 0 && (
                    <div className="text-xs text-gray-500">Store secrets securely. Rotate if leaked.</div>
                  )}
                </div>
                <div className="text-xs text-gray-500 border-t pt-3">
                  Signature = HMAC_SHA256(secret, raw_body). Verify with constant-time compare. Headers: X-Webhook-Type, X-Webhook-Id, X-Webhook-Signature.
                </div>
                <div className="border-t pt-4 space-y-3">
                  <div className="text-sm font-medium">Ad-hoc Test URL</div>
                  <div className="flex flex-col md:flex-row gap-2">
                    <Input placeholder="https://your-server.com/webhook" value={testHookUrl} onChange={e=>setTestHookUrl(e.target.value)} />
                    <Button disabled={!testHookUrl || hookTesting} onClick={()=>sendWebhookTest({ url: testHookUrl, event: newEvent })}>{hookTesting? 'Testing...':'Send Test'}</Button>
                  </div>
                  {hookTestResult && (
                    <pre className="text-xs bg-gray-50 p-3 rounded-md border whitespace-pre-wrap max-h-64 overflow-auto">{hookTestResult}</pre>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
