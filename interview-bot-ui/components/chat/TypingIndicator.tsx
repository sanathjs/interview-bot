export default function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200
                      flex items-center justify-center flex-shrink-0">
        <span className="text-xs">🤖</span>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
               style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
               style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
               style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}