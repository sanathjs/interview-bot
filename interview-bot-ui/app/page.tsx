import Link from "next/link";
import { MessageSquare, Brain, History, ChevronRight, Bot } from "lucide-react";

const routes = [
  {
    href: "/chat",
    icon: MessageSquare,
    label: "Interview Chat",
    description: "Start or continue a live interview session",
    accent: "bg-gray-900 text-white",
    iconBg: "bg-white/10",
  },
  {
    href: "/prep",
    icon: Brain,
    label: "Prep Dashboard",
    description: "Review unanswered questions and build your knowledge base",
    accent: "bg-white border border-gray-200 text-gray-900",
    iconBg: "bg-gray-100",
  },
  {
    href: "/sessions",
    icon: History,
    label: "Session History",
    description: "Browse past interviews and read full transcripts",
    accent: "bg-white border border-gray-200 text-gray-900",
    iconBg: "bg-gray-100",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-900
                          flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900">
            Interview Bot
          </span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Hey, Sanath 👋
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed max-w-md">
            Your AI-powered interview assistant. Start a session, review
            what you missed, or read back through past interviews.
          </p>
        </div>

        {/* Route cards */}
        <div className="flex flex-col gap-3">
          {routes.map(({ href, icon: Icon, label, description, accent, iconBg }) => (
            <Link key={href} href={href}
              className={`group flex items-center gap-4 px-5 py-4
                         rounded-2xl transition-all hover:shadow-sm
                         hover:scale-[1.01] ${accent}`}>

              <div className={`w-10 h-10 rounded-xl flex items-center
                               justify-center flex-shrink-0 ${iconBg}`}>
                <Icon size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{label}</p>
                <p className={`text-xs mt-0.5 truncate
                  ${accent.includes("gray-900") && !accent.includes("border")
                    ? "text-gray-400"
                    : "text-gray-500"}`}>
                  {description}
                </p>
              </div>

              <ChevronRight size={16}
                className="flex-shrink-0 opacity-40
                           group-hover:opacity-70 transition-opacity" />
            </Link>
          ))}
        </div>

        {/* Quick stats strip — purely decorative, wires up naturally */}
        <div className="grid grid-cols-3 gap-3 mt-8">
          {[
            { label: "Knowledge Base", value: "13 files" },
            { label: "KB Chunks",      value: "70 chunks" },
            { label: "LLM",            value: "Groq · Llama 3" },
          ].map(({ label, value }) => (
            <div key={label}
                 className="bg-white border border-gray-200 rounded-2xl
                            px-4 py-3 text-center">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-sm font-semibold text-gray-800">{value}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center text-xs text-gray-300 py-6">
        Built by Sanath Kumar J S · {new Date().getFullYear()}
      </footer>
    </div>
  );
}