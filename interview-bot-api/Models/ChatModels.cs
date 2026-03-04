namespace interview_bot_api.Models;

public class ChatRequest
{
    public string SessionId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool UseFallback { get; set; } = false;
}

public class ChatResponse
{
    public string Answer { get; set; } = string.Empty;
    public string AnswerSource { get; set; } = string.Empty;
    public double ConfidenceScore { get; set; }
    public List<SourceChunk> Sources { get; set; } = new();
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