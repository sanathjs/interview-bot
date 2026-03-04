using Npgsql;
using Pgvector;
using Pgvector.Npgsql;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using interview_bot_api.Models;

namespace interview_bot_api.Services;

public class IngestionService
{
    private readonly string _connectionString;
    private readonly HttpClient _httpClient;
    private readonly ILogger<IngestionService> _logger;
    private readonly string _ollamaBaseUrl;
    private readonly string _embeddingModel;

    public IngestionService(IConfiguration config, ILogger<IngestionService> logger)
    {
        _logger = logger;
        _connectionString = config["DATABASE_URL"]!;
        _ollamaBaseUrl = config["Ollama:BaseUrl"] ?? "http://localhost:11434";
        _embeddingModel = config["Ollama:EmbeddingModel"] ?? "nomic-embed-text";
        _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
    }

    public async Task<IngestionResult> IngestDirectoryAsync(string directoryPath)
    {
        var result = new IngestionResult();
        var mdFiles = Directory.GetFiles(directoryPath, "*.md");

        _logger.LogInformation("Found {Count} .md files", mdFiles.Length);

        await ClearExistingChunksAsync();

        foreach (var filePath in mdFiles)
        {
            var fileName = Path.GetFileName(filePath);
            try
            {
                var content = await File.ReadAllTextAsync(filePath);
                var chunks = SplitIntoChunks(content, fileName);

                _logger.LogInformation("{File} → {Count} chunks", fileName, chunks.Count);

                foreach (var chunk in chunks)
                {
                    var embedding = await GetEmbeddingAsync(chunk.ChunkText);

                    if (embedding.Length == 0)
                    {
                        _logger.LogWarning("Empty embedding: {Title}", chunk.SectionTitle);
                        continue;
                    }

                    await SaveChunkAsync(chunk, embedding);
                    result.ChunksCreated++;
                    await Task.Delay(50);
                }

                result.FilesIngested.Add(fileName);
                result.FilesProcessed++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing: {File}", fileName);
                result.Errors.Add($"{fileName}: {ex.Message}");
            }
        }

        _logger.LogInformation("Done: {Chunks} chunks from {Files} files",
            result.ChunksCreated, result.FilesProcessed);

        return result;
    }

    private List<KnowledgeChunk> SplitIntoChunks(string content, string fileName)
{
    var chunks = new List<KnowledgeChunk>();
    var sections = Regex.Split(content, @"(?=^##\s)", RegexOptions.Multiline);

    int index = 0;
    foreach (var section in sections)
    {
        var trimmed = section.Trim();
        if (string.IsNullOrWhiteSpace(trimmed)) continue;

        var lines = trimmed.Split('\n');
        var heading = lines[0].TrimStart('#').Trim();
        var body = string.Join('\n', lines.Skip(1)).Trim();

        if (body.Length < 30) continue;

        // Add question aliases so vector search matches
        // conversational interview questions to the right chunks
        var aliases = GetQuestionAliases(heading, fileName);

        var fileNameClean = Path.GetFileNameWithoutExtension(fileName)
            .Replace("-", " ");

        var enrichedText =
            $"Topic: {fileNameClean}\n" +
            $"Section: {heading}\n" +
            (aliases.Any()
                ? $"Related questions: {string.Join(", ", aliases)}\n"
                : "") +
            $"\n{trimmed}";

        chunks.Add(new KnowledgeChunk
        {
            SourceFile = fileName,
            SectionTitle = heading,
            ChunkText = enrichedText,
            ChunkIndex = index++
        });
    }

    return chunks;
}

// Maps section headings to common interview questions
// so pgvector finds the right chunk for conversational queries
private List<string> GetQuestionAliases(string heading, string fileName)
{
    var file = Path.GetFileNameWithoutExtension(fileName).ToLower();
    var h = heading.ToLower();

    // Introduction / About Me
    if (h.Contains("who i am") || h.Contains("about me"))
        return new List<string> {
            "tell me about yourself",
            "introduce yourself",
            "who are you",
            "can you introduce yourself",
            "give me a brief introduction"
        };

    if (h.Contains("career summary") || h.Contains("specialize"))
        return new List<string> {
            "what do you specialize in",
            "what are your skills",
            "what is your expertise",
            "what technologies do you work with",
            "what is your technical background"
        };

    if (h.Contains("different") || h.Contains("unique"))
        return new List<string> {
            "what makes you different",
            "why should we hire you",
            "what sets you apart",
            "what is your unique value"
        };

    // Career Journey
    if (file.Contains("career") && h.Contains("current"))
        return new List<string> {
            "what are you currently working on",
            "tell me about your current role",
            "what do you do at ingenio"
        };

    if (file.Contains("career") && (h.Contains("why") || h.Contains("looking")))
        return new List<string> {
            "why are you looking for a new job",
            "why do you want to leave your current company",
            "what motivates you to change jobs",
            "why are you open to work"
        };

    if (file.Contains("career"))
        return new List<string> {
            "walk me through your career",
            "tell me about your work experience",
            "what companies have you worked for",
            "describe your career journey",
            "what is your professional background"
        };

    // RAG / AI
if (file.Contains("ai-rag") || h.Contains("rag") || h.Contains("pipeline"))
    return new List<string> {
        "tell me about your RAG experience",
        "tell me about your RAG pipeline",
        "explain your RAG pipeline",
        "what is your AI experience",
        "have you built AI systems",
        "what is RAG and how does it work",
        "explain retrieval augmented generation",
        "tell me about vector search",
        "how did you build the Keen search system",
        "what embedding model do you use",
        "tell me about pgvector experience",
        "how do you integrate AI in applications",
        "what LLM experience do you have",
        "tell me about your machine learning work",
        "have you worked with Azure OpenAI",
        "explain semantic search implementation"
    };

    // .NET Experience
    if (file.Contains("dotnet") && h.Contains("how long"))
        return new List<string> {
            "how long have you worked with dotnet",
            "what is your dotnet experience",
            "tell me about your .NET background",
            "how experienced are you with C#"
        };

    if (file.Contains("dotnet") && h.Contains("design pattern"))
        return new List<string> {
            "what design patterns do you use",
            "tell me about design patterns",
            "what patterns do you follow in your code"
        };

    // Recent Project
    if (file.Contains("recent") && h.Contains("overview"))
        return new List<string> {
            "tell me about your recent project",
            "what have you been working on lately",
            "describe a recent project",
            "what is your most recent work"
        };

    if (file.Contains("recent") && h.Contains("challenge"))
        return new List<string> {
            "what was the biggest challenge in your project",
            "tell me about a technical challenge you faced",
            "describe a difficult problem you solved"
        };

    // Leadership
    if (file.Contains("leadership"))
        return new List<string> {
            "tell me about your leadership experience",
            "have you led a team",
            "describe your management style",
            "tell me about mentoring",
            "give me an example of leadership"
        };

    // Challenges
    if (file.Contains("challenge"))
        return new List<string> {
            "tell me about a challenge you faced",
            "describe a difficult situation",
            "how do you handle problems",
            "give me an example of problem solving"
        };

    // HR / General
    if (h.Contains("strength"))
        return new List<string> {
            "what are your strengths",
            "what are you good at",
            "what is your greatest strength"
        };

    if (h.Contains("weakness"))
        return new List<string> {
            "what are your weaknesses",
            "what is your greatest weakness",
            "what do you struggle with"
        };

    if (h.Contains("why") && h.Contains("here"))
        return new List<string> {
            "why do you want to work here",
            "why are you interested in this role",
            "why this company"
        };

    if (h.Contains("questions for us"))
        return new List<string> {
            "do you have any questions for us",
            "any questions for the team",
            "what would you like to know about us"
        };

    if (h.Contains("join") || h.Contains("notice"))
        return new List<string> {
            "when can you join",
            "what is your notice period",
            "how soon can you start"
        };

    return new List<string>();
}

    private async Task<float[]> GetEmbeddingAsync(string text)
    {
        try
        {
            var request = new { model = _embeddingModel, prompt = text };

            var response = await _httpClient.PostAsJsonAsync(
                $"{_ollamaBaseUrl}/api/embeddings", request);

            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadFromJsonAsync<JsonElement>();
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

    private async Task SaveChunkAsync(KnowledgeChunk chunk, float[] embedding)
    {
        var dataSourceBuilder = new NpgsqlDataSourceBuilder(_connectionString);
        dataSourceBuilder.UseVector();
        await using var dataSource = dataSourceBuilder.Build();
        await using var conn = await dataSource.OpenConnectionAsync();

        await using var cmd = new NpgsqlCommand(@"
            INSERT INTO knowledge_chunks
                (source_file, section_title, chunk_text, chunk_index, embedding)
            VALUES
                (@sourceFile, @sectionTitle, @chunkText, @chunkIndex, @embedding)",
            conn);

        cmd.Parameters.AddWithValue("sourceFile", chunk.SourceFile);
        cmd.Parameters.AddWithValue("sectionTitle", chunk.SectionTitle ?? "");
        cmd.Parameters.AddWithValue("chunkText", chunk.ChunkText);
        cmd.Parameters.AddWithValue("chunkIndex", chunk.ChunkIndex);
        cmd.Parameters.AddWithValue("embedding", new Vector(embedding));

        await cmd.ExecuteNonQueryAsync();
    }

    private async Task ClearExistingChunksAsync()
    {
        var dataSourceBuilder = new NpgsqlDataSourceBuilder(_connectionString);
        dataSourceBuilder.UseVector();
        await using var dataSource = dataSourceBuilder.Build();
        await using var conn = await dataSource.OpenConnectionAsync();
        await using var cmd = new NpgsqlCommand(
            "TRUNCATE knowledge_chunks RESTART IDENTITY CASCADE", conn);
        await cmd.ExecuteNonQueryAsync();
        _logger.LogInformation("Cleared existing chunks");
    }
}