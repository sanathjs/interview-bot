// components/chat/ArchitectureCard.tsx
// Renders inline in a chat bubble when answerSource === "architecture"
// No props except projectId (1–5). All data is local — zero API calls.

import React from "react";

const C = {
  bg:       "#141417",
  card:     "#1c1c21",
  border:   "#32323c",
  text:     "#e8e8ef",
  muted:    "#6b6b7d",
  subtle:   "#9292a4",
  amber:    "#f59e0b",
  green:    "#34d399",
  purple:   "#818cf8",
  blue:     "#60a5fa",
  red:      "#f87171",
};

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ].join(",");
}

function DownArrow({ color = C.amber }: { color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, margin: "2px 0" }}>
      <div style={{ width: 1, height: 10, background: color, opacity: 0.4 }} />
      <svg width="7" height="5" viewBox="0 0 8 6" fill="none">
        <path d="M0 0L4 6L8 0" fill={color} opacity={0.4} />
      </svg>
    </div>
  );
}

function Step({ n, label, sub, color = C.amber, last = false }: {
  n: number; label: string; sub?: string; color?: string; last?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 8, width: "100%",
        background: "#0f0f13", border: `1px solid ${C.border}`,
        borderRadius: 8, padding: "7px 10px",
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
          background: `rgba(${hexToRgb(color)},0.15)`,
          border: `1px solid rgba(${hexToRgb(color)},0.3)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color }}>{n}</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: C.text, margin: 0 }}>{label}</p>
          {sub && <p style={{ fontSize: 10, color: C.muted, margin: "2px 0 0", lineHeight: 1.4 }}>{sub}</p>}
        </div>
      </div>
      {!last && <DownArrow color={color} />}
    </div>
  );
}

function KV({ rows }: { rows: [string, string][] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "#0f0f13", border: `1px solid ${C.border}`,
          borderRadius: 7, padding: "5px 9px", gap: 8,
        }}>
          <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>{k}</span>
          <span style={{ fontSize: 10, color: C.text, fontWeight: 500, textAlign: "right" }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function SLabel({ children }: { children: string }) {
  return (
    <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.08em",
                textTransform: "uppercase", margin: "12px 0 6px" }}>
      {children}
    </p>
  );
}

function Callout({ text, color }: { text: string; color: string }) {
  return (
    <div style={{
      background: `rgba(${hexToRgb(color)},0.08)`,
      border: `1px solid rgba(${hexToRgb(color)},0.2)`,
      borderRadius: 8, padding: "8px 10px", marginBottom: 4,
    }}>
      <p style={{ fontSize: 11, color: C.text, margin: 0, lineHeight: 1.6 }}>{text}</p>
    </div>
  );
}

// ── Per-project diagrams ───────────────────────────────────────────────────────

function AdvisorSearch() {
  return (
    <>
      <SLabel>Search Pipeline</SLabel>
      <Step n={1} label="User types search query" sub='"I need guidance about my relationship falling apart"' color={C.amber} />
      <Step n={2} label="Embed query" sub="Azure OpenAI text-embedding-3-small → float[1536]" color={C.amber} />
      <Step n={3} label="Multi-embedding pgvector search" sub="3 columns: description (50%) · keywords (30%) · expertise (20%)" color={C.amber} />
      <Step n={4} label="7-factor attribute scoring (parallel)" sub="keywords · categories · communication · methods · satisfaction · experience · empathy" color={C.purple} />
      <Step n={5} label="Hybrid ranking" sub="semantic × 40% + attribute × 60% → top 20 advisors" color={C.green} />
      <Step n={6} label="Lazy AI match summaries" sub="gpt-4.1-nano per advisor as user scrolls — never blocks search" color={C.blue} last />

      <SLabel>Graceful Degradation</SLabel>
      {[
        ["Azure OpenAI down", "Circuit breaker → attribute-only scoring takes over", C.green],
        ["Embedding timeout", "4s limit → empty vector → fallback instantly", C.amber],
        ["DB down", "Only full failure — no workaround", C.red],
      ].map(([s, r, c]) => (
        <div key={s as string} style={{
          background: "#0f0f13", border: `1px solid ${C.border}`,
          borderRadius: 7, padding: "6px 9px", marginBottom: 4,
        }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: C.text, margin: 0 }}>{s as string}</p>
          <p style={{ fontSize: 10, color: c as string, margin: "2px 0 0" }}>{r as string}</p>
        </div>
      ))}

      <SLabel>Tech Stack</SLabel>
      <KV rows={[
        ["Language", "C# / .NET 8"],
        ["Embeddings", "Azure OpenAI text-embedding-3-small (1536d)"],
        ["LLM", "Azure OpenAI gpt-4.1-nano (summaries)"],
        ["Vector DB", "PostgreSQL + pgvector · HNSW index"],
        ["Ranking", "Hybrid: semantic 40% + attribute 60%"],
        ["Latency", "300–800ms"],
      ]} />
    </>
  );
}

function FeedbackSearch() {
  return (
    <>
      <Callout
        text="A popular advisor can have 100,000+ reviews. Keyword search can't find 'honest readings' in a review that says 'she only told me the truth, not what I wanted to hear.'"
        color={C.amber}
      />

      <SLabel>Ingestion (runs on every new review)</SLabel>
      <Step n={1} label="Session ends → review submitted" color={C.green} />
      <Step n={2} label="Embed review text" sub="Azure OpenAI text-embedding-3-small → float[1536]" color={C.green} />
      <Step n={3} label="Store in pgvector" sub="Partitioned by advisor_id — reviews never cross boundaries" color={C.green} last />

      <SLabel>Search Flow</SLabel>
      <Step n={1} label='User types in feedback search bar' sub='"show me feedback where advisor was genuinely honest"' color={C.amber} />
      <Step n={2} label="Embed query → float[1536]" color={C.amber} />
      <Step n={3} label="Scoped cosine similarity" sub="WHERE advisor_id = ? + HNSW index" color={C.amber} />
      <Step n={4} label="Top K reviews returned instantly" sub="Most relevant out of 100,000+" color={C.amber} last />

      <SLabel>Key Differences from Advisor Search</SLabel>
      {[
        ["No LLM generation", "Reviews are already human text — pure retrieval"],
        ["Scoped queries", "Each search only touches one advisor's reviews"],
        ["Incremental ingestion", "New reviews indexed automatically after each session"],
      ].map(([k, v]) => (
        <div key={k} style={{
          background: "#0f0f13", border: `1px solid ${C.border}`,
          borderRadius: 7, padding: "6px 9px", marginBottom: 4,
        }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: C.green, margin: 0 }}>{k}</p>
          <p style={{ fontSize: 10, color: C.muted, margin: "2px 0 0" }}>{v}</p>
        </div>
      ))}

      <SLabel>Tech Stack</SLabel>
      <KV rows={[
        ["Language", "C# / .NET 8"],
        ["Embeddings", "Azure OpenAI text-embedding-3-small (1536d)"],
        ["LLM", "None — retrieval only"],
        ["Vector DB", "PostgreSQL + pgvector · HNSW · per-advisor scoped"],
        ["Ingestion", "Incremental, real-time after each session"],
      ]} />
    </>
  );
}

function InterviewBot() {
  return (
    <>
      <SLabel>Architecture Layers</SLabel>
      {[
        { layer: "🌐  Frontend", detail: "Next.js 14 · Vercel · Tailwind CSS", color: C.amber },
        { layer: "⚙️  Backend API", detail: ".NET 8 · Railway · RAG orchestration", color: C.purple },
        { layer: "🧠  Embeddings", detail: "HuggingFace BAAI/bge-base-en-v1.5 · 768d", color: C.blue },
        { layer: "🗄️  Vector DB", detail: "PostgreSQL + pgvector · Supabase · HNSW", color: C.green },
        { layer: "✨  LLM", detail: "Groq llama-3.3-70b · streaming responses", color: C.amber },
        { layer: "🎙️  Voice", detail: "Groq Whisper STT · Browser TTS playback", color: C.muted },
      ].map(({ layer, detail, color }) => (
        <div key={layer} style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#0f0f13", border: `1px solid ${C.border}`,
          borderRadius: 7, padding: "6px 9px", marginBottom: 4,
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color, margin: 0 }}>{layer}</p>
            <p style={{ fontSize: 10, color: C.muted, margin: "2px 0 0" }}>{detail}</p>
          </div>
        </div>
      ))}

      <SLabel>RAG Pipeline</SLabel>
      <Step n={1} label="Question asked (text or voice)" color={C.amber} />
      <Step n={2} label="Embed question" sub="HuggingFace bge-base-en-v1.5 → 768d vector" color={C.amber} />
      <Step n={3} label="pgvector search + file boost" sub="Top 15 chunks → keyword-to-file boost → re-rank top 10" color={C.amber} />
      <Step n={4} label="Confidence threshold" sub="≥0.65 HIGH · ≥0.58 MED · <0.58 LOW → log unanswered" color={C.purple} />
      <Step n={5} label="Groq LLM generates answer as Sanath" sub="Streaming · conversational · anchored to KB content" color={C.green} last />

      <SLabel>Cost</SLabel>
      <div style={{
        background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)",
        borderRadius: 8, padding: "8px 10px", textAlign: "center",
      }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: C.green, margin: 0 }}>$0 / month</p>
        <p style={{ fontSize: 10, color: C.muted, margin: "3px 0 0" }}>
          All free tiers — Vercel · Railway · Supabase · HuggingFace · Groq
        </p>
      </div>
    </>
  );
}

function JWTMigration() {
  return (
    <>
      <Callout
        text="Migrated the entire Keen platform from session-based auth to JWT with zero downtime — killing active sessions would interrupt live paid advisor calls."
        color={C.red}
      />

      <SLabel>3-Phase Migration Strategy</SLabel>
      <Step n={1} label="Dual-token validation window" sub="API accepts BOTH session tokens AND JWTs. New logins issue JWT only." color={C.amber} />
      <Step n={2} label="Natural token drain" sub="Old session tokens expire naturally. No forced logouts. Zero user impact." color={C.amber} />
      <Step n={3} label="Legacy code path removed" sub="Once old token pool hits zero, session-based auth removed safely." color={C.green} last />

      <SLabel>Scope of Change</SLabel>
      {[
        ["Every API endpoint", "Updated to validate both token formats during transition"],
        ["Web + mobile clients", "Feature-flagged rollout, coordinated across all surfaces"],
        ["Token refresh", "Silent JWT refresh built before expiry — no re-login prompts"],
        ["Feature flags", "Instant rollback capability per client type if needed"],
      ].map(([k, v]) => (
        <div key={k} style={{
          background: "#0f0f13", border: `1px solid ${C.border}`,
          borderRadius: 7, padding: "6px 9px", marginBottom: 4,
        }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: C.text, margin: 0 }}>{k}</p>
          <p style={{ fontSize: 10, color: C.muted, margin: "2px 0 0" }}>{v}</p>
        </div>
      ))}

      <SLabel>Tech Stack</SLabel>
      <KV rows={[
        ["Language", "C# / .NET 8"],
        ["Auth", "JWT Bearer + refresh token rotation"],
        ["Frontend", "React / Next.js — silent refresh"],
        ["Strategy", "Dual-token window + feature flags"],
        ["Downtime", "Zero"],
      ]} />
    </>
  );
}

function Integrations() {
  return (
    <>
      <SLabel>Integration Map</SLabel>
      <div style={{
        background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
        borderRadius: 8, padding: "6px 12px", textAlign: "center", marginBottom: 8,
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: C.amber, margin: 0 }}>Keen Platform</p>
        <p style={{ fontSize: 10, color: C.muted, margin: "1px 0 0" }}>C# / .NET 8 backend</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
        {[
          { name: "Zinrelo", purpose: "Loyalty rewards", detail: "Points, redemption, tier management", color: C.purple },
          { name: "Iterable", purpose: "Marketing", detail: "Email, SMS, push + lifecycle flows", color: C.blue },
          { name: "Zendesk", purpose: "Support", detail: "Ticketing with full session context", color: C.green },
          { name: "ContentStack", purpose: "CMS", detail: "Headless CMS for platform content", color: C.amber },
        ].map(({ name, purpose, detail, color }) => (
          <div key={name} style={{
            background: "#0f0f13", border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "7px 9px",
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color, margin: 0 }}>{name}</p>
            <p style={{ fontSize: 10, fontWeight: 600, color: C.subtle, margin: "2px 0" }}>{purpose}</p>
            <p style={{ fontSize: 10, color: C.muted, margin: 0, lineHeight: 1.4 }}>{detail}</p>
          </div>
        ))}
      </div>

      <SLabel>Circuit Breaker Pattern (all 4 integrations)</SLabel>
      {[
        ["Timeout threshold", "Each call has a max wait — slow = treated as failure"],
        ["Failure counter", "After N failures the circuit opens, calls are skipped"],
        ["Fallback + queue", "Platform continues, event queued for retry — no user impact"],
        ["Idempotency keys", "Retried events never double-credit (e.g. loyalty points)"],
      ].map(([k, v]) => (
        <div key={k} style={{
          background: "#0f0f13", border: `1px solid ${C.border}`,
          borderRadius: 7, padding: "6px 9px", marginBottom: 4,
        }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: C.amber, margin: 0 }}>{k}</p>
          <p style={{ fontSize: 10, color: C.muted, margin: "2px 0 0" }}>{v}</p>
        </div>
      ))}

      <SLabel>Also Delivered</SLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {["A/B testing framework", "Splunk centralized logging", "Mixpanel event tracking", "Platform features"].map(t => (
          <span key={t} style={{
            fontSize: 10, padding: "3px 9px", borderRadius: 99,
            background: C.card, border: `1px solid ${C.border}`, color: C.subtle,
          }}>{t}</span>
        ))}
      </div>
    </>
  );
}

// ── Project metadata ──────────────────────────────────────────────────────────

const PROJECTS: Record<number, {
  emoji: string; label: string; where: string; color: string; tag: string;
  Component: () => React.ReactNode;
}> = {
  1: { emoji: "🔍", label: "Semantic Advisor Search", where: "Ingenio / Keen", color: C.amber, tag: "RAG · Production", Component: AdvisorSearch },
  2: { emoji: "💬", label: "Advisor Feedback Search",  where: "Ingenio / Keen", color: C.green, tag: "RAG · Production", Component: FeedbackSearch },
  3: { emoji: "🤖", label: "This Interview Bot",       where: "Personal Project", color: C.purple, tag: "RAG · Live · $0/mo", Component: InterviewBot },
  4: { emoji: "🔐", label: "JWT Auth Migration",       where: "Ingenio / Keen", color: C.red, tag: "Platform · Zero downtime", Component: JWTMigration },
  5: { emoji: "🔗", label: "3rd-Party Integrations",   where: "Ingenio / Keen", color: C.blue, tag: "Platform · 4 integrations", Component: Integrations },
};

// ── Exported card ─────────────────────────────────────────────────────────────

export default function ArchitectureCard({ projectId }: { projectId: number }) {
  const proj = PROJECTS[projectId];
  if (!proj) return null;

  const { emoji, label, where, color, tag, Component } = proj;

  return (
    <div style={{
      background: "#12121a",
      border: `1px solid rgba(${hexToRgb(color)},0.25)`,
      borderRadius: 14,
      overflow: "hidden",
      fontFamily: "'DM Sans', sans-serif",
      width: "100%",
      maxWidth: 380,
    }}>
      {/* Card header */}
      <div style={{
        padding: "10px 14px 9px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        background: `rgba(${hexToRgb(color)},0.06)`,
      }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>
            {emoji} {label}
          </p>
          <p style={{ fontSize: 10, color: C.muted, margin: "2px 0 0" }}>{where}</p>
        </div>
        <span style={{
          fontSize: 9, padding: "3px 8px", borderRadius: 99, flexShrink: 0,
          background: `rgba(${hexToRgb(color)},0.12)`,
          color, fontWeight: 600,
          border: `1px solid rgba(${hexToRgb(color)},0.25)`,
        }}>{tag}</span>
      </div>

      {/* Diagram content */}
      <div style={{ padding: "4px 12px 14px" }}>
        <Component />
      </div>
    </div>
  );
}

// ── Architecture chip follow-ups helper ───────────────────────────────────────
// Use this in chat/page.tsx to detect if a follow-up is an architecture chip

export const ARCHITECTURE_CHIPS: Record<string, number> = {
  "🔍 Architecture: Advisor Search":  1,
  "💬 Architecture: Feedback Search": 2,
  "🤖 Architecture: Interview Bot":   3,
  "🔐 Architecture: JWT Migration":   4,
  "🔗 Architecture: Integrations":    5,
};

export const PROJECT_MENU_FOLLOWUPS = Object.keys(ARCHITECTURE_CHIPS);