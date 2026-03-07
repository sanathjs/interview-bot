"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

const PREP_PIN = process.env.NEXT_PUBLIC_PREP_PIN || "1234";

const ROUND_TYPES = [
  { value: "technical",     label: "Technical",    desc: "Coding, architecture, problem-solving" },
  { value: "hr",            label: "HR",            desc: "Culture fit, background, motivations" },
  { value: "system_design", label: "System Design", desc: "Scalability, infrastructure, design" },
  { value: "behavioural",   label: "Behavioural",   desc: "Situational, STAR-based questions" },
  { value: "general",       label: "General",       desc: "Mixed or exploratory interview" },
];

const C = {
  bg:     "#0d0d0f",
  card:   "#1c1c21",
  border: "#32323c",
  input:  "#141417",
  text:   "#e8e8ef",
  muted:  "#6b6b7d",
  subtle: "#9292a4",
  amber:  "#f59e0b",
};

export default function HomePage() {
  const router = useRouter();
  const [step, setStep]                       = useState<"choose" | "pin" | "interviewer" | "admin-dashboard">("choose");
  const [ingestStatus, setIngestStatus]       = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [pin, setPin]                         = useState("");
  const [pinError, setPinError]               = useState("");
  const [showPin, setShowPin]                 = useState(false);
  const [interviewerName, setInterviewerName] = useState("");
  const [companyName, setCompanyName]         = useState("");
  const [roundType, setRoundType]             = useState("general");
  const [formError, setFormError]             = useState("");

  const handlePinSubmit = () => {
    if (pin === PREP_PIN) {
      localStorage.setItem("ib_role", "admin");
      localStorage.removeItem("ib_interviewer_name");
      localStorage.removeItem("ib_company_name");
      setStep("admin-dashboard");
    } else {
      setPinError("Incorrect PIN. Try again.");
      setPin("");
    }
  };

  const handleIngest = async () => {
    setIngestStatus("loading");
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5267";
      const KEY     = process.env.NEXT_PUBLIC_ADMIN_INGEST_KEY || "";
      const res     = await fetch(`${API_URL}/api/ingest`, {
        method: "POST", headers: { "X-Admin-Key": KEY },
      });
      setIngestStatus(res.ok ? "ok" : "error");
    } catch {
      setIngestStatus("error");
    }
    setTimeout(() => setIngestStatus("idle"), 3000);
  };

  const handleInterviewerSubmit = () => {
    if (!interviewerName.trim()) { setFormError("Please enter your name."); return; }
    if (!companyName.trim())     { setFormError("Please enter your company."); return; }
    localStorage.setItem("ib_role", "interviewer");
    localStorage.setItem("ib_interviewer_name", interviewerName.trim());
    localStorage.setItem("ib_company_name", companyName.trim());
    localStorage.setItem("ib_round_type", roundType);
    router.push("/chat");
  };

  const inputStyle: React.CSSProperties = {
    background: C.input, border: `1px solid ${C.border}`, color: C.text,
    borderRadius: 16, padding: "12px 16px", fontSize: 14, width: "100%",
    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };

  const amberBtn: React.CSSProperties = {
    background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "white",
    border: "none", borderRadius: 16, padding: "13px 0", width: "100%",
    fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    boxShadow: "0 0 20px rgba(245,158,11,0.25)",
  };

  const backBtn: React.CSSProperties = {
    background: "none", border: "none", color: C.muted, fontSize: 12,
    cursor: "pointer", padding: 0, marginBottom: 24, fontFamily: "inherit",
  };

  const label: React.CSSProperties = {
    fontSize: 12, fontWeight: 500, color: C.subtle,
    marginBottom: 8, display: "block",
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px 16px", fontFamily: "'DM Sans', sans-serif",
    }}>

      {/* Ambient glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,0.08) 0%, transparent 70%)",
      }} />

      {/* Logo */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        marginBottom: 28, position: "relative",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 24px rgba(245,158,11,0.35)",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="white"/>
          </svg>
        </div>
        <div>
          <p style={{
            fontSize: 16, fontWeight: 700, color: C.text, margin: 0,
            lineHeight: 1.2, fontFamily: "'Playfair Display', serif",
          }}>Interview Bot</p>
          <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>
            Powered by RAG · Built by Sanath
          </p>
        </div>
      </div>

      {/* ── ABOUT SECTION — only on choose step ── */}
      {step === "choose" && (
        <div style={{ width: "100%", maxWidth: 420, marginBottom: 16 }}>

          {/* Profile card */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "16px 20px", marginBottom: 10,
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 20,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
              border: "2px solid rgba(245,158,11,0.4)", overflow: "hidden",
              boxShadow: "0 0 0 3px rgba(245,158,11,0.08)",
            }}>
              <img src="/profile-avatar.jpg" alt="Sanath"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={e => {
                  e.currentTarget.style.display = "none";
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.style.background = "rgba(245,158,11,0.12)";
                    e.currentTarget.parentElement.innerHTML =
                      `<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#f59e0b">S</span>`;
                  }
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <p style={{
                  fontSize: 15, fontWeight: 700, color: C.text, margin: 0,
                  fontFamily: "'Playfair Display', serif",
                }}>Sanath Kumar J S</p>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
                  background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)",
                  color: "#34d399",
                }}>AI Twin</span>
              </div>
              <p style={{ fontSize: 12, color: C.muted, margin: "3px 0 0" }}>
                Lead Software Engineer · 10+ yrs · Bengaluru
              </p>
            </div>
          </div>

          {/* What is this */}
          <div style={{
            padding: "16px 20px", marginBottom: 10,
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 20,
          }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: C.muted, margin: "0 0 10px",
              textTransform: "uppercase", letterSpacing: "0.07em",
            }}>What is this?</p>
            <p style={{ fontSize: 13, color: C.subtle, margin: 0, lineHeight: 1.75 }}>
              This is Sanath's <strong style={{ color: C.text }}>digital brain</strong> — an AI bot he built
              to represent himself in technical interviews. His career, projects, skills, and
              experience are stored as a <strong style={{ color: C.amber }}>personal knowledge base</strong> and
              retrieved live using a <strong style={{ color: C.amber }}>RAG pipeline</strong> to answer your questions
              exactly as he would.
            </p>
            <p style={{ fontSize: 13, color: C.subtle, margin: "10px 0 0", lineHeight: 1.75 }}>
              Think of it as Sanath's twin — same knowledge, available 24/7, built to{" "}
              <strong style={{ color: C.text }}>show AI skills live</strong> rather than just describe them
              on a resume.
            </p>
          </div>

          {/* How it works */}
          <div style={{
            padding: "14px 20px", marginBottom: 10,
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 20,
          }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: C.muted, margin: "0 0 12px",
              textTransform: "uppercase", letterSpacing: "0.07em",
            }}>Under the hood</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { step: "01", label: "You ask",       desc: "Any question about Sanath's background, skills, or experience" },
                { step: "02", label: "KB searched",   desc: "pgvector finds the most relevant chunks from his knowledge base using cosine similarity" },
                { step: "03", label: "LLM answers",   desc: "Groq llama-3.3-70b generates a response in Sanath's voice using only retrieved context" },
                { step: "04", label: "Gaps tracked",  desc: "Questions the bot can't answer are saved — Sanath reviews and adds them to the KB" },
              ].map(({ step: s, label: l, desc: d }) => (
                <div key={s} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: C.amber, flexShrink: 0,
                    marginTop: 2, fontVariantNumeric: "tabular-nums",
                  }}>{s}</span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0 }}>{l}</p>
                    <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 0", lineHeight: 1.6 }}>{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tech stack pills */}
          <div style={{
            padding: "12px 16px", marginBottom: 10,
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
            display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
          }}>
            <span style={{ fontSize: 11, color: C.muted, marginRight: 4 }}>Stack:</span>
            {["Next.js 14", ".NET 8", "pgvector", "Groq LLM", "HuggingFace Embeddings"].map(t => (
              <span key={t} style={{
                fontSize: 11, padding: "3px 9px", borderRadius: 99,
                background: C.input, border: `1px solid ${C.border}`, color: C.subtle,
              }}>{t}</span>
            ))}
          </div>

          {/* Disclaimer */}
          <div style={{
            padding: "12px 16px",
            background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.13)",
            borderRadius: 16, display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>⚠️</span>
            <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.7 }}>
              This bot may occasionally give <strong style={{ color: C.subtle }}>inaccurate or incomplete answers</strong>.
              {" "}Always verify important details directly with Sanath.
              {" "}<strong style={{ color: C.amber }}>This is a live demo of RAG in production</strong> — not a replacement for the real conversation.
            </p>
          </div>
        </div>
      )}

      {/* ── CARD ── */}
      <div style={{
        width: "100%", maxWidth: 420, background: C.card,
        border: `1px solid ${C.border}`, borderRadius: 24, padding: 32,
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)", position: "relative",
      }}>

        {/* ── CHOOSE ROLE ── */}
        {step === "choose" && (
          <>
            <h1 style={{
              fontFamily: "'Playfair Display', serif", fontSize: 26,
              color: C.text, margin: "0 0 6px",
            }}>Ready to interview?</h1>
            <p style={{ fontSize: 14, color: C.muted, margin: "0 0 24px" }}>
              Who are you today?
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={() => setStep("interviewer")} style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "16px 20px", borderRadius: 16, border: "none",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                cursor: "pointer", textAlign: "left", width: "100%",
                boxShadow: "0 0 24px rgba(245,158,11,0.2)", fontFamily: "inherit",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: "rgba(255,255,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "white", margin: 0 }}>
                    I'm an Interviewer
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: "3px 0 0" }}>
                    Start a new interview session
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>

              <button onClick={() => setStep("pin")} style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "16px 20px", borderRadius: 16,
                border: `1px solid ${C.border}`, background: C.input,
                cursor: "pointer", textAlign: "left", width: "100%",
                fontFamily: "inherit",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: C.card,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke={C.subtle} strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke={C.subtle} strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>
                    I'm Sanath
                  </p>
                  <p style={{ fontSize: 12, color: C.muted, margin: "3px 0 0" }}>
                    Admin access with PIN
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke={C.muted} strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </>
        )}

        {/* ── PIN ── */}
        {step === "pin" && (
          <>
            <button onClick={() => { setStep("choose"); setPin(""); setPinError(""); }}
              style={backBtn}>← Back</button>
            <h1 style={{
              fontFamily: "'Playfair Display', serif", fontSize: 28,
              color: C.text, margin: "0 0 6px",
            }}>Admin Access</h1>
            <p style={{ fontSize: 14, color: C.muted, margin: "0 0 28px" }}>
              Enter your PIN to continue
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ position: "relative" }}>
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={e => { setPin(e.target.value); setPinError(""); }}
                  onKeyDown={e => e.key === "Enter" && handlePinSubmit()}
                  placeholder="Enter PIN"
                  style={{ ...inputStyle, paddingRight: 44 }}
                  autoFocus
                />
                <button onClick={() => setShowPin(!showPin)} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: C.muted, padding: 0, display: "flex",
                }}>
                  {showPin
                    ? <EyeOff size={15} color={C.muted} />
                    : <Eye size={15} color={C.muted} />
                  }
                </button>
              </div>
              {pinError && <p style={{ fontSize: 12, color: "#f87171", margin: 0 }}>{pinError}</p>}
              <button onClick={handlePinSubmit} disabled={!pin} style={{
                ...amberBtn, opacity: !pin ? 0.4 : 1,
                cursor: !pin ? "not-allowed" : "pointer",
              }}>
                Continue
              </button>
            </div>
          </>
        )}

        {/* ── ADMIN DASHBOARD ── */}
        {step === "admin-dashboard" && (
          <>
            <button onClick={() => { setStep("choose"); setPin(""); }}
              style={backBtn}>← Back</button>

            {/* Welcome row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                border: "1.5px solid rgba(245,158,11,0.4)", overflow: "hidden",
              }}>
                <img src="/profile-avatar.jpg" alt="Sanath"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={e => {
                    e.currentTarget.style.display = "none";
                    if (e.currentTarget.parentElement) {
                      e.currentTarget.parentElement.style.background = "rgba(245,158,11,0.15)";
                      e.currentTarget.parentElement.innerHTML = `<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#f59e0b">S</span>`;
                    }
                  }}
                />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0,
                            fontFamily: "'Playfair Display', serif" }}>
                  Welcome back, Sanath
                </p>
                <p style={{ fontSize: 12, color: "#34d399", margin: "2px 0 0", fontWeight: 500 }}>
                  ● Admin access active
                </p>
              </div>
            </div>

            {/* Action cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>

              {/* Chat */}
              <button onClick={() => router.push("/chat")} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: 16, border: "none",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "inherit",
                boxShadow: "0 0 24px rgba(245,158,11,0.2)",
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                  background: "rgba(255,255,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                          stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "white", margin: 0 }}>
                    Test the Chat
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", margin: "2px 0 0" }}>
                    Try out the bot, check confidence scores
                  </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Sessions */}
              <button onClick={() => router.push("/sessions")} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: 16,
                border: `1px solid ${C.border}`, background: C.input,
                cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "inherit",
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                  background: C.card,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke={C.subtle} strokeWidth="2"/>
                    <polyline points="12 6 12 12 16 14" stroke={C.subtle} strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>
                    Session History
                  </p>
                  <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>
                    Browse past interviews and transcripts
                  </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke={C.muted} strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Prep */}
              <button onClick={() => router.push("/prep")} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: 16,
                border: `1px solid ${C.border}`, background: C.input,
                cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "inherit",
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                  background: C.card,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" stroke={C.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" stroke={C.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>
                    Prep Dashboard
                  </p>
                  <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>
                    Review unanswered questions, update KB
                  </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke={C.muted} strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Re-ingest */}
              <button
                onClick={handleIngest}
                disabled={ingestStatus === "loading"}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", borderRadius: 16,
                  border: `1px solid ${
                    ingestStatus === "ok"    ? "rgba(52,211,153,0.4)"  :
                    ingestStatus === "error" ? "rgba(248,113,113,0.4)" :
                    C.border
                  }`,
                  background: C.input,
                  cursor: ingestStatus === "loading" ? "not-allowed" : "pointer",
                  textAlign: "left", width: "100%", fontFamily: "inherit",
                  opacity: ingestStatus === "loading" ? 0.7 : 1,
                  transition: "border-color 0.2s",
                }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                  background: C.card,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    style={{ animation: ingestStatus === "loading" ? "spin 1s linear infinite" : "none" }}>
                    <polyline points="23 4 23 10 17 10" stroke={
                      ingestStatus === "ok"    ? "#34d399" :
                      ingestStatus === "error" ? "#f87171" : C.subtle
                    } strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" stroke={
                      ingestStatus === "ok"    ? "#34d399" :
                      ingestStatus === "error" ? "#f87171" : C.subtle
                    } strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color:
                    ingestStatus === "ok"    ? "#34d399" :
                    ingestStatus === "error" ? "#f87171" : C.text,
                    margin: 0 }}>
                    {ingestStatus === "loading" ? "Ingesting KB..." :
                     ingestStatus === "ok"      ? "✓ Ingested successfully" :
                     ingestStatus === "error"   ? "✗ Ingest failed" :
                     "Re-ingest Knowledge Base"}
                  </p>
                  <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>
                    Run after adding or editing .md files
                  </p>
                </div>
              </button>

            </div>

            {/* Sign out */}
            <button onClick={() => {
              localStorage.removeItem("ib_role");
              setStep("choose");
              setPin("");
            }} style={{
              marginTop: 20, background: "none", border: "none",
              color: C.muted, fontSize: 12, cursor: "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Sign out of admin
            </button>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {/* ── INTERVIEWER DETAILS ── */}
        {step === "interviewer" && (
          <>
            <button onClick={() => { setStep("choose"); setFormError(""); }}
              style={backBtn}>← Back</button>
            <h1 style={{
              fontFamily: "'Playfair Display', serif", fontSize: 28,
              color: C.text, margin: "0 0 6px",
            }}>Before we start</h1>
            <p style={{ fontSize: 14, color: C.muted, margin: "0 0 28px" }}>
              A few quick details to set up your session
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={label}>Your Name</label>
                <input type="text" value={interviewerName}
                  onChange={e => { setInterviewerName(e.target.value); setFormError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleInterviewerSubmit()}
                  placeholder="e.g. Priya Sharma" style={inputStyle} autoFocus />
              </div>

              <div>
                <label style={label}>Company</label>
                <input type="text" value={companyName}
                  onChange={e => { setCompanyName(e.target.value); setFormError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleInterviewerSubmit()}
                  placeholder="e.g. Google" style={inputStyle} />
              </div>

              <div>
                <label style={label}>Round Type</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {ROUND_TYPES.map(r => (
                    <button key={r.value} onClick={() => setRoundType(r.value)} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "11px 14px", borderRadius: 12, cursor: "pointer",
                      textAlign: "left", width: "100%", fontFamily: "inherit",
                      background: roundType === r.value ? "rgba(245,158,11,0.08)" : C.input,
                      border: `1px solid ${roundType === r.value ? C.amber : C.border}`,
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${roundType === r.value ? C.amber : C.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {roundType === r.value && (
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.amber }} />
                        )}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: C.text, margin: 0 }}>{r.label}</p>
                        <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 0" }}>{r.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {formError && <p style={{ fontSize: 12, color: "#f87171", margin: 0 }}>{formError}</p>}

              <button onClick={handleInterviewerSubmit}
                disabled={!interviewerName.trim() || !companyName.trim()}
                style={{
                  ...amberBtn,
                  opacity: (!interviewerName.trim() || !companyName.trim()) ? 0.4 : 1,
                  cursor: (!interviewerName.trim() || !companyName.trim()) ? "not-allowed" : "pointer",
                  marginTop: 4,
                }}>
                Start Interview →
              </button>
            </div>
          </>
        )}
      </div>

      <p style={{ fontSize: 12, color: "#32323c", marginTop: 32 }}>
        Built with ❤️ by Sanath Kumar J S · {new Date().getFullYear()}
      </p>
    </div>
  );
}