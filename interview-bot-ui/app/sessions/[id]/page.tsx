"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSessionDetail } from "@/lib/api";

const C = {
  bg:     "#0d0d0f",
  card:   "#1c1c21",
  border: "#32323c",
  text:   "#e8e8ef",
  muted:  "#6b6b7d",
  subtle: "#9292a4",
  amber:  "#f59e0b",
  input:  "#141417",
};

interface TranscriptMessage {
  id: number;
  sequenceNumber: number;
  role: "interviewer" | "assistant";
  messageText: string;
  confidenceScore: number | null;
  answerSource: string | null;
  responseTimeMs: number | null;
  wasHelpful: boolean | null;
  createdAt: string;
}

interface SessionDetail {
  id: number;
  sessionCode: string;
  companyName: string | null;
  interviewerName: string | null;
  roundNumber: number | null;
  startedAt: string;
  endedAt: string | null;
  status: string;
  overallRating: number | null;
  notes: string | null;
  totalQuestions: number;
  answeredFromKb: number;
  unansweredCount: number;
  avgConfidenceScore: number | null;
  messages: TranscriptMessage[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start: string, end: string | null) {
  if (!end) return "Ongoing";
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return `${mins} min`;
}

function confColor(score: number) {
  return score >= 0.65 ? "#34d399" : score >= 0.55 ? "#fbbf24" : "#f87171";
}

function SourceBadge({ source }: { source: string | null }) {
  if (!source || source === "greeting") return null;
  const isKB      = source === "knowledge_base";
  const isLLM     = source === "fallback_ai";
  const isUnknown = source === "unanswered";

  const color  = isKB ? "#34d399" : isLLM ? "#818cf8" : C.amber;
  const bg     = isKB ? "rgba(52,211,153,0.08)"  : isLLM ? "rgba(99,102,241,0.08)"  : "rgba(245,158,11,0.08)";
  const border = isKB ? "rgba(52,211,153,0.2)"   : isLLM ? "rgba(99,102,241,0.2)"   : "rgba(245,158,11,0.2)";
  const label  = isKB ? "KB" : isLLM ? "AI" : "Unanswered";

  return (
    <span style={{
      fontSize: 10, padding: "2px 7px", borderRadius: 99, fontWeight: 600,
      background: bg, border: `1px solid ${border}`, color,
    }}>{label}</span>
  );
}

export default function SessionTranscriptPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    (async () => {
      setLoading(true);
      try {
        const data = await getSessionDetail(Number(params.id));
        setSession(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.id]);

  const handleExport = () => {
    if (!session) return;
    const lines = [
      `Interview Transcript`,
      `Company: ${session.companyName || "Unknown"}`,
      `Interviewer: ${session.interviewerName || "Unknown"}`,
      `Date: ${formatDate(session.startedAt)}`,
      `Duration: ${formatDuration(session.startedAt, session.endedAt)}`,
      ``,
      ...session.messages.map(m =>
        `[${formatTime(m.createdAt)}] ${m.role === "interviewer" ? "Interviewer" : "Sanath"}:\n${m.messageText}`
      ),
    ];
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `transcript-${session.sessionCode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAll = () => {
    if (!session) return;
    const text = session.messages
      .map(m => `${m.role === "interviewer" ? "Interviewer" : "Sanath"}: ${m.messageText}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading ───────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%", margin: "0 auto 16px",
          border: `3px solid ${C.border}`, borderTopColor: C.amber,
          animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ fontSize: 14, color: C.muted }}>Loading transcript...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────
  if (error || !session) return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>🗂️</p>
        <p style={{ fontSize: 15, color: C.text, marginBottom: 6 }}>Session not found</p>
        <button onClick={() => router.push("/sessions")} style={{
          marginTop: 16, padding: "8px 20px", borderRadius: 10, border: "none",
          background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "white",
          fontSize: 13, cursor: "pointer", fontFamily: "inherit",
        }}>← Back to Sessions</button>
      </div>
    </div>
  );

  const kbMessages       = session.messages.filter(m => m.answerSource === "knowledge_base");
  const unansweredMsgs   = session.messages.filter(m => m.answerSource === "unanswered");

  // ── Main ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>

      {/* Ambient glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(245,158,11,0.04) 0%, transparent 60%)",
      }} />

      {/* Header */}
      <header style={{
        padding: "16px 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", borderBottom: `1px solid ${C.border}`,
        position: "sticky", top: 0, background: "rgba(13,13,15,0.92)",
        backdropFilter: "blur(12px)", zIndex: 10, flexWrap: "wrap", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/sessions")} style={{
            width: 32, height: 32, borderRadius: 10, border: `1px solid ${C.border}`,
            background: C.input, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", color: C.muted, flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>
              {session.companyName || "Unknown Company"}
              {session.interviewerName && (
                <span style={{ fontWeight: 400, color: C.muted }}> · {session.interviewerName}</span>
              )}
            </p>
            <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>
              {formatDate(session.startedAt)} · {formatDuration(session.startedAt, session.endedAt)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleCopyAll} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 10, cursor: "pointer",
            background: C.input, border: `1px solid ${C.border}`,
            color: copied ? C.amber : C.subtle, fontSize: 12, fontFamily: "inherit",
          }}>
            {copied
              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/></svg>
            }
            {copied ? "Copied!" : "Copy"}
          </button>
          <button onClick={handleExport} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 10, cursor: "pointer",
            background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
            color: C.amber, fontSize: 12, fontFamily: "inherit",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Export
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px" }}>

        {/* Stats cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 28 }}>
          {[
            {
              label: "Status",
              value: session.status,
              color: session.status === "active" ? "#34d399" : C.subtle,
              bg: session.status === "active" ? "rgba(52,211,153,0.08)" : C.input,
              border: session.status === "active" ? "rgba(52,211,153,0.2)" : C.border,
            },
            {
              label: "Questions",
              value: session.totalQuestions,
              color: C.text, bg: C.input, border: C.border,
            },
            {
              label: "From KB",
              value: session.answeredFromKb,
              color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)",
            },
            {
              label: "Avg Match",
              value: session.avgConfidenceScore ? `${Math.round(session.avgConfidenceScore * 100)}%` : "—",
              color: session.avgConfidenceScore ? confColor(session.avgConfidenceScore) : C.muted,
              bg: C.input, border: C.border,
            },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} style={{
              background: bg, border: `1px solid ${border}`,
              borderRadius: 14, padding: "12px 14px", textAlign: "center",
            }}>
              <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px" }}>{label}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color, margin: 0, textTransform: "capitalize" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Rating if present */}
        {session.overallRating && (
          <div style={{
            padding: "12px 16px", borderRadius: 14, marginBottom: 20,
            background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 18, letterSpacing: 2 }}>
              {"★".repeat(session.overallRating)}{"☆".repeat(5 - session.overallRating)}
            </span>
            <span style={{ fontSize: 12, color: C.amber }}>Session Rating</span>
            {session.notes && (
              <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>· {session.notes}</span>
            )}
          </div>
        )}

        {/* Transcript */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {session.messages.map((msg, idx) => {
            const isInterviewer = msg.role === "interviewer";
            return (
              <div key={msg.id} style={{
                display: "flex", gap: 10,
                justifyContent: isInterviewer ? "flex-end" : "flex-start",
              }}>

                {/* Bot avatar */}
                {!isInterviewer && (
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                    background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="#f59e0b"/>
                    </svg>
                  </div>
                )}

                <div style={{
                  maxWidth: "75%", display: "flex", flexDirection: "column",
                  gap: 4, alignItems: isInterviewer ? "flex-end" : "flex-start",
                }}>
                  {/* Bubble */}
                  <div style={{
                    padding: "11px 15px",
                    borderRadius: isInterviewer ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: isInterviewer
                      ? "linear-gradient(135deg, #f59e0b, #d97706)"
                      : msg.answerSource === "unanswered"
                      ? "rgba(245,158,11,0.07)"
                      : msg.answerSource === "fallback_ai"
                      ? "rgba(99,102,241,0.07)"
                      : C.card,
                    border: isInterviewer ? "none"
                      : msg.answerSource === "unanswered" ? "1px solid rgba(245,158,11,0.15)"
                      : msg.answerSource === "fallback_ai" ? "1px solid rgba(99,102,241,0.15)"
                      : `1px solid ${C.border}`,
                    color: isInterviewer ? "white" : C.text,
                    fontSize: 14, lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.messageText}
                  </div>

                  {/* Meta row */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    flexDirection: isInterviewer ? "row-reverse" : "row",
                    padding: "0 2px",
                  }}>
                    <span style={{ fontSize: 11, color: "#4a4a58" }}>{formatTime(msg.createdAt)}</span>

                    {!isInterviewer && <SourceBadge source={msg.answerSource} />}

                    {!isInterviewer && msg.confidenceScore != null && (
                      <span style={{
                        fontSize: 11, fontWeight: 500,
                        color: confColor(msg.confidenceScore),
                      }}>
                        {Math.round(msg.confidenceScore * 100)}%
                      </span>
                    )}

                    {!isInterviewer && msg.wasHelpful !== null && (
                      <span style={{ fontSize: 11 }}>
                        {msg.wasHelpful ? "👍" : "👎"}
                      </span>
                    )}

                    {!isInterviewer && msg.responseTimeMs != null && (
                      <span style={{ fontSize: 10, color: "#4a4a58" }}>
                        {msg.responseTimeMs}ms
                      </span>
                    )}
                  </div>
                </div>

                {/* Interviewer avatar */}
                {isInterviewer && (
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2"/>
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer summary */}
        {session.messages.length > 0 && (
          <div style={{
            marginTop: 32, padding: "16px 20px", borderRadius: 16,
            background: C.card, border: `1px solid ${C.border}`,
            display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center",
          }}>
            <span style={{ fontSize: 12, color: C.muted }}>
              🟢 <strong style={{ color: C.text }}>{kbMessages.length}</strong> answered from KB
            </span>
            <span style={{ fontSize: 12, color: C.muted }}>
              🟡 <strong style={{ color: C.text }}>{unansweredMsgs.length}</strong> unanswered
            </span>
            <span style={{ fontSize: 12, color: C.muted }}>
              ⏱ {formatDuration(session.startedAt, session.endedAt)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}