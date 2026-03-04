namespace interview_bot_api.Models;

public class ChatRequest
{
    public string SessionId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool UseFallback { get; set; } = false;
    public string? RoundType { get; set; }  
    public List<ConversationTurn> History { get; set; } = new(); 
}

public class ChatResponse
{
    public string Answer { get; set; } = string.Empty;
    public string AnswerSource { get; set; } = string.Empty;
    public double ConfidenceScore { get; set; }
    public List<SourceChunk> Sources { get; set; } = new();
    public List<string> FollowUps { get; set; } = new(); 
    public bool UsedFallback { get; set; } = false;
    public string SessionId { get; set; } = string.Empty;
}

public class SourceChunk
{
    public string SourceFile { get; set; } = string.Empty;
    public string SectionTitle { get; set; } = string.Empty;
    public double Similarity { get; set; }
}

public class SearchResult
{
    public int ChunkId { get; set; }
    public string SourceFile { get; set; } = string.Empty;
    public string SectionTitle { get; set; } = string.Empty;
    public string ChunkText { get; set; } = string.Empty;
    public double Similarity { get; set; }
}

public class SaveAnswerRequest
{
    public string Answer { get; set; } = string.Empty;
}

public class MessageFeedbackRequest                           // ← ADD THIS
{
    public bool Helpful       { get; set; }
    public string SessionCode { get; set; } = "";
}

public class UpdateSessionDetailsRequest
{
    public string? InterviewerName { get; set; }
    public string? CompanyName     { get; set; }
}

public class ConversationTurn
{
    public string Role { get; set; } = string.Empty;  // "interviewer" or "bot"
    public string Text { get; set; } = string.Empty;
}