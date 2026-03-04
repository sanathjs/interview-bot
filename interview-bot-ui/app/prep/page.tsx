"use client";

import { useState, useEffect } from "react";
import { getUnanswered, saveAnswer, promoteToKb,
         deleteUnanswered } from "@/lib/api";
import { Brain, CheckCircle, Trash2, BookOpen,
         Lock, ChevronDown, ChevronUp } from "lucide-react";

interface UnansweredQuestion {
  id: number;
  questionText: string;
  category: string;
  timesAsked: number;
  priority: "high" | "medium" | "low";
  status: string;
  firstAskedAt: string;
  company: string | null;
  sessionCode: string;
}

const PIN = process.env.NEXT_PUBLIC_PREP_PIN || "1234";

const priorityColor = {
  high:   "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low:    "bg-gray-100 text-gray-600 border-gray-200",
};

const statusColor: Record<string, string> = {
  new:         "bg-blue-50 text-blue-600",
  ready:       "bg-green-50 text-green-600",
  added_to_kb: "bg-purple-50 text-purple-600",
};

export default function PrepPage() {
  const [unlocked, setUnlocked]       = useState(false);
  const [pin, setPin]                 = useState("");
  const [pinError, setPinError]       = useState(false);
  const [questions, setQuestions]     = useState<UnansweredQuestion[]>([]);
  const [filter, setFilter]           = useState("all");
  const [answers, setAnswers]         = useState<Record<number, string>>({});
  const [expanded, setExpanded]       = useState<Record<number, boolean>>({});
  const [saving, setSaving]           = useState<Record<number, boolean>>({});
  const [promoting, setPromoting]     = useState<Record<number, boolean>>({});
  const [deleting, setDeleting]       = useState<Record<number, boolean>>({});
  const [feedback, setFeedback]       = useState<Record<number, string>>({});
  const [loading, setLoading]         = useState(false);

  const handleUnlock = () => {
    if (pin === PIN) {
      setUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPin("");
    }
  };

  useEffect(() => {
    if (!unlocked) return;
    fetchQuestions();
  }, [unlocked]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const data = await getUnanswered();
      setQuestions(data.questions);
    } catch {
      console.error("Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id: number) => {
    const answer = answers[id];
    if (!answer?.trim()) return;
    setSaving({ ...saving, [id]: true });
    try {
      await saveAnswer(id, answer);
      setFeedback({ ...feedback, [id]: "saved" });
      await fetchQuestions();
    } catch {
      setFeedback({ ...feedback, [id]: "error" });
    } finally {
      setSaving({ ...saving, [id]: false });
    }
  };

  const handlePromote = async (id: number) => {
    setPromoting({ ...promoting, [id]: true });
    try {
      await promoteToKb(id);
      setFeedback({ ...feedback, [id]: "promoted" });
      await fetchQuestions();
    } catch {
      setFeedback({ ...feedback, [id]: "error" });
    } finally {
      setPromoting({ ...promoting, [id]: false });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this question?")) return;
    setDeleting({ ...deleting, [id]: true });
    try {
      await deleteUnanswered(id);
      setQuestions(questions.filter(q => q.id !== id));
    } catch {
      setFeedback({ ...feedback, [id]: "error" });
    } finally {
      setDeleting({ ...deleting, [id]: false });
    }
  };

  const filtered = questions.filter(q => {
    if (filter === "all") return q.status !== "added_to_kb";
    if (filter === "new") return q.status === "new";
    if (filter === "ready") return q.status === "ready";
    if (filter === "done") return q.status === "added_to_kb";
    return true;
  });

  // ── PIN Screen ──────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center
                      justify-center">
        <div className="bg-white border border-gray-200 rounded-2xl
                        p-8 w-full max-w-sm shadow-sm">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-gray-900
                            flex items-center justify-center">
              <Lock size={20} className="text-white" />
            </div>
          </div>
          <h1 className="text-center text-lg font-semibold
                         text-gray-900 mb-1">
            Prep Dashboard
          </h1>
          <p className="text-center text-sm text-gray-400 mb-6">
            Enter your PIN to access
          </p>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleUnlock()}
            placeholder="Enter PIN"
            className={`w-full border rounded-xl px-4 py-3 text-center
                       text-lg tracking-widest outline-none
                       focus:ring-2 focus:ring-gray-200
                       ${pinError
                         ? "border-red-300 bg-red-50"
                         : "border-gray-200"}`}
          />
          {pinError && (
            <p className="text-center text-sm text-red-500 mt-2">
              Incorrect PIN
            </p>
          )}
          <button
            onClick={handleUnlock}
            className="w-full mt-4 bg-gray-900 text-white rounded-xl
                       py-3 text-sm font-medium hover:bg-gray-700
                       transition-colors"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  // ── Main Dashboard ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4
                         flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-900
                          flex items-center justify-center">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">
              Prep Dashboard
            </h1>
            <p className="text-xs text-gray-400">
              {questions.filter(q =>
                q.status !== "added_to_kb").length} questions to review
            </p>
          </div>
        </div>
        <a href="/chat"
           className="text-xs text-gray-400 hover:text-gray-600">
          ← Back to chat
        </a>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {["all", "new", "ready", "done"].map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium
                         transition-colors capitalize
                         ${filter === f
                           ? "bg-gray-900 text-white"
                           : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
                         }`}>
              {f === "done" ? "added to KB" : f}
            </button>
          ))}
        </div>

        {/* Questions list */}
        {loading ? (
          <div className="text-center text-sm text-gray-400 py-12">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-12">
            No questions in this category 🎉
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(q => (
              <div key={q.id}
                className="bg-white border border-gray-200
                           rounded-2xl overflow-hidden">

                {/* Question header */}
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full
                                         border font-medium
                                         ${priorityColor[q.priority]}`}>
                          {q.priority} priority
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full
                                         font-medium
                                         ${statusColor[q.status] ?? ""}`}>
                          {q.status.replace("_", " ")}
                        </span>
                        {q.timesAsked > 1 && (
                          <span className="text-xs px-2 py-0.5 rounded-full
                                           bg-orange-50 text-orange-600
                                           font-medium">
                            asked {q.timesAsked}× 
                          </span>
                        )}
                        {q.company && (
                          <span className="text-xs px-2 py-0.5 rounded-full
                                           bg-gray-50 text-gray-500">
                            {q.company}
                          </span>
                        )}
                      </div>

                      {/* Question text */}
                      <p className="text-sm font-medium text-gray-800">
                        {q.questionText}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        First asked:{" "}
                        {new Date(q.firstAskedAt)
                          .toLocaleDateString()}
                      </p>
                    </div>

                    {/* Expand / collapse */}
                    <button
                      onClick={() => setExpanded({
                        ...expanded, [q.id]: !expanded[q.id]
                      })}
                      className="text-gray-400 hover:text-gray-600
                                 flex-shrink-0 mt-1">
                      {expanded[q.id]
                        ? <ChevronUp size={16} />
                        : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded — answer area */}
                {expanded[q.id] && (
                  <div className="border-t border-gray-100 px-5 py-4
                                  bg-gray-50">
                    <label className="text-xs font-medium text-gray-500
                                      mb-2 block">
                      Your answer
                    </label>
                    <textarea
                      value={answers[q.id] ?? ""}
                      onChange={e => setAnswers({
                        ...answers, [q.id]: e.target.value
                      })}
                      placeholder="Type your answer here..."
                      rows={4}
                      className="w-full border border-gray-200 rounded-xl
                                 px-4 py-3 text-sm text-gray-800
                                 placeholder-gray-400 resize-none
                                 focus:outline-none focus:ring-2
                                 focus:ring-gray-200 bg-white"
                    />

                    {/* Feedback message */}
                    {feedback[q.id] && (
                      <p className={`text-xs mt-1 ${
                        feedback[q.id] === "error"
                          ? "text-red-500"
                          : "text-green-600"
                      }`}>
                        {feedback[q.id] === "saved" && "✅ Answer saved"}
                        {feedback[q.id] === "promoted" &&
                          "🚀 Added to knowledge base!"}
                        {feedback[q.id] === "error" && "❌ Something went wrong"}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3">
                      {/* Save */}
                      <button
                        onClick={() => handleSave(q.id)}
                        disabled={saving[q.id] ||
                                  !answers[q.id]?.trim()}
                        className="flex items-center gap-1.5 px-4 py-2
                                   bg-gray-900 text-white text-xs
                                   rounded-xl hover:bg-gray-700
                                   disabled:opacity-40 transition-colors">
                        <CheckCircle size={13} />
                        {saving[q.id] ? "Saving..." : "Save Answer"}
                      </button>

                      {/* Promote */}
                      {q.status === "ready" && (
                        <button
                          onClick={() => handlePromote(q.id)}
                          disabled={promoting[q.id]}
                          className="flex items-center gap-1.5 px-4 py-2
                                     bg-green-600 text-white text-xs
                                     rounded-xl hover:bg-green-700
                                     disabled:opacity-40 transition-colors">
                          <BookOpen size={13} />
                          {promoting[q.id]
                            ? "Adding to KB..."
                            : "Add to KB"}
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(q.id)}
                        disabled={deleting[q.id]}
                        className="flex items-center gap-1.5 px-4 py-2
                                   border border-red-200 text-red-500
                                   text-xs rounded-xl hover:bg-red-50
                                   disabled:opacity-40 transition-colors
                                   ml-auto">
                        <Trash2 size={13} />
                        {deleting[q.id] ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
