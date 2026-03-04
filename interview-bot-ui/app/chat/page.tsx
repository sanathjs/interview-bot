"use client";

import { useState, useEffect, useRef } from "react";
import { Message } from "@/types";
import { sendMessage } from "@/lib/api";
import MessageBubble from "@/components/chat/MessageBubble";
import TypingIndicator from "@/components/chat/TypingIndicator";
import InputBar from "@/components/chat/InputBar";
import Navbar from "@/components/Navbar";
import { RefreshCw } from "lucide-react";

let counter = 0;
function newId() {
  counter += 1;
  return `msg-${counter}`;
}

export default function ChatPage() {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [sessionId]               = useState(`session-${Date.now()}`);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted]     = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setMessages([{
      id: "welcome",
      role: "bot",
      text: "Hello! I'm Sanath's interview assistant. Ask me anything about his experience, skills, or background.",
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
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
        text: "Sorry, I encountered an error. Please check the API is running on port 5267.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* Shared navbar */}
      <Navbar />

      {/* Session sub-header */}
      <div className="bg-white border-b border-gray-100 px-4 py-2
                      flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-700">Sanath Kumar J S</p>
          <p className="text-xs text-gray-400 hidden sm:block">
            Lead Software Engineer · Interview Assistant
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 text-xs text-gray-400
                     hover:text-gray-600 transition-colors px-2 py-1
                     rounded-lg hover:bg-gray-50">
          <RefreshCw size={12} />
          <span className="hidden sm:inline">New Session</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <InputBar onSend={handleSend} disabled={isLoading} />
    </div>
  );
}