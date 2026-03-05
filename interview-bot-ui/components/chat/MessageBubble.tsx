"use client";

import { useState } from "react";
import { Message } from "@/types";

const C = {
  card:   "#1c1c21",
  border: "#32323c",
  text:   "#e8e8ef",
  muted:  "#6b6b7d",
  subtle: "#9292a4",
  amber:  "#f59e0b",
  input:  "#141417",
};

function RenderText({ text, streaming }: { text: string; streaming?: boolean }) {
  const lines = text.split("\n");
  return (
    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, fontSize: 14 }}>
      {lines.map((line, i) => {
        if (line === "") return <div key={i} style={{ height: 6 }} />;
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <div key={i}>
            {parts.map((part, j) =>
              j % 2 === 1
                ? <strong key={j} style={{ fontWeight: 600, color: "#fcd34d" }}>{part}</strong>
                : <span key={j}>{part}</span>
            )}
            {streaming && i === lines.length - 1 && (
              <span style={{
                display: "inline-block", marginLeft: 2, color: C.amber,
                animation: "blink 0.8s ease infinite alternate",
              }}>▋</span>
            )}
          </div>
        );
      })}
      <style>{`@keyframes blink { from{opacity:1}to{opacity:0} }`}</style>
    </div>
  );
}

function PlayButton({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    if (playing) { window.speechSynthesis.cancel(); setPlaying(false); return; }
    const voices = window.speechSynthesis.getVoices();
    const voice  = voices.find(v => /david|mark|daniel|google uk english male/i.test(v.name))
                ?? voices.find(v => v.lang.startsWith("en")) ?? null;
    const utt = new SpeechSynthesisUtterance(text);
    utt.voice = voice; utt.rate = 0.95; utt.pitch = 0.9;
    utt.onend = () => setPlaying(false);
    utt.onerror = () => setPlaying(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
    setPlaying(true);
  };
  return (
    <button onClick={toggle} title="Read aloud" style={{
      width: 24, height: 24, borderRadius: "50%", border: "none", background: "none",
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      color: C.muted, flexShrink: 0, padding: 0,
    }}>
      {playing
        ? <svg width="10" height="10" viewBox="0 0 24 24" fill={C.muted}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        : <svg width="10" height="10" viewBox="0 0 24 24" fill={C.muted}><polygon points="5 3 19 12 5 21 5 3"/></svg>
      }
    </button>
  );
}

function SourceBanner({
  answerSource, sources, showSourceDetails,
}: {
  answerSource?: string;
  sources?: Message["sources"];
  showSourceDetails: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  // Respect the toggle — hide entirely if off
  if (!showSourceDetails) return null;
  if (!answerSource || answerSource === "greeting") return null;

  const isKB      = answerSource === "knowledge_base";
  const isLLM     = answerSource === "fallback_ai";
  const isUnknown = answerSource === "unanswered";

  const dotColor = isKB ? "#34d399" : isLLM ? "#818cf8" : C.amber;
  const bg       = isKB ? "rgba(52,211,153,0.07)" : isLLM ? "rgba(99,102,241,0.07)" : "rgba(245,158,11,0.07)";
  const border   = isKB ? "rgba(52,211,153,0.2)"  : isLLM ? "rgba(99,102,241,0.2)"  : "rgba(245,158,11,0.2)";

  const label = isKB
    ? "Answered from Sanath's Knowledge Base"
    : isLLM
    ? "Answered by AI (not in Knowledge Base)"
    : "Not in Knowledge Base — saved for prep";

  const canExpand = isKB && (sources?.length ?? 0) > 0;

  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${border}` }}>
      {/* Header row */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "7px 11px", background: bg,
          cursor: canExpand ? "pointer" : "default",
        }}
        onClick={() => canExpand && setExpanded(e => !e)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
            background: dotColor, boxShadow: `0 0 6px ${dotColor}55`,
          }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: dotColor }}>{label}</span>
        </div>
        {canExpand && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
               style={{ color: dotColor, flexShrink: 0,
                        transform: expanded ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s" }}>
            <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        )}
      </div>

      {/* Expanded sources */}
      {canExpand && expanded && (
        <div style={{
          padding: "8px 11px 10px",
          background: "rgba(52,211,153,0.03)",
          borderTop: "1px solid rgba(52,211,153,0.1)",
        }}>
          <p style={{ fontSize: 10, color: C.muted, margin: "0 0 6px",
                      textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Sources used
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {sources?.map((s, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "4px 8px", borderRadius: 6,
                background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.1)",
              }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 11, color: "#34d399", fontWeight: 500 }}>
                    {s.sourceFile.replace(".md", "")}
                  </span>
                  <span style={{ fontSize: 11, color: C.muted }}> · {s.sectionTitle}</span>
                </div>
                <span style={{ fontSize: 10, color: C.muted, flexShrink: 0, marginLeft: 8 }}>
                  {Math.round(s.similarity * 100)}% match
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  message: Message;
  streaming?: boolean;
  showFollowUps: boolean;
  showSourceDetails: boolean;
  usedFollowUps?: Set<string>;
  onFeedback?: (id: string, helpful: boolean) => void;
  onFollowUp?: (q: string) => void;
}

export default function MessageBubble({
  message, streaming, showFollowUps, showSourceDetails, usedFollowUps, onFeedback, onFollowUp,
}: Props) {
  const isBot        = message.role === "bot";
  const isUnanswered = message.answerSource === "unanswered";
  const isGreeting   = message.answerSource === "greeting";
  const isFallback   = message.answerSource === "fallback_ai";
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [copied, setCopied]     = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const conf = (() => {
    if (!message.confidenceScore || isUnanswered || isGreeting) return null;
    const pct   = Math.round(message.confidenceScore * 100);
    const color = message.confidenceScore >= 0.65 ? "#34d399"
                : message.confidenceScore >= 0.55 ? "#fbbf24" : "#f87171";
    return { pct, color };
  })();

  const botBg = isUnanswered ? "rgba(245,158,11,0.07)"
              : isFallback   ? "rgba(99,102,241,0.07)"
              : C.card;
  const botBorder = isUnanswered ? "1px solid rgba(245,158,11,0.18)"
                  : isFallback   ? "1px solid rgba(99,102,241,0.18)"
                  : `1px solid ${C.border}`;

  return (
    <div style={{
      display: "flex", gap: 10,
      justifyContent: isBot ? "flex-start" : "flex-end",
      animation: "fadeUp 0.25s ease forwards",
    }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Bot avatar — Sanath's photo */}
      {isBot && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0, marginTop: 2,
          border: "1.5px solid rgba(245,158,11,0.35)", overflow: "hidden",
          boxShadow: "0 0 0 2px rgba(245,158,11,0.1)",
        }}>
          <img
            src="/profile-avatar.jpg"
            alt="Sanath"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={e => {
              const el = e.currentTarget;
              el.style.display = "none";
              if (el.parentElement) {
                el.parentElement.style.background = "rgba(245,158,11,0.12)";
                el.parentElement.innerHTML = `<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#f59e0b">S</span>`;
              }
            }}
          />
        </div>
      )}

      {/* Column: bubble + banner + meta + followups */}
      <div style={{
        maxWidth: "78%", display: "flex", flexDirection: "column",
        gap: 5, alignItems: isBot ? "flex-start" : "flex-end",
      }}>

        {/* Bubble */}
        <div style={{
          padding: "12px 16px", width: "100%",
          borderRadius: isBot ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
          background: isBot ? botBg : "linear-gradient(135deg, #f59e0b, #d97706)",
          border: isBot ? botBorder : "none",
          color: isBot ? C.text : "white",
        }}>
          <RenderText text={message.text} streaming={streaming} />

          {/* Action bar */}
          {isBot && !streaming && (
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              marginTop: 10, paddingTop: 8,
              borderTop: "1px solid rgba(255,255,255,0.05)",
            }}>
              <PlayButton text={message.text} />

              <button onClick={handleCopy} title="Copy" style={{
                width: 24, height: 24, borderRadius: "50%", border: "none", background: "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                padding: 0, color: copied ? C.amber : C.muted, flexShrink: 0,
              }}>
                {copied
                  ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                  : <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/></svg>
                }
              </button>

              {conf && (
                <span style={{ fontSize: 11, fontWeight: 500, color: conf.color, marginLeft: 4 }}>
                  {conf.pct}% confident
                </span>
              )}

              {!isUnanswered && !isGreeting && (
                <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                  <button onClick={() => { setFeedback("up"); onFeedback?.(message.id, true); }}
                    style={{
                      width: 24, height: 24, borderRadius: "50%", border: "none", background: "none",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      padding: 0, color: feedback === "up" ? "#34d399" : C.muted,
                    }}>
                    <svg width="11" height="11" viewBox="0 0 24 24"
                         fill={feedback === "up" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/>
                      <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
                    </svg>
                  </button>
                  <button onClick={() => { setFeedback("down"); onFeedback?.(message.id, false); }}
                    style={{
                      width: 24, height: 24, borderRadius: "50%", border: "none", background: "none",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      padding: 0, color: feedback === "down" ? "#f87171" : C.muted,
                    }}>
                    <svg width="11" height="11" viewBox="0 0 24 24"
                         fill={feedback === "down" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                      <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/>
                      <path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Source banner — same width as bubble, below it */}
        {isBot && !streaming && !isGreeting && (
          <div style={{ width: "100%" }}>
            <SourceBanner
              answerSource={message.answerSource}
              sources={message.sources}
              showSourceDetails={showSourceDetails}
            />
          </div>
        )}

        {/* Timestamp */}
        <span style={{ fontSize: 11, color: "#4a4a58", padding: "0 2px" }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>

        {/* Follow-ups — filter out already used/seen ones */}
        {(() => {
          const available = (message.followUps ?? []).filter(q => !usedFollowUps?.has(q));
          if (!isBot || streaming || !showFollowUps || available.length === 0) return null;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%", marginTop: 2 }}>
              <p style={{ fontSize: 11, color: "#4a4a58", margin: 0, padding: "0 2px" }}>
                Suggested follow-ups
              </p>
              {available.map((q, i) => (
                <button key={i} onClick={() => onFollowUp?.(q)} style={{
                  textAlign: "left", fontSize: 12, padding: "8px 12px", borderRadius: 10,
                  cursor: "pointer", width: "100%", background: C.input,
                  border: `1px solid ${C.border}`, color: C.subtle, fontFamily: "inherit",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(245,158,11,0.3)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#fbbf24";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                  (e.currentTarget as HTMLButtonElement).style.color = C.subtle;
                }}>
                  → {q}
                </button>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Interviewer avatar */}
      {!isBot && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0, marginTop: 2,
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      )}
    </div>
  );
}