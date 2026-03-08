using Npgsql;
using Pgvector;
using Pgvector.Npgsql;
using interview_bot_api.Models;

namespace interview_bot_api.Services;

public class KnowledgeSearchService
{
    private readonly string _connectionString;
    private readonly ILogger<KnowledgeSearchService> _logger;
    private readonly EmbeddingService _embedding;

    private const double HighConfidence = 0.65;
    private const double LowConfidence  = 0.63;

    public KnowledgeSearchService(
        IConfiguration config,
        ILogger<KnowledgeSearchService> logger,
        EmbeddingService embedding)
    {
        _logger           = logger;
        _connectionString = config["DATABASE_URL"]!;
        _embedding        = embedding;
    }

    // ================================================================
    // MAIN SEARCH
    //
    // Strategy:
    // 1. Extract keywords from the question
    // 2. TAG SEARCH — vector search filtered to chunks whose tags
    //    overlap with those keywords. If matches found → use them.
    // 3. FALLBACK — full vector search across all chunks if no tag hits.
    //    (Handles broad/personal questions: career, intro, leadership.)
    // 4. Apply file boost on fallback path only.
    // ================================================================
    public async Task<(List<SearchResult> Results, double TopScore)>
        SearchAsync(string question, int topK = 10)
    {
        var queryVector = await _embedding.GetEmbeddingAsync(question);
        if (queryVector.Length == 0)
            return (new List<SearchResult>(), 0.0);

        var queryKeywords = ExtractQueryKeywords(question);

        _logger.LogInformation(
            "--- SEARCH: '{Q}' | keywords: [{K}] ---",
            question, string.Join(", ", queryKeywords));

        List<SearchResult> results;
        bool usedTagSearch = false;

        // Broad single-technology questions like "what's your experience with .NET?"
        // extract only ["dotnet"] — no specific topic tag to match against.
        // Skip tag search for these and go straight to full search + file boost.
        var isBroadTechQuestion = queryKeywords.Count <= 1 &&
            queryKeywords.Any(k => new[] {
                "dotnet","csharp","net","java","python","react","azure",
                "aws","sql","postgres","redis","docker","kubernetes"
            }.Contains(k));

        if (queryKeywords.Count > 0 && !isBroadTechQuestion)
        {
            results = await SearchWithTagsAsync(queryVector, queryKeywords, topK);

            if (results.Count > 0)
            {
                usedTagSearch = true;
                _logger.LogInformation("--- TAG SEARCH: {Count} chunks matched ---", results.Count);
            }
            else
            {
                _logger.LogInformation("--- TAG SEARCH: no matches, falling back to full search ---");
                results = await SearchPgVectorAsync(queryVector, 15);
            }
        }
        else
        {
            if (isBroadTechQuestion)
                _logger.LogInformation("--- Broad tech question — skipping tag search, using full search ---");
            results = await SearchPgVectorAsync(queryVector, 15);
        }

        if (results.Count == 0)
            return (results, 0.0);

        // Apply file boost only on the fallback full-search path
        if (!usedTagSearch)
        {
            var questionLower = question.ToLower();
            foreach (var result in results)
            {
                var scoreBefore = result.Similarity;
                var boost       = GetFileBoost(questionLower, result.SourceFile);
                result.Similarity = Math.Min(1.0, result.Similarity + boost);

                _logger.LogInformation(
                    "  BOOST {File} | {Title} | {Before:F3}+{Boost:F3}={After:F3}",
                    result.SourceFile, result.SectionTitle,
                    scoreBefore, boost, result.Similarity);
            }
        }

        results = results
            .OrderByDescending(r => r.Similarity)
            .Take(topK)
            .ToList();

        var topScore = results[0].Similarity;

        _logger.LogInformation(
            "--- TOP: {Score:F3} | {File} | {Title} | tagSearch={Used} ---",
            topScore, results[0].SourceFile, results[0].SectionTitle, usedTagSearch);

        // ── RELEVANCE GATE ──────────────────────────────────────────────────
        // If we used full search (no tag match), verify the top result's file
        // actually belongs to the question's domain.
        // Prevents career-journey chunks from answering .NET questions, etc.
        // If the file doesn't match the domain, collapse score → unanswered.
        if (!usedTagSearch)
        {
            var expectedDomain = GetExpectedDomain(question);
            var topFile        = results[0].SourceFile.ToLower();

            if (expectedDomain != null && !topFile.Contains(expectedDomain))
            {
                _logger.LogInformation(
                    "--- RELEVANCE GATE BLOCKED: expected '{Domain}' but got '{File}' (score {Score:F3}) → unanswered ---",
                    expectedDomain, results[0].SourceFile, topScore);
                return (results, 0.0);   // forces unanswered flow
            }
        }
        // ────────────────────────────────────────────────────────────────────

        return (results, topScore);
    }

    public string GetConfidenceLevel(double score)
    {
        if (score >= HighConfidence) return "high";
        if (score >= LowConfidence)  return "medium";
        return "low";
    }

    // ================================================================
    // TAG-FILTERED VECTOR SEARCH
    //
    // Finds only chunks whose tags array overlaps (&&) with the query
    // keywords, then ranks those by vector similarity.
    //
    // "var vs dynamic" → keywords ["var","dynamic"]
    // → only chunks tagged with "var" or "dynamic" are candidates
    // → "string vs StringBuilder" chunk is never even considered
    // ================================================================
    private async Task<List<SearchResult>> SearchWithTagsAsync(
        float[] queryVector, List<string> keywords, int topK)
    {
        var results = new List<SearchResult>();
        try
        {
            var dsb = new NpgsqlDataSourceBuilder(_connectionString);
            dsb.UseVector();
            await using var ds   = dsb.Build();
            await using var conn = await ds.OpenConnectionAsync();

            var sql = @"
                SELECT
                    id,
                    source_file,
                    section_title,
                    chunk_text,
                    1 - (embedding <=> @queryVec::vector) AS similarity
                FROM knowledge_chunks
                WHERE embedding IS NOT NULL
                  AND tags && @keywords
                ORDER BY embedding <=> @queryVec::vector
                LIMIT @topK";

            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("queryVec", new Vector(queryVector));
            cmd.Parameters.AddWithValue("keywords", keywords.ToArray());
            cmd.Parameters.AddWithValue("topK",     topK);

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new SearchResult
                {
                    ChunkId      = reader.GetInt32(0),
                    SourceFile   = reader.GetString(1),
                    SectionTitle = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    ChunkText    = reader.GetString(3),
                    Similarity   = reader.GetDouble(4)
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tag-filtered search failed");
        }
        return results;
    }

    // ================================================================
    // FULL VECTOR SEARCH (fallback for broad/personal questions)
    // ================================================================
    private async Task<List<SearchResult>> SearchPgVectorAsync(
        float[] queryVector, int topK)
    {
        var results = new List<SearchResult>();
        try
        {
            var dsb = new NpgsqlDataSourceBuilder(_connectionString);
            dsb.UseVector();
            await using var ds   = dsb.Build();
            await using var conn = await ds.OpenConnectionAsync();

            var sql = @"
                SELECT
                    id,
                    source_file,
                    section_title,
                    chunk_text,
                    1 - (embedding <=> @queryVec::vector) AS similarity
                FROM knowledge_chunks
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> @queryVec::vector
                LIMIT @topK";

            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("queryVec", new Vector(queryVector));
            cmd.Parameters.AddWithValue("topK",     topK);

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new SearchResult
                {
                    ChunkId      = reader.GetInt32(0),
                    SourceFile   = reader.GetString(1),
                    SectionTitle = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    ChunkText    = reader.GetString(3),
                    Similarity   = reader.GetDouble(4)
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "pgvector search failed");
        }
        return results;
    }

    // ================================================================
    // KEYWORD EXTRACTION
    // Normalises .NET terms so they match what ingestion stores.
    // "C#" → "csharp",  ".NET" → "dotnet"
    // ================================================================
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
        // Generic interview words — too broad to be useful as tag filters
        "experience","background","knowledge","work","worked",
        "years","long","much","many","level","skills","skill",
        "good","great","know","familiar","comfortable","strong"
    };

    private List<string> ExtractQueryKeywords(string question)
    {
        var normalised = question
            .ToLower()
            .Replace("c#", "csharp")
            .Replace(".net", "dotnet");

        return normalised
            .Split(new[] { ' ', '?', '.', ',', '(', ')', '/', '\'', '"', ':', ';', '!' },
                   StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 1)
            .Where(w => !StopWords.Contains(w))
            .Where(w => !w.All(char.IsDigit))
            .Distinct()
            .ToList();
    }

    // ================================================================
    // RELEVANCE GATE — maps question keywords to expected file domains
    // Returns null if no specific domain can be inferred (allow any file).
    // ================================================================
    private string? GetExpectedDomain(string question)
    {
        var q = question.ToLower()
            .Replace("c#", "csharp")
            .Replace(".net", "dotnet");

        // Technical .NET / coding questions → must come from dotnet files
        // career-journey scores 90% on these because it mentions all these companies
        // and technologies, but the actual answers must come from dotnet files.
        if (new[] {
                "dotnet","csharp","asp.net","entity framework","linq",
                "async","await","dependency injection","middleware",
                "struct","class","interface","abstract","generic",
                "garbage collection","nullable","record","delegate",
                "task","thread","ioc","solid","repository pattern",
                "value type","reference type","boxing","unboxing",
                "var ","dynamic ","ref ","out ","action","func",
                "iquery","iqueryable","ienumerable","first(","single(",
                "polly","httpclient","signalr","blazor",
                "experience with dotnet","experience with csharp",
                "experience with .net","your .net","your c#"
            }
            .Any(k => q.Contains(k)))
            return "dotnet";

        // System design
        if (new[] {
                "design a","system design","url shortener","rate limiter",
                "notification system","chat system","scale to","high availability"
            }
            .Any(k => q.Contains(k)))
            return "system-design";

        // AI / RAG questions → must come from ai-rag file
        if (new[] {
                "rag","retrieval augmented","embedding","vector search",
                "pgvector","semantic search","llm","language model",
                "azure openai","huggingface","groq","ai experience",
                "ai project","machine learning","nlp"
            }
            .Any(k => q.Contains(k)))
            return "ai-rag";

        // Personal/experiential questions — no domain restriction
        return null;
    }

    // ================================================================
    // FILE BOOST — only used on the fallback full-search path
    // Narrow keywords only — broad terms like ".net" / "c#" removed
    // to avoid inflating scores for unrelated chunks in the same domain
    // ================================================================
    private double GetFileBoost(string question, string sourceFile)
    {
        var file = sourceFile.ToLower();
        var q    = question.ToLower();

        if (file.Contains("ai-rag") &&
            new[] { "rag","vector","embedding","llm","semantic search","retrieval",
                    "pgvector","azure openai","ai project","language model","nlp" }
            .Any(k => q.Contains(k))) return 0.20;

        if (file.Contains("introduction") &&
            new[] { "yourself","introduce","who are you","about you","tell me about" }
            .Any(k => q.Contains(k))) return 0.15;

        if (file.Contains("career") &&
            new[] { "career","journey","worked at","companies","history",
                    "work history","past jobs" }
            .Any(k => q.Contains(k))) return 0.15;

        if (file.Contains("leadership") &&
            new[] { "led a team","leadership","mentored","managed a team",
                    "led people","team lead" }
            .Any(k => q.Contains(k))) return 0.15;

        if (file.Contains("recent-project") &&
            new[] { "recent project","current project","keen",
                    "ingenio","latest project" }
            .Any(k => q.Contains(k))) return 0.15;

        if (file.Contains("general-hr") &&
            new[] { "strength","weakness","why are you","salary",
                    "notice","goal","motivat","hobby" }
            .Any(k => q.Contains(k))) return 0.15;

        if (file.Contains("challenge") &&
            new[] { "challenge","difficult","problem you faced",
                    "tough","hard situation","conflict" }
            .Any(k => q.Contains(k))) return 0.15;

        if (file.Contains("system-design") &&
            new[] { "design","scale","system","rate limit","notification",
                    "url shortener","chat system","high availability" }
            .Any(k => q.Contains(k))) return 0.15;

        // Broad technology experience questions — these have no specific tags
        // so they always fall through to full search; boost the right file here.
        if ((file.Contains("dotnet") || file.Contains("dotnet-interview-qa")) &&
            new[] { ".net","dotnet","c#","csharp","asp.net","experience with",
                    "how long","your .net","your dotnet","your csharp" }
            .Any(k => q.Contains(k))) return 0.15;

        return 0.0;
    }
}