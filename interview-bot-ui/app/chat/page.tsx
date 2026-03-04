"use client";

import { useState, useEffect, useRef } from "react";
import { Message } from "@/types";
import { sendMessage } from "@/lib/api";
import MessageBubble from "@/components/chat/MessageBubble";
import TypingIndicator from "@/components/chat/TypingIndicator";
import InputBar from "@/components/chat/InputBar";
import Navbar from "@/components/Navbar";
import { PhoneOff, CheckCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5267";

let counter = 0;
function newId() {
  counter += 1;
  return `msg-${counter}`;
}

export default function ChatPage() {
  const [messages, setMessages]     = useState<Message[]>([]);
  const [sessionId, setSessionId]   = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [mounted, setMounted]       = useState(false);
  const [ended, setEnded]           = useState(false);
  const [ending, setEnding]         = useState(false);
  const bottomRef                   = useRef<HTMLDivElement>(null);

  // Interviewer details from localStorage
  const [interviewerName, setInterviewerName] = useState<string | null>(null);
  const [companyName, setCompanyName]         = useState<string | null>(null);

  useEffect(() => {
    const sid = `session-${Date.now()}`;
    setSessionId(sid);
    setMounted(true);

    const name    = localStorage.getItem("ib_interviewer_name");
    const company = localStorage.getItem("ib_company_name");
    setInterviewerName(name);
    setCompanyName(company);

    const greeting = name && company
      ? `Hello ${name}!. I'm Sanath's interview assistant — go ahead and ask me anything about his experience, skills, or background.`
      : "Hello! I'm Sanath's interview assistant. Ask me anything about his experience, skills, or background.";

    setMessages([{
      id: "welcome",
      role: "bot",
      text: greeting,
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  // Once sessionId is set, patch the session with interviewer details
  useEffect(() => {
    if (!sessionId || !interviewerName) return;
    fetch(`${API_URL}/api/sessions/${sessionId}/details`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interviewerName,
        companyName,
      }),
    }).catch(() => {}); // fire and forget — don't block chat
  }, [sessionId, interviewerName, companyName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (ended) return;

    const interviewerMsg: Message = {
      id: newId(),
      role: "interviewer",
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, interviewerMsg]);
    setIsLoading(true);

    try {
      const response = await sendMessage({ sessionId, message: text });
      setMessages(prev => [...prev, {
        id: newId(),
        role: "bot",
        text: response.answer,
        answerSource: response.answerSource as Message["answerSource"],
        confidenceScore: response.confidenceScore,
        sources: response.sources,
        timestamp: new Date().toISOString(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: newId(),
        role: "bot",
        text: "Sorry, I encountered an error. Please check the API is running.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (ending || ended) return;
    setEnding(true);

    try {
      await fetch(`${API_URL}/api/sessions/${sessionId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // still show thank you even if API fails
    }

    setEnded(true);
    setEnding(false);
  };

  if (!mounted) return null;

  // ── THANK YOU SCREEN ──────────────────────────────────────────
  if (ended) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center
                          justify-center mb-6">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Interview Ended
          </h2>
          {companyName && interviewerName ? (
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-1">
              Thank you <span className="font-medium text-gray-700">{interviewerName}</span> from{" "}
              <span className="font-medium text-gray-700">{companyName}</span>!
            </p>
          ) : (
            <p className="text-sm text-gray-500 mb-1">Thank you!</p>
          )}
          <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
            It was a pleasure. Sanath will follow up with you shortly.
          </p>
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-2xl bg-gray-900 text-white
                         text-sm font-medium hover:bg-gray-800 transition-colors">
              New Session
            </button>
            <a href="/"
              className="px-5 py-2.5 rounded-2xl border border-gray-200
                         text-sm font-medium text-gray-600
                         hover:border-gray-300 transition-colors">
              Go Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── CHAT SCREEN ───────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-gray-50">

      <Navbar />

      {/* Session sub-header */}
      <div className="bg-white border-b border-gray-100 px-4 py-2
                      flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-700">Sanath Kumar J S</p>
          <p className="text-xs text-gray-400 hidden sm:block">
            Lead Software Engineer · Interview Assistant
            {companyName && ` · ${companyName}`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6
                      pb-24">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <InputBar onSend={handleSend} disabled={isLoading || ended} />

      {/* Floating End Session button */}
      <div className="fixed bottom-24 right-4 sm:right-6 z-20">
        <button
          onClick={handleEndSession}
          disabled={ending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl
                     bg-red-50 border border-red-100 text-red-500
                     text-xs font-medium shadow-sm
                     hover:bg-red-100 hover:border-red-200
                     transition-all disabled:opacity-50">
          <PhoneOff size={13} />
          {ending ? "Ending..." : "End Session"}
        </button>
      </div>
    </div>
  );
}