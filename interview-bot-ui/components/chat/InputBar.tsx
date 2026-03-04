"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send, Mic, MicOff, Loader2 } from "lucide-react";

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        await transcribeAudio(mimeType);
      };

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

      const res = await fetch(`${API_URL}/api/transcribe`, {
        method: "POST", body: form,
      });
      if (!res.ok) throw new Error();

      const data = await res.json();
      const text = (data.text ?? "").trim();
      if (text) onSend(text);
      else setMicError("No speech detected. Try again.");
    } catch {
      setMicError("Transcription failed. Try again.");
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

  const micButton = () => {
    if (micState === "transcribing") return (
      <button disabled
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gray-100
                   text-gray-400 flex items-center justify-center
                   flex-shrink-0 cursor-not-allowed">
        <Loader2 size={15} className="animate-spin" />
      </button>
    );
    if (micState === "recording") return (
      <button onClick={handleMicClick}
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-red-500
                   text-white flex items-center justify-center
                   flex-shrink-0 hover:bg-red-600 animate-pulse
                   transition-colors">
        <MicOff size={15} />
      </button>
    );
    return (
      <button onClick={handleMicClick} disabled={disabled}
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border
                   border-gray-200 text-gray-500 flex items-center
                   justify-center flex-shrink-0 hover:border-gray-300
                   hover:text-gray-700 disabled:opacity-40
                   disabled:cursor-not-allowed transition-colors">
        <Mic size={15} />
      </button>
    );
  };

  return (
    <div className="border-t border-gray-100 bg-white px-3 sm:px-4 py-3 sm:py-4">
      <div className="flex gap-2 items-end max-w-3xl mx-auto">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || micState !== "idle"}
          placeholder={
            micState === "recording"    ? "🎙 Listening..." :
            micState === "transcribing" ? "Transcribing..." :
            "Type your question..."
          }
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200
                     px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-gray-800
                     placeholder-gray-400 focus:outline-none
                     focus:ring-2 focus:ring-gray-200
                     disabled:opacity-50 disabled:cursor-not-allowed
                     max-h-32 overflow-y-auto"
          style={{ minHeight: "42px" }}
        />
        {micButton()}
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim() || micState !== "idle"}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gray-900
                     text-white flex items-center justify-center
                     flex-shrink-0 hover:bg-gray-700 disabled:opacity-40
                     disabled:cursor-not-allowed transition-colors">
          <Send size={15} />
        </button>
      </div>

      {micError ? (
        <p className="text-center text-xs text-red-400 mt-2">{micError}</p>
      ) : (
        <p className="text-center text-xs text-gray-300 mt-1.5 hidden sm:block">
          {micState === "recording"
            ? "Click mic again to stop"
            : "Enter to send · Shift+Enter for new line · 🎙 for voice"}
        </p>
      )}
    </div>
  );
}