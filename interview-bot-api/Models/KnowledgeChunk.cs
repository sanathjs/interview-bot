namespace interview_bot_api.Models;

public class KnowledgeChunk
{
    public int Id { get; set; }
    public string SourceFile { get; set; } = string.Empty;
    public string? SectionTitle { get; set; }
    public string ChunkText { get; set; } = string.Empty;
    public int ChunkIndex { get; set; }
    public string?   Topic        { get; set; }
    public string[]? Tags         { get; set; }
}

public class IngestionResult
{
    public int FilesProcessed { get; set; }
    public int ChunksCreated { get; set; }
    public List<string> FilesIngested { get; set; } = new();
    public List<string> Errors { get; set; } = new();
}