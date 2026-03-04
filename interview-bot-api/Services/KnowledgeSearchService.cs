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
    private const double LowConfidence  = 0.58;

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
    // MAIN SEARCH — embed question → pgvector → boost → return top K
    // ================================================================
    public async Task<(List<SearchResult> Results, double TopScore)>
        SearchAsync(string question, int topK = 10)
    {
        // 1. Embed the question via HuggingFace
        var queryVector = await _embedding.GetEmbeddingAsync(question);

        if (queryVector.Length == 0)
            return (new List<SearchResult>(), 0.0);

        // 2. Fetch top 15 candidates from pgvector
        var results = await SearchPgVectorAsync(queryVector, 15);

        if (results.Count == 0)
            return (results, 0.0);

        var questionLower = question.ToLower();

        _logger.LogInformation("--- BOOST DEBUG for: {Q} ---", question);

        // 3. Apply file boost
        foreach (var result in results)
        {
            var scoreBefore = result.Similarity;
            var fileBoost   = GetFileBoost(questionLower, result.SourceFile);
            result.Similarity = Math.Min(1.0, result.Similarity + fileBoost);

            _logger.LogInformation(
                "  {File} | {Title} | {Before:F3} + {Boost:F3} = {After:F3}",
                result.SourceFile, result.SectionTitle,
                scoreBefore, fileBoost, result.Similarity);
        }

        // 4. Re-sort after boosting and take topK
        results = results
            .OrderByDescending(r => r.Similarity)
            .Take(topK)
            .ToList();

        var topScore = results[0].Similarity;

        _logger.LogInformation(
            "--- TOP after boost: {Score:F3} from {File} ---",
            topScore, results[0].SourceFile);

        return (results, topScore);
    }

    public string GetConfidenceLevel(double score)
    {
        if (score >= HighConfidence) return "high";
        if (score >= LowConfidence)  return "medium";
        return "low";
    }

    // ================================================================
    // PGVECTOR SEARCH
    // ================================================================
    private async Task<List<SearchResult>> SearchPgVectorAsync(
        float[] queryVector, int topK)
    {
        var results = new List<SearchResult>();

        try
        {
            var dataSourceBuilder = new NpgsqlDataSourceBuilder(_connectionString);
            dataSourceBuilder.UseVector();
            await using var dataSource = dataSourceBuilder.Build();
            await using var conn = await dataSource.OpenConnectionAsync();

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
            cmd.Parameters.AddWithValue("topK", topK);

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new SearchResult
                {
                    ChunkId       = reader.GetInt32(0),
                    SourceFile    = reader.GetString(1),
                    SectionTitle  = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    ChunkText     = reader.GetString(3),
                    Similarity    = reader.GetDouble(4)
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
    // FILE BOOST — adds score bonus when question keywords match file
    // ================================================================
    private double GetFileBoost(string question, string sourceFile)
    {
        var file = sourceFile.ToLower();
        var q    = question.ToLower();

        if (file.Contains("ai-rag"))
        {
            var keywords = new[] {
                "rag", "ai", "vector", "embedding", "llm",
                "semantic", "pipeline", "retrieval", "pgvector",
                "machine learning", "azure openai", "ollama",
                "artificial intelligence", "knowledge base",
                "used ai", "used rag", "ai in", "rag in",
                "ai project", "rag project", "ai experience",
                "language model", "generative", "chatbot",
                "neural", "deep learning", "nlp"
            };
            if (keywords.Any(k => q.Contains(k))) return 0.20;
        }

        if (file.Contains("introduction"))
        {
            var keywords = new[] {
                "yourself", "introduce", "who are you",
                "background", "about you", "overview", "tell me about"
            };
            if (keywords.Any(k => q.Contains(k))) return 0.15;
        }

        if (file.Contains("career"))
        {
            var keywords = new[] {
                "career", "journey", "experience", "worked",
                "companies", "history", "previous", "years",
                "work history", "past jobs"
            };
            if (keywords.Any(k => q.Contains(k))) return 0.15;
        }

        if (file.Contains("dotnet"))
        {
            var keywords = new[] {
                ".net", "dotnet", "c#", "csharp", "asp.net",
                "entity framework", "design pattern", "microservice",
                "rest api", "web api"
            };
            if (keywords.Any(k => q.Contains(k))) return 0.15;
        }

        if (file.Contains("leadership"))
        {
            var keywords = new[] {
                "lead", "team", "mentor", "manage",
                "junior", "architect", "decision", "leadership"
            };
            if (keywords.Any(k => q.Contains(k))) return 0.15;
        }

        if (file.Contains("recent-project"))
        {
            var keywords = new[] {
                "recent project", "current project", "keen",
                "ingenio", "what are you working", "latest project"
            };
            if (keywords.Any(k => q.Contains(k))) return 0.15;
        }

        if (file.Contains("general-hr"))
        {
            var keywords = new[] {
                "strength", "weakness", "why", "salary",
                "notice", "join", "goal", "motivate", "hobby"
            };
            if (keywords.Any(k => q.Contains(k))) return 0.15;
        }

        if (file.Contains("challenge"))
        {
            var keywords = new[] {
                "challenge", "difficult", "problem", "obstacle",
                "tough", "hard situation", "conflict"
            };
            if (keywords.Any(k => q.Contains(k))) return 0.15;
        }

        return 0.0;
    }
}