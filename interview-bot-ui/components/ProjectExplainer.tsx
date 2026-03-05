"use client";

import { useState } from "react";

const C = {
  bg:     "#0d0d0f",
  card:   "#1c1c21",
  border: "#32323c",
  text:   "#e8e8ef",
  muted:  "#6b6b7d",
  subtle: "#9292a4",
  amber:  "#f59e0b",
  amberDim: "rgba(245,158,11,0.12)",
  green:  "#34d399",
  purple: "#818cf8",
  red:    "#f87171",
};

const TABS = ["Overview", "RAG Pipeline", "Tech Stack", "Flow"];

// ── Mini diagram components ────────────────────────────────────

function Arrow({ color = C.amber }: { color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
      <div style={{ width: 20, height: 1, background: color, opacity: 0.5 }} />
      <svg width="6" height="8" viewBox="0 0 6 8" fill="none">
        <path d="M0 0L6 4L0 8" fill={color} opacity={0.5} />
      </svg>
    </div>
  );
}

function DownArrow({ color = C.amber, label }: { color?: string; label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, margin: "4px 0" }}>
      {label && <span style={{ fontSize: 9, color: C.muted, letterSpacing: "0.05em" }}>{label}</span>}
      <div style={{ width: 1, height: 14, background: color, opacity: 0.4 }} />
      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
        <path d="M0 0L4 6L8 0" fill={color} opacity={0.4} />
      </svg>
    </div>
  );
}

function Box({
  label, sub, color = C.border, icon, accent = false,
}: {
  label: string; sub?: string; color?: string; icon?: React.ReactNode; accent?: boolean;
}) {
  return (
    <div style={{
      padding: "8px 12px", borderRadius: 10,
      background: accent ? `${C.amberDim}` : "#141417",
      border: `1px solid ${accent ? "rgba(245,158,11,0.3)" : color}`,
      display: "flex", alignItems: "center", gap: 8,
      minWidth: 0,
    }}>
      {icon && <div style={{ flexShrink: 0, color: accent ? C.amber : C.subtle }}>{icon}</div>}
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: accent ? C.amber : C.text, margin: 0, whiteSpace: "nowrap" }}>{label}</p>
        {sub && <p style={{ fontSize: 10, color: C.muted, margin: "2px 0 0", lineHeight: 1.4 }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Tab content ────────────────────────────────────────────────

function OverviewTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 13, color: C.subtle, margin: 0, lineHeight: 1.75 }}>
        This is <strong style={{ color: C.text }}>Sanath's AI twin</strong> — a digital brain that
        represents him in interviews. His entire career, projects, and expertise live in a
        personal <strong style={{ color: C.amber }}>Knowledge Base</strong> of markdown files.
        When you ask a question, it's answered using <strong style={{ color: C.amber }}>RAG</strong> —
        retrieving only the most relevant knowledge and generating a response in Sanath's voice.
      </p>

      {/* Architecture diagram */}
      <div style={{
        background: "#0a0a0c", border: `1px solid ${C.border}`,
        borderRadius: 14, padding: 16,
      }}>
        <p style={{ fontSize: 10, color: C.muted, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          System Architecture
        </p>

        {/* Three columns */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }}>
          {/* Frontend */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 100 }}>
            <p style={{ fontSize: 9, color: C.muted, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>Frontend</p>
            <Box label="Next.js 14" sub="Vercel" icon={
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 19h20L12 2z"/></svg>
            } accent />
            <Box label="React UI" sub="Dark theme" />
            <Box label="Voice Input" sub="Groq Whisper" />
          </div>

          <Arrow />

          {/* Backend */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 100 }}>
            <p style={{ fontSize: 9, color: C.muted, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>Backend</p>
            <Box label=".NET 8 API" sub="Railway" icon={
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="2"/></svg>
            } accent />
            <Box label="RAG Service" sub="Orchestrates" />
            <Box label="Chat Service" sub="Groq LLM" />
          </div>

          <Arrow />

          {/* Data */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 100 }}>
            <p style={{ fontSize: 9, color: C.muted, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>Data</p>
            <Box label="PostgreSQL" sub="Supabase" icon={
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="2"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke="currentColor" strokeWidth="2"/></svg>
            } accent />
            <Box label="pgvector" sub="768d embeddings" />
            <Box label="KB Files" sub="13 .md files" />
          </div>
        </div>
      </div>

      {/* Key facts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { label: "Knowledge Base", value: "13 .md files", color: C.amber },
          { label: "Embedding Model", value: "BAAI/bge-base", color: C.green },
          { label: "LLM", value: "llama-3.3-70b", color: C.purple },
          { label: "Vector Dims", value: "768 dimensions", color: C.red },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            padding: "10px 12px", borderRadius: 10,
            background: "#141417", border: `1px solid ${C.border}`,
          }}>
            <p style={{ fontSize: 10, color: C.muted, margin: "0 0 3px" }}>{label}</p>
            <p style={{ fontSize: 13, fontWeight: 600, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RAGTab() {
  const steps = [
    {
      num: "01", label: "Question Asked",
      desc: "Interviewer types or speaks a question",
      color: C.amber, icon: "💬",
    },
    {
      num: "02", label: "Embed Question",
      desc: "HuggingFace BAAI/bge-base-en-v1.5 converts text → 768-dim vector",
      color: C.purple, icon: "🔢",
    },
    {
      num: "03", label: "Vector Search",
      desc: "pgvector cosine similarity → top 15 chunks from Knowledge Base",
      color: C.green, icon: "🔍",
    },
    {
      num: "04", label: "Re-rank + Boost",
      desc: "File-type keyword boost (+0.15–0.20) → top 10 most relevant chunks",
      color: C.amber, icon: "⚡",
    },
    {
      num: "05", label: "Confidence Check",
      desc: "≥0.65 HIGH → answer  |  ≥0.58 MED → partial  |  <0.58 LOW → store as unanswered",
      color: "#f87171", icon: "🎯",
    },
    {
      num: "06", label: "LLM Generation",
      desc: "Groq llama-3.3-70b generates answer using retrieved context in Sanath's voice",
      color: C.purple, icon: "🧠",
    },
    {
      num: "07", label: "Saved + Streamed",
      desc: "Answer streamed word-by-word to UI and saved to PostgreSQL with confidence score",
      color: C.green, icon: "💾",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontSize: 12, color: C.muted, margin: "0 0 4px", lineHeight: 1.6 }}>
        RAG = <strong style={{ color: C.text }}>Retrieval Augmented Generation</strong>.
        Instead of relying on the LLM's general knowledge, we retrieve Sanath's actual
        experience and feed it as context — so answers are grounded in truth.
      </p>

      {steps.map((s, i) => (
        <div key={s.num}>
          <div style={{
            display: "flex", gap: 12, alignItems: "flex-start",
            padding: "10px 12px", borderRadius: 12,
            background: "#141417", border: `1px solid ${C.border}`,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: s.color, fontVariantNumeric: "tabular-nums" }}>
                  {s.num}
                </span>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0 }}>{s.label}</p>
              </div>
              <p style={{ fontSize: 11, color: C.muted, margin: "3px 0 0", lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          </div>
          {i < steps.length - 1 && <DownArrow color={s.color} />}
        </div>
      ))}
    </div>
  );
}

function TechTab() {
  const layers = [
    {
      label: "Frontend",
      color: C.amber,
      items: [
        { name: "Next.js 14", role: "App Router, SSR, routing" },
        { name: "React + TypeScript", role: "UI components" },
        { name: "Tailwind / Inline styles", role: "Dark theme design system" },
        { name: "Groq Whisper STT", role: "Voice input transcription" },
        { name: "Web Speech API", role: "Voice playback (TTS)" },
      ],
    },
    {
      label: "Backend",
      color: C.purple,
      items: [
        { name: ".NET 8 Web API", role: "C# REST API, Railway hosted" },
        { name: "ChatService.cs", role: "RAG pipeline orchestration" },
        { name: "KnowledgeSearchService", role: "pgvector search + file boost" },
        { name: "EmbeddingService", role: "HuggingFace API calls" },
        { name: "IngestionService", role: "Chunk, embed, store KB files" },
      ],
    },
    {
      label: "Data & AI",
      color: C.green,
      items: [
        { name: "PostgreSQL 16", role: "Supabase, all session/chat data" },
        { name: "pgvector", role: "HNSW index, cosine similarity" },
        { name: "BAAI/bge-base-en-v1.5", role: "768-dim text embeddings" },
        { name: "Groq llama-3.3-70b", role: "LLM answer generation (free)" },
        { name: "13 .md KB files", role: "Sanath's personal knowledge base" },
      ],
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {layers.map(layer => (
        <div key={layer.label}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: layer.color }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: layer.color, margin: 0, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {layer.label}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {layer.items.map(item => (
              <div key={item.name} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px", borderRadius: 10, gap: 8,
                background: "#141417", border: `1px solid ${C.border}`,
              }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0, whiteSpace: "nowrap" }}>
                  {item.name}
                </p>
                <p style={{ fontSize: 11, color: C.muted, margin: 0, textAlign: "right" }}>
                  {item.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Cost callout */}
      <div style={{
        padding: "12px 14px", borderRadius: 12,
        background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>💰</span>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: C.green, margin: 0 }}>Total Cost: $0/month</p>
          <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 0" }}>
            Vercel free · Railway free · Supabase free · Groq free · HuggingFace free
          </p>
        </div>
      </div>
    </div>
  );
}

function FlowTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* End-to-end flow diagram */}
      <div style={{
        background: "#0a0a0c", border: `1px solid ${C.border}`,
        borderRadius: 14, padding: 16,
      }}>
        <p style={{ fontSize: 10, color: C.muted, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Full Request → Response Flow
        </p>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>

          {/* Interviewer */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 16px", borderRadius: 10,
            background: C.amberDim, border: "1px solid rgba(245,158,11,0.3)",
          }}>
            <span style={{ fontSize: 16 }}>👤</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.amber, margin: 0 }}>Interviewer</p>
              <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>Types or speaks a question</p>
            </div>
          </div>

          <DownArrow label="HTTPS POST /api/chat" />

          {/* Next.js */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "8px 12px", borderRadius: 10,
            background: "#141417", border: `1px solid ${C.border}`,
          }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0 }}>Next.js Frontend</p>
              <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>Sends message + session ID + last 6 turns of history</p>
            </div>
          </div>

          <DownArrow label="REST API call" />

          {/* .NET API */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "8px 12px", borderRadius: 10,
            background: "#141417", border: `1px solid rgba(129,140,248,0.3)`,
          }}>
            <span style={{ fontSize: 14 }}>🔧</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.purple, margin: 0 }}>.NET 8 ChatService</p>
              <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>Embeds question → pgvector search → confidence check</p>
            </div>
          </div>

          {/* Branch */}
          <DownArrow />
          <div style={{
            display: "flex", gap: 8, width: "100%", justifyContent: "center",
          }}>
            {[
              { label: "HIGH ≥65%", sub: "Answers from KB", color: C.green, emoji: "✅" },
              { label: "MED ≥58%", sub: "Best 3 chunks", color: C.amber, emoji: "🟡" },
              { label: "LOW <58%", sub: "Saved to Prep", color: C.red, emoji: "📝" },
            ].map(b => (
              <div key={b.label} style={{
                flex: 1, padding: "7px 8px", borderRadius: 10, textAlign: "center",
                background: "#141417", border: `1px solid ${b.color}33`,
              }}>
                <p style={{ fontSize: 13, margin: "0 0 3px" }}>{b.emoji}</p>
                <p style={{ fontSize: 10, fontWeight: 700, color: b.color, margin: 0 }}>{b.label}</p>
                <p style={{ fontSize: 9, color: C.muted, margin: "2px 0 0" }}>{b.sub}</p>
              </div>
            ))}
          </div>

          <DownArrow label="Groq API call" />

          {/* LLM */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "8px 12px", borderRadius: 10,
            background: "#141417", border: `1px solid rgba(129,140,248,0.3)`,
          }}>
            <span style={{ fontSize: 14 }}>🧠</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.purple, margin: 0 }}>Groq llama-3.3-70b</p>
              <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>Generates answer using Sanath's KB context + conversation history</p>
            </div>
          </div>

          <DownArrow label="Streamed word by word" />

          {/* Response */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 16px", borderRadius: 10,
            background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)",
          }}>
            <span style={{ fontSize: 16 }}>💬</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.green, margin: 0 }}>Answer Displayed</p>
              <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>With confidence %, source attribution, follow-up suggestions</p>
            </div>
          </div>
        </div>
      </div>

      {/* KB workflow */}
      <div style={{
        padding: "12px 14px", borderRadius: 12,
        background: "#141417", border: `1px solid ${C.border}`,
      }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: C.text, margin: "0 0 10px" }}>
          🔄 Knowledge Base Improvement Loop
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {[
            "Unanswered question saved",
            "Sanath reviews in Prep",
            "Writes answer",
            "Promoted to KB",
            "Re-ingested",
            "Bot gets smarter",
          ].map((step, i, arr) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontSize: 11, color: C.subtle, padding: "3px 8px",
                borderRadius: 99, background: "#0d0d0f", border: `1px solid ${C.border}`,
                whiteSpace: "nowrap",
              }}>{step}</span>
              {i < arr.length - 1 && <span style={{ color: C.amber, fontSize: 12 }}>→</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export default function ProjectExplainer() {
  const [open, setOpen]       = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <style>{`
        @keyframes floatBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes backdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Floating ? button */}
      <button
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="How does this bot work?"
        style={{
          position: "fixed", bottom: 76, right: 16, zIndex: 40,
          width: 40, height: 40, borderRadius: "50%",
          cursor: "pointer",
          background: hovered
            ? "linear-gradient(135deg, #f59e0b, #d97706)"
            : "rgba(245,158,11,0.15)",
          boxShadow: hovered
            ? "0 0 20px rgba(245,158,11,0.5)"
            : "0 0 12px rgba(245,158,11,0.2)",
          border: `1px solid rgba(245,158,11,${hovered ? "0.6" : "0.3"})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s",
          animation: "floatBob 3s ease-in-out infinite",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <span style={{
          fontSize: 16, fontWeight: 700, lineHeight: 1,
          color: hovered ? "white" : C.amber,
        }}>?</span>
      </button>

      {/* Modal backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "flex-end",
            justifyContent: "center",
            animation: "backdropIn 0.2s ease",
          }}
        >
          {/* Modal */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 520,
              maxHeight: "88vh",
              background: "#12121a",
              border: `1px solid ${C.border}`,
              borderRadius: "20px 20px 0 0",
              display: "flex", flexDirection: "column",
              animation: "modalIn 0.25s ease",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "16px 20px 14px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: C.amberDim, border: "1px solid rgba(245,158,11,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 16 }}>🤖</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0,
                              fontFamily: "'Playfair Display', serif" }}>
                    How this bot works
                  </p>
                  <p style={{ fontSize: 11, color: C.muted, margin: "1px 0 0" }}>
                    Built by Sanath · RAG + .NET + pgvector
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{
                width: 28, height: 28, borderRadius: "50%", border: "none",
                background: C.card, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: C.muted, fontSize: 16, flexShrink: 0,
              }}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{
              display: "flex", gap: 4, padding: "10px 16px 0",
              flexShrink: 0, overflowX: "auto",
            }}>
              {TABS.map((tab, i) => (
                <button key={tab} onClick={() => setActiveTab(i)} style={{
                  padding: "6px 14px", borderRadius: 99, border: "none",
                  cursor: "pointer", fontSize: 12, fontWeight: 500,
                  fontFamily: "inherit", whiteSpace: "nowrap",
                  background: activeTab === i ? "rgba(245,158,11,0.15)" : "transparent",
                  color: activeTab === i ? C.amber : C.muted,
                  outline: activeTab === i ? "1px solid rgba(245,158,11,0.3)" : "none",
                  transition: "all 0.15s",
                }}>{tab}</button>
              ))}
            </div>

            {/* Content */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "16px 16px 24px",
              WebkitOverflowScrolling: "touch",
            } as React.CSSProperties}>
              {activeTab === 0 && <OverviewTab />}
              {activeTab === 1 && <RAGTab />}
              {activeTab === 2 && <TechTab />}
              {activeTab === 3 && <FlowTab />}
            </div>

            {/* Footer */}
            <div style={{
              padding: "10px 16px 16px", flexShrink: 0,
              borderTop: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <p style={{ fontSize: 11, color: "#32323c", margin: 0 }}>
                Built with ❤️ by Sanath Kumar J S
              </p>
              <a
                href="https://github.com/sanathjs/interview-bot"
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 11, color: C.muted, textDecoration: "none",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}