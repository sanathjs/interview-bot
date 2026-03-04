using Npgsql;
using Pgvector;
using Pgvector.Npgsql;
using System.Net.Http.Json;
using System.Text.Json;
using interview_bot_api.Models;

namespace interview_bot_api.Services;

public class KnowledgeSearchService
{
    private readonly string _connectionString;
    private readonly HttpClient _httpClient;
    private readonly ILogger<KnowledgeSearchService> _logger;
    private readonly string _ollamaBaseUrl;
    private readonly string _embeddingModel;

    private const double HighConfidence = 0.65;
    private const double LowConfidence = 0.58;

    public KnowledgeSearchService(IConfiguration config,
        ILogger<KnowledgeSearchService> logger)
    {
        _logger = logger;
        _connectionString = config["DATABASE_URL"]!;
        _ollamaBaseUrl = config["Ollama:BaseUrl"] ?? "http://localhost:11434";
        _embeddingModel = config["Ollama:EmbeddingModel"] ?? "nomic-embed-text";
        _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
    }

    public async Task<(List<SearchResult> Results, double TopScore)>
        SearchAsync(string question, int topK = 10)
    {
        var embedding = await GetEmbeddingAsync(question);

        if (embedding.Length == 0)
            return (new List<SearchResult>(), 0.0);

        // Fetch 15 candidates so boost has more to work with
        var results = await SearchPgVectorAsync(embedding, 15);

        if (results.Count == 0)
            return (results, 0.0);

        var questionLower = question.ToLower();

        _logger.LogInformation("--- BOOST DEBUG for: {Q} ---", question);

        foreach (var result in results)
        {
            var scoreBefore = result.Similarity;
            var fileBoost = GetFileBoost(questionLower, result.SourceFile);
            result.Similarity = Math.Min(1.0, result.Similarity + fileBoost);

            _logger.LogInformation(
                "  {File} | {Title} | {Before:F3} + {Boost:F3} = {After:F3}",
                result.SourceFile, result.SectionTitle,
                scoreBefore, fileBoost, result.Similarity);
        }

        // Re-sort after boosting and take topK
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
        if (score >= LowConfidence) return "medium";
        return "low";
    }

    private async Task<float[]> GetEmbeddingAsync(string text)
    {
        try
        {
            var request = new { model = _embeddingModel, prompt = text };

            var response = await _httpClient.PostAsJsonAsync(
                $"{_ollamaBaseUrl}/api/embeddings", request);

            response.EnsureSuccessStatusCode();

            var json = await response.Content
                .ReadFromJsonAsync<JsonElement>();
            var embeddingArray = json.GetProperty("embedding");

            return embeddingArray.EnumerateArray()
                .Select(e => (float)e.GetDouble())
                .ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Embedding failed");
            return Array.Empty<float>();
        }
    }

    private async Task<List<SearchResult>> SearchPgVectorAsync(
        float[] embedding, int topK)
    {
        var results = new List<SearchResult>();

        try
        {
            var dataSourceBuilder =
                new NpgsqlDataSourceBuilder(_connectionString);
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
            cmd.Parameters.AddWithValue("queryVec", new Vector(embedding));
            cmd.Parameters.AddWithValue("topK", topK);

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new SearchResult
                {
                    ChunkId = reader.GetInt32(0),
                    SourceFile = reader.GetString(1),
                    SectionTitle = reader.IsDBNull(2)
                        ? "" : reader.GetString(2),
                    ChunkText = reader.GetString(3),
                    Similarity = reader.GetDouble(4)
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "pgvector search failed");
        }

        return results;
    }

    private double GetFileBoost(string question, string sourceFile)
    {
        var file = sourceFile.ToLower();
        var q = question.ToLower();

        if (file.Contains("ai-rag"))
        {
            var ragKeywords = new[] {
                "rag", "ai", "vector", "embedding", "llm",
                "semantic", "pipeline", "retrieval", "pgvector",
                "machine learning", "azure openai", "ollama",
                "artificial intelligence", "knowledge base",
                "used ai", "used rag", "ai in", "rag in",
                "ai project", "rag project", "ai experience",
                "language model", "generative", "chatbot",
                "neural", "deep learning", "nlp"
            };
            if (ragKeywords.Any(k => q.Contains(k)))
                return 0.20;
        }

        if (file.Contains("introduction"))
        {
            var introKeywords = new[] {
                "yourself", "introduce", "who are you",
                "background", "about you", "overview",
                "tell me about"
            };
            if (introKeywords.Any(k => q.Contains(k)))
                return 0.15;
        }

        if (file.Contains("career"))
        {
            var careerKeywords = new[] {
                "career", "journey", "experience", "worked",
                "companies", "history", "previous", "years",
                "work history", "past jobs"
            };
            if (careerKeywords.Any(k => q.Contains(k)))
                return 0.15;
        }

        if (file.Contains("dotnet"))
        {
            var dotnetKeywords = new[] {
                ".net", "dotnet", "c#", "csharp", "asp.net",
                "entity framework", "design pattern", "microservice",
                "rest api", "web api"
            };
            if (dotnetKeywords.Any(k => q.Contains(k)))
                return 0.15;
        }

        if (file.Contains("leadership"))
        {
            var leaderKeywords = new[] {
                "lead", "team", "mentor", "manage",
                "junior", "architect", "decision", "leadership"
            };
            if (leaderKeywords.Any(k => q.Contains(k)))
                return 0.15;
        }

        if (file.Contains("recent-project"))
        {
            var projectKeywords = new[] {
                "recent project", "current project", "keen",
                "ingenio", "what are you working", "latest project"
            };
            if (projectKeywords.Any(k => q.Contains(k)))
                return 0.15;
        }

        if (file.Contains("general-hr"))
        {
            var hrKeywords = new[] {
                "strength", "weakness", "why", "salary",
                "notice", "join", "goal", "motivate", "hobby"
            };
            if (hrKeywords.Any(k => q.Contains(k)))
                return 0.15;
        }

        if (file.Contains("challenge"))
        {
            var challengeKeywords = new[] {
                "challenge", "difficult", "problem", "obstacle",
                "tough", "hard situation", "conflict"
            };
            if (challengeKeywords.Any(k => q.Contains(k)))
                return 0.15;
        }

        return 0.0;
    }
}