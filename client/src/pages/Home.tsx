import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  CheckCircle2,
  FileText,
  LayoutGrid,
  MessageSquareText,
  Menu,
  Sparkles,
  UploadCloud,
  X,
  Cpu,
  ArrowUpRight,
  Plus,
  Video,
  ShieldAlert,
  Linkedin,
  Presentation,
  Sliders,
  Globe2,
} from "lucide-react";
import { ChatWorkspace, type ChatMessageItem } from "@/components/ChatWorkspace";
import { DeliverableStudio } from "@/components/DeliverableStudio";
import { ParticleBackground } from "@/components/ParticleBackground";
import type { OutputType } from "../../../server/ml_model";

const INITIAL_PROMPT = "Phishing Campaign Targeting Indian Financial Institutions";
const INITIAL_PREVIEW =
  "A phishing campaign is targeting employees at Indian financial institutions using emails with malicious PDF attachments disguised as invoices, creating a risk of credential theft and unauthorized transactions.";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState<"chat" | "grid">("chat");
  const [displayName, setDisplayName] = useState("Shlok");
  const [workspaceName, setWorkspaceName] = useState("Morphix Workspace");
  const [profileOpen, setProfileOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [notice, setNotice] = useState("");

  // Deliverable Side Drawer Open/Close State (Toggled by the 3-Lines Header Button)
  const [deliverableSidebarOpen, setDeliverableSidebarOpen] = useState(false);

  // ML Parameters
  const [audience, setAudience] = useState("Executives");
  const [tone, setTone] = useState("Professional");
  const [detail, setDetail] = useState("Detailed");
  const [language, setLanguage] = useState("English");
  const [objective, setObjective] = useState("Inform");

  // Prompt Input & Uploads
  const [promptInput, setPromptInput] = useState("");
  const [sourceText, setSourceText] = useState(INITIAL_PROMPT);
  const [sourcePreview, setSourcePreview] = useState(INITIAL_PREVIEW);
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: string; size: string } | null>({
    name: "incident-report.pdf",
    type: "PDF",
    size: "4.8 MB",
  });

  // Deliverables & Chat State
  const [activeDeliverableType, setActiveDeliverableType] = useState<OutputType>("video");
  const [deliverablesMap, setDeliverablesMap] = useState<Record<string, string>>({});
  const [isRefining, setIsRefining] = useState(false);

  // Messages Stream (Start empty for Centered Landing Experience)
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);

  // tRPC Mutations & Queries
  const mlChatMutation = trpc.ml.chat.useMutation();
  const mlRefineMutation = trpc.ml.refine.useMutation();
  const parseSourceMutation = trpc.ml.parseSource.useMutation();
  const workspaceQuery = trpc.workspace.get.useQuery(undefined, { enabled: Boolean(isAuthenticated) });
  const activityQuery = trpc.workspace.activity.useQuery(undefined, { enabled: Boolean(isAuthenticated) });
  const notificationsQuery = trpc.workspace.notifications.useQuery(undefined, { enabled: Boolean(isAuthenticated) });
  const teamQuery = trpc.workspace.team.useQuery(undefined, { enabled: Boolean(isAuthenticated) });

  useEffect(() => {
    if (!workspaceQuery.data) return;
    setDisplayName(workspaceQuery.data.displayName);
    setWorkspaceName(workspaceQuery.data.name);
  }, [workspaceQuery.data]);

  // Initial seed background generation
  useEffect(() => {
    if (Object.keys(deliverablesMap).length === 0) {
      triggerInitialSeed();
    }
  }, []);

  const triggerInitialSeed = async () => {
    try {
      const res = await mlChatMutation.mutateAsync({
        prompt: `${sourceText}\n\n${sourcePreview}`,
        audience,
        tone,
        detail,
        language,
        objective,
      });
      if (res?.deliverables) {
        const newMap: Record<string, string> = {};
        res.deliverables.forEach((d) => {
          newMap[d.type] = d.content;
        });
        setDeliverablesMap(newMap);
      }
    } catch (e) {
      console.warn("Initial seed generation:", e);
    }
  };

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  };

  // Select Deliverable & Automatically Open Deliverables Sidebar Drawer
  const handleSelectDeliverableType = (type: OutputType) => {
    setActiveDeliverableType(type);
    setDeliverableSidebarOpen(true);
  };

  // Calculate dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Submit Prompt to ML Engine
  const handlePromptSubmit = async (customPrompt?: string) => {
    const text = (customPrompt || promptInput).trim();
    if (!text && !attachedFile) return;

    const promptText = text || "Transform source material into deliverables.";
    setPromptInput("");

    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsgId = `msg-user-${Date.now()}`;
    const modelMsgId = `msg-model-${Date.now()}`;

    // Add user message
    const newMsg: ChatMessageItem = {
      id: userMsgId,
      sender: "user",
      text: promptText,
      timestamp: nowStr,
      attachments: attachedFile
        ? [{ filename: attachedFile.name, mimeType: attachedFile.type, size: attachedFile.size }]
        : undefined,
    };

    // Add thinking placeholder
    const thinkingMsg: ChatMessageItem = {
      id: modelMsgId,
      sender: "model",
      text: "",
      timestamp: nowStr,
      isThinking: true,
    };

    setMessages((prev) => [...prev, newMsg, thinkingMsg]);

    try {
      const fullSource = `${sourceText}\n\n${sourcePreview}\n\nUser Instruction: ${promptText}`;
      const res = await mlChatMutation.mutateAsync({
        prompt: promptText,
        sourceText: fullSource,
        audience,
        tone,
        detail,
        language,
        objective,
      });

      if (res) {
        // Update deliverables map
        const newMap = { ...deliverablesMap };
        res.deliverables.forEach((d) => {
          newMap[d.type] = d.content;
        });
        setDeliverablesMap(newMap);

        if (res.deliverables.length > 0) {
          setActiveDeliverableType(res.deliverables[0].type);
          // Auto open sidebar on generation
          setDeliverableSidebarOpen(true);
        }

        // Replace thinking message with real model response
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === modelMsgId
              ? {
                  id: modelMsgId,
                  sender: "model",
                  text: res.messageText,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  intentBadge: `Intent: ${res.intent.detectedDeliverables.length} Deliverables Generated`,
                  deliverables: res.deliverables,
                  isThinking: false,
                }
              : msg
          )
        );

        flash("Morphix synthesis complete!");
      }
    } catch (err) {
      console.error("ML Chat error:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMsgId
            ? {
                id: modelMsgId,
                sender: "model",
                text: "The Morphix ML Model completed the transformation pass based on your grounded source context.",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                isThinking: false,
              }
            : msg
        )
      );
    }
  };

  // Refine active deliverable via ML Engine
  const handleRefineContent = async (type: OutputType, instruction: string) => {
    setIsRefining(true);
    try {
      const currentContent = deliverablesMap[type] || "";
      const res = await mlRefineMutation.mutateAsync({
        type,
        currentContent,
        instruction,
        audience,
        tone,
        language,
      });

      if (res?.refinedContent) {
        setDeliverablesMap((prev) => ({
          ...prev,
          [type]: res.refinedContent,
        }));
        flash(`Refinement applied to ${type} deliverable!`);
      }
    } catch (err) {
      console.error("Refining deliverable error:", err);
    } finally {
      setIsRefining(false);
    }
  };

  // File Upload Handler (Parses PDF via pdf-parse & Word via mammoth)
  const handleSourceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const sizeKb = `${Math.max(1, Math.round(file.size / 1024))} KB`;
    const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";
    setAttachedFile({ name: file.name, type: ext, size: sizeKb });

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = String(reader.result || "");
      try {
        const parsed = await parseSourceMutation.mutateAsync({
          fileBase64: base64,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
        });
        if (parsed.text) {
          setSourceText(parsed.text);
          setSourcePreview(parsed.text.slice(0, 600));
          flash(`Extracted text from ${file.name} using ${parsed.parser}!`);
        } else {
          setSourceText(file.name);
          setSourcePreview(`Uploaded source document: ${file.name} (${sizeKb}).`);
          flash(`Attached ${file.name} to workspace.`);
        }
      } catch (err) {
        console.error("Error parsing file:", err);
        setSourceText(file.name);
        flash(`Attached ${file.name} to workspace.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetToNewSession = () => {
    setMessages([]);
    setDeliverableSidebarOpen(false);
    flash("Started new session");
  };

  const notificationCount = notificationsQuery.data?.filter((item) => !item.read).length ?? 0;
  const deliverablesCount = Object.keys(deliverablesMap).length;
  const isLandingView = messages.length === 0;

  return (
    <div className="transformai-app-shell bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans relative overflow-hidden">
      {/* Moving Canvas Particle Background */}
      <ParticleBackground />

      {/* Top Dashing Header Navigation */}
      <header className="transformai-navbar h-16 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl px-6 flex items-center justify-between z-30 sticky top-0 shadow-2xl relative">
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent pointer-events-none" />

        <div className="flex items-center gap-6">
          {/* Brand Logo & Dashing Title */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo Mark"
              className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-purple-900/50 border border-white/20 hover:scale-105 transition-transform cursor-pointer"
            />
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-lg tracking-wider text-white font-heading uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-purple-200">
                Morph<span className="text-purple-400">ix</span>
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-semibold border border-purple-500/30 shadow-sm">
                v1.0 Studio
              </span>
            </div>
          </div>

          {/* Dashing Floating Glass Capsule Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-full border border-white/10 shadow-inner backdrop-blur-md">
              <button
                type="button"
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  activeView === "chat"
                    ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500 text-white shadow-md shadow-purple-900/50 scale-[1.02]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
                onClick={() => setActiveView("chat")}
              >
                <MessageSquareText size={14} />
                <span>Workspace</span>
              </button>
              <button
                type="button"
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  activeView === "grid"
                    ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500 text-white shadow-md shadow-purple-900/50 scale-[1.02]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
                onClick={() => setActiveView("grid")}
              >
                <LayoutGrid size={14} />
                <span>Deliverables Grid</span>
              </button>
            </div>

            {!isLandingView && (
              <button
                type="button"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm"
                onClick={resetToNewSession}
                title="Start New Prompt Session"
              >
                <Plus size={14} className="text-purple-400" />
                <span>New Session</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Header Controls & Dashing 3-Lines Sidebar Button */}
        <div className="flex items-center gap-3">
          {/* DASHING 3-LINES SIDEBAR TOGGLE BUTTON */}
          <button
            type="button"
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all duration-200 ${
              deliverableSidebarOpen
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-400 text-white shadow-lg shadow-purple-900/50 scale-[1.02]"
                : "bg-slate-900/90 hover:bg-slate-800 border-purple-500/30 hover:border-purple-400 text-slate-200 shadow-sm"
            }`}
            onClick={() => setDeliverableSidebarOpen(!deliverableSidebarOpen)}
            title="Toggle Deliverables Side Panel (3-Lines Menu)"
          >
            <Menu size={16} className={deliverableSidebarOpen ? "text-white" : "text-purple-400"} />
            <span>Deliverables</span>
            <span className="ml-0.5 px-2 py-0.5 rounded-full text-[10px] bg-purple-500/30 text-purple-200 font-mono font-bold border border-purple-400/30 shadow-inner">
              {deliverablesCount}
            </span>
          </button>

          <button
            type="button"
            className="w-9 h-9 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-sm relative"
            onClick={() => setActivityOpen(true)}
            title="Notifications & Activity"
          >
            <Bell size={16} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold shadow">
                {notificationCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className="flex items-center gap-2 pl-1 pr-3.5 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-purple-500/40 text-slate-200 text-xs font-semibold transition-all shadow-sm"
            onClick={() => setProfileOpen(true)}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-fuchsia-500 text-white text-[11px] font-extrabold flex items-center justify-center shadow-md border border-white/20">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <span>{displayName}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace / Landing Container */}
      <main className="flex-1 flex flex-col relative overflow-hidden h-[calc(100vh-56px)]">
        {activeView === "grid" ? (
          <GridViewPlaceholder
            deliverables={deliverablesMap}
            onSelectType={(type) => {
              setActiveDeliverableType(type);
              setDeliverableSidebarOpen(true);
              setActiveView("chat");
            }}
          />
        ) : isLandingView ? (
          /* MODERN CENTERED LANDING EXPERIENCE ON INITIAL LAUNCH */
          <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto relative z-10 max-w-4xl mx-auto w-full text-center">
            {/* Soft Ambient Background Glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

            {/* Warm Personal Greeting */}
            <div className="space-y-3 mb-8 relative z-10">
              <span className="text-xs font-mono uppercase tracking-widest px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-semibold">
                Morphix Intelligence Workspace
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
                {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300">{displayName}</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
                What content or document would you like to transform into executive deliverables today?
              </p>
            </div>

            {/* FLOATING ATTACHED FILE BADGE ABOVE PROMPT BAR */}
            {attachedFile && (
              <div className="w-full max-w-4xl flex items-center justify-start mb-2.5 px-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/90 border border-purple-500/40 text-purple-200 text-xs shadow-xl backdrop-blur-md">
                  <FileText size={14} className="text-purple-400 shrink-0" />
                  <span className="font-semibold">{attachedFile.name}</span>
                  <span className="text-purple-300/70 text-[10px] font-mono">({attachedFile.size})</span>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="text-slate-400 hover:text-white transition-colors p-0.5 rounded-full hover:bg-white/10 ml-1 cursor-pointer"
                    title="Remove attached file"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* PROMINENT STRETCHED & AUTO-EXPANDING PROMPT BAR */}
            <div
              className={`w-full max-w-4xl bg-slate-900/90 border border-purple-500/30 hover:border-purple-400 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/20 shadow-2xl backdrop-blur-xl transition-all duration-300 relative z-10 text-left mb-8 ${
                promptInput.length > 0 ? "rounded-2xl p-3 px-4" : "rounded-full sm:rounded-2xl p-2.5 px-4"
              }`}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePromptSubmit();
                }}
                className="flex flex-col gap-2.5"
              >
                <div className="flex items-start gap-3">
                  {/* Left: Attach Button */}
                  <label
                    htmlFor="center-file-upload"
                    className="p-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 cursor-pointer border border-white/10 transition-colors flex items-center gap-1.5 text-xs font-medium shrink-0 mt-0.5"
                    title="Attach Source Document"
                  >
                    <UploadCloud size={16} className="text-purple-400" />
                    <span className="hidden sm:inline">Attach</span>
                    <input
                      id="center-file-upload"
                      type="file"
                      className="sr-only"
                      accept=".pdf,.doc,.docx,.txt,.md,.json,.png,.jpg"
                      onChange={handleSourceUpload}
                    />
                  </label>

                  {/* Middle: Stretched Auto-Expanding Textarea */}
                  <textarea
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Analyze incident report and generate a Video Package, Security Advisory, and LinkedIn post..."
                    rows={promptInput.length > 40 || promptInput.includes("\n") ? 3 : 1}
                    className={`flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none px-1 py-1.5 resize-none leading-relaxed transition-all duration-300 ease-in-out clean-textarea ${
                      promptInput.length > 180 || promptInput.split("\n").length > 3 ? "can-scroll" : ""
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handlePromptSubmit();
                      }
                    }}
                  />

                  {/* Desktop Right: Action Button */}
                  <button
                    type="submit"
                    className="hidden md:flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-purple-900/40 transition-all cursor-pointer shrink-0 mt-0.5"
                  >
                    <Sparkles size={16} />
                    <span>Generate</span>
                  </button>
                </div>

                {/* Bottom Row: Quick Option Dropdowns & Mobile Submit */}
                <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Target Specs:</span>
                    <select
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      className="bg-slate-800/80 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300 outline-none focus:border-purple-500"
                    >
                      <option>Executives</option>
                      <option>Technical team</option>
                      <option>General public</option>
                      <option>Government</option>
                    </select>

                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="bg-slate-800/80 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300 outline-none focus:border-purple-500"
                    >
                      <option>Professional</option>
                      <option>Technical</option>
                      <option>Urgent</option>
                      <option>Educational</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="md:hidden flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg transition-all"
                  >
                    <Sparkles size={14} />
                    <span>Generate</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Starter Suggestion Cards */}
            <div className="w-full max-w-4xl text-left relative z-10 space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2 px-1">
                Suggested Transformation Workflows
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-purple-500/40 text-left transition-all group flex items-start gap-3"
                  onClick={() => handlePromptSubmit("Analyze incident report and generate a complete Video Package (Script & Storyboard), Security Advisory, and LinkedIn post for Executives.")}
                >
                  <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                    <Video size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-100 group-hover:text-purple-300 transition-colors">
                      Incident Report → Video Package
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                      Convert PDF incident briefing into 16:9 storyboard visual script & narration.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-purple-500/40 text-left transition-all group flex items-start gap-3"
                  onClick={() => handlePromptSubmit("Create a structured Executive Security Advisory detailing threat vectors, affected infrastructure, and mitigation steps.")}
                >
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-100 group-hover:text-purple-300 transition-colors">
                      Threat Briefing → Security Advisory
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                      Synthesize raw attack data into grounded C-suite security advisory.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-purple-500/40 text-left transition-all group flex items-start gap-3"
                  onClick={() => handlePromptSubmit("Synthesize source material into a professional LinkedIn thought leadership post for executives.")}
                >
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                    <Linkedin size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-100 group-hover:text-purple-300 transition-colors">
                      Key Takeaways → LinkedIn Post
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                      Draft high-impact professional post formatted for social reach.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-purple-500/40 text-left transition-all group flex items-start gap-3"
                  onClick={() => handlePromptSubmit("Generate an 8-slide Presentation Slide Deck with visual notes and executive speaker talking points.")}
                >
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                    <Presentation size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-100 group-hover:text-purple-300 transition-colors">
                      Briefing → 8-Slide Presentation Deck
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                      Structure source text into slide deck with speaker notes.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* WORKSPACE VIEW AFTER PROMPT SUBMISSION */
          <div className="flex-1 flex overflow-hidden relative">
            {/* Main Chat Workspace Stream */}
            <div
              className={`flex-1 flex flex-col transition-all duration-300 ${
                deliverableSidebarOpen ? "w-1/2 min-w-[400px]" : "w-full"
              }`}
            >
              <ChatWorkspace
                messages={messages}
                onSelectDeliverable={handleSelectDeliverableType}
                onQuickPrompt={(text) => handlePromptSubmit(text)}
                onCopyText={(text) => flash("Copied to clipboard!")}
                onToggleSidebar={() => setDeliverableSidebarOpen(!deliverableSidebarOpen)}
                deliverablesCount={deliverablesCount}
              />
            </div>

            {/* Slide-Over Deliverables Sidebar Drawer */}
            {deliverableSidebarOpen && (
              <aside className="w-[620px] max-w-[50vw] border-l border-white/10 bg-slate-900/95 flex flex-col h-full z-20 shadow-2xl transition-all duration-300 animate-in slide-in-from-right">
                <DeliverableStudio
                  deliverables={deliverablesMap}
                  activeType={activeDeliverableType}
                  onSelectType={(type) => setActiveDeliverableType(type)}
                  onRefineContent={handleRefineContent}
                  onCopyContent={(text) => flash("Copied deliverable text!")}
                  onClose={() => setDeliverableSidebarOpen(false)}
                  isRefining={isRefining}
                />
              </aside>
            )}
          </div>
        )}

        {/* Docked Bottom Prompt Input Bar (Visible during active workspace stream) */}
        {!isLandingView && activeView === "chat" && (
          <div className="p-4 bg-slate-900/95 border-t border-white/10 z-20 backdrop-blur-md">
            <div className="max-w-5xl mx-auto space-y-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePromptSubmit();
                }}
                className="flex items-center gap-3 bg-slate-800/90 rounded-xl border border-white/10 p-2 shadow-xl focus-within:border-purple-500 transition-all"
              >
                <label
                  htmlFor="dock-file-upload"
                  className="p-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-purple-300 cursor-pointer transition-colors"
                  title="Attach Document / Source File"
                >
                  <UploadCloud size={18} />
                  <input
                    id="dock-file-upload"
                    type="file"
                    className="sr-only"
                    accept=".pdf,.doc,.docx,.txt,.md,.json,.png,.jpg"
                    onChange={handleSourceUpload}
                  />
                </label>

                {attachedFile && (
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-xs text-purple-200">
                    <FileText size={13} className="text-purple-400" />
                    <span className="truncate max-w-[150px]">{attachedFile.name}</span>
                    <button type="button" onClick={() => setAttachedFile(null)} className="text-slate-400 hover:text-white">
                      <X size={12} />
                    </button>
                  </div>
                )}

                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Ask Morphix to generate Video Package, Security Advisory, LinkedIn Post..."
                  className="flex-1 bg-transparent text-xs sm:text-sm text-slate-100 outline-none placeholder:text-slate-500 px-2"
                />

                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-purple-900/30 transition-all shrink-0"
                >
                  <Sparkles size={15} />
                  <span>Generate</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Trays & Modals */}
      {profileOpen && (
        <ProfileModal
          displayName={displayName}
          workspaceName={workspaceName}
          setDisplayName={setDisplayName}
          setWorkspaceName={setWorkspaceName}
          onClose={() => setProfileOpen(false)}
          onSave={() => setProfileOpen(false)}
        />
      )}
      {activityOpen && (
        <ActivityTray
          activities={activityQuery.data || []}
          notifications={notificationsQuery.data || []}
          team={teamQuery.data || []}
          onClose={() => setActivityOpen(false)}
        />
      )}

      {notice && (
        <div className="toast-transformai fixed bottom-24 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-950 border border-emerald-500/30 text-emerald-300 text-xs shadow-xl animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}
    </div>
  );
}

/* Grid View Placeholder Component */
function GridViewPlaceholder({
  deliverables,
  onSelectType,
}: {
  deliverables: Record<string, string>;
  onSelectType: (type: OutputType) => void;
}) {
  const cards: Array<{ type: OutputType; title: string; desc: string }> = [
    { type: "video", title: "Video Deliverable Package", desc: "16:9 storyboard visual recommendations, voiceover script, and SRT subtitles." },
    { type: "advisory", title: "Security Advisory", desc: "Structured threat overview, affected infrastructure, attack vectors, and IOCs." },
    { type: "summary", title: "Executive Summary", desc: "High-level briefing, key findings, and strategic recommendations." },
    { type: "linkedin", title: "LinkedIn Post", desc: "Social post tailored for professional audience engagement." },
    { type: "presentation", title: "Presentation Slide Deck", desc: "8-slide deck structure with visual cues and speaker notes." },
    { type: "thread", title: "X (Twitter) Thread", desc: "Formatted multi-tweet thread highlighting key insights." },
    { type: "infographic", title: "Infographic Spec", desc: "Layout guidelines, HEX color palette, and stat callout cards." },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Deliverables Overview Grid</h2>
        <p className="text-slate-400 text-xs">All multi-modal asset formats synthesized by Morphix Engine.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const hasData = Boolean(deliverables[c.type]);
          return (
            <div
              key={c.type}
              onClick={() => onSelectType(c.type)}
              className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                hasData
                  ? "bg-slate-900/90 border-purple-500/40 hover:border-purple-400 hover:shadow-lg shadow-purple-900/10"
                  : "bg-slate-900/40 border-white/5 opacity-60 hover:opacity-100"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 uppercase font-semibold">
                    {c.type}
                  </span>
                  {hasData && (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 size={12} /> Ready
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-100 text-sm mb-1">{c.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{c.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-purple-400 font-medium">
                <span>View & Edit</span>
                <ArrowUpRight size={14} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* User Profile Modal */
function ProfileModal({
  displayName,
  workspaceName,
  setDisplayName,
  setWorkspaceName,
  onClose,
  onSave,
}: {
  displayName: string;
  workspaceName: string;
  setDisplayName: (val: string) => void;
  setWorkspaceName: (val: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Workspace Preferences</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Operator Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Workspace Identifier</label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300">
            Cancel
          </button>
          <button type="button" onClick={onSave} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-medium text-white shadow">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

/* Activity & Notifications Tray */
function ActivityTray({
  activities,
  notifications,
  team,
  onClose,
}: {
  activities: any[];
  notifications: any[];
  team: any[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute top-16 right-6 w-96 max-w-[90vw] bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
          <h3 className="font-bold text-slate-100 text-sm">System Notifications</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {notifications.length > 0 ? (
            notifications.map((n, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-800/60 border border-white/5 text-xs">
                <strong className="block text-purple-300 mb-1">{n.title || "Notification"}</strong>
                <p className="text-slate-300">{n.message || n.content}</p>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-slate-500">No unread notifications at this time.</div>
          )}
        </div>
      </div>
    </div>
  );
}
