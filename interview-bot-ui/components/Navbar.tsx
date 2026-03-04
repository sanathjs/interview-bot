"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, MessageSquare, Brain, History, LogOut } from "lucide-react";

const adminLinks = [
  { href: "/chat",     icon: MessageSquare, label: "Chat"     },
  { href: "/sessions", icon: History,       label: "Sessions" },
  { href: "/prep",     icon: Brain,         label: "Prep"     },
];

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();

  const isAdmin =
    typeof window !== "undefined" &&
    localStorage.getItem("ib_role") === "admin";

  const handleExit = () => {
    localStorage.removeItem("ib_role");
    localStorage.removeItem("ib_interviewer_name");
    localStorage.removeItem("ib_company_name");
    router.push("/");
  };

  return (
    <nav className="bg-white border-b border-gray-100 px-4 py-3
                    flex items-center justify-between sticky top-0 z-10">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center">
          <Bot size={14} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-900 hidden sm:block">
          Interview Bot
        </span>
      </Link>

      {/* Admin nav links */}
      {isAdmin && (
        <div className="flex items-center gap-1">
          {adminLinks.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                         text-xs font-medium transition-colors
                         ${pathname === href
                           ? "bg-gray-900 text-white"
                           : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                         }`}>
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Exit button */}
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 text-xs text-gray-400
                   hover:text-gray-600 transition-colors px-2 py-1.5
                   rounded-xl hover:bg-gray-50">
        <LogOut size={13} />
        <span className="hidden sm:inline">Exit</span>
      </button>
    </nav>
  );
}