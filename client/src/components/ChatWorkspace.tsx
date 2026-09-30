import React from "react";
import {
  Sparkles,
  User,
  FileText,
  CheckCircle2,
  ArrowUpRight,
  Copy,
  Activity,
  Cpu,
  Layers,
  Menu,
  FileCheck,
  Shield,
  Zap,
} from "lucide-react";
import type { OutputType } from "../../../server/ml_model";

export interface ChatMessageItem {
  id: string;
  sender: "user" | "model";
  text: string;
  timestamp: string;
  attachments?: Array<{ filename: string; mimeType: string; size: string }>;
  deliverables?: Array<{ type: OutputType; title: string; content: string }>;
  intentBadge?: string;
  isThinking?: boolean;
}

interface ChatWorkspaceProps {
  messages: ChatMessageItem[];
  onSelectDeliverable: (type: OutputType) => void;
  onQuickPrompt: (promptText: string) => void;
  onCopyText: (text: string) => void;
  onToggleSidebar?: () => void;
  deliverablesCount?: number;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  messages,
  onSelectDeliverable,
  onQuickPrompt,
  onCopyText,
  onToggleSidebar,
  deliverablesCount = 0,
}) => {
  return (
    <div className="chat-workspace-container flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Morphix Engine Header */}
      <div className="chat-workspace-header px-6 py-3 border-b border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Morphix Logo Mark"
            className="w-9 h-9 rounded-xl object-cover border border-purple-500/30 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-tight">Morphix Engine</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-medium flex items-center gap-1 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Multi-Modal Content Transformation & Grounding Engine</p>
          </div>
        </div>

        {/* Telemetry & 3-Lines Sidebar Toggle Button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-white/10 text-slate-300 flex items-center gap-1.5">
              <Activity size={12} className="text-emerald-400" />
              <span>Grounded</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-white/10 text-slate-300 flex items-center gap-1.5">
              <Layers size={12} className="text-purple-400" />
              <span>Multi-Format</span>
            </span>
          </div>

          {onToggleSidebar && (
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold transition-all shadow"
              onClick={onToggleSidebar}
              title="Toggle Deliverables Side Panel (3-Lines Menu)"
            >
              <Menu size={16} />
              <span className="hidden md:inline">Side Panel</span>
              <span className="px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 text-[10px] font-mono">
                {deliverablesCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Stream Container */}
      <div className="chat-message-stream flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";

          return (
            <div
              key={msg.id}
              className={`flex gap-3.5 max-w-4xl mx-auto ${
                isUser ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar Bubble */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                  isUser
                    ? "bg-purple-600 text-white"
                    : "bg-gradient-to-tr from-purple-900 to-indigo-700 text-purple-200 border border-purple-400/30"
                }`}
              >
                {isUser ? <User size={15} /> : <Sparkles size={15} />}
              </div>

              {/* Message Content Box */}
              <div
                className={`flex-1 max-w-[85%] rounded-2xl p-4 border transition-all ${
                  isUser
                    ? "bg-purple-950/40 border-purple-500/30 text-purple-100 rounded-tr-none"
                    : "bg-slate-900/90 border-white/10 text-slate-100 rounded-tl-none shadow-xl"
                }`}
              >
                {/* Author & Timestamp Line */}
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">
                      {isUser ? "Human Operator" : "Morphix Engine"}
                    </span>
                    <span className="text-slate-500">{msg.timestamp}</span>
                  </div>
                  {msg.intentBadge && (
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] border border-purple-500/30">
                      {msg.intentBadge}
                    </span>
                  )}
                </div>

                {/* Attachments Pill List */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {msg.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-purple-500/30 text-xs text-purple-200"
                      >
                        <FileText size={14} className="text-purple-400" />
                        <span className="font-medium">{att.filename}</span>
                        <span className="text-slate-400 text-[10px]">({att.size})</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Thinking / Loading State */}
                {msg.isThinking ? (
                  <div className="py-4 flex items-center gap-3 text-purple-300 text-xs font-medium">
                    <Sparkles size={18} className="animate-spin text-purple-400" />
                    <span>Morphix Engine is processing context and synthesizing grounded deliverables...</span>
                  </div>
                ) : (
                  <div className="text-xs leading-relaxed space-y-2">
                    <FormattedMessageBody text={msg.text} />
                  </div>
                )}

                {/* Deliverables Action Grid Cards inside AI response */}
                {msg.deliverables && msg.deliverables.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 size={13} />
                      <span>{msg.deliverables.length} Deliverable(s) Generated & Ready:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {msg.deliverables.map((d) => (
                        <button
                          key={d.type}
                          type="button"
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-purple-500/30 hover:border-purple-400 text-left transition-all group shadow-sm"
                          onClick={() => onSelectDeliverable(d.type)}
                        >
                          <div>
                            <span className="block text-xs font-bold text-slate-100 group-hover:text-purple-300 transition-colors">
                              {d.title}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-mono">
                              Click to view in sidebar ↗
                            </span>
                          </div>
                          <ArrowUpRight size={14} className="text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Toolbar */}
                {!msg.isThinking && !isUser && (
                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-end">
                    <button
                      type="button"
                      className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/60 hover:bg-slate-800 text-[11px] text-slate-300 hover:text-white transition-colors"
                      onClick={() => onCopyText(msg.text)}
                      title="Copy response text"
                    >
                      <Copy size={12} />
                      <span>Copy</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* Format inline markdown for message paragraphs */
const FormattedMessageBody: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const paragraphs = text.split("\n\n");

  return (
    <>
      {paragraphs.map((para, pIdx) => {
        const formatted = para.split(/(\*\*.*?\*\*)/g).map((chunk, cIdx) => {
          if (chunk.startsWith("**") && chunk.endsWith("**")) {
            return (
              <strong key={cIdx} className="font-semibold text-purple-200">
                {chunk.slice(2, -2)}
              </strong>
            );
          }
          return chunk;
        });

        return (
          <p key={pIdx} className="leading-relaxed text-slate-200 text-xs">
            {formatted}
          </p>
        );
      })}
    </>
  );
};
