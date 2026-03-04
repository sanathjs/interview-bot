"use client";

import { useState, useRef } from "react";
import { Message } from "@/types";
import { Brain, User, AlertCircle, Play, Square } from "lucide-react";

type PlayState = "idle" | "playing";

interface Props {
  message: Message;
}

function RenderText({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap leading-relaxed">
      {text.split("\n").map((line, i) => {
        if (line === "") return <div key={i} className="h-2" />;
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <div key={i}>
            {parts.map((part, j) =>
              j % 2 === 1
                ? <strong key={j} className="font-semibold">{part}</strong>
                : <span key={j}>{part}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PlayButton({ text, isBot }: { text: string; isBot: boolean }) {
  const [state, setState] = useState<PlayState>("idle");
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = () => {
    window.speechSynthesis.cancel();
    setState("idle");
  };

  const play = () => {
    if (state === "playing") { stop(); return; }

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      /david|mark|daniel|aaron|rishi|google uk english male/i.test(v.name)
    ) ?? voices.find(v => v.lang.startsWith("en")) ?? null;

    const utt    = new SpeechSynthesisUtterance(text);
    utt.voice    = preferred;
    utt.rate     = 0.95;
    utt.pitch    = 0.9;
    utt.volume   = 1;
    utt.onend    = () => setState("idle");
    utt.onerror  = () => setState("idle");

    uttRef.current = utt;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
    setState("playing");
  };

  const base = "flex-shrink-0 w-6 h-6 rounded-full flex items-center \
justify-center transition-colors";
  const cls = isBot
    ? `${base} text-gray-400 hover:text-gray-600 hover:bg-gray-100`
    : `${base} text-gray-300 hover:text-white hover:bg-white/20`;

  return (
    <button onClick={play} className={cls} title="Read aloud">
      {state === "playing" ? <Square size={11} /> : <Play size={11} />}
    </button>
  );
}

export default function MessageBubble({ message }: Props) {
  const isBot        = message.role === "bot";
  const isUnanswered = message.answerSource === "unanswered";
  const isFallback   = message.answerSource === "fallback_ai";

  return (
    <div className={`flex gap-2 sm:gap-3 ${isBot ? "justify-start" : "justify-end"}`}>

      {/* Bot avatar — hidden on very small screens */}
      {isBot && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100
                        border border-gray-200 flex items-center justify-center
                        flex-shrink-0 mt-1">
          <Brain size={14} className="text-gray-500" />
        </div>
      )}

      {/* Content */}
      <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col gap-1
                       ${isBot ? "items-start" : "items-end"}`}>

        {/* Bubble */}
        <div className={`px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl text-sm
          ${isBot
            ? isUnanswered
              ? "bg-amber-50 border border-amber-200 text-amber-900"
              : isFallback
              ? "bg-blue-50 border border-blue-200 text-blue-900"
              : "bg-white border border-gray-200 text-gray-800"
            : "bg-gray-900 text-white"
          }`}>

          {isUnanswered && (
            <div className="flex items-center gap-1 mb-2">
              <AlertCircle size={13} className="text-amber-500 flex-shrink-0" />
              <span className="text-xs font-medium text-amber-600">
                Not in knowledge base — stored 📝
              </span>
            </div>
          )}

          {isFallback && (
            <div className="flex items-center gap-1 mb-2">
              <Brain size={13} className="text-blue-500 flex-shrink-0" />
              <span className="text-xs font-medium text-blue-600">
                AI-assisted answer
              </span>
            </div>
          )}

          <RenderText text={message.text} />

          <div className={`flex mt-2 ${isBot ? "justify-end" : "justify-start"}`}>
            <PlayButton text={message.text} isBot={isBot} />
          </div>
        </div>

        {/* Sources — wrap on mobile */}
        {isBot && message.sources?.length > 0 && !isUnanswered && (
          <div className="flex flex-wrap gap-1 px-1">
            {message.sources.map((s, i) => (
              <span key={i}
                className="text-xs text-gray-400 bg-gray-50 border
                           border-gray-100 rounded-full px-2 py-0.5">
                {s.sourceFile.replace(".md", "")}
                <span className="hidden sm:inline"> · {s.sectionTitle}</span>
              </span>
            ))}
          </div>
        )}

        {/* Confidence */}
        {isBot && message.confidenceScore !== undefined && !isUnanswered && (
          <div className="px-1">
            <span className={`text-xs ${
              message.confidenceScore >= 0.65 ? "text-green-500"
              : message.confidenceScore >= 0.55 ? "text-amber-500"
              : "text-red-400"
            }`}>
              {Math.round(message.confidenceScore * 100)}% confidence
            </span>
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-gray-300 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit", minute: "2-digit",
          })}
        </span>
      </div>

      {/* Interviewer avatar */}
      {!isBot && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-900
                        flex items-center justify-center flex-shrink-0 mt-1">
          <User size={14} className="text-white" />
        </div>
      )}
    </div>
  );
}