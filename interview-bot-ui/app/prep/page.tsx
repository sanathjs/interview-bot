"use client";

import { useState, useEffect } from "react";
import { getUnanswered, saveAnswer, promoteToKb, deleteUnanswered } from "@/lib/api";

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

interface UnansweredQuestion {
  id: number;
  questionText: string;
  category: string;
  timesAsked: number;
  priority: "high" | "medium" | "low";
  status: string;
  firstAskedAt: string;
  company: string | null;
  sessionCode: string;
}

const PIN = process.env.NEXT_PUBLIC_PREP_PIN || "1234";

const priorityStyle = {
  high:   { bg: "rgba(248,113,113,0.08)",  border: "rgba(248,113,113,0.2)",  color: "#f87171" },
  medium: { bg: "rgba(245,158,11,0.08)",   border: "rgba(245,158,11,0.2)",   color: "#fbbf24" },
  low:    { bg: "rgba(100,100,120,0.1)",   border: "#32323c",                color: "#9292a4" },
};

const statusStyle: Record<string, { bg: string; border: string; color: string }> = {
  new:         { bg: "rgba(99,102,241,0.08)",  border: "rgba(99,102,241,0.2)",  color: "#818cf8" },
  ready:       { bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)",  color: "#34d399" },
  added_to_kb: { bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)",  color: "#fbbf24" },
};

export default function PrepPage() {
  const [unlocked, setUnlocked]   = useState(false);
  const [pin, setPin]             = useState("");
  const [pinError, setPinError]   = useState(false);
  const [showPin, setShowPin]     = useState(false);
  const [questions, setQuestions] = useState<UnansweredQuestion[]>([]);
  const [filter, setFilter]       = useState("all");
  const [answers, setAnswers]     = useState<Record<number, string>>({});
  const [expanded, setExpanded]   = useState<Record<number, boolean>>({});
  const [saving, setSaving]       = useState<Record<number, boolean>>({});
  const [promoting, setPromoting] = useState<Record<number, boolean>>({});
  const [deleting, setDeleting]   = useState<Record<number, boolean>>({});
  const [feedback, setFeedback]   = useState<Record<number, string>>({});
  const [loading, setLoading]     = useState(false);
  const [focused, setFocused]     = useState<number | null>(null);
  const [ingesting, setIngesting]   = useState(false);
  const [ingestMsg, setIngestMsg]   = useState<{ ok: boolean; text: string } | null>(null);

  const handleIngest = async () => {
    setIngesting(true);
    setIngestMsg(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5267";
      const adminKey = process.env.NEXT_PUBLIC_ADMIN_INGEST_KEY || "";
      const res = await fetch(`${API_URL}/api/ingest`, {
        method: "POST",
        headers: { "X-Admin-Key": adminKey },
      });
      if (res.ok) {
        const data = await res.json();
        setIngestMsg({ ok: true, text: `✅ Re-ingested successfully · ${data.chunksCreated ?? "?"} chunks` });
      } else {
        setIngestMsg({ ok: false, text: "❌ Ingest failed — check admin key" });
      }
    } catch {
      setIngestMsg({ ok: false, text: "❌ Could not reach backend" });
    } finally {
      setIngesting(false);
    }
  };

  const handleUnlock = () => {
    if (pin === PIN) { setUnlocked(true); setPinError(false); }
    else { setPinError(true); setPin(""); }
  };

  useEffect(() => {
    if (!unlocked) return;
    fetchQuestions();
  }, [unlocked]);

  const fetchQuestions = async () => {
    setLoading(true);
    try { const data = await getUnanswered(); setQuestions(data.questions); }
    catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleSave = async (id: number) => {
    if (!answers[id]?.trim()) return;
    setSaving(p => ({ ...p, [id]: true }));
    try {
      await saveAnswer(id, answers[id]);
      setFeedback(p => ({ ...p, [id]: "saved" }));
      await fetchQuestions();
    } catch { setFeedback(p => ({ ...p, [id]: "error" })); }
    finally { setSaving(p => ({ ...p, [id]: false })); }
  };

  const handlePromote = async (id: number) => {
    setPromoting(p => ({ ...p, [id]: true }));
    try {
      await promoteToKb(id);
      setFeedback(p => ({ ...p, [id]: "promoted" }));
      await fetchQuestions();
    } catch { setFeedback(p => ({ ...p, [id]: "error" })); }
    finally { setPromoting(p => ({ ...p, [id]: false })); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this question?")) return;
    setDeleting(p => ({ ...p, [id]: true }));
    try {
      await deleteUnanswered(id);
      setQuestions(q => q.filter(x => x.id !== id));
    } catch { setFeedback(p => ({ ...p, [id]: "error" })); }
    finally { setDeleting(p => ({ ...p, [id]: false })); }
  };

  const filtered = questions.filter(q => {
    if (filter === "all")   return q.status !== "added_to_kb";
    if (filter === "new")   return q.status === "new";
    if (filter === "ready") return q.status === "ready";
    if (filter === "done")  return q.status === "added_to_kb";
    return true;
  });

  // ── PIN Screen ────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div style={{
        minHeight: "100vh", background: C.bg, display: "flex",
        alignItems: "center", justifyContent: "center",
        padding: "24px 16px", fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,158,11,0.06) 0%, transparent 60%)",
        }} />

        <div style={{
          width: "100%", maxWidth: 380, background: C.card,
          border: `1px solid ${C.border}`, borderRadius: 24,
          padding: 32, boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          position: "relative",
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="#f59e0b" strokeWidth="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontSize: 26,
            color: C.text, textAlign: "center", margin: "0 0 6px",
          }}>Prep Dashboard</h1>
          <p style={{ fontSize: 13, color: C.muted, textAlign: "center", margin: "0 0 28px" }}>
            Enter your PIN to access
          </p>

          <div style={{ position: "relative", marginBottom: 12 }}>
            <input
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={e => { setPin(e.target.value); setPinError(false); }}
              onKeyDown={e => e.key === "Enter" && handleUnlock()}
              placeholder="Enter PIN"
              autoFocus
              style={{
                width: "100%", padding: "12px 44px 12px 16px", borderRadius: 14,
                background: C.input,
                border: `1px solid ${pinError ? "#f87171" : focused === -1 ? C.amber : C.border}`,
                color: C.text, fontSize: 16, textAlign: "center",
                letterSpacing: "0.2em", outline: "none", fontFamily: "inherit",
                boxSizing: "border-box",
              }}
              onFocus={() => setFocused(-1)}
              onBlur={() => setFocused(null)}
            />
            <button onClick={() => setShowPin(p => !p)} style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: C.muted, padding: 0, display: "flex",
            }}>
              {showPin
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
              }
            </button>
          </div>
          {pinError && <p style={{ fontSize: 12, color: "#f87171", textAlign: "center", margin: "0 0 12px" }}>Incorrect PIN</p>}
          <button onClick={handleUnlock} style={{
            width: "100%", padding: "13px 0", borderRadius: 14, border: "none",
            background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "white",
            fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 0 20px rgba(245,158,11,0.25)",
          }}>Unlock</button>
        </div>
      </div>
    );
  }

  // ── Main Dashboard ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(245,158,11,0.04) 0%, transparent 60%)",
      }} />

      {/* Header */}
      <header style={{
        padding: "18px 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", borderBottom: `1px solid ${C.border}`,
        position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>Prep Dashboard</p>
            <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>
              {questions.filter(q => q.status !== "added_to_kb").length} questions to review
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={handleIngest} disabled={ingesting} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 8, cursor: ingesting ? "not-allowed" : "pointer",
            border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)",
            color: C.amber, fontSize: 12, fontWeight: 600, fontFamily: "inherit",
            opacity: ingesting ? 0.6 : 1, transition: "all 0.15s",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                 style={{ animation: ingesting ? "spin 1s linear infinite" : "none" }}>
              <path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {ingesting ? "Ingesting..." : "Re-ingest KB"}
          </button>
          <a href="/chat" style={{
            fontSize: 12, color: C.muted, textDecoration: "none",
            padding: "6px 12px", borderRadius: 8,
            border: `1px solid ${C.border}`, background: C.input,
          }}>← Back to chat</a>
        </div>
      </header>

      {/* Ingest result toast */}
      {ingestMsg && (
        <div style={{
          margin: "0 auto", maxWidth: 720, padding: "10px 16px 0",
        }}>
          <div style={{
            padding: "10px 16px", borderRadius: 12,
            background: ingestMsg.ok ? "rgba(52,211,153,0.07)" : "rgba(248,113,113,0.07)",
            border: `1px solid ${ingestMsg.ok ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`,
            fontSize: 12, color: ingestMsg.ok ? "#34d399" : "#f87171",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>{ingestMsg.text}</span>
            <button onClick={() => setIngestMsg(null)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "inherit", fontSize: 14, padding: 0, opacity: 0.6,
            }}>✕</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>

        {/* Stats strip */}
        {!loading && questions.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "To Review",   value: questions.filter(q => q.status === "new").length,         color: "#818cf8" },
              { label: "Ready",       value: questions.filter(q => q.status === "ready").length,       color: "#34d399" },
              { label: "Added to KB", value: questions.filter(q => q.status === "added_to_kb").length, color: C.amber },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 16, padding: "14px 16px", textAlign: "center",
              }}>
                <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px" }}>{label}</p>
                <p style={{ fontSize: 26, fontWeight: 700, color, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["all", "new", "ready", "done"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 16px", borderRadius: 99, fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
              background: filter === f ? "rgba(245,158,11,0.12)" : C.input,
              border: `1px solid ${filter === f ? "rgba(245,158,11,0.3)" : C.border}`,
              color: filter === f ? C.amber : C.muted,
              transition: "all 0.15s",
            }}>
              {f === "done" ? "added to KB" : f}
            </button>
          ))}
        </div>

        {/* Questions */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0", fontSize: 14, color: C.muted }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontSize: 28, margin: "0 0 8px" }}>🎉</p>
            <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>No questions in this category</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(q => {
              const ps = priorityStyle[q.priority] || priorityStyle.low;
              const ss = statusStyle[q.status]     || statusStyle.new;
              const isExpanded = !!expanded[q.id];

              return (
                <div key={q.id} style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 16, overflow: "hidden",
                  transition: "border-color 0.15s",
                }}>
                  {/* Question header */}
                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        {/* Badges */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 500,
                            background: ps.bg, border: `1px solid ${ps.border}`, color: ps.color,
                          }}>{q.priority} priority</span>
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 500,
                            background: ss.bg, border: `1px solid ${ss.border}`, color: ss.color,
                          }}>{q.status.replace("_", " ")}</span>
                          {q.timesAsked > 1 && (
                            <span style={{
                              fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 500,
                              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                              color: C.amber,
                            }}>asked {q.timesAsked}×</span>
                          )}
                          {q.company && (
                            <span style={{
                              fontSize: 11, padding: "2px 8px", borderRadius: 99,
                              background: C.input, border: `1px solid ${C.border}`, color: C.subtle,
                            }}>{q.company}</span>
                          )}
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: C.text, margin: "0 0 6px", lineHeight: 1.5 }}>
                          {q.questionText}
                        </p>
                        <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                          First asked: {new Date(q.firstAskedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <button onClick={() => setExpanded(p => ({ ...p, [q.id]: !p[q.id] }))}
                        style={{
                          width: 28, height: 28, borderRadius: 8, border: "none",
                          cursor: "pointer", flexShrink: 0, marginTop: 2,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: isExpanded ? "rgba(245,158,11,0.1)" : C.input,
                          color: isExpanded ? C.amber : C.muted,
                        }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <polyline points={isExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}
                                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded answer area */}
                  {isExpanded && (
                    <div style={{
                      padding: "16px 20px",
                      background: C.input,
                      borderTop: `1px solid ${C.border}`,
                    }}>
                      <label style={{ fontSize: 12, fontWeight: 500, color: C.subtle, display: "block", marginBottom: 8 }}>
                        Your answer
                      </label>
                      <textarea
                        value={answers[q.id] ?? ""}
                        onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                        placeholder="Type your answer here..."
                        rows={4}
                        style={{
                          width: "100%", padding: "12px 14px", borderRadius: 12,
                          background: C.card, border: `1px solid ${focused === q.id ? C.amber : C.border}`,
                          color: C.text, fontSize: 13, resize: "none",
                          outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                          transition: "border-color 0.2s",
                        }}
                        onFocus={() => setFocused(q.id)}
                        onBlur={() => setFocused(null)}
                      />

                      {feedback[q.id] && (
                        <p style={{
                          fontSize: 12, margin: "6px 0 0",
                          color: feedback[q.id] === "error" ? "#f87171" : "#34d399",
                        }}>
                          {feedback[q.id] === "saved"    && "✅ Answer saved"}
                          {feedback[q.id] === "promoted" && "🚀 Added to knowledge base!"}
                          {feedback[q.id] === "error"    && "❌ Something went wrong"}
                        </p>
                      )}

                      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        {/* Save */}
                        <button onClick={() => handleSave(q.id)}
                          disabled={saving[q.id] || !answers[q.id]?.trim()}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                            background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "white",
                            fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                            opacity: (saving[q.id] || !answers[q.id]?.trim()) ? 0.4 : 1,
                          }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                          </svg>
                          {saving[q.id] ? "Saving..." : "Save Answer"}
                        </button>

                        {/* Promote */}
                        {q.status === "ready" && (
                          <button onClick={() => handlePromote(q.id)}
                            disabled={promoting[q.id]}
                            style={{
                              display: "flex", alignItems: "center", gap: 6,
                              padding: "8px 16px", borderRadius: 10, cursor: "pointer",
                              background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)",
                              color: "#34d399", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                              opacity: promoting[q.id] ? 0.4 : 1,
                            } as React.CSSProperties}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            {promoting[q.id] ? "Adding..." : "Add to KB"}
                          </button>
                        )}

                        {/* Delete */}
                        <button onClick={() => handleDelete(q.id)}
                          disabled={deleting[q.id]}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "8px 16px", borderRadius: 10, cursor: "pointer",
                            background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)",
                            color: "#f87171", fontSize: 12, fontWeight: 500, fontFamily: "inherit",
                            opacity: deleting[q.id] ? 0.4 : 1, marginLeft: "auto",
                          }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          {deleting[q.id] ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}