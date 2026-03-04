"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSessions } from "@/lib/api";
import {
  Clock, Building2, Star, MessageSquare,
  CheckCircle, XCircle, ChevronRight, History,
} from "lucide-react";

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

const ratingStars = (n: number | null) =>
  n ? "★".repeat(n) + "☆".repeat(5 - n) : null;

const confidenceColor = (score: number) => {
  if (score >= 0.65) return "text-green-600";
  if (score >= 0.58) return "text-amber-500";
  return "text-red-500";
};

const statusBadge = (s: Session) =>
  s.status === "active"
    ? "bg-green-50 text-green-600 border-green-200"
    : "bg-gray-100 text-gray-500 border-gray-200";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatDuration(start: string, end: string | null) {
  if (!end) return "Ongoing";
  const mins = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000
  );
  return `${mins}m`;
}

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<"all" | "active" | "completed">("all");

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await getSessions();
      setSessions(data.sessions);
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = sessions.filter(s =>
    filter === "all" ? true : s.status === filter
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4
                         flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-900
                          flex items-center justify-center">
            <History size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">
              Interview Sessions
            </h1>
            <p className="text-xs text-gray-400">
              {sessions.length} total session{sessions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <a href="/chat" className="text-xs text-gray-400 hover:text-gray-600">
          ← Back to chat
        </a>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Summary stats */}
        {!loading && sessions.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              {
                label: "Total Sessions",
                value: sessions.length,
                sub: `${sessions.filter(s => s.status === "active").length} active`,
              },
              {
                label: "Avg Confidence",
                value: (() => {
                  const scored = sessions.filter(s => s.avgConfidenceScore != null);
                  if (!scored.length) return "—";
                  const avg = scored.reduce((a, s) => a + s.avgConfidenceScore!, 0) / scored.length;
                  return `${Math.round(avg * 100)}%`;
                })(),
                sub: "across all sessions",
              },
              {
                label: "Questions Asked",
                value: sessions.reduce((a, s) => a + s.totalQuestions, 0),
                sub: `${sessions.reduce((a, s) => a + s.unansweredCount, 0)} unanswered`,
              },
            ].map(({ label, value, sub }) => (
              <div key={label}
                   className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className="text-xl font-semibold text-gray-900">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(["all", "active", "completed"] as const).map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium
                         transition-colors capitalize
                         ${filter === f
                           ? "bg-gray-900 text-white"
                           : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
                         }`}>
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center text-sm text-gray-400 py-16">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-16">
            No sessions found 🗂️
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(s => (
              <button key={s.id}
                onClick={() => router.push(`/sessions/${s.id}`)}
                className="bg-white border border-gray-200 rounded-2xl px-5 py-4
                           text-left hover:border-gray-300 hover:shadow-sm
                           transition-all group w-full">

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">

                    {/* Top row — company + status */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={13} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {s.companyName || "Unknown Company"}
                        </span>
                      </div>
                      {s.roundNumber && (
                        <span className="text-xs text-gray-400">
                          Round {s.roundNumber}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full border
                                       font-medium ${statusBadge(s)}`}>
                        {s.status}
                      </span>
                      {s.overallRating && (
                        <span className="text-xs text-amber-500 tracking-tight">
                          {ratingStars(s.overallRating)}
                        </span>
                      )}
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatDate(s.startedAt)}
                        {" · "}
                        {formatDuration(s.startedAt, s.endedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={11} />
                        {s.totalQuestions} questions
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="flex items-center gap-1 text-xs
                                       bg-green-50 text-green-700 px-2 py-0.5
                                       rounded-full">
                        <CheckCircle size={11} />
                        {s.answeredFromKb} from KB
                      </span>
                      {s.unansweredCount > 0 && (
                        <span className="flex items-center gap-1 text-xs
                                         bg-red-50 text-red-500 px-2 py-0.5
                                         rounded-full">
                          <XCircle size={11} />
                          {s.unansweredCount} unanswered
                        </span>
                      )}
                      {s.avgConfidenceScore != null && (
                        <span className={`text-xs px-2 py-0.5 rounded-full
                                         bg-gray-50 font-medium
                                         ${confidenceColor(s.avgConfidenceScore)}`}>
                          {Math.round(s.avgConfidenceScore * 100)}% avg confidence
                        </span>
                      )}
                      {s.interviewerName && (
                        <span className="text-xs px-2 py-0.5 rounded-full
                                         bg-gray-50 text-gray-500">
                          {s.interviewerName}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={16}
                    className="text-gray-300 group-hover:text-gray-500
                               flex-shrink-0 mt-1 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
