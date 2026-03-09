// ─────────────────────────────────────────────────────────────────────────────
// Services/ChunkMetadataHelper.cs  —  FIXED VERSION
// Key changes:
//   1. Topic-based tag injection per file — career chunks always get "career"
//      tag, leadership chunks always get "leadership" tag, etc.
//   2. Introduction chunks always get "yourself","introduce","background" tags
//   3. IsExcludedFromSearch() — answering-guidelines.md never returned
//   4. ExtractTags() signature updated to accept sourceFile
// ─────────────────────────────────────────────────────────────────────────────

namespace interview_bot_api.Services;

public static class ChunkMetadataHelper
{
    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "what","the","is","are","was","were","and","or","in","of",
        "to","for","a","an","be","been","have","has","had","do",
        "does","did","how","why","when","where","which","who",
        "that","this","these","those","with","from","by","on",
        "at","its","it","you","your","we","our","they","their",
        "can","could","would","should","will","not","but","any",
        "all","use","used","using","between","difference","about",
        "give","example","explain","tell","me","please","define",
    };

    /// <summary>
    /// Files that should NEVER be returned by the search engine.
    /// answering-guidelines.md is internal instructions, not interview answers.
    /// </summary>
    public static bool IsExcludedFromSearch(string sourceFile)
    {
        var f = sourceFile.ToLower();
        return f.Contains("answering-guidelines");
    }

    public static string ExtractTopic(string sourceFile)
        => Path.GetFileNameWithoutExtension(sourceFile).ToLower();

    /// <summary>
    /// Extracts keyword tags from heading + body + injects file-level semantic tags.
    /// The file-level injection ensures chunks are always findable for their topic,
    /// regardless of how the section heading is worded.
    /// </summary>
    public static string[] ExtractTags(string sectionTitle, string chunkBody, string sourceFile)
    {
        var file = Path.GetFileNameWithoutExtension(sourceFile).ToLower();

        var firstLine = chunkBody.Split('\n').FirstOrDefault() ?? "";
        var source    = $"{sectionTitle} {firstLine}";

        var tags = source
            .ToLower()
            .Replace("c#", "csharp")
            .Replace(".net", "dotnet")
            .Split(new[] { ' ', '?', '.', ',', '(', ')', '/', '\'', '"', ':', ';', '!', '\u2014', '-' },
                   StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 1)
            .Where(w => !StopWords.Contains(w))
            .Where(w => !w.All(char.IsDigit))
            .Distinct()
            .ToList();

        // ── File-level semantic tag injection ────────────────────────────────
        // Each file gets a guaranteed set of tags so that common question
        // phrasings always route to the right file, even when the heading
        // wording doesn't contain the exact keyword.

        if (file.Contains("career-journey"))
            tags.AddRange(new[] { "career", "journey", "history", "companies", "worked", "previous", "walk" });

        if (file.Contains("introduction"))
            tags.AddRange(new[] { "yourself", "introduce", "introduction", "background", "profile", "summary", "about" });

        if (file.Contains("leadership"))
            tags.AddRange(new[] { "leadership", "led", "managed", "team", "mentored", "lead", "mentor" });

        if (file.Contains("general-hr"))
            tags.AddRange(new[] { "strengths", "weakness", "goals", "motivation", "salary", "notice", "hr", "yourself" });

        if (file.Contains("recent-project"))
            tags.AddRange(new[] { "recent", "project", "keen", "ingenio", "built", "projects", "current" });

        if (file.Contains("ai-rag"))
            tags.AddRange(new[] { "rag", "ai", "vector", "embedding", "llm", "semantic", "search", "pgvector", "retrieval" });

        if (file.Contains("challenges"))
            tags.AddRange(new[] { "challenge", "difficult", "problem", "obstacle", "conflict", "tough", "hard" });

        if (file.Contains("dotnet") || file.Contains("dotnet-interview"))
            tags.AddRange(new[] { "dotnet", "csharp", "net", "aspnet", "dotnetcore" });

        if (file.Contains("my-approach") || file.Contains("system-design"))
            tags.AddRange(new[] { "design", "system", "architecture", "scale", "approach", "url", "shortener", "notification", "rate", "limiter", "chat" });

        return tags
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(30)
            .ToArray();
    }
}