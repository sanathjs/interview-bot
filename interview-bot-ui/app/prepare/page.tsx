"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getKnowledgeFiles, getKnowledgeChunks } from "@/lib/api";
import { useTheme } from "@/components/ThemeProvider";
import MarkdownBody from "@/components/MarkdownBody";

interface KnowledgeFile {
  sourceFile: string;
  displayName: string;
  chunkCount: number;
}

interface KnowledgeChunk {
  sectionTitle: string;
  body: string;
  questions: string[] | null;
}

interface FileDetail {
  sourceFile: string;
  displayName: string;
  chunks: KnowledgeChunk[];
}

// Which "Interview Angles" sections are expanded
function ChunkCard({ chunk, idx }: { chunk: KnowledgeChunk; idx: number }) {
  const C = useTheme();
  const green = "#34d399";
  const greenBg = "rgba(52,211,153,0.08)";
  const [anglesOpen, setAnglesOpen] = useState(false);

  return (
    <div style={{
      borderBottom: `1px solid ${C.border}`,
      paddingBottom: 28,
      marginBottom: 28,
    }}>
      {/* Section heading */}
      <h2 style={{
        fontSize: 16, fontWeight: 600, color: C.amber,
        marginBottom: 12, marginTop: 0,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 600,
          background: C.amberBg,
          border: `1px solid ${C.amberBorder}`,
          color: C.amber,
          borderRadius: 6, padding: "2px 7px",
          flexShrink: 0,
        }}>
          {String(idx + 1).padStart(2, "0")}
        </span>
        {chunk.sectionTitle || "(Untitled Section)"}
      </h2>

      {/* Body content — rendered as markdown */}
      <MarkdownBody content={chunk.body} />

      {/* Interview Angles (AI-generated question variants) */}
      {chunk.questions && chunk.questions.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => setAnglesOpen(o => !o)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer",
              padding: "4px 0",
              color: C.subtle, fontSize: 12, fontFamily: "inherit",
            }}
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              style={{ transform: anglesOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}
            >
              <polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Interview Angles ({chunk.questions.length})
          </button>

          {anglesOpen && (
            <ul style={{
              margin: "8px 0 0 0",
              paddingLeft: 0,
              listStyle: "none",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              {chunk.questions.map((q, qi) => (
                <li key={qi} style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  fontSize: 13, color: C.subtle,
                  background: greenBg,
                  border: `1px solid rgba(52,211,153,0.12)`,
                  borderRadius: 8,
                  padding: "7px 12px",
                }}>
                  <span style={{ color: green, flexShrink: 0, marginTop: 1, fontSize: 11 }}>›</span>
                  {q}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function PreparePage() {
  const C = useTheme();
  const cardHover = C.mode === "light" ? "#f1f5f9" : "#23232a";
  const router = useRouter();

  const [isAdmin,      setIsAdmin]      = useState(false);
  const [files,        setFiles]        = useState<KnowledgeFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [detail,       setDetail]       = useState<FileDetail | null>(null);
  const [detailLoading,setDetailLoading]= useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Admin check
  useEffect(() => {
    const role = localStorage.getItem("ib_role");
    if (role !== "admin") {
      setIsAdmin(false);
    } else {
      setIsAdmin(true);
    }
  }, []);

  // Load file list
  useEffect(() => {
    if (!isAdmin) return;
    setFilesLoading(true);
    getKnowledgeFiles()
      .then(data => setFiles(data.files))
      .catch(() => setError("Failed to load knowledge files."))
      .finally(() => setFilesLoading(false));
  }, [isAdmin]);

  // Load chunks when a file is selected
  const handleSelectFile = useCallback(async (sourceFile: string) => {
    if (sourceFile === selectedFile) return;
    setSelectedFile(sourceFile);
    setDetail(null);
    setDetailLoading(true);
    setError(null);
    try {
      const data = await getKnowledgeChunks(sourceFile);
      setDetail(data);
    } catch {
      setError("Failed to load file content.");
    } finally {
      setDetailLoading(false);
    }
  }, [selectedFile]);

  // Not admin
  if (!isAdmin) {
    return (
      <div style={{
        minHeight: "100vh", background: C.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          textAlign: "center", padding: 40,
          background: C.card, borderRadius: 16,
          border: `1px solid ${C.border}`,
          maxWidth: 360,
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 12px", display: "block" }}>
            <circle cx="12" cy="12" r="10" stroke={C.muted} strokeWidth="2"/>
            <line x1="12" y1="8" x2="12" y2="12" stroke={C.muted} strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="16" x2="12.01" y2="16" stroke={C.muted} strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Admin access required.</p>
          <button
            onClick={() => router.push("/")}
            style={{
              marginTop: 16, padding: "8px 20px",
              background: C.amberBg, border: `1px solid ${C.amberBorder}`,
              borderRadius: 8, color: C.amber, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 24px 16px",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: C.text }}>
          Prepare
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted }}>
          Review your knowledge base before a physical interview.
        </p>
      </div>

      {/* Two-panel layout */}
      <div className="prepare-layout" style={{
        display: "flex",
        minHeight: "calc(100vh - 80px)",
      }}>

        {/* ── Left sidebar: file list ── */}
        <aside className="prepare-sidebar" style={{
          width: 240, flexShrink: 0,
          borderRight: `1px solid ${C.border}`,
          padding: "16px 12px",
          overflowY: "auto",
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, marginTop: 0 }}>
            Topics
          </p>

          {filesLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{
                  height: 46, borderRadius: 10,
                  background: C.card, opacity: 0.5,
                  animation: "pulse 1.5s ease-in-out infinite",
                }} />
              ))}
            </div>
          )}

          {!filesLoading && files.length === 0 && (
            <p style={{ fontSize: 13, color: C.muted }}>
              No knowledge base loaded.
            </p>
          )}

          {!filesLoading && files.map(f => {
            const active = f.sourceFile === selectedFile;
            return (
              <button
                key={f.sourceFile}
                onClick={() => handleSelectFile(f.sourceFile)}
                style={{
                  width: "100%", textAlign: "left",
                  background: active ? C.amberBg : "transparent",
                  border: `1px solid ${active ? C.amberBorder : "transparent"}`,
                  borderRadius: 10, padding: "9px 12px",
                  cursor: "pointer", marginBottom: 4,
                  color: active ? C.amber : C.text,
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = cardHover; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, lineHeight: 1.3 }}>
                  {f.displayName}
                </div>
                <div style={{ fontSize: 11, color: active ? C.amber : C.muted, marginTop: 2 }}>
                  {f.chunkCount} section{f.chunkCount !== 1 ? "s" : ""}
                </div>
              </button>
            );
          })}
        </aside>

        {/* ── Right reading pane ── */}
        <main className="prepare-main" style={{
          flex: 1, padding: "24px 32px",
          overflowY: "auto", maxWidth: 780,
        }}>

          {/* Empty state: no file selected yet */}
          {!selectedFile && !detailLoading && (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              height: "60%", gap: 12,
              color: C.muted, textAlign: "center",
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p style={{ margin: 0, fontSize: 14 }}>Select a topic from the left to start reading.</p>
            </div>
          )}

          {/* Loading chunks */}
          {detailLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.muted, fontSize: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10"/>
              </svg>
              Loading…
            </div>
          )}

          {/* Error */}
          {error && !detailLoading && (
            <div style={{ color: "#f87171", fontSize: 14 }}>{error}</div>
          )}

          {/* File content */}
          {detail && !detailLoading && (
            <>
              {/* File header */}
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>
                  {detail.displayName}
                </h1>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>
                  {detail.chunks.length} section{detail.chunks.length !== 1 ? "s" : ""}
                </p>
              </div>

              {detail.chunks.map((chunk, idx) => (
                <ChunkCard key={idx} chunk={chunk} idx={idx} />
              ))}
            </>
          )}
        </main>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile: stack sidebar above reading pane */
        @media (max-width: 640px) {
          .prepare-layout { flex-direction: column !important; }
          .prepare-sidebar { width: 100% !important; border-right: none !important; border-bottom: 1px solid ${C.border} !important; }
          .prepare-main { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
