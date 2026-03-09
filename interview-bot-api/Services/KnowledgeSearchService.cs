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

    // ── Confidence thresholds (lowered from 0.65/0.63 for better recall) ──
    private const double HighConfidence = 0.62;
    private const double LowConfidence  = 0.52;

    // ── 3-signal weights ───────────────────────────────────────────────────
    // questions_embedding gets highest weight: question↔question matching
    // is the most reliable signal (same vector space as the query).
    // title_embedding weight is adaptive based on heading word count.
    // body_embedding is the safety net for paraphrasing + technical questions.
    private const double QuestionsWeight     = 0.45;
    private const double TitleWeightLong     = 0.30;  // title >= 5 words
    private const double TitleWeightShort    = 0.15;  // title < 5 words
    private const double BodyWeightWithLong  = 0.25;  // remainder when long title
    private const double BodyWeightWithShort = 0.40;  // remainder when short title

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
    // 3-signal weighted scoring:
    //   Signal 1 — body_embedding:      semantic content match (existing)
    //   Signal 2 — title_embedding:     heading match, adaptive weight
    //   Signal 3 — questions_embedding: AI question variants, highest weight
    //
    // Each signal fetches top-15 candidates independently via HNSW index.
    // Results are merged by chunk id and re-ranked in application code.
    //
    // Falls back to body-only scoring for chunks that predate the migration
    // (title_embedding / questions_embedding will be NULL for old rows).
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

        // ── Step 1: fetch candidates from all 3 signals ──────────────────
        var bodyTask      = SearchByColumnAsync(queryVector, "embedding",          15);
        var titleTask     = SearchByColumnAsync(queryVector, "title_embedding",     15);
        var questionsTask = SearchByColumnAsync(queryVector, "questions_embedding", 15);

        await Task.WhenAll(bodyTask, titleTask, questionsTask);

        var bodyHits      = bodyTask.Result;
        var titleHits     = titleTask.Result;
        var questionsHits = questionsTask.Result;

        _logger.LogInformation(
            "  Candidates — body:{B} title:{T} questions:{Q}",
            bodyHits.Count, titleHits.Count, questionsHits.Count);

        // ── Step 2: merge all candidates by chunk id ──────────────────────
        var allIds = bodyHits.Keys
            .Union(titleHits.Keys)
            .Union(questionsHits.Keys)
            .ToHashSet();

        var merged = new List<SearchResult>();

        foreach (var id in allIds)
        {
            bodyHits.TryGetValue(id,      out var bodyRow);
            titleHits.TryGetValue(id,     out var titleRow);
            questionsHits.TryGetValue(id, out var questionsRow);

            // Use whichever row has the full chunk data
            var baseRow = bodyRow ?? titleRow ?? questionsRow!;

            var bodySim      = bodyRow?.Similarity      ?? 0.0;
            var titleSim     = titleRow?.Similarity     ?? 0.0;
            var questionsSim = questionsRow?.Similarity ?? 0.0;

            // Adaptive title weight: long specific headings trusted more
            var titleWords  = baseRow.TitleWordCount;
            var titleWeight = titleWords >= 5 ? TitleWeightLong : TitleWeightShort;
            var bodyWeight  = titleWords >= 5 ? BodyWeightWithLong : BodyWeightWithShort;

            double finalScore;

            if (questionsRow != null && titleRow != null)
            {
                // All 3 signals available → full weighted score
                finalScore = (questionsSim * QuestionsWeight)
                           + (titleSim     * titleWeight)
                           + (bodySim      * bodyWeight);
            }
            else if (titleRow != null)
            {
                // No questions embedding (old chunk or generation failed)
                finalScore = (titleSim * (titleWeight + QuestionsWeight * 0.5))
                           + (bodySim  * (bodyWeight  + QuestionsWeight * 0.5));
            }
            else
            {
                // Body only — pre-migration chunk, use raw similarity
                finalScore = bodySim;
            }

            _logger.LogDebug(
                "  SCORE {Id} | body:{B:F3} title:{T:F3} q:{Q:F3} titleW:{TW} → final:{F:F3} | {File} § {Section}",
                id, bodySim, titleSim, questionsSim, titleWords, finalScore,
                baseRow.SourceFile, baseRow.SectionTitle);

            merged.Add(new SearchResult
            {
                ChunkId      = id,
                SourceFile   = baseRow.SourceFile,
                SectionTitle = baseRow.SectionTitle,
                ChunkText    = baseRow.ChunkText,
                Similarity   = finalScore,
                TitleWordCount = baseRow.TitleWordCount,
            });
        }

        if (merged.Count == 0)
            return (new List<SearchResult>(), 0.0);

        // ── Step 3: tag filter as a BOOST, not a gate ─────────────────────
        // If a chunk's tags match the query keywords, add a small bonus.
        // This keeps tag intelligence without it being a hard filter.
        if (queryKeywords.Count > 0)
        {
            var taggedIds = await GetTagMatchingIdsAsync(queryKeywords);
            foreach (var r in merged)
            {
                if (taggedIds.Contains(r.ChunkId))
                    r.Similarity = Math.Min(1.0, r.Similarity + 0.05);
            }
        }

        // ── Step 4: apply file boost on broad/fallback questions ──────────
        var questionLower = question.ToLower();
        foreach (var r in merged)
        {
            var boost = GetFileBoost(questionLower, r.SourceFile);
            if (boost > 0)
                r.Similarity = Math.Min(1.0, r.Similarity + boost);
        }

        // ── Step 5: exclude answering-guidelines, sort, take top K ────────
        var results = merged
            .Where(r => !r.SourceFile.Contains("answering-guidelines"))
            .OrderByDescending(r => r.Similarity)
            .Take(topK)
            .ToList();

        if (results.Count == 0)
            return (new List<SearchResult>(), 0.0);

        var topScore = results[0].Similarity;

        _logger.LogInformation(
            "--- TOP: {Score:F3} | {File} | {Title} ---",
            topScore, results[0].SourceFile, results[0].SectionTitle);

        return (results, topScore);
    }

    public string GetConfidenceLevel(double score)
    {
        if (score >= HighConfidence) return "high";
        if (score >= LowConfidence)  return "medium";
        return "low";
    }

    // ================================================================
    // SEARCH BY SINGLE COLUMN
    // Fetches top-N chunks ranked by cosine similarity on one vector column.
    // Returns dict keyed by chunk id for O(1) merge.
    // Silently returns empty dict if column has no data (pre-migration rows).
    // ================================================================
    private async Task<Dictionary<int, SearchResult>> SearchByColumnAsync(
        float[] queryVector, string columnName, int topK)
    {
        var results = new Dictionary<int, SearchResult>();
        try
        {
            var dsb = new NpgsqlDataSourceBuilder(_connectionString);
            dsb.UseVector();
            await using var ds   = dsb.Build();
            await using var conn = await ds.OpenConnectionAsync();

            // Cast query vector explicitly; skip rows where column is NULL
            var sql = $@"
                SELECT
                    id,
                    source_file,
                    section_title,
                    chunk_text,
                    COALESCE(title_word_count, 0) AS title_word_count,
                    1 - ({columnName} <=> @queryVec::vector) AS similarity
                FROM knowledge_chunks
                WHERE {columnName} IS NOT NULL
                  AND source_file NOT LIKE '%answering-guidelines%'
                ORDER BY {columnName} <=> @queryVec::vector
                LIMIT @topK";

            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("queryVec", new Vector(queryVector));
            cmd.Parameters.AddWithValue("topK",     topK);

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var id = reader.GetInt32(0);
                results[id] = new SearchResult
                {
                    ChunkId        = id,
                    SourceFile     = reader.GetString(1),
                    SectionTitle   = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    ChunkText      = reader.GetString(3),
                    TitleWordCount = reader.GetInt32(4),
                    Similarity     = reader.GetDouble(5),
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Search by column '{Column}' failed", columnName);
        }
        return results;
    }

    // ================================================================
    // TAG MATCH IDS — returns chunk ids whose tags overlap with keywords
    // Used as a small boost (not a hard gate anymore)
    // ================================================================
    private async Task<HashSet<int>> GetTagMatchingIdsAsync(List<string> keywords)
    {
        var ids = new HashSet<int>();
        try
        {
            var dsb = new NpgsqlDataSourceBuilder(_connectionString);
            dsb.UseVector();
            await using var ds   = dsb.Build();
            await using var conn = await ds.OpenConnectionAsync();

            await using var cmd = new NpgsqlCommand(
                "SELECT id FROM knowledge_chunks WHERE tags && @keywords", conn);
            cmd.Parameters.AddWithValue("keywords", keywords.ToArray());

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                ids.Add(reader.GetInt32(0));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tag match query failed");
        }
        return ids;
    }

    // ================================================================
    // KEYWORD EXTRACTION
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
    // FILE BOOST — small boost for strong keyword→file matches
    // Now a supplement to the 3-signal scoring, not the primary mechanism
    // ================================================================
    private double GetFileBoost(string question, string sourceFile)
    {
        var file = sourceFile.ToLower();
        var q    = question.ToLower();

        if (file.Contains("ai-rag") &&
            new[] { "rag","vector","embedding","llm","semantic search","retrieval",
                    "pgvector","azure openai","ai project","language model" }
            .Any(k => q.Contains(k))) return 0.08;

        if (file.Contains("introduction") &&
            new[] { "yourself","introduce","who are you","about you" }
            .Any(k => q.Contains(k))) return 0.05;

        if (file.Contains("career") &&
            new[] { "career","journey","companies","work history","walk me through" }
            .Any(k => q.Contains(k))) return 0.05;

        if (file.Contains("leadership") &&
            new[] { "leadership","led","managed a team","mentored","team lead" }
            .Any(k => q.Contains(k))) return 0.05;

        if (file.Contains("recent-project") &&
            new[] { "recent project","keen","ingenio","latest project" }
            .Any(k => q.Contains(k))) return 0.05;

        if (file.Contains("general-hr") &&
            new[] { "strength","weakness","salary","notice","goal","motivat" }
            .Any(k => q.Contains(k))) return 0.05;

        if ((file.Contains("dotnet") || file.Contains("dotnet-interview")) &&
            new[] { "dotnet","csharp",".net","asp.net","experience with" }
            .Any(k => q.Contains(k))) return 0.05;

        return 0.0;
    }
}