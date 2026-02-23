import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Key,
  Send,
  Play,
  Copy,
  Check,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Globe,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ────────────── helpers ────────────── */

function randomSecret(length = 48) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const arr = new Uint32Array(length);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, (v) => chars[v % chars.length]).join("");
}

function copyText(text: string, toast: any) {
  navigator.clipboard.writeText(text).then(
    () => toast({ title: "Copied!", description: "Copied to clipboard" }),
    () => toast({ title: "Copy failed", variant: "destructive" })
  );
}

/* ════════════════════════════════════════════════════════════════════ */

export default function ApiStartFlow() {
  const { dbUser } = useAuth();
  const { toast } = useToast();
  const isAdmin = dbUser?.role === "admin";
  const orgId = dbUser?.organizationId ?? "";

  /* ─── API keys state ─── */
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyDesc, setNewKeyDesc] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState("");

  /* ─── Webhook state ─── */
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [hooksLoading, setHooksLoading] = useState(false);
  const [newEvent, setNewEvent] = useState("flow.started");
  const [newTargetUrl, setNewTargetUrl] = useState("");
  const [newSecret, setNewSecret] = useState("");
  const [newHookDesc, setNewHookDesc] = useState("");
  const [creatingHook, setCreatingHook] = useState(false);
  const [revealSecretId, setRevealSecretId] = useState<string | null>(null);

  /* ─── Tester state ─── */
  const [testApiKey, setTestApiKey] = useState("");
  const [testSystem, setTestSystem] = useState("");
  const [testOrderNumber, setTestOrderNumber] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [testFormData, setTestFormData] = useState('{\n  "field": "value"\n}');
  const [testNotify, setTestNotify] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");

  /* ─── Fetch available flow names for the dropdown ─── */
  const { data: flowRules } = useQuery({
    queryKey: ["/api/flow-rules"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/flow-rules");
      return res.json();
    },
    enabled: isAdmin,
  });

  const flowNames = useMemo(() => {
    if (!flowRules || !Array.isArray(flowRules)) return [];
    const names = new Set<string>();
    flowRules.forEach((r: any) => {
      if (r.system) names.add(r.system);
    });
    return Array.from(names).sort();
  }, [flowRules]);

  // Pick first flow name as default when loaded
  useEffect(() => {
    if (flowNames.length > 0 && !testSystem) {
      setTestSystem(flowNames[0]);
    }
  }, [flowNames]);

  /* ─── API key CRUD ─── */
  const loadApiKeys = async () => {
    if (!isAdmin) return;
    setKeysLoading(true);
    try {
      const res = await fetch("/api/admin/integrations/keys");
      if (res.ok) setApiKeys(await res.json());
    } catch {}
    setKeysLoading(false);
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const res = await fetch("/api/admin/integrations/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName, description: newKeyDesc }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setNewlyCreatedKey(data.apiKey);
      setNewKeyName("");
      setNewKeyDesc("");
      await loadApiKeys();
      toast({ title: "API Key created" });
    } catch {
      toast({ title: "Failed to create API key", variant: "destructive" });
    }
    setCreatingKey(false);
  };

  const toggleKeyActive = async (key: any) => {
    await fetch(`/api/admin/integrations/keys/${key.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !key.isActive }),
    });
    await loadApiKeys();
  };

  const deleteKey = async (key: any) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    await fetch(`/api/admin/integrations/keys/${key.id}`, { method: "DELETE" });
    await loadApiKeys();
    toast({ title: "API key revoked" });
  };

  /* ─── Webhook CRUD ─── */
  const loadWebhooks = async () => {
    if (!isAdmin) return;
    setHooksLoading(true);
    try {
      const res = await fetch("/api/webhooks");
      if (res.ok) setWebhooks(await res.json());
    } catch {}
    setHooksLoading(false);
  };

  const createWebhook = async () => {
    if (!newTargetUrl || !newSecret) {
      toast({ title: "Target URL and Secret are required", variant: "destructive" });
      return;
    }
    setCreatingHook(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: newEvent, targetUrl: newTargetUrl, secret: newSecret, description: newHookDesc, isActive: true }),
      });
      if (!res.ok) throw new Error("Failed");
      setNewTargetUrl("");
      setNewHookDesc("");
      await loadWebhooks();
      toast({ title: "Webhook created" });
    } catch {
      toast({ title: "Failed to create webhook", variant: "destructive" });
    }
    setCreatingHook(false);
  };

  const toggleHookActive = async (hook: any) => {
    await fetch(`/api/webhooks/${hook.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !hook.isActive }),
    });
    await loadWebhooks();
  };

  const deleteHook = async (hook: any) => {
    if (!confirm("Delete this webhook?")) return;
    await fetch(`/api/webhooks/${hook.id}`, { method: "DELETE" });
    await loadWebhooks();
    toast({ title: "Webhook deleted" });
  };

  useEffect(() => {
    loadApiKeys();
    loadWebhooks();
  }, [isAdmin]);

  /* ─── Tester ─── */
  const parsedFormData = useMemo(() => {
    try {
      if (!testFormData.trim()) return undefined;
      return JSON.parse(testFormData);
    } catch {
      return undefined;
    }
  }, [testFormData]);

  const handleTestApi = async () => {
    setTesting(true);
    setTestResult("");
    setTestStatus("idle");

    try {
      if (!testApiKey) throw new Error("Enter an API key");
      if (!testSystem) throw new Error("Select a flow name (system)");
      if (!testOrderNumber) throw new Error("Enter an order number");
      if (!testDescription) throw new Error("Enter a description");
      if (testFormData.trim() && !parsedFormData) throw new Error("Initial form data must be valid JSON");

      const body: any = {
        system: testSystem,
        orderNumber: testOrderNumber,
        description: testDescription,
        notifyAssignee: testNotify,
      };
      if (parsedFormData) body.initialFormData = parsedFormData;

      const res = await fetch("/api/integrations/start-flow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": testApiKey,
        },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));
      setTestResult(JSON.stringify(json, null, 2));
      setTestStatus(res.ok ? "success" : "error");
    } catch (err: any) {
      setTestResult(err.message || "Request failed");
      setTestStatus("error");
    }
    setTesting(false);
  };

  if (!isAdmin) {
    return (
      <AppLayout title="API & Webhooks" description="Integration APIs">
        <div className="text-center py-12 text-gray-500">Only admins can access this page.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="API & Webhooks" description="Start flows from external tools, manage keys and webhooks">
      <div className="max-w-5xl mx-auto">
        <Tabs defaultValue="keys" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-11">
            <TabsTrigger value="keys" className="gap-1.5"><Key className="h-4 w-4" /> API Keys</TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-1.5"><Globe className="h-4 w-4" /> Webhooks</TabsTrigger>
            <TabsTrigger value="test" className="gap-1.5"><Play className="h-4 w-4" /> Test API</TabsTrigger>
          </TabsList>

          {/* ═══════════ API KEYS TAB ═══════════ */}
          <TabsContent value="keys" className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Secure API Key System</p>
                <ul className="text-xs text-blue-800 space-y-0.5 list-disc ml-4">
                  <li>Keys are hashed — shown only once on creation</li>
                  <li>Each key tracks usage and can be individually revoked</li>
                  <li>Use <code className="bg-blue-100 px-1 rounded">x-api-key</code> header in every request</li>
                </ul>
              </div>
            </div>

            {/* Create Key */}
            <div className="bg-white border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Create New API Key</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Key Name *</Label>
                  <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. Production ERP Key" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={newKeyDesc} onChange={(e) => setNewKeyDesc(e.target.value)} placeholder="Optional description" />
                </div>
              </div>
              <Button onClick={createApiKey} disabled={creatingKey || !newKeyName.trim()}>
                {creatingKey ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : <><Key className="h-4 w-4 mr-2" /> Generate API Key</>}
              </Button>
            </div>

            {/* Newly Created Key */}
            {newlyCreatedKey && (
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-900">API Key Created!</span>
                </div>
                <p className="text-xs text-green-800">
                  <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                  Copy this key now — it will <strong>never be shown again</strong>.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border rounded p-2.5 text-xs font-mono break-all select-all">{newlyCreatedKey}</code>
                  <Button size="sm" onClick={() => copyText(newlyCreatedKey, toast)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button size="sm" variant="outline" onClick={() => setNewlyCreatedKey("")}>Dismiss</Button>
              </div>
            )}

            {/* Existing Keys */}
            <div className="bg-white border rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Your API Keys</h3>
                <Button size="sm" variant="ghost" onClick={loadApiKeys} disabled={keysLoading}>
                  <RefreshCw className={`h-4 w-4 ${keysLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {apiKeys.length === 0 && !keysLoading && (
                <p className="text-sm text-gray-500">No API keys yet. Create one above to get started.</p>
              )}

              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-sm">{key.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${key.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {key.isActive ? "Active" : "Disabled"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => toggleKeyActive(key)}>
                          {key.isActive ? "Disable" : "Enable"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteKey(key)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500">
                      <div>
                        <span className="font-medium text-gray-700">Prefix:</span>{" "}
                        <code className="bg-gray-100 px-1 rounded">{key.keyPrefix}</code>
                      </div>
                      <div><span className="font-medium text-gray-700">Created:</span> {new Date(key.createdAt).toLocaleDateString()}</div>
                      <div><span className="font-medium text-gray-700">Last Used:</span> {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}</div>
                      <div className="truncate"><span className="font-medium text-gray-700">Desc:</span> {key.description || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Org ID (legacy) */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Legacy: Organization ID</span>
              </div>
              <p className="text-xs text-yellow-800">Using organization ID as API key is deprecated. Use proper API keys for better security and tracking.</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-white border border-yellow-300 rounded px-2 py-1 flex-1 font-mono">{orgId || "Unavailable"}</code>
                <Button size="sm" variant="outline" onClick={() => copyText(orgId, toast)} disabled={!orgId}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════ WEBHOOKS TAB ═══════════ */}
          <TabsContent value="webhooks" className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-900">
                <p className="font-semibold mb-1">Enterprise Webhook Security</p>
                <ul className="text-xs text-green-800 space-y-0.5 list-disc ml-4">
                  <li><strong>HMAC-SHA256</strong> signature on every delivery (<code className="bg-green-100 px-1 rounded">X-Webhook-Signature</code>)</li>
                  <li><strong>SSRF protection:</strong> blocks internal IPs and cloud metadata</li>
                  <li><strong>Auto-retry:</strong> 3 retries with exponential backoff (1→5→30 min)</li>
                  <li><strong>10s timeout</strong> per delivery, full delivery logging</li>
                </ul>
              </div>
            </div>

            {/* Create Webhook */}
            <div className="bg-white border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Add Webhook</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Event</Label>
                  <select className="w-full border rounded-md h-10 px-3 text-sm bg-white" value={newEvent} onChange={(e) => setNewEvent(e.target.value)}>
                    <option value="flow.started">flow.started</option>
                    <option value="flow.resumed">flow.resumed</option>
                    <option value="form.submitted">form.submitted</option>
                  </select>
                </div>
                <div>
                  <Label>Target URL *</Label>
                  <Input value={newTargetUrl} onChange={(e) => setNewTargetUrl(e.target.value)} placeholder="https://your-server.com/webhook" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Secret *</Label>
                  <div className="flex gap-2">
                    <Input value={newSecret} onChange={(e) => setNewSecret(e.target.value)} placeholder="Click generate →" className="flex-1" />
                    <Button variant="outline" onClick={() => setNewSecret(randomSecret())}>Generate</Button>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={newHookDesc} onChange={(e) => setNewHookDesc(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <Button onClick={createWebhook} disabled={creatingHook || !newTargetUrl || !newSecret}>
                {creatingHook ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : <><Globe className="h-4 w-4 mr-2" /> Add Webhook</>}
              </Button>
            </div>

            {/* Existing Webhooks */}
            <div className="bg-white border rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Active Webhooks</h3>
                <Button size="sm" variant="ghost" onClick={loadWebhooks} disabled={hooksLoading}>
                  <RefreshCw className={`h-4 w-4 ${hooksLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {webhooks.length === 0 && !hooksLoading && (
                <p className="text-sm text-gray-500">No webhooks configured yet.</p>
              )}

              <div className="space-y-3">
                {webhooks.map((hook) => (
                  <div key={hook.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hook.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                        <span className="font-mono text-xs truncate max-w-[40ch]">{hook.targetUrl}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{hook.event}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => toggleHookActive(hook)}>
                          {hook.isActive ? "Disable" : "Enable"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteHook(hook)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-700">Secret:</span>
                        <code className="bg-gray-100 px-1 rounded">{revealSecretId === hook.id ? hook.secret : "••••••••••"}</code>
                        <button onClick={() => setRevealSecretId(revealSecretId === hook.id ? null : hook.id)}>
                          {revealSecretId === hook.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                      <div><span className="font-medium text-gray-700">Created:</span> {hook.createdAt ? new Date(hook.createdAt).toLocaleDateString() : ""}</div>
                      <div className="truncate"><span className="font-medium text-gray-700">Desc:</span> {hook.description || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Webhook Payload Example */}
            <div className="bg-white border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold">Webhook Payload Example</h3>
              <div className="bg-gray-900 rounded-lg p-4 text-xs font-mono text-gray-100 overflow-x-auto">
                <pre>{`{
  "id": "delivery-uuid",
  "type": "flow.started",
  "createdAt": "2026-02-23T16:05:14Z",
  "data": {
    "flowId": "flow-uuid",
    "orderNumber": "TRIP-001",
    "system": "Truck Trip Management",
    "description": "New truck trip",
    "initiatedBy": "user@company.com",
    "task": {
      "id": "task-uuid",
      "name": "Vehicle Visit in Yard",
      "assignee": "assignee@company.com"
    }
  }
}`}</pre>
              </div>

              <h3 className="font-semibold mt-2">Signature Verification (Node.js)</h3>
              <div className="bg-gray-900 rounded-lg p-4 text-xs font-mono text-gray-100 overflow-x-auto">
                <pre>{`const crypto = require('crypto');

app.post('/webhook', (req, res) => {
  const sig = req.headers['x-webhook-signature'];
  const expected = crypto
    .createHmac('sha256', YOUR_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  // Process webhook...
  res.json({ received: true });
});`}</pre>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════ TEST API TAB ═══════════ */}
          <TabsContent value="test" className="space-y-6">
            <div className="bg-white border rounded-lg p-6 space-y-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Play className="h-5 w-5 text-green-500" /> Test Start Flow API
              </h2>
              <p className="text-sm text-gray-600">
                Send a real API request to start a flow. This will create an actual task in your organization.
              </p>

              {/* API Key */}
              <div>
                <Label className="text-sm font-medium">API Key *</Label>
                <Input
                  value={testApiKey}
                  onChange={(e) => setTestApiKey(e.target.value)}
                  placeholder="sk_live_your_key_here or paste Organization ID"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Paste your full API key from the API Keys tab</p>
              </div>

              {/* System (flow name) */}
              <div>
                <Label className="text-sm font-medium">Flow Name (system) *</Label>
                {flowNames.length > 0 ? (
                  <select
                    className="w-full border rounded-md h-10 px-3 text-sm bg-white"
                    value={testSystem}
                    onChange={(e) => setTestSystem(e.target.value)}
                  >
                    {flowNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                ) : (
                  <Input value={testSystem} onChange={(e) => setTestSystem(e.target.value)} placeholder="Enter flow name" />
                )}
              </div>

              {/* Order Number + Description */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Order Number *</Label>
                  <Input
                    value={testOrderNumber}
                    onChange={(e) => setTestOrderNumber(e.target.value)}
                    placeholder={`TEST-${new Date().toISOString().slice(0, 10)}`}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Description *</Label>
                  <Input
                    value={testDescription}
                    onChange={(e) => setTestDescription(e.target.value)}
                    placeholder="API test flow"
                  />
                </div>
              </div>

              {/* Initial Form Data */}
              <div>
                <Label className="text-sm font-medium">Initial Form Data (JSON, optional)</Label>
                <textarea
                  className="w-full min-h-[100px] text-sm font-mono border rounded-md p-3 bg-gray-50"
                  value={testFormData}
                  onChange={(e) => setTestFormData(e.target.value)}
                />
                {testFormData.trim() && !parsedFormData && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><XCircle className="h-3 w-3" /> Invalid JSON</p>
                )}
              </div>

              {/* Notify */}
              <div className="flex items-center gap-2">
                <Checkbox id="test-notify" checked={testNotify} onCheckedChange={(v) => setTestNotify(Boolean(v))} />
                <Label htmlFor="test-notify" className="text-sm">Notify assignee via email</Label>
              </div>

              {/* Generated Request Preview */}
              <div>
                <Label className="text-sm font-medium text-gray-500">Request Preview</Label>
                <div className="bg-gray-900 rounded-lg p-4 text-xs font-mono text-gray-300 overflow-x-auto mt-1">
                  <div className="text-green-400">POST /api/integrations/start-flow</div>
                  <div className="text-blue-300">x-api-key: {testApiKey ? testApiKey.slice(0, 20) + "..." : "<your-key>"}</div>
                  <div className="text-gray-400 mt-1">{JSON.stringify({
                    system: testSystem || "...",
                    orderNumber: testOrderNumber || "...",
                    description: testDescription || "...",
                    ...(parsedFormData ? { initialFormData: parsedFormData } : {}),
                    notifyAssignee: testNotify,
                  }, null, 2)}</div>
                </div>
              </div>

              {/* Send Button */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleTestApi}
                  disabled={testing || !testApiKey || !testSystem || !testOrderNumber || !testDescription}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {testing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" /> Send Test Request</>
                  )}
                </Button>
                {testing && <span className="text-sm text-gray-500">Calling API...</span>}
              </div>

              {/* Result */}
              {testResult && (
                <div className={`rounded-lg border-2 p-4 space-y-2 ${
                  testStatus === "success" ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
                }`}>
                  <div className="flex items-center gap-2">
                    {testStatus === "success" ? (
                      <><CheckCircle className="h-5 w-5 text-green-600" /><span className="font-semibold text-green-900">Flow Started Successfully!</span></>
                    ) : (
                      <><XCircle className="h-5 w-5 text-red-600" /><span className="font-semibold text-red-900">Request Failed</span></>
                    )}
                  </div>
                  <pre className="text-xs font-mono bg-white rounded border p-3 overflow-x-auto whitespace-pre-wrap max-h-80">{testResult}</pre>
                  <Button size="sm" variant="outline" onClick={() => copyText(testResult, toast)}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy Response
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
