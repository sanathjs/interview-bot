export interface Message {
  id: string;
  role: "interviewer" | "bot";
  text: string;
  answerSource?: "knowledge_base" | "unanswered" | "fallback_ai";
  confidenceScore?: number;
  sources?: SourceChunk[];
  timestamp: string;
}

export interface SourceChunk {
  sourceFile: string;
  sectionTitle: string;
  similarity: number;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
  useFallback?: boolean;
}

export interface ChatResponse {
  answer: string;
  answerSource: string;
  confidenceScore: number;
  sources: SourceChunk[];
  usedFallback: boolean;
  sessionId: string;
}