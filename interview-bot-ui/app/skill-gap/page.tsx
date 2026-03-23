"use client";

import { useState, useEffect } from "react";
import {
  Search, Briefcase, TrendingUp, AlertCircle, CheckCircle,
  ExternalLink, MapPin, Building2, DollarSign, Zap,
  ToggleLeft, ToggleRight, Loader2, RefreshCw, BookmarkPlus,
  ChevronDown, ChevronUp, Star, Wifi
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5267";

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

interface SalaryInsight {
  min: number;
  max: number;
  median: number;
  currency: string;
}

interface CompanyInsight {
  name: string;
  jobCount: number;
  isRemote: boolean;
}

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
  n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : `₹${n.toLocaleString("en-IN")}`;

const matchColor = (score: number) => {
  if (score >= 75) return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" };
  if (score >= 50) return { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20"   };
  return              { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/20"    };
};

const sourceLabel = (s: string) =>
  s === "adzuna" ? { label: "Adzuna", color: "text-blue-400 bg-blue-500/10" }
                 : { label: "Remote", color: "text-violet-400 bg-violet-500/10" };

// ── Job Card ─────────────────────────────────────────────────────
function JobCard({ job, onSave }: { job: JobListing; onSave: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved]       = useState(false);
  const mc = matchColor(job.matchScore);
  const sl = sourceLabel(job.source);

  const handleSave = async () => {
    setSaved(true);
    onSave(job.id);
  };

  return (
    <div className={`rounded-2xl border bg-[#111118] transition-all duration-200
                     hover:border-[#3a3a52] ${expanded ? "border-[#3a3a52]" : "border-[#22222e]"}`}>

      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">

            {/* Badges row */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${sl.color}`}>
                {sl.label}
              </span>
              {job.isRemote && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full
                                 text-violet-400 bg-violet-500/10 flex items-center gap-1">
                  <Wifi size={10} /> Remote
                </span>
              )}
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full
                               border ${mc.bg} ${mc.text} ${mc.border}`}>
                {Math.round(job.matchScore)}% match
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full
                               text-sky-400 bg-sky-500/10">
                ATS {Math.round(job.atsScore)}%
              </span>
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold text-white leading-snug mb-1 truncate">
              {job.title}
            </h3>

            {/* Meta */}
            <div className="flex flex-wrap gap-3 text-xs text-[#7878a0]">
              <span className="flex items-center gap-1">
                <Building2 size={11} /> {job.company || "Unknown"}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={11} /> {job.location}
              </span>
              {job.salaryMin && (
                <span className="flex items-center gap-1">
                  <DollarSign size={11} />
                  {fmt(job.salaryMin)}{job.salaryMax ? ` – ${fmt(job.salaryMax)}` : "+"}
                </span>
              )}
            </div>

            {/* Required skills chips */}
            {job.requiredSkills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {job.requiredSkills.slice(0, 6).map(s => (
                  <span key={s}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1e2a]
                               text-[#9292a4] border border-[#2a2a3a]">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action row */}
        <div className="flex gap-2 mt-3">
          <a href={job.jobUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl
                       text-xs font-semibold bg-indigo-600 hover:bg-indigo-500
                       text-white transition-colors">
            <ExternalLink size={12} /> View Job
          </a>
          <button
            onClick={handleSave}
            disabled={saved}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs
                       font-semibold transition-colors
                       ${saved
                         ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                         : "bg-[#1e1e2a] border border-[#2a2a3a] text-[#9292a4] hover:text-white"}`}>
            {saved ? <><CheckCircle size={12} /> Saved</> : <><BookmarkPlus size={12} /> Save</>}
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs
                       text-[#7878a0] hover:text-white bg-[#1e1e2a]
                       border border-[#2a2a3a] transition-colors">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Expanded description */}
      {expanded && (
        <div className="border-t border-[#22222e] px-4 py-3">
          <p className="text-xs text-[#9292a4] leading-relaxed line-clamp-6">
            {job.description.slice(0, 600)}{job.description.length > 600 ? "…" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Skill Pill ───────────────────────────────────────────────────
function SkillPill({ label, type }: { label: string; type: "matched" | "missing" | "trending" | "yours" }) {
  const styles = {
    matched:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    missing:  "bg-red-500/10 text-red-400 border-red-500/20",
    trending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    yours:    "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${styles[type]}`}>
      {label}
    </span>
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

  // Load settings on mount
  useEffect(() => {
    fetch(`${API}/api/skill-gap/settings`)
      .then(r => r.json())
      .then(s => {
        setAutoDigest(s.autoDigest);
        setKeywords(s.keywords);
        setLocation(s.location);
      })
      .catch(() => {});
  }, []);

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`${API}/api/skill-gap`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ keywords, location, includeRemote: remote, maxJobs: 30 }),
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json: SkillGapResponse = await res.json();
      setData(json);
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
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        auto_digest_enabled: String(next),
        digest_keywords:     keywords,
        digest_location:     location,
      }),
    }).catch(() => {});
  };

  const handleSaveJob = async (jobId: number) => {
    setSavedIds(prev => new Set([...prev, jobId]));
    await fetch(`${API}/api/skill-gap/save-job`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ jobId, status: "saved" }),
    }).catch(() => {});
  };

  const filteredJobs = data?.jobs.filter(j => j.matchScore >= filterScore) ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e8e8f0]"
         style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── Header ── */}
      <header className="bg-[#111118] border-b border-[#22222e] px-6 py-4
                         flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Skill Gap Analyzer</h1>
            <p className="text-xs text-[#7878a0]">Jobs · Skills · Salary · Companies</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-digest toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#7878a0]">Auto-digest</span>
            <button onClick={toggleAutoDigest}
              className={`transition-colors ${autoDigest ? "text-emerald-400" : "text-[#3a3a52]"}`}>
              {autoDigest ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
            </button>
          </div>
          <a href="/chat" className="text-xs text-[#7878a0] hover:text-white transition-colors">
            ← Back to chat
          </a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ── Search Bar ── */}
        <div className="bg-[#111118] border border-[#22222e] rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7878a0]" />
              <input
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                onKeyDown={e => e.key === "Enter" && analyze()}
                placeholder="Role keywords e.g. Lead .NET Engineer"
                className="w-full bg-[#0a0a0f] border border-[#22222e] rounded-xl
                           pl-8 pr-3 py-2 text-sm text-white placeholder-[#7878a0]
                           focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="relative sm:w-44">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7878a0]" />
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Location"
                className="w-full bg-[#0a0a0f] border border-[#22222e] rounded-xl
                           pl-8 pr-3 py-2 text-sm text-white placeholder-[#7878a0]
                           focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer px-1">
              <input type="checkbox" checked={remote} onChange={e => setRemote(e.target.checked)}
                className="accent-indigo-500 w-4 h-4" />
              <span className="text-sm text-[#9292a4]">Include remote</span>
            </label>
            <button
              onClick={analyze}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600
                         hover:bg-indigo-500 disabled:opacity-50 text-white text-sm
                         font-semibold transition-colors whitespace-nowrap">
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Analyzing…</>
                : <><RefreshCw size={14} /> Analyze</>}
            </button>
          </div>

          {/* Auto-digest notice */}
          {autoDigest && (
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400
                            bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-3 py-2">
              <Zap size={12} />
              Auto-digest is ON — jobs will be fetched daily at 9am and saved automatically.
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/5
                          border border-red-500/15 rounded-xl px-4 py-3 mb-4">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="grid gap-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-32 rounded-2xl bg-[#111118] border border-[#22222e]
                                      animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Results ── */}
        {data && !loading && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Jobs Found",    value: data.totalJobsFound,                         icon: <Briefcase size={14} /> },
                { label: "Profile Match", value: `${data.skillGap.overallMatch.toFixed(0)}%`, icon: <Star size={14} /> },
                { label: "Skills Missing",value: data.skillGap.missingSkills.length,          icon: <AlertCircle size={14} /> },
                { label: "Salary Median", value: fmt(data.salary.median),                     icon: <DollarSign size={14} /> },
              ].map(({ label, value, icon }) => (
                <div key={label}
                  className="bg-[#111118] border border-[#22222e] rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[#7878a0] mb-1">
                    {icon}
                    <span className="text-[11px]">{label}</span>
                  </div>
                  <p className="text-xl font-bold text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              {(["jobs","skills","companies"] as const).map(tab => (
                <button key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold
                             capitalize transition-colors
                             ${activeTab === tab
                               ? "bg-indigo-600 text-white"
                               : "bg-[#111118] border border-[#22222e] text-[#7878a0] hover:text-white"}`}>
                  {tab === "jobs"      ? `Jobs (${filteredJobs.length})`        : ""}
                  {tab === "skills"    ? "Skill Gap"                             : ""}
                  {tab === "companies" ? `Companies (${data.topCompanies.length})` : ""}
                </button>
              ))}
            </div>

            {/* ── JOBS TAB ── */}
            {activeTab === "jobs" && (
              <>
                {/* Filter */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-[#7878a0]">Min match:</span>
                  {[0, 25, 50, 75].map(v => (
                    <button key={v}
                      onClick={() => setFilterScore(v)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors
                                 ${filterScore === v
                                   ? "bg-indigo-600 text-white"
                                   : "bg-[#111118] border border-[#22222e] text-[#7878a0]"}`}>
                      {v === 0 ? "All" : `${v}%+`}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-3">
                  {filteredJobs.length === 0
                    ? <div className="text-center text-sm text-[#7878a0] py-12">
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
              <div className="grid sm:grid-cols-2 gap-4">

                {/* Overall match gauge */}
                <div className="sm:col-span-2 bg-[#111118] border border-[#22222e] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-white">Overall Profile Match</span>
                    <span className="text-2xl font-bold text-indigo-400">
                      {data.skillGap.overallMatch.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-[#1e1e2a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 rounded-full transition-all"
                      style={{ width: `${data.skillGap.overallMatch}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#7878a0] mt-2">
                    Based on {data.totalJobsFound} job descriptions from Adzuna + Remotive
                  </p>
                </div>

                {/* Matched skills */}
                <div className="bg-[#111118] border border-[#22222e] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={14} className="text-emerald-400" />
                    <span className="text-sm font-semibold text-white">
                      Skills You Have ({data.skillGap.matchedSkills.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.skillGap.matchedSkills.map(s => (
                      <SkillPill key={s} label={s} type="matched" />
                    ))}
                    {data.skillGap.matchedSkills.length === 0 &&
                      <span className="text-xs text-[#7878a0]">No matches found</span>}
                  </div>
                </div>

                {/* Missing skills */}
                <div className="bg-[#111118] border border-[#22222e] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle size={14} className="text-red-400" />
                    <span className="text-sm font-semibold text-white">
                      Skills to Learn ({data.skillGap.missingSkills.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.skillGap.missingSkills.map(s => (
                      <SkillPill key={s} label={s} type="missing" />
                    ))}
                    {data.skillGap.missingSkills.length === 0 &&
                      <span className="text-xs text-[#7878a0]">No gaps — great!</span>}
                  </div>
                </div>

                {/* Trending skills */}
                <div className="sm:col-span-2 bg-[#111118] border border-[#22222e] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={14} className="text-amber-400" />
                    <span className="text-sm font-semibold text-white">
                      Trending in Market ({data.skillGap.trendingSkills.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.skillGap.trendingSkills.map(s => (
                      <SkillPill key={s} label={s} type="trending" />
                    ))}
                    {data.skillGap.trendingSkills.length === 0 &&
                      <span className="text-xs text-[#7878a0]">No trending data yet</span>}
                  </div>
                </div>

                {/* Salary insight */}
                <div className="sm:col-span-2 bg-[#111118] border border-[#22222e] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign size={14} className="text-sky-400" />
                    <span className="text-sm font-semibold text-white">Salary Range</span>
                    <span className="text-xs text-[#7878a0]">
                      (from {data.totalJobsFound} jobs · INR annual)
                    </span>
                  </div>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-xs text-[#7878a0]">Min</p>
                      <p className="text-lg font-bold text-white">{fmt(data.salary.min)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#7878a0]">Median</p>
                      <p className="text-2xl font-bold text-sky-400">{fmt(data.salary.median)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#7878a0]">Max</p>
                      <p className="text-lg font-bold text-white">{fmt(data.salary.max)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── COMPANIES TAB ── */}
            {activeTab === "companies" && (
              <div className="flex flex-col gap-2">
                {data.topCompanies.map((c, i) => (
                  <div key={c.name}
                    className="bg-[#111118] border border-[#22222e] rounded-xl
                               px-4 py-3 flex items-center gap-3">
                    <span className="text-xs font-bold text-[#3a3a52] w-5 text-right">
                      {i + 1}
                    </span>
                    <Building2 size={14} className="text-[#7878a0] flex-shrink-0" />
                    <span className="flex-1 text-sm font-medium text-white truncate">{c.name}</span>
                    <div className="flex items-center gap-2">
                      {c.isRemote && (
                        <span className="text-[10px] text-violet-400 bg-violet-500/10
                                         px-1.5 py-0.5 rounded-full">Remote</span>
                      )}
                      <span className="text-xs text-[#7878a0]">
                        {c.jobCount} job{c.jobCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Last updated */}
            <p className="text-[11px] text-[#3a3a52] text-center mt-6">
              Generated {new Date(data.generatedAt).toLocaleString("en-IN")}
            </p>
          </>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-full bg-indigo-600/10 border border-indigo-600/20
                            flex items-center justify-center mx-auto mb-4">
              <Zap size={22} className="text-indigo-400" />
            </div>
            <h2 className="text-base font-semibold text-white mb-1">
              Ready to analyze your market fit
            </h2>
            <p className="text-sm text-[#7878a0] mb-6 max-w-sm mx-auto">
              Enter your target role and location, then hit Analyze.
              We'll pull live jobs from Adzuna + Remotive and compare against your profile.
            </p>
            <button onClick={analyze}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500
                         text-white text-sm font-semibold transition-colors">
              Run Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  );
}