export interface Message {
  id: string;
  role: "interviewer" | "bot";
  text: string;
  answerSource?: "knowledge_base" | "unanswered" | "fallback_ai" | "greeting" | "architecture";
  architectureProject?: number; // 1-5 maps to PROJECTS array
  confidenceScore?: number;
  sources?: SourceChunk[];
  followUps?: string[];
  timestamp: string;
}

export interface SourceChunk {
  sourceFile: string;
  sectionTitle: string;
  similarity: number;
}

export interface ConversationTurn {
  role: "interviewer" | "bot";
  text: string;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
  useFallback?: boolean;
  roundType?: string;
  history?: ConversationTurn[];   // ← last N turns for context
}

export interface ChatResponse {
  answer: string;
  answerSource: string;
  confidenceScore: number;
  sources: SourceChunk[];
  followUps?: string[];
  usedFallback: boolean;
  sessionId: string;
}