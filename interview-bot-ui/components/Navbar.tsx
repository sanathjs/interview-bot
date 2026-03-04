"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const C = {
  bg:     "rgba(13,13,15,0.92)",
  border: "rgba(255,255,255,0.06)",
  text:   "#e8e8ef",
  muted:  "#6b6b7d",
  amber:  "#f59e0b",
  amberBg: "rgba(245,158,11,0.12)",
  amberBorder: "rgba(245,158,11,0.25)",
  hover:  "#1c1c21",
};

const adminLinks = [
  {
    href: "/chat", label: "Chat",
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>,
  },
  {
    href: "/sessions", label: "Sessions",
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>,
  },
  {
    href: "/prep", label: "Prep",
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>,
  },
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
    localStorage.removeItem("ib_round_type");
    router.push("/");
  };

  return (
    <nav style={{
      padding: "10px 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "sticky", top: 0, zIndex: 20,
      background: C.bg,
      borderBottom: `1px solid ${C.border}`,
      backdropFilter: "blur(12px)",
      flexShrink: 0,
    }}>

      {/* Logo */}
      <Link href="/" style={{
        display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 12px rgba(245,158,11,0.3)",
          flexShrink: 0,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="white"/>
          </svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
          Interview Bot
        </span>
      </Link>

      {/* Admin nav links */}
      {isAdmin && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {adminLinks.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 10, textDecoration: "none",
                fontSize: 12, fontWeight: 500,
                background: active ? C.amberBg : "transparent",
                border: `1px solid ${active ? C.amberBorder : "transparent"}`,
                color: active ? C.amber : C.muted,
                transition: "all 0.15s",
              }}>
                {icon}
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Exit */}
      <button onClick={handleExit} style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 10, cursor: "pointer",
        background: "none", border: "none",
        color: C.muted, fontSize: 12, fontFamily: "inherit",
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span>Exit</span>
      </button>
    </nav>
  );
}