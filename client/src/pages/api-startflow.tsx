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
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
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

  // API Keys state
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [keysLoading, setKeysLoading] = useState<boolean>(false);
  const [keyError, setKeyError] = useState<string>("");
  const [creatingKey, setCreatingKey] = useState<boolean>(false);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [newKeyDescription, setNewKeyDescription] = useState<string>('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string>('');
  const [showNewKey, setShowNewKey] = useState<boolean>(false);

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

  const loadApiKeys = async () => {
    if (!isAdmin) return;
    setKeysLoading(true); setKeyError('');
    try {
      const res = await fetch('/api/admin/integrations/keys');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setApiKeys(data);
    } catch (e:any) {
      setKeyError(e.message || 'Failed to load API keys');
    } finally { setKeysLoading(false); }
  };

  useEffect(() => { loadWebhooks(); loadApiKeys(); }, [isAdmin]);

  const handleCreateApiKey = async () => {
    if (!isAdmin || !newKeyName.trim()) return;
    setCreatingKey(true); setKeyError('');
    try {
      const res = await fetch('/api/admin/integrations/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName, description: newKeyDescription })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNewlyCreatedKey(data.apiKey);
      setShowNewKey(true);
      setNewKeyName('');
      setNewKeyDescription('');
      await loadApiKeys();
    } catch (e:any) {
      setKeyError(e.message || 'Failed to create API key');
    } finally { setCreatingKey(false); }
  };

  const toggleKeyActive = async (key: any) => {
    try {
      const res = await fetch(`/api/admin/integrations/keys/${key.id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ isActive: !key.isActive }) 
      });
      if (res.ok) await loadApiKeys();
    } catch {}
  };

  const deleteKey = async (key: any) => {
    if (!window.confirm('Delete this API key? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/integrations/keys/${key.id}`, { method: 'DELETE' });
      if (res.ok) await loadApiKeys();
    } catch {}
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
              <CardTitle>API Keys Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isAdmin ? (
                <div className="text-sm text-gray-600">Only admins can manage API keys.</div>
              ) : (
                <>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="text-sm font-medium text-blue-900 mb-2">🔐 Secure API Key System</div>
                    <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
                      <li>API keys are hashed and stored securely in the database</li>
                      <li>Keys are shown only once upon creation - save them immediately</li>
                      <li>Each key tracks last usage and can be individually revoked</li>
                      <li>Keys can optionally expire after a set date</li>
                    </ul>
                  </div>

                  {/* Create New API Key */}
                  <div className="border rounded-md p-4 space-y-4 bg-white/50">
                    <div className="text-sm font-medium">Create New API Key</div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Key Name *</Label>
                        <Input value={newKeyName} onChange={e=>setNewKeyName(e.target.value)} placeholder="Production API Key" />
                      </div>
                      <div>
                        <Label>Description (optional)</Label>
                        <Input value={newKeyDescription} onChange={e=>setNewKeyDescription(e.target.value)} placeholder="Used for production integrations" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button disabled={creatingKey || !newKeyName.trim()} onClick={handleCreateApiKey}>
                        {creatingKey ? 'Creating...' : 'Generate API Key'}
                      </Button>
                    </div>
                    {keyError && <div className="text-xs text-red-600">{keyError}</div>}
                  </div>

                  {/* Show newly created key */}
                  {showNewKey && newlyCreatedKey && (
                    <div className="p-4 bg-green-50 border-2 border-green-500 rounded-md">
                      <div className="text-sm font-semibold text-green-900 mb-2">✅ API Key Created Successfully!</div>
                      <div className="text-xs text-green-800 mb-3">⚠️ Save this key now - it will never be shown again!</div>
                      <div className="flex gap-2 items-center">
                        <code className="flex-1 bg-white p-2 rounded border text-xs break-all">{newlyCreatedKey}</code>
                        <Button size="sm" onClick={() => {
                          navigator.clipboard.writeText(newlyCreatedKey);
                          alert('API Key copied to clipboard!');
                        }}>Copy</Button>
                        <Button size="sm" variant="outline" onClick={() => {setShowNewKey(false); setNewlyCreatedKey('');}}>Close</Button>
                      </div>
                    </div>
                  )}

                  {/* Existing API Keys */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Your API Keys</div>
                    {keysLoading && <div className="text-sm text-gray-500">Loading...</div>}
                    {!keysLoading && apiKeys.length === 0 && <div className="text-xs text-gray-500">No API keys created yet.</div>}
                    <div className="space-y-2">
                      {apiKeys.map(key => (
                        <div key={key.id} className="border rounded-md p-3 bg-white/70 flex flex-col gap-2">
                          <div className="flex flex-wrap gap-2 items-center justify-between">
                            <div className="font-medium text-sm">{key.name}</div>
                            <div className="flex gap-2 items-center">
                              <Button size="sm" variant={key.isActive? 'secondary':'outline'} onClick={()=>toggleKeyActive(key)}>
                                {key.isActive? 'Active':'Disabled'}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={()=>deleteKey(key)}>Revoke</Button>
                            </div>
                          </div>
                          <div className="grid md:grid-cols-4 gap-2 text-xs text-gray-600">
                            <div><span className="font-semibold">Prefix:</span> <code className="bg-gray-100 px-1 rounded">{key.keyPrefix}</code></div>
                            <div><span className="font-semibold">Created:</span> {new Date(key.createdAt).toLocaleDateString()}</div>
                            <div><span className="font-semibold">Last Used:</span> {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}</div>
                            <div className="truncate"><span className="font-semibold">Desc:</span> {key.description || '-'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 border-t pt-3">
                    💡 Use any active API key as the <code className="bg-gray-100 px-1 rounded">x-api-key</code> header in your requests. Keys can be revoked at any time.
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Legacy Organization ID (Deprecated)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isAdmin ? (
                <div className="text-sm text-gray-600">Only admins can view organization details.</div>
              ) : (
                <>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="text-xs text-yellow-800">
                      ⚠️ Using organization ID as API key is deprecated. Please create proper API keys above for better security and tracking.
                    </div>
                  </div>
                  <div>
                    <Label>Your Organization ID</Label>
                    <Input readOnly value={orgId || "Unavailable"} />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (orgId) {
                        navigator.clipboard.writeText(orgId).then(() => {
                          alert("Organization ID copied to clipboard");
                        }).catch(() => {
                          alert("Failed to copy Organization ID");
                        });
                      }
                    }}
                    disabled={!orgId}
                  >
                    Copy Organization ID
                  </Button>
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
              <pre className="text-sm bg-gray-50 p-3 rounded-md border">x-api-key: sk_live_your_api_key_here
x-actor-email: bot@yourcompany.com (optional)
x-source: zapier (optional)</pre>
              <div className="mt-3 text-xs text-gray-600">
                Use a properly generated API key from the management section above. Legacy organization ID support is maintained for backward compatibility.
              </div>
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
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm font-medium text-blue-900 mb-2">📢 Automatic Webhook Notifications</div>
                <div className="text-xs text-blue-800">
                  When a flow starts successfully, a <code className="bg-blue-100 px-1 rounded">flow.started</code> webhook event is automatically triggered to all active webhooks configured below. Configure your webhook endpoints to receive real-time notifications with full flow details, including flowId, task assignments, and metadata.
                </div>
              </div>
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
                  <pre className="text-xs bg-gray-50 p-3 rounded-md border">{`$headers = @{ "x-api-key" = "sk_live_your_api_key_here"; "x-actor-email" = "bot@yourcompany.com" }
    $body = @{ system = "CRM Onboarding"; orderNumber = "ORD-12345"; description = "New account setup"; initialFormData = @{ account = "Acme" } } | ConvertTo-Json
// Update example to match working API
Invoke-RestMethod -Uri "http://localhost:5000/api/start-flow" -Method Post -Headers $headers -Body $body -ContentType "application/json"`}</pre>
                </div>
                <div>
                  <div className="font-medium mb-2">Node fetch</div>
                  <pre className="text-xs bg-gray-50 p-3 rounded-md border">{`await fetch("http://localhost:5000/api/start-flow", {
  method: "POST",
  headers: {
    "x-api-key": "sk_live_your_api_key_here",
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
                  <select 
                    className="w-full border rounded-md h-10 px-3 text-sm"
                    value={selectedKeyId} 
                    onChange={(e) => {
                      setSelectedKeyId(e.target.value);
                      const selected = apiKeys.find(k => k.id === e.target.value);
                      if (selected) {
                        setToken(''); // Can't use actual key for testing from here
                      } else {
                        setToken(e.target.value); // It's the org ID
                      }
                    }}
                  >
                    <option value="">Select an API key or use Org ID...</option>
                    {orgId && <option value={orgId}>Organization ID (Legacy - {orgId})</option>}
                  </select>
                  <div className="text-xs text-yellow-600 mt-1 p-2 bg-yellow-50 rounded border border-yellow-200">
                    ⚠️ For security, you need to copy a full API key from above to test it. The "Try it now" feature works with Organization ID (legacy method).
                  </div>
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
                <div className="text-xs text-gray-500">
                  💡 For testing with actual API keys, use curl, Postman, or your preferred HTTP client with the full key value.
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
                <div className="space-y-3">
                  <div className="text-sm text-gray-700">
                    Configure outbound webhooks for events: <code className="bg-gray-100 px-1 rounded">flow.started</code>, <code className="bg-gray-100 px-1 rounded">flow.resumed</code>, <code className="bg-gray-100 px-1 rounded">form.submitted</code>.
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="text-sm font-medium text-green-900 mb-2">🔒 Enterprise Security Features</div>
                    <ul className="text-xs text-green-800 space-y-1 ml-4 list-disc">
                      <li><strong>HMAC-SHA256 Signatures:</strong> All requests include <code className="bg-green-100 px-1 rounded">X-Webhook-Signature</code> header for authenticity verification</li>
                      <li><strong>SSRF Protection:</strong> Blocks internal IPs, cloud metadata services (AWS/Azure/GCP), and prevents redirect-based attacks</li>
                      <li><strong>Automatic Retries:</strong> Failed deliveries retry 3 times with exponential backoff (1min → 5min → 30min)</li>
                      <li><strong>10-second Timeout:</strong> Prevents hanging requests</li>
                      <li><strong>Delivery Logging:</strong> Track all webhook attempts, HTTP status, latency, and errors</li>
                      <li><strong>HTTPS Required:</strong> Production webhooks must use HTTPS (HTTP allowed for localhost in development)</li>
                    </ul>
                  </div>
                  <div className="text-xs text-gray-600">
                    Your webhook endpoint must verify the signature using constant-time comparison to prevent timing attacks.
                  </div>
                </div>
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
                  <div className="font-medium mb-2">Webhook Payload Example (flow.started):</div>
                  <pre className="bg-gray-50 p-3 rounded-md border whitespace-pre-wrap">{`{
  "id": "webhook-delivery-uuid",
  "type": "flow.started",
  "createdAt": "2025-11-07T10:30:00Z",
  "data": {
    "flowId": "flow-uuid",
    "orderNumber": "ORD-12345",
    "system": "CRM Onboarding",
    "description": "New account setup",
    "initiatedBy": "user@company.com",
    "initiatedAt": "2025-11-07T10:30:00Z",
    "task": {
      "id": "task-uuid",
      "name": "First Task Name",
      "assignee": "assignee@company.com"
    }
  }
}`}</pre>
                  <div className="mt-3 font-medium mb-2">Signature Verification Example (Node.js):</div>
                  <pre className="bg-gray-50 p-3 rounded-md border whitespace-pre-wrap">{`const crypto = require('crypto');

function verifyWebhookSignature(secret, body, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  
  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In your webhook handler:
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = 'your-webhook-secret';
  
  if (!verifyWebhookSignature(secret, req.body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process the webhook
  // Webhook data intentionally not logged for security
  res.json({ received: true });
});`}</pre>
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
