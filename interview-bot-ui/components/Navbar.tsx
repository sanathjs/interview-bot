"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Brain, History, Bot } from "lucide-react";

const links = [
  { href: "/chat",     icon: MessageSquare, label: "Chat"     },
  { href: "/prep",     icon: Brain,         label: "Prep"     },
  { href: "/sessions", icon: History,       label: "Sessions" },
];

export default function Navbar() {
  const path = usePathname();

  return (
    <header className="bg-white border-b border-gray-100 px-4 sm:px-6
                       py-3 flex items-center justify-between
                       sticky top-0 z-20">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 group">
        <div className="w-7 h-7 rounded-full bg-gray-900
                        flex items-center justify-center">
          <Bot size={14} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-900
                         group-hover:text-gray-600 transition-colors
                         hidden sm:block">
          Interview Bot
        </span>
      </Link>

      {/* Nav — icon only on mobile, icon+label on sm+ */}
      <nav className="flex items-center gap-1">
        {links.map(({ href, icon: Icon, label }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3
                         py-1.5 rounded-xl text-xs font-medium
                         transition-colors
                         ${active
                           ? "bg-gray-900 text-white"
                           : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                         }`}>
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}