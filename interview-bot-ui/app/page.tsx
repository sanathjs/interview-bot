"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Lock, User, ChevronRight, Eye, EyeOff } from "lucide-react";

const PREP_PIN = process.env.NEXT_PUBLIC_PREP_PIN || "1234";

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<"choose" | "pin" | "interviewer">("choose");

  // PIN flow
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [showPin, setShowPin] = useState(false);

  // Interviewer flow
  const [interviewerName, setInterviewerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [interviewerError, setInterviewerError] = useState("");

  const handlePinSubmit = () => {
    if (pin === PREP_PIN) {
      localStorage.setItem("ib_role", "admin");
      router.push("/chat");
    } else {
      setPinError("Incorrect PIN. Try again.");
      setPin("");
    }
  };

  const handleInterviewerSubmit = () => {
    if (!interviewerName.trim()) {
      setInterviewerError("Please enter your name.");
      return;
    }
    if (!companyName.trim()) {
      setInterviewerError("Please enter your company name.");
      return;
    }
    localStorage.setItem("ib_role", "interviewer");
    localStorage.setItem("ib_interviewer_name", interviewerName.trim());
    localStorage.setItem("ib_company_name", companyName.trim());
    router.push("/chat");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center">
          <Bot size={20} className="text-white" />
        </div>
        <span className="text-base font-semibold text-gray-900">Interview Bot</span>
      </div>

      <div className="w-full max-w-sm">

        {/* ── STEP: CHOOSE ROLE ── */}
        {step === "choose" && (
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
            <h1 className="text-lg font-semibold text-gray-900 mb-1">Welcome</h1>
            <p className="text-sm text-gray-400 mb-8">Who are you today?</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setStep("interviewer")}
                className="group flex items-center gap-4 px-5 py-4 rounded-2xl
                           bg-gray-900 text-white hover:bg-gray-800
                           transition-all hover:scale-[1.01]">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <User size={17} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">I'm an Interviewer</p>
                  <p className="text-xs text-gray-400 mt-0.5">Start a new interview session</p>
                </div>
                <ChevronRight size={15} className="opacity-40 group-hover:opacity-70 transition-opacity" />
              </button>

              <button
                onClick={() => setStep("pin")}
                className="group flex items-center gap-4 px-5 py-4 rounded-2xl
                           bg-white border border-gray-200 text-gray-900
                           hover:border-gray-300 hover:shadow-sm
                           transition-all hover:scale-[1.01]">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Lock size={17} className="text-gray-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">I'm Sanath</p>
                  <p className="text-xs text-gray-500 mt-0.5">Admin access with PIN</p>
                </div>
                <ChevronRight size={15} className="opacity-40 group-hover:opacity-70 transition-opacity" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: PIN ── */}
        {step === "pin" && (
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
            <button
              onClick={() => { setStep("choose"); setPin(""); setPinError(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1">
              ← Back
            </button>
            <h1 className="text-lg font-semibold text-gray-900 mb-1">Admin Access</h1>
            <p className="text-sm text-gray-400 mb-8">Enter your PIN to continue</p>

            <div className="flex flex-col gap-4">
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={e => { setPin(e.target.value); setPinError(""); }}
                  onKeyDown={e => e.key === "Enter" && handlePinSubmit()}
                  placeholder="Enter PIN"
                  className="w-full px-4 py-3 pr-10 rounded-2xl border border-gray-200
                             text-sm text-gray-900 placeholder-gray-400
                             focus:outline-none focus:border-gray-400 transition-colors"
                  autoFocus
                />
                <button
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {pinError && (
                <p className="text-xs text-red-500">{pinError}</p>
              )}

              <button
                onClick={handlePinSubmit}
                disabled={!pin}
                className="w-full py-3 rounded-2xl bg-gray-900 text-white text-sm font-medium
                           hover:bg-gray-800 transition-colors disabled:opacity-40
                           disabled:cursor-not-allowed">
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: INTERVIEWER DETAILS ── */}
        {step === "interviewer" && (
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
            <button
              onClick={() => { setStep("choose"); setInterviewerError(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1">
              ← Back
            </button>
            <h1 className="text-lg font-semibold text-gray-900 mb-1">Before we start</h1>
            <p className="text-sm text-gray-400 mb-8">Tell us a bit about yourself</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                  Your Name
                </label>
                <input
                  type="text"
                  value={interviewerName}
                  onChange={e => { setInterviewerName(e.target.value); setInterviewerError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleInterviewerSubmit()}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200
                             text-sm text-gray-900 placeholder-gray-400
                             focus:outline-none focus:border-gray-400 transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                  Company
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => { setCompanyName(e.target.value); setInterviewerError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleInterviewerSubmit()}
                  placeholder="e.g. Google"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200
                             text-sm text-gray-900 placeholder-gray-400
                             focus:outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              {interviewerError && (
                <p className="text-xs text-red-500">{interviewerError}</p>
              )}

              <button
                onClick={handleInterviewerSubmit}
                disabled={!interviewerName.trim() || !companyName.trim()}
                className="w-full py-3 rounded-2xl bg-gray-900 text-white text-sm font-medium
                           hover:bg-gray-800 transition-colors disabled:opacity-40
                           disabled:cursor-not-allowed mt-2">
                Start Interview
              </button>
            </div>
          </div>
        )}

      </div>

      <p className="text-xs text-gray-300 mt-10">
        Built by Sanath Kumar J S · {new Date().getFullYear()}
      </p>
    </div>
  );
}