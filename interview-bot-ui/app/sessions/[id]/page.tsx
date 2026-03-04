"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSessionDetail } from "@/lib/api";
import {
  ArrowLeft, Building2, Clock, Star,
  User, Bot, Mic, Database, Zap,
  AlertCircle, Download,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */
interface TranscriptMessage {
  id: number;
  sequenceNumber: number;
  role: "interviewer" | "bot" | "sanath";
  messageText: string;
  answerSource: "knowledge_base" | "unanswered" | "fallback_ai" | "sanath_live" | null;
  confidenceScore: number | null;
  fallbackProvider: string | null;
  responseTimeMs: number | null;
  createdAt: string;
}

interface TranscriptSession {
  id: number;
  sessionCode: string;
  companyName: string | null;
  interviewerName: string | null;
  roundNumber: number | null;
  startedAt: string;
  endedAt: string | null;
  status: "active" | "completed";
  overallRating: number | null;
  notes: string | null;
  totalQuestions: number;
  answeredFromKb: number;
  unansweredCount: number;
  avgConfidenceScore: number | null;
  messages: TranscriptMessage[];
}

/* ── Helpers ────────────────────────────────────────────────── */
const sourceLabel: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  knowledge_base: {
    label: "KB",
    icon: <Database size={10} />,
    cls: "bg-green-50 text-green-700 border-green-200",
  },
  fallback_ai: {
    label: "AI Fallback",
    icon: <Zap size={10} />,
    cls: "bg-amber-50 text-amber-600 border-amber-200",
  },
  unanswered: {
    label: "Unanswered",
    icon: <AlertCircle size={10} />,
    cls: "bg-red-50 text-red-500 border-red-200",
  },
  sanath_live: {
    label: "Live",
    icon: <Mic size={10} />,
    cls: "bg-blue-50 text-blue-600 border-blue-200",
  },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatDuration(start: string, end: string | null) {
  if (!end) return "Ongoing";
  const mins = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000
  );
  return `${mins} min`;
}

function confidenceBadge(score: number) {
  const pct = Math.round(score * 100);
  const cls = score >= 0.65
    ? "bg-green-50 text-green-700"
    : score >= 0.58
    ? "bg-amber-50 text-amber-600"
    : "bg-red-50 text-red-500";
  return <span className={`text-xs px-1.5 py-0.5 rounded-full ${cls}`}>{pct}%</span>;
}

function exportTranscript(session: TranscriptSession) {
  const lines = [
    `Interview Transcript`,
    `Company: ${session.companyName ?? "Unknown"}`,
    `Date: ${formatDate(session.startedAt)}`,
    `Duration: ${formatDuration(session.startedAt, session.endedAt)}`,
    `Round: ${session.roundNumber ?? "—"}`,
    `Interviewer: ${session.interviewerName ?? "—"}`,
    "",
    "─".repeat(60),
    "",
    ...session.messages.map(m =>
      `[${formatTime(m.createdAt)}] ${m.role.toUpperCase()}\n${m.messageText}\n`
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `transcript-${session.sessionCode}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Message Bubble ─────────────────────────────────────────── */
function MessageBubble({ msg }: { msg: TranscriptMessage }) {
  const isInterviewer = msg.role === "interviewer";
  const src = msg.answerSource ? sourceLabel[msg.answerSource] : null;

  return (
    <div className={`flex gap-2.5 ${isInterviewer ? "flex-row-reverse" : "flex-row"}`}>

      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center
                       justify-center mt-0.5
                       ${isInterviewer
                         ? "bg-blue-100 text-blue-600"
                         : "bg-gray-900 text-white"}`}>
        {isInterviewer
          ? <User size={13} />
          : msg.role === "sanath"
          ? <Mic size={13} />
          : <Bot size={13} />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] ${isInterviewer ? "items-end" : "items-start"}
                       flex flex-col gap-1`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
                         ${isInterviewer
                           ? "bg-blue-600 text-white rounded-tr-sm"
                           : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"}`}>
          {msg.messageText}
        </div>

        {/* Meta */}
        <div className={`flex items-center gap-2 px-1
                         ${isInterviewer ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
          {src && (
            <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5
                              rounded-full border ${src.cls}`}>
              {src.icon} {src.label}
            </span>
          )}
          {msg.confidenceScore != null && confidenceBadge(msg.confidenceScore)}
          {msg.responseTimeMs != null && (
            <span className="text-xs text-gray-300">{msg.responseTimeMs}ms</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */
export default function TranscriptPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [session, setSession] = useState<TranscriptSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getSessionDetail(Number(id));
        setSession(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading transcript...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center
                      justify-center gap-3">
        <p className="text-sm text-gray-500">Session not found.</p>
        <button onClick={() => router.push("/sessions")}
                className="text-xs text-gray-400 hover:text-gray-600">
          ← Back to sessions
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4
                         flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sessions")}
                  className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-900">
              {session.companyName ?? "Unknown Company"}
            </span>
            {session.roundNumber && (
              <span className="text-xs text-gray-400">· Round {session.roundNumber}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => exportTranscript(session)}
          className="flex items-center gap-1.5 text-xs text-gray-500
                     hover:text-gray-800 border border-gray-200 hover:border-gray-300
                     px-3 py-1.5 rounded-xl transition-colors">
          <Download size={12} /> Export
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Session info card */}
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 mb-6">
          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
            {[
              ["Date",        formatDate(session.startedAt)],
              ["Duration",    formatDuration(session.startedAt, session.endedAt)],
              ["Interviewer", session.interviewerName ?? "—"],
              ["Status",      session.status],
              ["Questions",   String(session.totalQuestions)],
              ["From KB",     String(session.answeredFromKb)],
              ["Unanswered",  String(session.unansweredCount)],
              ["Avg Confidence",
                session.avgConfidenceScore != null
                  ? `${Math.round(session.avgConfidenceScore * 100)}%`
                  : "—"
              ],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-gray-400 mb-0.5">{k}</p>
                <p className="text-gray-800 font-medium">{v}</p>
              </div>
            ))}
          </div>

          {/* Rating */}
          {session.overallRating && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
              <Star size={13} className="text-amber-400" />
              <span className="text-xs text-gray-500">
                {"★".repeat(session.overallRating)}{"☆".repeat(5 - session.overallRating)}
              </span>
            </div>
          )}

          {/* Notes */}
          {session.notes && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Notes</p>
              <p className="text-xs text-gray-700 leading-relaxed">{session.notes}</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-5">
          {Object.values(sourceLabel).map(s => (
            <span key={s.label}
                  className={`flex items-center gap-1 text-xs px-2 py-0.5
                              rounded-full border ${s.cls}`}>
              {s.icon} {s.label}
            </span>
          ))}
          <span className="text-xs text-gray-400 self-center ml-1">answer sources</span>
        </div>

        {/* Transcript */}
        <div className="flex flex-col gap-5">
          {session.messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
        </div>

        {session.messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-12">
            No messages in this session.
          </p>
        )}

        <div className="h-10" />
      </div>
    </div>
  );
}