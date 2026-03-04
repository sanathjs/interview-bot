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
  bg:      "#0d0d0f",
  card:    "#1c1c21",
  border:  "#32323c",
  input:   "#141417",
  text:    "#e8e8ef",
  muted:   "#6b6b7d",
  subtle:  "#9292a4",
  amber:   "#f59e0b",
};

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<"choose" | "pin" | "interviewer">("choose");
  const [pin, setPin]           = useState("");
  const [pinError, setPinError] = useState("");
  const [showPin, setShowPin]   = useState(false);
  const [interviewerName, setInterviewerName] = useState("");
  const [companyName, setCompanyName]         = useState("");
  const [roundType, setRoundType]             = useState("general");
  const [formError, setFormError]             = useState("");

  const handlePinSubmit = () => {
    if (pin === PREP_PIN) {
      localStorage.setItem("ib_role", "admin");
          localStorage.removeItem("ib_interviewer_name"); 
    localStorage.removeItem("ib_company_name");     
    localStorage.removeItem("ib_round_type");       
      router.push("/chat");
    } else {
      setPinError("Incorrect PIN. Try again.");
      setPin("");
    }
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
      padding: "24px 16px", fontFamily: "'DM Sans', sans-serif",
    }}>

      {/* Ambient glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,0.08) 0%, transparent 70%)",
      }} />

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48, position: "relative" }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 24px rgba(245,158,11,0.35)",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="white"/>
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1.2,
                      fontFamily: "'Playfair Display', serif" }}>
            Interview Bot
          </p>
          <p style={{ fontSize: 12, color: C.muted, margin: 0, marginTop: 2 }}>Sanath Kumar J S</p>
        </div>
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 420, background: C.card,
        border: `1px solid ${C.border}`, borderRadius: 24, padding: 32,
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)", position: "relative",
      }}>

        {/* ── CHOOSE ROLE ── */}
        {step === "choose" && (
          <>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28,
                         color: C.text, margin: "0 0 6px" }}>Welcome</h1>
            <p style={{ fontSize: 14, color: C.muted, margin: "0 0 28px" }}>Who are you today?</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={() => setStep("interviewer")} style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "16px 20px", borderRadius: 16, border: "none",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                cursor: "pointer", textAlign: "left", width: "100%",
                boxShadow: "0 0 24px rgba(245,158,11,0.2)",
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
                  <p style={{ fontSize: 14, fontWeight: 600, color: "white", margin: 0 }}>I'm an Interviewer</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: "3px 0 0" }}>Start a new interview session</p>
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
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>I'm Sanath</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: "3px 0 0" }}>Admin access with PIN</p>
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
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28,
                         color: C.text, margin: "0 0 6px" }}>Admin Access</h1>
            <p style={{ fontSize: 14, color: C.muted, margin: "0 0 28px" }}>Enter your PIN to continue</p>

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
                  {showPin ? <EyeOff size={15} color={C.muted} /> : <Eye size={15} color={C.muted} />}
                </button>
              </div>
              {pinError && <p style={{ fontSize: 12, color: "#f87171", margin: 0 }}>{pinError}</p>}
              <button onClick={handlePinSubmit} disabled={!pin}
                style={{ ...amberBtn, opacity: !pin ? 0.4 : 1, cursor: !pin ? "not-allowed" : "pointer" }}>
                Continue
              </button>
            </div>
          </>
        )}

        {/* ── INTERVIEWER DETAILS ── */}
        {step === "interviewer" && (
          <>
            <button onClick={() => { setStep("choose"); setFormError(""); }}
              style={backBtn}>← Back</button>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28,
                         color: C.text, margin: "0 0 6px" }}>Before we start</h1>
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

      <p style={{ fontSize: 12, color: "#32323c", marginTop: 40 }}>
        Built by Sanath Kumar J S · {new Date().getFullYear()}
      </p>
    </div>
  );
}