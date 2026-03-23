"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5267";

// ── Design tokens ────────────────────────────────────────────────
const C = {
  bg:        "#0a0a0f",
  surface:   "#111118",
  card:      "#16161f",
  input:     "#0d0d12",
  border:    "#22222e",
  borderHov: "#3a3a52",
  text:      "#e8e8f0",
  muted:     "#7878a0",
  dim:       "#3a3a52",
  indigo:    "#6366f1",
  emerald:   "#34d399",
  amber:     "#f59e0b",
  red:       "#f87171",
  sky:       "#38bdf8",
  violet:    "#a78bfa",
};

// ── Types ────────────────────────────────────────────────────────
interface JobListing {
  id: number;
  source: "adzuna" | "remotive";
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  jobUrl: string;
  description: string;
  requiredSkills: string[];
  atsScore: number;
  matchScore: number;
}
interface SkillProfile {
  yourSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  trendingSkills: string[];
  overallMatch: number;
}
interface SalaryInsight { min: number; max: number; median: number; currency: string; }
interface CompanyInsight { name: string; jobCount: number; isRemote: boolean; }
interface SkillGapResponse {
  jobs: JobListing[];
  skillGap: SkillProfile;
  salary: SalaryInsight;
  topCompanies: CompanyInsight[];
  totalJobsFound: number;
  generatedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`;

const matchStyle = (score: number) => {
  if (score >= 75) return { color: C.emerald, bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.2)"  };
  if (score >= 50) return { color: C.amber,   bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" };
  return               { color: C.red,     bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)" };
};

// ── SVG Icons ────────────────────────────────────────────────────
const IconSearch   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const IconPin      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/></svg>;
const IconRefresh  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="23 4 23 10 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const IconLink     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const IconBookmark = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconCheck    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconChevDown = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconChevUp   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="18 15 12 9 6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconBuilding = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke="currentColor" strokeWidth="2"/></svg>;
const IconDollar   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const IconTrend    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17 6 23 6 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconAlert    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const IconZap      = ({ size = 16 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconWifi     = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12.55a11 11 0 0114.08 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M1.42 9a16 16 0 0121.16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M8.53 16.11a6 6 0 016.95 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>;
const IconToggleOn  = () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="1" y="7" width="22" height="10" rx="5" stroke={C.emerald} strokeWidth="2"/><circle cx="16" cy="12" r="3" fill={C.emerald}/></svg>;
const IconToggleOff = () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="1" y="7" width="22" height="10" rx="5" stroke={C.dim} strokeWidth="2"/><circle cx="8" cy="12" r="3" fill={C.dim}/></svg>;

// ── Skill Pill ───────────────────────────────────────────────────
const pillStyles = {
  matched:  { color: C.emerald, bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.2)"  },
  missing:  { color: C.red,     bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)" },
  trending: { color: C.amber,   bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)"  },
  yours:    { color: C.indigo,  bg: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.2)"  },
};
function SkillPill({ label, type }: { label: string; type: keyof typeof pillStyles }) {
  const s = pillStyles[type];
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20,
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
    }}>{label}</span>
  );
}

// ── Job Card ─────────────────────────────────────────────────────
function JobCard({ job, onSave }: { job: JobListing; onSave: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [hovered,  setHovered]  = useState(false);
  const ms = matchStyle(job.matchScore);

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${hovered || expanded ? C.borderHov : C.border}`,
        borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ padding: 16 }}>

        {/* Badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
            color: job.source === "adzuna" ? "#60a5fa" : C.violet,
            background: job.source === "adzuna" ? "rgba(96,165,250,0.1)" : "rgba(167,139,250,0.1)",
          }}>{job.source === "adzuna" ? "Adzuna" : "Remotive"}</span>

          {job.isRemote && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
              color: C.violet, background: "rgba(167,139,250,0.1)",
              display: "flex", alignItems: "center", gap: 4,
            }}><IconWifi /> Remote</span>
          )}

          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
            color: ms.color, background: ms.bg, border: `1px solid ${ms.border}`,
          }}>{Math.round(job.matchScore)}% match</span>

          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
            color: C.sky, background: "rgba(56,189,248,0.1)",
          }}>ATS {Math.round(job.atsScore)}%</span>
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: 13, fontWeight: 600, color: C.text, margin: "0 0 4px",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{job.title}</h3>

        {/* Meta */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: C.muted }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <IconBuilding /> {job.company || "Unknown"}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <IconPin /> {job.location}
          </span>
          {job.salaryMin && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <IconDollar />
              {fmt(job.salaryMin)}{job.salaryMax ? ` – ${fmt(job.salaryMax)}` : "+"}
            </span>
          )}
        </div>

        {/* Skill chips */}
        {job.requiredSkills.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
            {job.requiredSkills.slice(0, 6).map(s => (
              <span key={s} style={{
                fontSize: 10, padding: "2px 6px", borderRadius: 6,
                background: C.card, color: C.muted, border: `1px solid ${C.border}`,
              }}>{s}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, padding: "7px 0", borderRadius: 10, textDecoration: "none",
            fontSize: 12, fontWeight: 600, color: "#fff", background: C.indigo,
          }}><IconLink /> View Job</a>

          <button
            onClick={() => { setSaved(true); onSave(job.id); }}
            disabled={saved}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              cursor: saved ? "default" : "pointer", border: "1px solid", fontFamily: "inherit",
              color:       saved ? C.emerald : C.muted,
              background:  saved ? "rgba(52,211,153,0.1)" : C.card,
              borderColor: saved ? "rgba(52,211,153,0.2)" : C.border,
            }}>
            {saved ? <><IconCheck /> Saved</> : <><IconBookmark /> Save</>}
          </button>

          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "7px 10px", borderRadius: 10, cursor: "pointer",
              background: C.card, border: `1px solid ${C.border}`, color: C.muted, fontFamily: "inherit",
            }}>
            {expanded ? <IconChevUp /> : <IconChevDown />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 16px" }}>
          <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, margin: 0 }}>
            {job.description.slice(0, 600)}{job.description.length > 600 ? "…" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function SkillGapPage() {
  const [data,        setData]        = useState<SkillGapResponse | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [keywords,    setKeywords]    = useState("Lead .NET Engineer Senior C# Developer");
  const [location,    setLocation]    = useState("Bengaluru");
  const [remote,      setRemote]      = useState(true);
  const [autoDigest,  setAutoDigest]  = useState(false);
  const [activeTab,   setActiveTab]   = useState<"jobs" | "skills" | "companies">("jobs");
  const [savedIds,    setSavedIds]    = useState<Set<number>>(new Set());
  const [filterScore, setFilterScore] = useState(0);

  useEffect(() => {
    fetch(`${API}/api/skill-gap/settings`)
      .then(r => r.json())
      .then(s => { setAutoDigest(s.autoDigest); setKeywords(s.keywords); setLocation(s.location); })
      .catch(() => {});
  }, []);

  const analyze = async () => {
    setLoading(true); setError(null); setData(null);
    try {
      const res = await fetch(`${API}/api/skill-gap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, location, includeRemote: remote, maxJobs: 30 }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setData(await res.json());
      setActiveTab("jobs");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    }
    setLoading(false);
  };

  const toggleAutoDigest = async () => {
    const next = !autoDigest;
    setAutoDigest(next);
    await fetch(`${API}/api/skill-gap/settings`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto_digest_enabled: String(next), digest_keywords: keywords, digest_location: location }),
    }).catch(() => {});
  };

  const handleSaveJob = async (jobId: number) => {
    setSavedIds(prev => new Set([...prev, jobId]));
    await fetch(`${API}/api/skill-gap/save-job`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, status: "saved" }),
    }).catch(() => {});
  };

  const filteredJobs = data?.jobs.filter(j => j.matchScore >= filterScore) ?? [];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:0.3} }
        input::placeholder { color: ${C.muted}; }
        input:focus { border-color: ${C.indigo} !important; outline: none; }
        a:hover { opacity: 0.8; }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: "12px 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: C.indigo,
            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
          }}><IconZap size={16} /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Skill Gap Analyzer</div>
            <div style={{ fontSize: 11, color: C.muted }}>Jobs · Skills · Salary · Companies</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Auto-digest</span>
            <button onClick={toggleAutoDigest}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
              {autoDigest ? <IconToggleOn /> : <IconToggleOff />}
            </button>
          </div>
          <a href="/chat" style={{ fontSize: 12, color: C.muted, textDecoration: "none" }}>← Back to chat</a>
        </div>
      </header>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 16px" }}>

        {/* ── Search Bar ── */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: 16, marginBottom: 24,
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>

            <div style={{ flex: "1 1 220px", position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.muted, pointerEvents: "none" }}>
                <IconSearch />
              </span>
              <input
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                onKeyDown={e => e.key === "Enter" && analyze()}
                placeholder="Role keywords e.g. Lead .NET Engineer"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: C.input, border: `1px solid ${C.border}`, borderRadius: 10,
                  padding: "8px 10px 8px 30px", fontSize: 13, color: C.text, fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ flex: "0 1 150px", position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.muted, pointerEvents: "none" }}>
                <IconPin />
              </span>
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Location"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: C.input, border: `1px solid ${C.border}`, borderRadius: 10,
                  padding: "8px 10px 8px 28px", fontSize: 13, color: C.text, fontFamily: "inherit",
                }}
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: C.muted, userSelect: "none" }}>
              <input type="checkbox" checked={remote} onChange={e => setRemote(e.target.checked)}
                style={{ accentColor: C.indigo, width: 14, height: 14, cursor: "pointer" }} />
              Include remote
            </label>

            <button onClick={analyze} disabled={loading} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 20px",
              borderRadius: 10, border: "none", fontFamily: "inherit",
              background: loading ? C.dim : C.indigo, color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}>
              <IconRefresh /> {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>

          {autoDigest && (
            <div style={{
              marginTop: 10, display: "flex", alignItems: "center", gap: 8,
              fontSize: 12, color: C.emerald,
              background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)",
              borderRadius: 10, padding: "6px 12px",
            }}>
              <IconZap size={12} /> Auto-digest ON — jobs fetched daily at 9am automatically.
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.red,
            background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.15)",
            borderRadius: 12, padding: "10px 16px", marginBottom: 16,
          }}><IconAlert /> {error}</div>
        )}

        {/* ── Loading skeletons ── */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                height: 120, borderRadius: 16, background: C.surface,
                border: `1px solid ${C.border}`, animation: "pulse 1.5s ease infinite",
              }} />
            ))}
          </div>
        )}

        {/* ── Results ── */}
        {data && !loading && (
          <>
            {/* Summary stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Jobs Found",     value: data.totalJobsFound },
                { label: "Profile Match",  value: `${data.skillGap.overallMatch.toFixed(0)}%` },
                { label: "Skills Missing", value: data.skillGap.missingSkills.length },
                { label: "Salary Median",  value: fmt(data.salary.median) },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 14, padding: "12px 16px",
                }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(["jobs","skills","companies"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", border: "1px solid", fontFamily: "inherit",
                  background:  activeTab === tab ? C.indigo : C.surface,
                  borderColor: activeTab === tab ? C.indigo : C.border,
                  color:       activeTab === tab ? "#fff"   : C.muted,
                }}>
                  {tab === "jobs"      && `Jobs (${filteredJobs.length})`}
                  {tab === "skills"    && "Skill Gap"}
                  {tab === "companies" && `Companies (${data.topCompanies.length})`}
                </button>
              ))}
            </div>

            {/* ── JOBS TAB ── */}
            {activeTab === "jobs" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Min match:</span>
                  {[0, 25, 50, 75].map(v => (
                    <button key={v} onClick={() => setFilterScore(v)} style={{
                      padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", border: "1px solid", fontFamily: "inherit",
                      background:  filterScore === v ? C.indigo : C.surface,
                      borderColor: filterScore === v ? C.indigo : C.border,
                      color:       filterScore === v ? "#fff"   : C.muted,
                    }}>{v === 0 ? "All" : `${v}%+`}</button>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filteredJobs.length === 0
                    ? <div style={{ textAlign: "center", fontSize: 13, color: C.muted, padding: "48px 0" }}>
                        No jobs match the filter 🗂️
                      </div>
                    : filteredJobs.map(job => (
                        <JobCard key={job.id ?? job.jobUrl} job={job} onSave={handleSaveJob} />
                      ))
                  }
                </div>
              </>
            )}

            {/* ── SKILLS TAB ── */}
            {activeTab === "skills" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                {/* Overall match bar */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Overall Profile Match</span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: C.indigo }}>{data.skillGap.overallMatch.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 8, background: C.card, borderRadius: 8, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 8, transition: "width 0.5s",
                      background: `linear-gradient(90deg, ${C.indigo}, ${C.violet})`,
                      width: `${data.skillGap.overallMatch}%`,
                    }} />
                  </div>
                  <p style={{ fontSize: 12, color: C.muted, marginTop: 8, marginBottom: 0 }}>
                    Based on {data.totalJobsFound} job descriptions from Adzuna + Remotive
                  </p>
                </div>

                {/* Matched / Missing */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { title: `Skills You Have (${data.skillGap.matchedSkills.length})`, skills: data.skillGap.matchedSkills, type: "matched" as const, color: C.emerald, empty: "No matches found" },
                    { title: `Skills to Learn (${data.skillGap.missingSkills.length})`, skills: data.skillGap.missingSkills, type: "missing" as const, color: C.red,     empty: "No gaps — great!" },
                  ].map(({ title, skills, type, color, empty }) => (
                    <div key={type} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <span style={{ color }}>{type === "matched" ? <IconCheck /> : <IconAlert />}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{title}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {skills.length > 0
                          ? skills.map(s => <SkillPill key={s} label={s} type={type} />)
                          : <span style={{ fontSize: 12, color: C.muted }}>{empty}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Trending */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ color: C.amber }}><IconTrend /></span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Trending in Market ({data.skillGap.trendingSkills.length})</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {data.skillGap.trendingSkills.length > 0
                      ? data.skillGap.trendingSkills.map(s => <SkillPill key={s} label={s} type="trending" />)
                      : <span style={{ fontSize: 12, color: C.muted }}>No trending data yet</span>}
                  </div>
                </div>

                {/* Salary */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ color: C.sky }}><IconDollar /></span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Salary Range</span>
                    <span style={{ fontSize: 12, color: C.muted }}>· INR annual · {data.totalJobsFound} jobs</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 32 }}>
                    {[
                      { label: "Min",    value: fmt(data.salary.min),    big: false },
                      { label: "Median", value: fmt(data.salary.median), big: true  },
                      { label: "Max",    value: fmt(data.salary.max),    big: false },
                    ].map(({ label, value, big }) => (
                      <div key={label}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: big ? 24 : 16, fontWeight: 700, color: big ? C.sky : C.text }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── COMPANIES TAB ── */}
            {activeTab === "companies" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.topCompanies.map((co, i) => (
                  <div key={co.name} style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 12, padding: "10px 16px",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.dim, minWidth: 20, textAlign: "right" }}>{i + 1}</span>
                    <span style={{ color: C.muted, display: "flex" }}><IconBuilding /></span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{co.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {co.isRemote && (
                        <span style={{ fontSize: 10, color: C.violet, background: "rgba(167,139,250,0.1)", padding: "2px 6px", borderRadius: 20 }}>Remote</span>
                      )}
                      <span style={{ fontSize: 12, color: C.muted }}>{co.jobCount} job{co.jobCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontSize: 11, color: C.dim, textAlign: "center", marginTop: 24 }}>
              Generated {new Date(data.generatedAt).toLocaleString("en-IN")}
            </p>
          </>
        )}

        {/* ── Empty state ── */}
        {!data && !loading && !error && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", color: C.indigo,
            }}><IconZap size={22} /></div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: "0 0 8px" }}>
              Ready to analyze your market fit
            </h2>
            <p style={{ fontSize: 13, color: C.muted, maxWidth: 380, margin: "0 auto 24px", lineHeight: 1.6 }}>
              Enter your target role and location, then hit Analyze.
              We'll pull live jobs from Adzuna + Remotive and compare against your profile.
            </p>
            <button onClick={analyze} style={{
              padding: "10px 24px", borderRadius: 10, border: "none", fontFamily: "inherit",
              background: C.indigo, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>Run Analysis</button>
          </div>
        )}
      </div>
    </div>
  );
}