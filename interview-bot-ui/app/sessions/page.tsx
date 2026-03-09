"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSessions } from "@/lib/api";

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

export interface Session {
  id: number;
  sessionCode: string;
  companyName: string | null;
  interviewerName: string | null;
  roundNumber: number | null;
  startedAt: string;
  endedAt: string | null;
  status: "active" | "completed";
  overallRating: number | null;
  totalQuestions: number;
  answeredFromKb: number;
  unansweredCount: number;
  avgConfidenceScore: number | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDuration(start: string, end: string | null) {
  if (!end) return "Ongoing";
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return `${mins}m`;
}

const confColor = (score: number) =>
  score >= 0.65 ? "#34d399" : score >= 0.55 ? "#fbbf24" : "#f87171";

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getSessions();
        setSessions(data?.sessions ?? []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = sessions.filter(s => filter === "all" ? true : s.status === filter);

  const avgConf = (() => {
    const scored = sessions.filter(s => s.avgConfidenceScore != null);
    if (!scored.length) return null;
    return scored.reduce((a, s) => a + s.avgConfidenceScore!, 0) / scored.length;
  })();

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>

      {/* Ambient glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(245,158,11,0.05) 0%, transparent 60%)",
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
              <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="2"/>
              <polyline points="12 6 12 12 16 14" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>Interview Sessions</p>
            <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>
              {sessions.length} total session{sessions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <a href="/chat" style={{
          fontSize: 12, color: C.muted, textDecoration: "none",
          padding: "6px 12px", borderRadius: 8,
          border: `1px solid ${C.border}`, background: C.input,
        }}>← Back to chat</a>
      </header>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>

        {/* Stats */}
        {!loading && sessions.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total Sessions",   value: sessions.length,                             sub: `${sessions.filter(s => s.status === "active").length} active` },
              { label: "Avg KB Match",     value: avgConf ? `${Math.round(avgConf * 100)}%` : "—", sub: "across all sessions", valueColor: avgConf ? confColor(avgConf) : undefined },
              { label: "Questions Asked",  value: sessions.reduce((a, s) => a + s.totalQuestions, 0), sub: `${sessions.reduce((a, s) => a + s.unansweredCount, 0)} unanswered` },
            ].map(({ label, value, sub, valueColor }: any) => (
              <div key={label} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 16, padding: "14px 16px",
              }}>
                <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px" }}>{label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: valueColor || C.text, margin: "0 0 2px" }}>{value}</p>
                <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(["all", "active", "completed"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 16px", borderRadius: 99, fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
              background: filter === f ? "rgba(245,158,11,0.12)" : C.input,
              border: `1px solid ${filter === f ? "rgba(245,158,11,0.3)" : C.border}`,
              color: filter === f ? C.amber : C.muted,
              transition: "all 0.15s",
            }}>{f}</button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "64px 0", fontSize: 14, color: C.muted }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", fontSize: 14, color: C.muted }}>No sessions found 🗂️</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(s => (
              <button key={s.id} onClick={() => router.push(`/sessions/${s.id}`)}
                style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 16, padding: "16px 20px",
                  textAlign: "left", cursor: "pointer", width: "100%",
                  fontFamily: "inherit", transition: "all 0.15s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(245,158,11,0.25)";
                  (e.currentTarget as HTMLButtonElement).style.background = "#26262e";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                  (e.currentTarget as HTMLButtonElement).style.background = C.card;
                }}>

                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>

                    {/* Top row */}
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                        {s.companyName || "Unknown Company"}
                      </span>
                      {s.roundNumber && (
                        <span style={{ fontSize: 12, color: C.muted }}>Round {s.roundNumber}</span>
                      )}
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 99,
                        background: s.status === "active" ? "rgba(52,211,153,0.1)" : "rgba(100,100,120,0.12)",
                        border: `1px solid ${s.status === "active" ? "rgba(52,211,153,0.2)" : C.border}`,
                        color: s.status === "active" ? "#34d399" : C.muted,
                      }}>{s.status}</span>
                    </div>

                    {/* Meta row */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12 }}>
                      <span style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 5 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        {formatDate(s.startedAt)} · {formatDuration(s.startedAt, s.endedAt)}
                      </span>
                      <span style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 5 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        {s.totalQuestions} questions
                      </span>
                      {s.interviewerName && (
                        <span style={{ fontSize: 12, color: C.muted }}>{s.interviewerName}</span>
                      )}
                    </div>

                    {/* Stats chips */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <span style={{
                        fontSize: 11, padding: "3px 10px", borderRadius: 99,
                        background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)",
                        color: "#34d399",
                      }}>✓ {s.answeredFromKb} from KB</span>

                      {s.unansweredCount > 0 && (
                        <span style={{
                          fontSize: 11, padding: "3px 10px", borderRadius: 99,
                          background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)",
                          color: "#f87171",
                        }}>✗ {s.unansweredCount} unanswered</span>
                      )}

                      {s.avgConfidenceScore != null && (
                        <span style={{
                          fontSize: 11, padding: "3px 10px", borderRadius: 99,
                          background: C.input, border: `1px solid ${C.border}`,
                          color: confColor(s.avgConfidenceScore), fontWeight: 500,
                        }}>{Math.round(s.avgConfidenceScore * 100)}% avg match</span>
                      )}
                    </div>
                  </div>

                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                       style={{ color: C.border, flexShrink: 0, marginTop: 4 }}>
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}