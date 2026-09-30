import React, { useState } from "react";
import {
  FileText,
  ShieldAlert,
  Video,
  Linkedin,
  Presentation,
  MessageSquare,
  Layers3,
  Copy,
  Download,
  CheckCircle2,
  Sparkles,
  Wand2,
  RefreshCcw,
  Send,
  Clapperboard,
  Sliders,
  Play,
  Volume2,
  X,
  Share2,
  Clock,
  Target,
  Sparkle,
  FileCheck,
  ChevronRight,
  Eye,
  MessageCircle,
  ThumbsUp,
  Repeat,
  Bookmark,
  Tv,
} from "lucide-react";
import type { OutputType } from "../../../server/ml_model";

interface DeliverableStudioProps {
  deliverables: Record<string, string>;
  activeType: OutputType;
  onSelectType: (type: OutputType) => void;
  onRefineContent: (type: OutputType, instruction: string) => Promise<void>;
  onCopyContent: (text: string) => void;
  onClose?: () => void;
  isRefining?: boolean;
}

export const DeliverableStudio: React.FC<DeliverableStudioProps> = ({
  deliverables,
  activeType,
  onSelectType,
  onRefineContent,
  onCopyContent,
  onClose,
  isRefining = false,
}) => {
  const [refineInput, setRefineInput] = useState("");
  const currentContent = deliverables[activeType] || "";

  const typesList: Array<{ id: OutputType; label: string; icon: React.FC<{ size?: number; className?: string }>; accent: string }> = [
    { id: "video", label: "Video Package", icon: Video, accent: "red" },
    { id: "advisory", label: "Security Advisory", icon: ShieldAlert, accent: "purple" },
    { id: "summary", label: "Executive Summary", icon: FileText, accent: "emerald" },
    { id: "linkedin", label: "LinkedIn Post", icon: Linkedin, accent: "blue" },
    { id: "presentation", label: "Presentation Deck", icon: Presentation, accent: "amber" },
    { id: "thread", label: "X Thread", icon: MessageSquare, accent: "cyan" },
    { id: "infographic", label: "Infographic Spec", icon: Layers3, accent: "pink" },
  ];

  const handleRefineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refineInput.trim() || isRefining) return;
    onRefineContent(activeType, refineInput.trim());
    setRefineInput("");
  };

  const handleDownload = () => {
    const blob = new Blob([currentContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `morphix_${activeType}_deliverable.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="deliverable-studio-container bg-slate-900/95 flex flex-col h-full text-slate-100 overflow-hidden border-l border-white/10 shadow-2xl">
      {/* Top Studio Header */}
      <div className="studio-top-header flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Layers3 size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-tight">Deliverables Studio</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-medium border border-purple-500/30">
                {Object.keys(deliverables).length} Ready
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-medium text-slate-200 transition-colors"
            onClick={() => onCopyContent(currentContent)}
            title="Copy content to clipboard"
          >
            <Copy size={13} />
            <span>Copy</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-medium text-slate-200 transition-colors"
            onClick={handleDownload}
            title="Download Markdown (.md)"
          >
            <Download size={13} />
            <span>Export</span>
          </button>

          {onClose && (
            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
              onClick={onClose}
              title="Close Deliverables Sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Output Format Selector Tabs */}
      <div className="studio-tabs-bar px-4 py-2.5 border-b border-white/10 bg-slate-900/60 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {typesList.map((item) => {
            const Icon = item.icon;
            const hasContent = Boolean(deliverables[item.id]);
            const isSelected = activeType === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-md shadow-purple-900/40 border border-purple-500"
                    : hasContent
                    ? "bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10"
                    : "bg-slate-900/40 hover:bg-slate-800/50 text-slate-400 border border-white/5 opacity-70"
                }`}
                onClick={() => onSelectType(item.id)}
              >
                <Icon size={14} />
                <span>{item.label}</span>
                {hasContent && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? "bg-white" : "bg-emerald-400"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grounded Verification Banner & Version Info */}
      <div className="px-5 py-2 border-b border-white/5 bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2 text-emerald-400 font-medium">
          <CheckCircle2 size={13} />
          <span>Grounded Claim Verification Passed</span>
        </div>
        <div className="text-slate-500 font-mono text-[10px]">
          Engine Output v1.0 · Grounded
        </div>
      </div>

      {/* Main Studio Preview Content Scroll Container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {activeType === "video" ? (
          <VideoPackageVisualizer content={currentContent} />
        ) : activeType === "linkedin" ? (
          <LinkedInPostVisualizer content={currentContent} />
        ) : activeType === "presentation" ? (
          <PresentationDeckVisualizer content={currentContent} />
        ) : activeType === "thread" ? (
          <XThreadVisualizer content={currentContent} />
        ) : (
          <RichMarkdownRenderer content={currentContent} />
        )}
      </div>

      {/* ML Refinement Prompt Dock at Bottom */}
      <div className="p-3.5 border-t border-white/10 bg-slate-950/90 backdrop-blur-md">
        <form onSubmit={handleRefineSubmit} className="flex items-center gap-2 bg-slate-800/90 rounded-xl border border-white/10 p-1.5 focus-within:border-purple-500/80 transition-all shadow-inner">
          <div className="pl-2.5 text-purple-400">
            <Wand2 size={15} />
          </div>
          <input
            type="text"
            value={refineInput}
            onChange={(e) => setRefineInput(e.target.value)}
            placeholder={`Refine ${activeType} deliverable (e.g. "Add urgent call to action", "Expand technical IOCs")...`}
            disabled={isRefining}
            className="flex-1 bg-transparent text-xs text-slate-100 placeholder:text-slate-500 outline-none px-2"
          />
          <button
            type="submit"
            disabled={!refineInput.trim() || isRefining}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
          >
            {isRefining ? <RefreshCcw size={13} className="animate-spin" /> : <Send size={13} />}
            <span>Refine</span>
          </button>
        </form>
      </div>
    </div>
  );
};

/* Video Package Visualizer Component */
const VideoPackageVisualizer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) {
    return <EmptyDeliverablePlaceholder formatName="Video Package" />;
  }

  return (
    <div className="space-y-6">
      {/* Video Header Hero Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/40 via-slate-900 to-indigo-950/50 border border-purple-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4 relative z-10 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-rose-950/50 shrink-0">
            <Play size={22} fill="currentColor" className="ml-0.5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Video Deliverable Package</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Broadcast-ready script, 16:9 4K visual scene recommendations, voiceover narration, and SRT captions.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10 text-[11px] text-purple-200 font-medium">
          <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-purple-500/30 flex items-center gap-1.5">
            <Clapperboard size={13} className="text-rose-400" /> 16:9 4K Video
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-purple-500/30 flex items-center gap-1.5">
            <Volume2 size={13} className="text-purple-400" /> Narration + Audio
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-purple-500/30 flex items-center gap-1.5">
            <Sliders size={13} className="text-indigo-400" /> Closed Subtitles (.SRT)
          </span>
        </div>
      </div>

      {/* Parsed Scenes & Storyboard Content */}
      <RichMarkdownRenderer content={content} />
    </div>
  );
};

/* LinkedIn Post Visualizer Component */
const LinkedInPostVisualizer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return <EmptyDeliverablePlaceholder formatName="LinkedIn Post" />;

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl bg-slate-900 border border-blue-500/30 shadow-xl space-y-4">
        {/* Post Author Card Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow">
              EX
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white">Executive Briefing</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                  Official Post
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Thought Leadership · Morphix Grounded</span>
            </div>
          </div>
          <Linkedin size={20} className="text-blue-400" />
        </div>

        {/* Post Content Body */}
        <div className="py-2 text-sm leading-relaxed text-slate-200">
          <RichMarkdownRenderer content={content} />
        </div>

        {/* Mock Social Interactions */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 hover:text-blue-400 cursor-pointer">
              <ThumbsUp size={14} /> Like
            </span>
            <span className="flex items-center gap-1 hover:text-blue-400 cursor-pointer">
              <MessageCircle size={14} /> Comment
            </span>
            <span className="flex items-center gap-1 hover:text-blue-400 cursor-pointer">
              <Repeat size={14} /> Repost
            </span>
          </div>
          <span className="flex items-center gap-1 hover:text-blue-400 cursor-pointer">
            <Send size={14} /> Send
          </span>
        </div>
      </div>
    </div>
  );
};

/* Presentation Deck Visualizer Component */
const PresentationDeckVisualizer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return <EmptyDeliverablePlaceholder formatName="Presentation Deck" />;

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
        <div className="flex items-center gap-2">
          <Presentation size={16} className="text-amber-400" />
          <span className="font-medium">Slide Deck Structure & Visual Notes</span>
        </div>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">8 Slides Ready</span>
      </div>

      <RichMarkdownRenderer content={content} />
    </div>
  );
};

/* X Thread Visualizer Component */
const XThreadVisualizer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return <EmptyDeliverablePlaceholder formatName="X Thread" />;

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-xs text-cyan-200">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-cyan-400" />
          <span className="font-medium">Multi-Tweet Thread Sequence</span>
        </div>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">Formatted Thread</span>
      </div>

      <RichMarkdownRenderer content={content} />
    </div>
  );
};

/* Empty Placeholder when content is empty */
const EmptyDeliverablePlaceholder: React.FC<{ formatName: string }> = ({ formatName }) => (
  <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-dashed border-white/10 flex flex-col items-center justify-center space-y-3">
    <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center">
      <Sparkles size={24} />
    </div>
    <h4 className="text-sm font-semibold text-slate-200">No {formatName} Synthesized Yet</h4>
    <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
      Type an instruction in the prompt bar below to generate this deliverable using the Morphix Engine.
    </p>
  </div>
);

/* RICH MARKDOWN & STRUCTURED CONTENT RENDERER */
export const RichMarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  // Split into paragraphs / sections by double newlines or lines
  const lines = content.split("\n");
  const renderedElements: React.ReactNode[] = [];

  let keyValuesBuffer: Array<{ key: string; value: string }> = [];

  const flushKeyValues = (key: string) => {
    if (keyValuesBuffer.length > 0) {
      const items = [...keyValuesBuffer];
      keyValuesBuffer = [];
      renderedElements.push(
        <div key={`kv-grid-${key}-${renderedElements.length}`} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-3">
          {items.map((item, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-800/70 border border-white/10 flex flex-col gap-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-purple-300 font-semibold">
                {item.key}
              </span>
              <span className="text-xs text-slate-100 font-medium leading-normal">
                {renderInlineMarkdown(item.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushKeyValues(`empty-${index}`);
      return;
    }

    // Check for Horizontal Divider `---`
    if (trimmed === "---") {
      flushKeyValues(`hr-${index}`);
      renderedElements.push(<hr key={`hr-${index}`} className="my-5 border-white/10" />);
      return;
    }

    // Check for Heading 1 `# Title`
    if (trimmed.startsWith("# ")) {
      flushKeyValues(`h1-${index}`);
      renderedElements.push(
        <h1 key={`h1-${index}`} className="text-xl font-bold text-white tracking-tight mt-6 mb-3 border-b border-white/10 pb-2">
          {trimmed.replace(/^#\s+/, "")}
        </h1>
      );
      return;
    }

    // Check for Heading 2 `## Section`
    if (trimmed.startsWith("## ")) {
      flushKeyValues(`h2-${index}`);
      renderedElements.push(
        <h2 key={`h2-${index}`} className="text-base font-bold text-purple-300 tracking-tight mt-5 mb-2.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span>{trimmed.replace(/^##\s+/, "")}</span>
        </h2>
      );
      return;
    }

    // Check for Heading 3 `### Subheading`
    if (trimmed.startsWith("### ")) {
      flushKeyValues(`h3-${index}`);
      const h3Text = trimmed.replace(/^###\s+/, "");

      // Special visual card header for Scene titles e.g. "Scene 1: Opening Hook & Signal (0:00 - 0:20)"
      if (/^Scene \d+:/i.test(h3Text)) {
        renderedElements.push(
          <div key={`h3-scene-${index}`} className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs font-bold text-purple-200 mt-5 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Video size={14} className="text-purple-400" />
              <span>{h3Text}</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
              Storyboard Scene
            </span>
          </div>
        );
      } else {
        renderedElements.push(
          <h3 key={`h3-${index}`} className="text-sm font-semibold text-slate-100 mt-4 mb-2 flex items-center gap-1.5">
            <ChevronRight size={14} className="text-purple-400" />
            <span>{h3Text}</span>
          </h3>
        );
      }
      return;
    }

    // Check for Key-Value spec lines e.g. `**Target Duration**: 2:30 Minutes | **Format**: 16:9 4K Video`
    if (trimmed.includes("**") && trimmed.includes(":")) {
      const kvMatches = Array.from(trimmed.matchAll(/\*\*(.*?)\*\*:\s*([^|]+)/g));
      if (kvMatches.length > 0) {
        kvMatches.forEach((match) => {
          keyValuesBuffer.push({ key: match[1].trim(), value: match[2].trim() });
        });
        return;
      }
    }

    // Check for Bullet Points `- ` or `* `
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushKeyValues(`bullet-${index}`);
      const bulletText = trimmed.replace(/^[-*]\s+/, "");

      // Check if bullet starts with bold header e.g. `- **Visual Recommendation**: ...`
      const boldBulletMatch = bulletText.match(/^\*\*(.*?)\*\*:\s*(.*)/);

      if (boldBulletMatch) {
        const label = boldBulletMatch[1];
        const val = boldBulletMatch[2];

        // Customized callout card for Visual Recommendation
        if (label.toLowerCase().includes("visual")) {
          renderedElements.push(
            <div key={`bullet-visual-${index}`} className="my-2 p-3 rounded-xl bg-slate-800/80 border border-purple-500/30 flex items-start gap-3">
              <Eye size={15} className="text-purple-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="block text-purple-300 font-semibold mb-0.5">Visual Recommendation</strong>
                <span className="text-slate-200 leading-relaxed">{renderInlineMarkdown(val)}</span>
              </div>
            </div>
          );
        } else if (label.toLowerCase().includes("narration") || label.toLowerCase().includes("script")) {
          // Customized speech block for Narration Script
          renderedElements.push(
            <div key={`bullet-script-${index}`} className="my-2 p-3.5 rounded-xl bg-slate-950 border border-indigo-500/30 flex items-start gap-3 shadow-inner">
              <Volume2 size={16} className="text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="block text-indigo-300 font-semibold mb-1">Narration Script</strong>
                <p className="text-slate-100 italic leading-relaxed font-serif text-[13px]">"{renderInlineMarkdown(val.replace(/^"/, "").replace(/"$/, ""))}"</p>
              </div>
            </div>
          );
        } else {
          renderedElements.push(
            <div key={`bullet-spec-${index}`} className="my-1.5 flex items-start gap-2.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5" />
              <div>
                <strong className="text-purple-200 font-semibold">{label}: </strong>
                <span className="text-slate-300 leading-relaxed">{renderInlineMarkdown(val)}</span>
              </div>
            </div>
          );
        }
      } else {
        renderedElements.push(
          <div key={`bullet-plain-${index}`} className="my-1.5 flex items-start gap-2.5 text-xs text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5" />
            <span className="leading-relaxed">{renderInlineMarkdown(bulletText)}</span>
          </div>
        );
      }
      return;
    }

    // Blockquote `> text`
    if (trimmed.startsWith("> ")) {
      flushKeyValues(`quote-${index}`);
      renderedElements.push(
        <blockquote key={`quote-${index}`} className="my-3 p-3.5 border-l-2 border-purple-500 bg-purple-950/20 text-xs text-slate-200 rounded-r-xl italic leading-relaxed">
          {renderInlineMarkdown(trimmed.replace(/^>\s+/, ""))}
        </blockquote>
      );
      return;
    }

    // Default Paragraph line
    flushKeyValues(`para-${index}`);
    renderedElements.push(
      <p key={`para-${index}`} className="my-2 text-xs leading-relaxed text-slate-200">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });

  // Flush any leftover key values at the end of document
  flushKeyValues("end");

  return <div className="space-y-1 font-sans">{renderedElements}</div>;
};

/* Render inline bold, italic, code formatting */
function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return text;

  // Split string by bold (**text**), italic (*text*), and code (`text`)
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return parts.map((chunk, idx) => {
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-purple-200">
          {chunk.slice(2, -2)}
        </strong>
      );
    }
    if (chunk.startsWith("*") && chunk.endsWith("*")) {
      return (
        <em key={idx} className="italic text-slate-300 font-serif">
          {chunk.slice(1, -1)}
        </em>
      );
    }
    if (chunk.startsWith("`") && chunk.endsWith("`")) {
      return (
        <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 font-mono text-[11px] border border-white/10">
          {chunk.slice(1, -1)}
        </code>
      );
    }
    return chunk;
  });
}
