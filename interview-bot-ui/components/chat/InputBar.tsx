"use client";

import { useState, useRef, KeyboardEvent } from "react";

const C = {
  bg:     "#141417",
  border: "#32323c",
  borderFocus: "#f59e0b",
  text:   "#e8e8ef",
  muted:  "#6b6b7d",
  amber:  "#f59e0b",
};

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
}

type MicState = "idle" | "recording" | "transcribing";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5267";

export default function InputBar({ onSend, disabled }: Props) {
  const [input, setInput]       = useState("");
  const [micState, setMicState] = useState<MicState>("idle");
  const [micError, setMicError] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => { stream.getTracks().forEach(t => t.stop()); await transcribeAudio(mimeType); };
      recorder.start();
      setMicState("recording");
    } catch {
      setMicError("Microphone access denied.");
      setMicState("idle");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      setMicState("transcribing");
      mediaRecorderRef.current.stop();
    }
  };

  const transcribeAudio = async (mimeType: string) => {
    try {
      const ext  = mimeType.includes("ogg") ? "ogg" : "webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const form = new FormData();
      form.append("audio", blob, `recording.${ext}`);
      const res  = await fetch(`${API_URL}/api/transcribe`, { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const text = (data.text ?? "").trim();
      if (text) onSend(text);
      else setMicError("No speech detected.");
    } catch {
      setMicError("Transcription failed.");
    } finally {
      setMicState("idle");
      chunksRef.current = [];
    }
  };

  const handleMicClick = () => {
    if (disabled) return;
    if (micState === "idle")      startRecording();
    if (micState === "recording") stopRecording();
  };

  const isRecording    = micState === "recording";
  const isTranscribing = micState === "transcribing";
  const canSend        = !!input.trim() && !disabled && micState === "idle";

  return (
    <div style={{
      padding: "10px 12px 10px",
      background: "#141417",
    }}>
      {/* Error / hint row */}
      {(micError || isRecording) && (
        <p style={{
          textAlign: "center", fontSize: 11, marginBottom: 6,
          color: micError ? "#f87171" : C.amber,
        }}>
          {micError || "🎙 Listening... tap stop when done"}
        </p>
      )}

      {/* WhatsApp-style row: input + mic + send */}
      <div style={{
        display: "flex", gap: 8, alignItems: "flex-end",
        maxWidth: 720, margin: "0 auto",
      }}>
        {/* Input pill — auto-grows, max 5 lines */}
        <div style={{
          flex: 1, display: "flex", alignItems: "flex-end",
          background: "#1c1c21",
          border: `1px solid ${isRecording ? C.amber : inputFocused ? C.amber : C.border}`,
          borderRadius: 22, padding: "0 4px 0 14px",
          transition: "border-color 0.2s",
          boxShadow: inputFocused ? "0 0 0 3px rgba(245,158,11,0.08)" : "none",
          minHeight: 44,
        }}>
          <textarea
            value={input}
            onChange={e => {
              setInput(e.target.value);
              // Auto-grow
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            disabled={disabled || micState !== "idle"}
            placeholder={
              isRecording    ? "🎙 Listening..." :
              isTranscribing ? "Transcribing..." :
              "Ask a question..."
            }
            rows={1}
            style={{
              flex: 1, resize: "none", border: "none", outline: "none",
              background: "transparent", color: C.text,
              fontSize: 15, lineHeight: 1.45, fontFamily: "inherit",
              padding: "11px 0", minHeight: 44,
              maxHeight: 120, overflowY: "auto",
              // Prevent iOS zoom on focus (needs font-size >= 16 or this)
              WebkitTextSizeAdjust: "100%",
            } as React.CSSProperties}
          />
        </div>

        {/* Mic button — circular */}
        <button onClick={handleMicClick} disabled={disabled || isTranscribing}
          style={{
            width: 44, height: 44, borderRadius: "50%", border: "none",
            cursor: disabled || isTranscribing ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            background: isRecording ? "rgba(245,158,11,0.15)" : "#1c1c21",
            outline: `1px solid ${isRecording ? "rgba(245,158,11,0.5)" : C.border}`,
            color: isRecording ? C.amber : isTranscribing ? "#4a4a58" : "#9292a4",
            transition: "all 0.2s",
            boxShadow: isRecording ? "0 0 12px rgba(245,158,11,0.2)" : "none",
          }}>
          {isTranscribing ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                 style={{ animation: "spin 1s linear infinite" }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"
                      strokeDasharray="31.4" strokeDashoffset="10"/>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </svg>
          ) : isRecording ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" strokeWidth="2"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>

        {/* Send button — circular amber */}
        <button onClick={handleSend} disabled={!canSend}
          style={{
            width: 44, height: 44, borderRadius: "50%", border: "none",
            cursor: canSend ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            background: canSend ? "linear-gradient(135deg, #f59e0b, #d97706)" : "#1c1c21",
            outline: `1px solid ${canSend ? "transparent" : C.border}`,
            opacity: canSend ? 1 : 0.35,
            boxShadow: canSend ? "0 0 16px rgba(245,158,11,0.35)" : "none",
            transition: "all 0.2s",
          }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <line x1="22" y1="2" x2="11" y2="13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white"/>
          </svg>
        </button>
      </div>
    </div>
  );
}