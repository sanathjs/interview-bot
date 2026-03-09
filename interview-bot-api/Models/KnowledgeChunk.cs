namespace interview_bot_api.Models;

public class KnowledgeChunk
{
    public int Id { get; set; }
    public string SourceFile { get; set; } = string.Empty;
    public string? SectionTitle { get; set; }
    public string ChunkText { get; set; } = string.Empty;
    public int ChunkIndex { get; set; }
    public string?   Topic          { get; set; }
    public string[]? Tags           { get; set; }

    // ── NEW: dual embedding + question augmentation ──────────────────
    // title_embedding:     embedding of section heading alone
    // questions_text:      5 AI-generated question variants (stored for inspection)
    // questions_embedding: single embedding of all 5 questions joined
    // title_word_count:    word count of heading (drives adaptive weight)
    public float[]?  TitleEmbedding     { get; set; }
    public string[]? QuestionsText      { get; set; }
    public float[]?  QuestionsEmbedding { get; set; }
    public int       TitleWordCount     { get; set; }
}

public class IngestionResult
{
    public int FilesProcessed { get; set; }
    public int ChunksCreated { get; set; }
    public List<string> FilesIngested { get; set; } = new();
    public List<string> Errors { get; set; } = new();
}