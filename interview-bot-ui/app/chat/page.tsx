"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Message, ConversationTurn } from "@/types";
import { sendMessage } from "@/lib/api";
import MessageBubble from "@/components/chat/MessageBubble";
import TypingIndicator from "@/components/chat/TypingIndicator";
import InputBar from "@/components/chat/InputBar";
import Navbar from "@/components/Navbar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5267";

const C = {
  bg:     "#0d0d0f",
  card:   "#1c1c21",
  header: "#141417",
  border: "#32323c",
  text:   "#e8e8ef",
  muted:  "#6b6b7d",
  subtle: "#9292a4",
  amber:  "#f59e0b",
};

let counter = 0;
function newId() { counter += 1; return `msg-${counter}`; }

const ROUND_LABELS: Record<string, string> = {
  technical: "Technical", hr: "HR", system_design: "System Design",
  behavioural: "Behavioural", general: "General",
};

const HISTORY_WINDOW = 6;

function Toggle({ on, onChange, label, desc }: {
  on: boolean; onChange: (v: boolean) => void; label: string; desc: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 14px", borderRadius: 12,
      background: C.bg, border: `1px solid ${C.border}`,
    }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 500, color: C.text, margin: 0 }}>{label}</p>
        <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 0" }}>{desc}</p>
      </div>
      <button onClick={() => onChange(!on)} style={{
        width: 38, height: 22, borderRadius: 11, border: "none",
        background: on ? "linear-gradient(135deg, #f59e0b, #d97706)" : C.border,
        cursor: "pointer", position: "relative", flexShrink: 0, marginLeft: 12,
        transition: "background 0.2s",
        boxShadow: on ? "0 0 8px rgba(245,158,11,0.3)" : "none",
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: "50%", background: "white",
          position: "absolute", top: 3, left: on ? 19 : 3,
          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </button>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages]           = useState<Message[]>([]);
  const [sessionId, setSessionId]         = useState("");
  const [isLoading, setIsLoading]         = useState(false);
  const [mounted, setMounted]             = useState(false);
  const [ended, setEnded]                 = useState(false);
  const [ending, setEnding]               = useState(false);
  const [streamingId, setStreamingId]     = useState<string | null>(null);
  const [avgConfidence, setAvgConfidence] = useState<number | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [showSettings, setShowSettings]   = useState(false);
  const bottomRef                         = useRef<HTMLDivElement>(null);
  const sessionIdRef                      = useRef<string>("");  // stable ref for cleanup
  const endedRef                          = useRef(false);       // stable ref for cleanup

  const [showFollowUps,    setShowFollowUps]    = useState(true);
  const [showSourceDetail, setShowSourceDetail] = useState(true);

  const [interviewerName, setInterviewerName] = useState<string | null>(null);
  const [companyName, setCompanyName]         = useState<string | null>(null);
  const [roundType, setRoundType]             = useState("general");
  const [isAdmin, setIsAdmin]                 = useState(false);

  // ── Silently end a session via fetch (used in cleanup) ─────────
  const endSession = useCallback(async (sid: string) => {
    if (!sid || endedRef.current) return;
    endedRef.current = true;
    try {
      await fetch(`${API_URL}/api/sessions/${sid}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,   // keeps request alive even if page unloads
      });
    } catch { /* silent */ }
  }, []);

  // ── Init ────────────────────────────────────────────────────────
  useEffect(() => {
    const sid     = `session-${Date.now()}`;
    const name    = localStorage.getItem("ib_interviewer_name");
    const company = localStorage.getItem("ib_company_name");
    const round   = localStorage.getItem("ib_round_type") || "general";
    const admin   = localStorage.getItem("ib_role") === "admin";

    const storedFollowUps = localStorage.getItem("ib_show_followups");
    const storedSource    = localStorage.getItem("ib_show_source");
    if (storedFollowUps !== null) setShowFollowUps(storedFollowUps === "true");
    if (storedSource    !== null) setShowSourceDetail(storedSource === "true");

    setSessionId(sid);
    sessionIdRef.current = sid;
    setInterviewerName(name);
    setCompanyName(company);
    setRoundType(round);
    setIsAdmin(admin);
    setMounted(true);

    const greeting = name
      ? `Hello ${name}! I'm Sanath's interview assistant — go ahead and ask me anything about his experience, skills, or background.`
      : "Hello! I'm Sanath's interview assistant. Ask me anything about his experience, skills, or background.";

    setMessages([{
      id: "welcome", role: "bot", text: greeting,
      answerSource: "greeting", timestamp: new Date().toISOString(),
    }]);

    // ── Auto-end when tab closes / navigates away ──────────────
    const handleBeforeUnload = () => {
      // Use sendBeacon for guaranteed delivery on page unload
      if (!endedRef.current && sessionIdRef.current) {
        navigator.sendBeacon(
          `${API_URL}/api/sessions/${sessionIdRef.current}/end`,
        );
        endedRef.current = true;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup on React unmount (SPA navigation)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      endSession(sessionIdRef.current);
    };
  }, [endSession]);

  const handleFollowUpsToggle = (v: boolean) => {
    setShowFollowUps(v);
    localStorage.setItem("ib_show_followups", String(v));
  };
  const handleSourceToggle = (v: boolean) => {
    setShowSourceDetail(v);
    localStorage.setItem("ib_show_source", String(v));
  };

  useEffect(() => {
    if (!sessionId || !interviewerName) return;
    fetch(`${API_URL}/api/sessions/${sessionId}/details`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interviewerName, companyName }),
    }).catch(() => {});
  }, [sessionId, interviewerName, companyName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const scored = messages.filter(
      m => m.role === "bot" && m.confidenceScore != null && m.answerSource === "knowledge_base"
    );
    if (!scored.length) { setAvgConfidence(null); return; }
    setAvgConfidence(scored.reduce((a, m) => a + (m.confidenceScore ?? 0), 0) / scored.length);
  }, [messages]);

  const handleSend = async (text: string) => {
    if (ended) return;

    const interviewerMsg: Message = {
      id: newId(), role: "interviewer", text, timestamp: new Date().toISOString(),
    };

    const allMsgs      = [...messages, interviewerMsg];
    const relevantMsgs = allMsgs.filter(m => m.answerSource !== "greeting");
    const recentMsgs   = relevantMsgs.slice(-HISTORY_WINDOW);
    const history: ConversationTurn[] = recentMsgs.map(m => ({
      role: m.role, text: m.text,
    }));

    setMessages(prev => [...prev, interviewerMsg]);
    setIsLoading(true);
    setQuestionCount(c => c + 1);

    const botMsgId = newId();
    try {
      const response = await sendMessage({ sessionId, message: text, roundType, history });
      const words = response.answer.split(" ");

      setMessages(prev => [...prev, {
        id: botMsgId, role: "bot", text: "",
        answerSource: response.answerSource as Message["answerSource"],
        confidenceScore: response.confidenceScore,
        sources: response.sources,
        followUps: response.followUps,
        timestamp: new Date().toISOString(),
      }]);
      setStreamingId(botMsgId);
      setIsLoading(false);

      let current = "";
      for (let i = 0; i < words.length; i++) {
        current += (i === 0 ? "" : " ") + words[i];
        const c = current;
        setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: c } : m));
        await new Promise(r => setTimeout(r, 28));
      }
      setStreamingId(null);
    } catch {
      setIsLoading(false);
      setStreamingId(null);
      setMessages(prev => [...prev, {
        id: botMsgId, role: "bot",
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
      }]);
    }
  };

  const handleFeedback = async (messageId: string, helpful: boolean) => {
    try {
      await fetch(`${API_URL}/api/messages/${messageId}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpful, sessionCode: sessionId }),
      });
    } catch { /* non-critical */ }
  };

  const handleEndSession = async () => {
    if (ending || ended) return;
    setEnding(true);
    endedRef.current = true;
    await endSession(sessionId);
    setEnded(true);
    setEnding(false);
  };

  const confPct   = avgConfidence ? Math.round(avgConfidence * 100) : 0;
  const confColor = avgConfidence
    ? avgConfidence >= 0.65 ? "#34d399" : avgConfidence >= 0.55 ? "#fbbf24" : "#f87171"
    : C.border;

  if (!mounted) return null;

  // ── THANK YOU SCREEN ──────────────────────────────────────────
  if (ended) {
    return (
      <div style={{
        minHeight: "100vh", background: C.bg, display: "flex",
        flexDirection: "column", fontFamily: "'DM Sans', sans-serif",
      }}>
        <Navbar />

        {/* Ended banner */}
        <div style={{
          padding: "10px 20px", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 8,
          background: "rgba(52,211,153,0.07)",
          borderBottom: "1px solid rgba(52,211,153,0.15)",
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#34d399", boxShadow: "0 0 6px #34d399",
          }} />
          <span style={{ fontSize: 12, color: "#34d399", fontWeight: 500 }}>
            Session ended · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0 24px", textAlign: "center",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", marginBottom: 24,
            background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <polyline points="20 6 9 17 4 12" stroke="#34d399" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 style={{
            fontFamily: "'Playfair Display', serif", fontSize: 28,
            color: C.text, margin: "0 0 10px",
          }}>Interview Complete</h2>

          {interviewerName && (
            <p style={{ fontSize: 14, color: C.subtle, margin: "0 0 6px" }}>
              Thank you, <strong style={{ color: C.text }}>{interviewerName}</strong>
              {companyName && <> from <strong style={{ color: C.text }}>{companyName}</strong></>}!
            </p>
          )}
          <p style={{ fontSize: 14, color: C.muted, maxWidth: 280, lineHeight: 1.6, margin: "0 0 32px" }}>
            It was a pleasure. Sanath will be in touch with you shortly.
          </p>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3,1fr)",
            gap: 12, marginBottom: 32, width: "100%", maxWidth: 340,
          }}>
            {[
              { label: "Questions",      value: questionCount },
              { label: "Avg Confidence", value: avgConfidence ? `${confPct}%` : "—" },
              { label: "Round",          value: ROUND_LABELS[roundType] || "General" },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 16, padding: "12px 8px", textAlign: "center",
              }}>
                <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px" }}>{label}</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => window.location.reload()} style={{
              padding: "10px 24px", borderRadius: 16, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "white",
              fontSize: 14, fontWeight: 600, fontFamily: "inherit",
            }}>New Session</button>
            <a href="/" style={{
              padding: "10px 24px", borderRadius: 16, textDecoration: "none",
              background: C.card, border: `1px solid ${C.border}`,
              color: C.subtle, fontSize: 14, fontFamily: "inherit",
            }}>Go Home</a>
          </div>
        </div>
      </div>
    );
  }

  // ── CHAT SCREEN ───────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg }}>
      <Navbar />

      {/* Sub-header */}
      <div style={{
        padding: "10px 16px", display: "flex", alignItems: "center",
        justifyContent: "space-between", background: C.header,
        borderBottom: `1px solid ${C.border}`, flexShrink: 0, flexWrap: "wrap", gap: 8,
      }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>
            Sanath Kumar J S
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
            {/* Live indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#34d399", boxShadow: "0 0 5px #34d399",
                animation: "pulse 2s ease infinite",
              }} />
              <span style={{ fontSize: 11, color: "#34d399", fontWeight: 500 }}>Live</span>
            </div>
            <span style={{ color: C.border }}>·</span>
            <span style={{ fontSize: 11, color: C.muted }}>Lead Software Engineer</span>
            {companyName && <>
              <span style={{ color: C.border }}>·</span>
              <span style={{ fontSize: 11, color: C.muted }}>{companyName}</span>
            </>}
            <span style={{ color: C.border }}>·</span>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 99,
              background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
              color: C.amber,
            }}>{ROUND_LABELS[roundType] || "General"}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {avgConfidence !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: C.muted }}>KB Match</span>
              <div style={{ width: 72, height: 4, borderRadius: 99, background: C.border, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99, width: `${confPct}%`,
                  background: confColor, transition: "width 0.8s ease",
                }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: confColor }}>{confPct}%</span>
            </div>
          )}

          {/* Admin settings */}
          {isAdmin && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowSettings(s => !s)} style={{
                width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: showSettings ? "rgba(245,158,11,0.12)" : C.card,
                outline: `1px solid ${showSettings ? "rgba(245,158,11,0.3)" : C.border}`,
                color: showSettings ? C.amber : C.subtle,
              }} title="Admin Settings">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
                        stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>

              {showSettings && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 8px)", width: 280,
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
                  padding: 16, zIndex: 50, boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.amber, boxShadow: "0 0 6px #f59e0b" }} />
                    <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0 }}>Admin Settings</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Toggle on={showFollowUps} onChange={handleFollowUpsToggle}
                      label="Follow-up Questions" desc="Show suggested follow-ups after each answer" />
                    <Toggle on={showSourceDetail} onChange={handleSourceToggle}
                      label="Source Attribution" desc="Show KB / AI source banner on answers" />
                  </div>
                  <p style={{ fontSize: 10, color: "#32323c", margin: "12px 0 0", textAlign: "center" }}>
                    Preferences saved automatically
                  </p>
                </div>
              )}
            </div>
          )}

          {/* End session button */}
          <button onClick={handleEndSession} disabled={ending} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 10, cursor: "pointer",
            background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)",
            color: "#f87171", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
            opacity: ending ? 0.5 : 1,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" fill="#f87171"/>
            </svg>
            {ending ? "Ending..." : "End Session"}
          </button>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px" }}
           onClick={() => showSettings && setShowSettings(false)}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.map(msg => (
            <MessageBubble
              key={msg.id} message={msg}
              streaming={msg.id === streamingId}
              showFollowUps={showFollowUps}
              showSourceDetails={showSourceDetail}
              onFeedback={handleFeedback}
              onFollowUp={handleSend}
            />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      <InputBar onSend={handleSend} disabled={isLoading || ended || streamingId !== null} />
    </div>
  );
}