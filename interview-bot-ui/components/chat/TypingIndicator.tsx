export default function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "flex-start" }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: "rgba(245,158,11,0.12)",
        border: "1px solid rgba(245,158,11,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"
                fill="#f59e0b"/>
        </svg>
      </div>

      {/* Bubble */}
      <div style={{
        padding: "12px 16px", borderRadius: "16px 16px 16px 4px",
        background: "#1c1c21", border: "1px solid #32323c",
      }}>
        <div style={{ display: "flex", gap: 5, alignItems: "center", height: 16 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#f59e0b",
              animation: "typing 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}