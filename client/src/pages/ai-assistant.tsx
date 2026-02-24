import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/app-layout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Send,
  Settings,
  Sparkles,
  Workflow,
  FileText,
  Play,
  Lightbulb,
  Loader2,
  Check,
  AlertCircle,
  Copy,
  Download,
  Key,
  Eye,
  EyeOff,
  Trash2,
  ArrowRight,
  Zap,
  MessageSquare,
  RotateCcw,
  ChevronDown,
  Cpu,
  GitBranch,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  parsedBlocks?: ParsedBlock[];
}

interface ParsedBlock {
  type: "flowrules" | "forms" | "simulation" | "text";
  content: any;
  raw: string;
}

interface FlowRuleData {
  system: string;
  rules: Array<{
    currentTask: string;
    status: string;
    nextTask: string;
    tat: number;
    tatType: string;
    doer: string;
    email: string;
    formId: string;
    transferable: boolean;
    transferToEmails: string;
    mergeCondition: string;
  }>;
}

interface FormData {
  formId: string;
  title: string;
  description: string;
  fields: Array<{
    label: string;
    type: string;
    required: boolean;
    placeholder: string;
    options: string[];
  }>;
}

// ─── Parse AI response for special blocks ─────

function parseAIResponse(text: string): ParsedBlock[] {
  if (!text) return [{ type: "text", content: text || "", raw: text || "" }];
  const blocks: ParsedBlock[] = [];
  const regex = /```json:(flowrules|forms|simulation)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before this block
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index).trim();
      if (textBefore) {
        blocks.push({ type: "text", content: textBefore, raw: textBefore });
      }
    }

    try {
      const parsed = JSON.parse(match[2]);
      blocks.push({
        type: match[1] as any,
        content: parsed,
        raw: match[2],
      });
    } catch {
      blocks.push({ type: "text", content: match[0], raw: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) {
      blocks.push({ type: "text", content: remaining, raw: remaining });
    }
  }

  return blocks.length > 0 ? blocks : [{ type: "text", content: text, raw: text }];
}

// ─── Markdown-lite renderer ───────────────────

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-base font-semibold mt-3 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-lg font-bold mt-4 mb-1">{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-2">
          <span className="text-blue-500 mt-1">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\.\s/)?.[1];
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-2">
          <span className="text-blue-500 font-medium min-w-[1.2rem]">{num}.</span>
          <span>{renderInline(line.replace(/^\d+\.\s/, ""))}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="leading-relaxed">{renderInline(line)}</p>);
    }
  });

  return <>{elements}</>;
}

function renderInline(text: string) {
  // Bold + code
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-blue-600 dark:text-blue-400">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

// ─── Flow Rules Preview Card ──────────────────

function FlowRulesCard({ data, onDeploy, deploying }: { data: FlowRuleData; onDeploy: () => void; deploying: boolean }) {
  const rules = data.rules || [];
  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30 my-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-base">{data.system}</CardTitle>
          </div>
          <Badge variant="outline" className="text-blue-600 border-blue-300">
            {rules.length} rules
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1">
          {rules.slice(0, 6).map((rule, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 w-5">{i + 1}.</span>
              <span className="font-medium">{rule.currentTask || "START"}</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="text-blue-700 dark:text-blue-300">{rule.nextTask}</span>
              <span className="text-gray-400 text-xs ml-auto">{rule.doer}</span>
            </div>
          ))}
          {rules.length > 6 && (
            <div className="text-xs text-gray-500 ml-7">...and {rules.length - 6} more</div>
          )}
        </div>
        <Separator />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onDeploy}
            disabled={deploying}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {deploying ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
            Deploy Flow
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Forms Preview Card ───────────────────────

function FormsCard({ data, onDeploy, deploying }: { data: FormData[]; onDeploy: () => void; deploying: boolean }) {
  return (
    <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30 my-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            <CardTitle className="text-base">Generated Forms</CardTitle>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-300">
            {data.length} form{data.length > 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map((form, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-green-500" />
            <span className="font-medium">{form.title}</span>
            <span className="text-gray-400 text-xs ml-auto">{form.fields?.length || 0} fields</span>
          </div>
        ))}
        <Separator />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onDeploy}
            disabled={deploying}
            className="bg-green-600 hover:bg-green-700"
          >
            {deploying ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
            Deploy Forms
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Simulation Card ──────────────────────────

function SimulationCard({ data }: { data: any }) {
  const steps = data.steps || [];
  return (
    <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/30 my-3">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5 text-purple-600" />
          <CardTitle className="text-base">Flow Simulation</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step: any, i: number) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs font-bold">
                {step.step}
              </div>
              {i < steps.length - 1 && <div className="w-0.5 flex-1 bg-purple-200 dark:bg-purple-800 mt-1" />}
            </div>
            <div className="flex-1 pb-3">
              <div className="font-medium text-sm">{step.task}</div>
              <div className="text-xs text-gray-500">{step.assignee} · {step.tat}</div>
              {step.form && step.form !== "none" && (
                <Badge variant="outline" className="text-xs mt-1">Form: {step.form}</Badge>
              )}
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{step.description}</p>
            </div>
          </div>
        ))}
        {data.totalTime && (
          <div className="pt-2 border-t text-sm">
            <span className="font-medium">Total estimated time:</span> {data.totalTime}
          </div>
        )}
        {data.bottlenecks?.length > 0 && (
          <div className="pt-2">
            <div className="text-sm font-medium text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Potential Bottlenecks
            </div>
            {data.bottlenecks.map((b: string, i: number) => (
              <div key={i} className="text-xs text-gray-600 dark:text-gray-400 ml-5">• {b}</div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Quick Prompt Chips ───────────────────────

const QUICK_PROMPTS = [
  { label: "Design a workflow", icon: Workflow, prompt: "I want to create a new workflow for my business. Let's start by understanding my business process, industry, team structure, and what I want to automate." },
  { label: "Create forms", icon: FileText, prompt: "I need to build forms for data collection in my workflow. Please understand my business type and customer type first, then help me design the right forms with relevant fields." },
  { label: "Simulate flow", icon: Play, prompt: "Please simulate my existing workflow and show me step-by-step how it executes, including all decision branches, parallel paths, and merge points." },
  { label: "Improve process", icon: Lightbulb, prompt: "Analyze my existing workflows and suggest improvements for efficiency, bottlenecks, decision logic, and optimization. Also suggest where decision boxes, parallel steps, or merge conditions could help." },
  { label: "Modify workflow", icon: GitBranch, prompt: "I want to modify an existing workflow. Please review my current flow rules and help me update, extend, or restructure them — including adding decision branches, parallel steps, merge points, or new forms." },
];

// ─── Main Component ───────────────────────────

export default function AIAssistant() {
  const { dbUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scope localStorage keys to user to prevent cross-user data leakage
  const storagePrefix = dbUser?.id ? `ai-chat-${dbUser.id}` : "ai-chat";
  const chatStorageKey = `${storagePrefix}-messages`;
  const modelStorageKey = `${storagePrefix}-model`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(chatStorageKey);
      if (!saved) return [];
      const parsed: ChatMessage[] = JSON.parse(saved);
      // Restore Date objects and re-parse AI blocks from content
      return parsed.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
        parsedBlocks: m.role === "assistant" ? parseAIResponse(m.content) : undefined,
      }));
    } catch {
      return [];
    }
  });
  const [inputValue, setInputValue] = useState("");
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [deployingFlow, setDeployingFlow] = useState(false);
  const [deployingForms, setDeployingForms] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      // dbUser may not be available on first render for lazy init, use fallback key
      const key = dbUser?.id ? `ai-chat-${dbUser.id}-model` : null;
      const saved = key ? localStorage.getItem(key) : null;
      return saved || "gemini-2.0-flash";
    } catch {
      return "gemini-2.0-flash";
    }
  });
  const [keyProvider, setKeyProvider] = useState<"gemini" | "openai">("gemini");

  // ─── Queries ────────────────────────────────

  const { data: aiStatus, isLoading: statusLoading } = useQuery<any>({
    queryKey: ["/api/ai-assistant/status"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: existingFlows = [] } = useQuery<any[]>({
    queryKey: ["/api/flow-rules"],
  });

  const { data: existingForms = [] } = useQuery<any[]>({
    queryKey: ["/api/quick-forms"],
  });

  const { data: orgUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: orgInfo } = useQuery<any>({
    queryKey: ["/api/organizations/current"],
  });

  const { data: modelsData } = useQuery<any>({
    queryKey: ["/api/ai-assistant/models"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const availableModels: Array<{ id: string; label: string; maxTokens: number; provider: string; available: boolean }> = modelsData?.models || [];
  const geminiModels = availableModels.filter((m) => m.provider === "gemini");
  const openaiModels = availableModels.filter((m) => m.provider === "openai");

  // ─── Auto-select model based on configured API keys ─────────────
  useEffect(() => {
    if (!modelsData) return;
    const currentProvider = availableModels.find((m) => m.id === selectedModel)?.provider || "gemini";
    const currentProviderOk = currentProvider === "openai"
      ? modelsData.openaiConfigured
      : modelsData.geminiConfigured;

    if (!currentProviderOk) {
      // Switch to the server-suggested default (which is already provider-aware)
      const suggested = modelsData.default as string;
      if (suggested && suggested !== selectedModel) {
        setSelectedModel(suggested);
      }
    }
  }, [modelsData]);

  // ─── Mutations ──────────────────────────────

  const saveKeyMutation = useMutation({
    mutationFn: async (params: { key: string; provider: string }) => {
      const res = await apiRequest("PUT", "/api/ai-assistant/api-key", { apiKey: params.key, provider: params.provider });
      return res.json();
    },
    onSuccess: (_data: any, variables: { key: string; provider: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-assistant/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-assistant/models"] });
      setShowApiKeySetup(false);
      setApiKeyInput("");
      // Auto-select a model matching the newly saved provider
      if (variables.provider === "openai") {
        setSelectedModel("gpt-4o");
      } else {
        setSelectedModel("gemini-2.0-flash");
      }
      toast({ title: "API key saved", description: `${variables.provider === "openai" ? "OpenAI" : "Gemini"} API key configured successfully` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const removeKeyMutation = useMutation({
    mutationFn: async (provider: string) => {
      const res = await apiRequest("DELETE", "/api/ai-assistant/api-key", { provider });
      return res.json();
    },
    onSuccess: (_data: any, provider: string) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-assistant/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-assistant/models"] });
      // If the removed provider was the selected model's provider, switch to the other
      const currentProvider = availableModels.find((m) => m.id === selectedModel)?.provider || "gemini";
      if (currentProvider === provider) {
        const other = provider === "openai" ? "gemini" : "openai";
        const fallback = other === "openai" ? "gpt-4o" : "gemini-2.0-flash";
        setSelectedModel(fallback);
      }
      toast({ title: "API key removed" });
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (msgs: Array<{ role: string; content: string }>) => {
      const res = await apiRequest("POST", "/api/ai-assistant/chat", {
        messages: msgs,
        model: selectedModel,
        context: {
          existingFlows: existingFlows.length > 0
            ? existingFlows.map((f: any) => f.system as string).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).map((sys: string) => ({
                system: sys,
                ruleCount: existingFlows.filter((f: any) => f.system === sys).length,
              }))
            : undefined,
          existingForms: existingForms.length > 0
            ? existingForms.map((f: any) => ({ formId: f.formId, title: f.title, fieldCount: f.fields?.length }))
            : undefined,
          users: orgUsers.length > 0
            ? orgUsers.map((u: any) => ({ email: u.email, role: u.role, name: `${u.firstName || ""} ${u.lastName || ""}`.trim() }))
            : undefined,
          organization: orgInfo
            ? { name: orgInfo.name, industry: orgInfo.industry, businessType: orgInfo.businessType, customerType: orgInfo.customerType }
            : undefined,
        },
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      const parsed = parseAIResponse(data.reply);
      const assistantMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
        parsedBlocks: parsed,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    },
    onError: (err: any) => {
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: `⚠️ ${err.message || "Failed to get AI response. Please try again."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    },
  });

  // ─── Send message ───────────────────────────

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || chatMutation.isPending) return;

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInputValue("");

      // Build history for Gemini
      const chatHistory = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      chatMutation.mutate(chatHistory);
    },
    [messages, chatMutation]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  // ─── Deploy flow rules ──────────────────────

  const deployFlow = async (data: FlowRuleData) => {
    setDeployingFlow(true);
    try {
      const rulesWithSystem = data.rules.map((r) => ({
        ...r,
        system: data.system,
      }));
      const res = await apiRequest("POST", "/api/flow-rules/bulk", { rules: rulesWithSystem });
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/flow-rules"] });
      toast({
        title: "Flow deployed!",
        description: `${result?.created?.length || data.rules?.length || 0} rules created for "${data.system}"`,
      });
    } catch (err: any) {
      toast({ title: "Deploy failed", description: err.message, variant: "destructive" });
    } finally {
      setDeployingFlow(false);
    }
  };

  // ─── Deploy forms ───────────────────────────

  const deployForms = async (forms: FormData[]) => {
    setDeployingForms(true);
    try {
      let created = 0;
      for (const form of forms) {
        await apiRequest("POST", "/api/quick-forms", {
          formId: form.formId,
          title: form.title,
          description: form.description || "",
          fields: form.fields,
        });
        created++;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/quick-forms"] });
      toast({
        title: "Forms deployed!",
        description: `${created} form${created > 1 ? "s" : ""} created successfully`,
      });
    } catch (err: any) {
      toast({ title: "Deploy failed", description: err.message, variant: "destructive" });
    } finally {
      setDeployingForms(false);
    }
  };

  // ─── Persist chat & model (scoped to user) ──

  useEffect(() => {
    try {
      // Strip parsedBlocks before saving — they're re-parsed from content on restore.
      // This prevents storing duplicate data that would fill the 5MB localStorage limit.
      const slim = messages.map(({ parsedBlocks, ...rest }) => rest);
      localStorage.setItem(chatStorageKey, JSON.stringify(slim));
    } catch {
      // ignore storage errors (private mode / quota)
    }
  }, [messages, chatStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(modelStorageKey, selectedModel);
    } catch {}
  }, [selectedModel, modelStorageKey]);

  // ─── Auto scroll ────────────────────────────

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  // ─── Render ─────────────────────────────────

  const isConfigured = aiStatus?.configured;
  const geminiConfigured = aiStatus?.gemini?.configured;
  const openaiConfigured = aiStatus?.openai?.configured;

  // Determine which provider the selected model needs
  const selectedModelProvider = availableModels.find((m) => m.id === selectedModel)?.provider || "gemini";
  const selectedProviderConfigured = selectedModelProvider === "openai" ? openaiConfigured : geminiConfigured;

  return (
    <AppLayout title="AI Assistant">
      <SEOHead title="AI Assistant" description="AI-powered workflow and form builder" />
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">AI Assistant</h1>
              <p className="text-xs text-gray-500">Powered by Gemini & OpenAI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Model selector */}
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[220px] h-8 text-xs">
                <Cpu className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const neitherConfigured = !geminiConfigured && !openaiConfigured;
                  // When no keys configured show all with "No key" label (setup mode)
                  // Otherwise show ONLY models whose provider key is configured
                  const visibleGemini = neitherConfigured
                    ? geminiModels
                    : geminiModels.filter((m) => m.available);
                  const visibleOpenai = neitherConfigured
                    ? openaiModels
                    : openaiModels.filter((m) => m.available);
                  if (visibleGemini.length === 0 && visibleOpenai.length === 0) {
                    return <SelectItem value="gemini-2.0-flash" className="text-xs">Gemini 2.0 Flash</SelectItem>;
                  }
                  return (
                    <>
                      {visibleGemini.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Google Gemini</div>
                          {visibleGemini.map((m) => (
                            <SelectItem key={m.id} value={m.id} className="text-xs" disabled={!m.available}>
                              <span>{m.label}</span>
                              {!m.available && <span className="ml-1 text-[10px] text-amber-500">No key</span>}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {visibleOpenai.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1">OpenAI</div>
                          {visibleOpenai.map((m) => (
                            <SelectItem key={m.id} value={m.id} className="text-xs" disabled={!m.available}>
                              <span>{m.label}</span>
                              {!m.available && <span className="ml-1 text-[10px] text-amber-500">No key</span>}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}
              </SelectContent>
            </Select>
            {/* Status badges */}
            {geminiConfigured && (
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-[10px] px-1.5 py-0.5">
                Gemini
              </Badge>
            )}
            {openaiConfigured && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-[10px] px-1.5 py-0.5">
                OpenAI
              </Badge>
            )}
            {!isConfigured && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <AlertCircle className="w-3 h-3 mr-1" /> No keys
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowApiKeySetup(!showApiKeySetup)}
            >
              <Settings className="w-4 h-4 mr-1" />
              API Key
            </Button>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMessages([]);
                  try { localStorage.removeItem(chatStorageKey); } catch {}
                }}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                New Chat
              </Button>
            )}
          </div>
        </div>

        {/* API Key Setup Panel */}
        {showApiKeySetup && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-950/30 border-b">
            <div className="max-w-2xl space-y-3">
              {/* Provider tabs */}
              <div className="flex gap-1 bg-gray-200 dark:bg-gray-800 rounded-lg p-0.5 w-fit">
                <button
                  onClick={() => { setKeyProvider("gemini"); setApiKeyInput(""); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${keyProvider === "gemini" ? "bg-white dark:bg-gray-700 shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Google Gemini
                </button>
                <button
                  onClick={() => { setKeyProvider("openai"); setApiKeyInput(""); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${keyProvider === "openai" ? "bg-white dark:bg-gray-700 shadow text-green-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  OpenAI
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">
                  {keyProvider === "openai" ? "OpenAI API Key" : "Google AI Studio API Key"}
                </span>
                {keyProvider === "gemini" && geminiConfigured && (
                  <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5">Connected</Badge>
                )}
                {keyProvider === "openai" && openaiConfigured && (
                  <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5">Connected</Badge>
                )}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {keyProvider === "openai" ? (
                  <>Get your API key from{" "}
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      platform.openai.com/api-keys
                    </a>. Requires a paid OpenAI account.</>
                ) : (
                  <>Get your free API key from{" "}
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      aistudio.google.com/apikey
                    </a>. Free tier available.</>
                )}
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? "text" : "password"}
                    placeholder={keyProvider === "openai" ? "sk-..." : "AIza..."}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  size="sm"
                  onClick={() => saveKeyMutation.mutate({ key: apiKeyInput, provider: keyProvider })}
                  disabled={!apiKeyInput.trim() || saveKeyMutation.isPending}
                >
                  {saveKeyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </Button>
                {((keyProvider === "gemini" && geminiConfigured) || (keyProvider === "openai" && openaiConfigured)) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeKeyMutation.mutate(keyProvider)}
                    disabled={removeKeyMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {keyProvider === "gemini" && aiStatus?.gemini?.keyPreview && (
                <p className="text-xs text-gray-500">
                  Current key: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{aiStatus.gemini.keyPreview}</code>
                </p>
              )}
              {keyProvider === "openai" && aiStatus?.openai?.keyPreview && (
                <p className="text-xs text-gray-500">
                  Current key: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{aiStatus.openai.keyPreview}</code>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            {messages.length === 0 ? (
              /* Welcome Screen */
              <div className="flex flex-col items-center justify-center py-12 space-y-8">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold">AI Workflow Assistant</h2>
                  <p className="text-gray-500 max-w-md">
                    Describe your business process and I'll design workflows, create forms, 
                    simulate execution, and suggest improvements.
                  </p>
                </div>

                {!isConfigured && !statusLoading && (
                  <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 max-w-md w-full">
                    <CardContent className="py-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">API Key Required</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Click "API Key" above to add your Google Gemini or OpenAI key.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {isConfigured && !selectedProviderConfigured && (
                  <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 max-w-md w-full">
                    <CardContent className="py-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{selectedModelProvider === "openai" ? "OpenAI" : "Gemini"} key not set</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          The selected model requires a {selectedModelProvider === "openai" ? "OpenAI" : "Gemini"} API key. Add it via "API Key" or pick a different model.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Context badges */}
                {isConfigured && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {existingFlows.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Workflow className="w-3 h-3 mr-1" />
                        {existingFlows.map((f: any) => f.system as string).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).length} existing flows
                      </Badge>
                    )}
                    {existingForms.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <FileText className="w-3 h-3 mr-1" />
                        {existingForms.length} existing forms
                      </Badge>
                    )}
                    {orgUsers.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        {orgUsers.length} team members
                      </Badge>
                    )}
                  </div>
                )}

                {/* Quick prompts */}
                <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                  {QUICK_PROMPTS.map((qp, idx) => (
                    idx === QUICK_PROMPTS.length - 1 && QUICK_PROMPTS.length % 2 !== 0 ? (
                      <button
                        key={qp.label}
                        onClick={() => sendMessage(qp.prompt)}
                        disabled={!isConfigured || !selectedProviderConfigured || chatMutation.isPending}
                        className="col-span-2 flex items-center gap-3 p-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <qp.icon className="w-5 h-5 text-orange-500 flex-shrink-0" />
                        <span className="text-sm font-medium">{qp.label}</span>
                      </button>
                    ) : (
                    <button
                      key={qp.label}
                      onClick={() => sendMessage(qp.prompt)}
                      disabled={!isConfigured || !selectedProviderConfigured || chatMutation.isPending}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <qp.icon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <span className="text-sm font-medium">{qp.label}</span>
                    </button>
                    )
                  ))}
                </div>
              </div>
            ) : (
              /* Chat Messages */
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-md"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    ) : msg.parsedBlocks ? (
                      msg.parsedBlocks.map((block, bi) => {
                        if (block.type === "flowrules") {
                          return (
                            <FlowRulesCard
                              key={bi}
                              data={block.content}
                              onDeploy={() => deployFlow(block.content)}
                              deploying={deployingFlow}
                            />
                          );
                        }
                        if (block.type === "forms") {
                          const forms = Array.isArray(block.content) ? block.content : [block.content];
                          return (
                            <FormsCard
                              key={bi}
                              data={forms}
                              onDeploy={() => deployForms(forms)}
                              deploying={deployingForms}
                            />
                          );
                        }
                        if (block.type === "simulation") {
                          return <SimulationCard key={bi} data={block.content} />;
                        }
                        return (
                          <div key={bi} className="text-sm">
                            {renderMarkdown(block.content)}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm">{renderMarkdown(msg.content)}</div>
                    )}
                    <div className={`text-xs mt-1 ${msg.role === "user" ? "text-blue-200" : "text-gray-400"}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Typing indicator */}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        {/* Input Bar */}
        <div className="border-t bg-white dark:bg-gray-900 px-4 py-3">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                !isConfigured
                  ? "Configure an API key first..."
                  : !selectedProviderConfigured
                    ? `Add a ${selectedModelProvider === "openai" ? "OpenAI" : "Gemini"} key to use this model...`
                    : "Describe your business process or ask for help..."
              }
              disabled={!isConfigured || !selectedProviderConfigured || chatMutation.isPending}
              className="flex-1"
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || !isConfigured || !selectedProviderConfigured || chatMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {chatMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
          <p className="text-xs text-center text-gray-400 mt-2">
            AI generates suggestions. Review before deploying. Responses may contain errors.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
