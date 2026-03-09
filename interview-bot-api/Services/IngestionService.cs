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
    private readonly HttpClient _groqClient;
    private readonly ILogger<IngestionService> _logger;
    private readonly EmbeddingService _embedding;
    private readonly string _groqApiKey;
    private readonly string _groqModel;

    public IngestionService(
        IConfiguration config,
        ILogger<IngestionService> logger,
        EmbeddingService embedding)
    {
        _logger           = logger;
        _connectionString = config["DATABASE_URL"]!;
        _embedding        = embedding;
        _groqApiKey       = config["Groq:ApiKey"]!;
        _groqModel        = config["Groq:Model"] ?? "llama-3.3-70b-versatile";

        _groqClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        _groqClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_groqApiKey}");
    }

    public async Task<IngestionResult> IngestDirectoryAsync(string directoryPath)
    {
        var result  = new IngestionResult();
        var mdFiles = Directory.GetFiles(directoryPath, "*.md");

        _logger.LogInformation("Found {Count} .md files", mdFiles.Length);

        await ClearExistingChunksAsync();

        foreach (var filePath in mdFiles)
        {
            var fileName = Path.GetFileName(filePath);

            // Skip files excluded from search (e.g. answering-guidelines.md)
            if (ChunkMetadataHelper.IsExcludedFromSearch(fileName))
            {
                _logger.LogInformation("Skipping excluded file: {File}", fileName);
                continue;
            }

            try
            {
                var content = await File.ReadAllTextAsync(filePath);
                var chunks  = SplitIntoChunks(content, fileName);

                _logger.LogInformation("{File} → {Count} chunks", fileName, chunks.Count);

                foreach (var chunk in chunks)
                {
                    // ── 1. Body embedding (existing) ─────────────────────────
                    var bodyEmbedding = await _embedding.GetEmbeddingAsync(chunk.ChunkText);
                    if (bodyEmbedding.Length == 0)
                    {
                        _logger.LogWarning("Empty body embedding: {Title}", chunk.SectionTitle);
                        continue;
                    }

                    // ── 2. Title embedding (new) ─────────────────────────────
                    var titleText      = chunk.SectionTitle ?? "";
                    var titleEmbedding = await _embedding.GetEmbeddingAsync(titleText);

                    // ── 3. AI-generated question variants (new) ───────────────
                    var questions = await GenerateQuestionsAsync(
                        fileName, chunk.SectionTitle ?? "", chunk.ChunkText);

                    float[] questionsEmbedding = Array.Empty<float>();
                    if (questions.Length > 0)
                    {
                        // Join all questions into one string → one embedding
                        // This creates a vector covering all phrasing variants
                        var joined = string.Join(" ", questions);
                        questionsEmbedding = await _embedding.GetEmbeddingAsync(joined);
                    }

                    chunk.TitleEmbedding     = titleEmbedding.Length > 0 ? titleEmbedding : null;
                    chunk.QuestionsText      = questions.Length > 0 ? questions : null;
                    chunk.QuestionsEmbedding = questionsEmbedding.Length > 0 ? questionsEmbedding : null;

                    await SaveChunkAsync(chunk, bodyEmbedding);
                    result.ChunksCreated++;

                    // Small delay to avoid HuggingFace rate limits
                    await Task.Delay(100);
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

    // ================================================================
    // GENERATE QUESTION VARIANTS via Groq
    // Asks the LLM: "how might an interviewer ask about this content?"
    // Returns 5 question strings, or empty array on failure.
    // ================================================================
    private async Task<string[]> GenerateQuestionsAsync(
        string fileName, string sectionTitle, string chunkText)
    {
        try
        {
            // Use first 400 chars of body — enough context, keeps prompt small
            var bodyPreview = chunkText.Length > 400
                ? chunkText[..400] + "..."
                : chunkText;

            var prompt = $"""
                File: {fileName}
                Section: {sectionTitle}

                Content:
                {bodyPreview}

                Generate exactly 5 different ways an interviewer might ask about this content.
                Cover a range: formal, casual, direct, indirect, follow-up phrasing.
                Return ONLY a JSON array of 5 strings, no explanation, no markdown.
                Example format: ["question 1", "question 2", "question 3", "question 4", "question 5"]
                """;

            var requestBody = new
            {
                model = _groqModel,
                max_tokens = 300,
                temperature = 0.4,
                messages = new[]
                {
                    new {
                        role = "system",
                        content = "You generate interview question variants for a RAG search index. Respond ONLY with a JSON array of exactly 5 strings. No other text, no markdown backticks."
                    },
                    new { role = "user", content = prompt }
                }
            };

            var response = await _groqClient.PostAsJsonAsync(
                "https://api.groq.com/openai/v1/chat/completions", requestBody);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Groq question generation failed: {Status}", response.StatusCode);
                return Array.Empty<string>();
            }

            var json    = await response.Content.ReadFromJsonAsync<JsonElement>();
            var rawText = json
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "";

            // Strip markdown fences if Groq adds them despite instructions
            rawText = rawText.Trim()
                .TrimStart('`').TrimEnd('`')
                .Replace("```json", "").Replace("```", "")
                .Trim();

            var questions = JsonSerializer.Deserialize<string[]>(rawText);
            if (questions == null || questions.Length == 0)
            {
                _logger.LogWarning("Empty question array for: {Title}", sectionTitle);
                return Array.Empty<string>();
            }

            var result = questions.Take(5).ToArray();
            _logger.LogInformation(
                "  Questions for '{Title}': [{Q}]",
                sectionTitle, string.Join(" | ", result));

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Question generation failed for: {Title}", sectionTitle);
            return Array.Empty<string>();
        }
    }

    // ================================================================
    // SPLIT INTO CHUNKS
    // ================================================================
    private List<KnowledgeChunk> SplitIntoChunks(string content, string fileName)
    {
        var chunks   = new List<KnowledgeChunk>();
        var sections = Regex.Split(content, @"(?=^##\s)", RegexOptions.Multiline);

        int index = 0;
        foreach (var section in sections)
        {
            var trimmed = section.Trim();
            if (string.IsNullOrWhiteSpace(trimmed)) continue;

            var lines   = trimmed.Split('\n');
            var heading = lines[0].TrimStart('#').Trim();
            var body    = string.Join('\n', lines.Skip(1)).Trim();

            if (body.Length < 30) continue;

            var fileNameClean = Path.GetFileNameWithoutExtension(fileName).Replace("-", " ");

            var enrichedText =
                $"Topic: {fileNameClean}\n" +
                $"Section: {heading}\n\n" +
                body;

            var topic          = ChunkMetadataHelper.ExtractTopic(fileName);
            var tags           = ChunkMetadataHelper.ExtractTags(heading, body, fileName);
            var titleWordCount = heading.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;

            _logger.LogInformation(
                "  {File} | {Heading} | topic={Topic} | tags=[{Tags}] | titleWords={W}",
                fileName, heading, topic, string.Join(", ", tags), titleWordCount);

            chunks.Add(new KnowledgeChunk
            {
                SourceFile     = fileName,
                SectionTitle   = heading,
                ChunkText      = enrichedText,
                ChunkIndex     = index++,
                Topic          = topic,
                Tags           = tags,
                TitleWordCount = titleWordCount,
            });
        }

        return chunks;
    }

    // ================================================================
    // SAVE CHUNK — includes all 3 embeddings + questions_text
    // ================================================================
    private async Task SaveChunkAsync(KnowledgeChunk chunk, float[] bodyEmbedding)
    {
        var dsb = new NpgsqlDataSourceBuilder(_connectionString);
        dsb.UseVector();
        await using var ds   = dsb.Build();
        await using var conn = await ds.OpenConnectionAsync();

        await using var cmd = new NpgsqlCommand(@"
            INSERT INTO knowledge_chunks
                (source_file, section_title, chunk_text, chunk_index,
                 embedding, topic, tags,
                 title_embedding, questions_embedding, questions_text, title_word_count)
            VALUES
                (@sourceFile, @sectionTitle, @chunkText, @chunkIndex,
                 @embedding, @topic, @tags,
                 @titleEmbedding, @questionsEmbedding, @questionsText, @titleWordCount)",
            conn);

        cmd.Parameters.AddWithValue("sourceFile",    chunk.SourceFile);
        cmd.Parameters.AddWithValue("sectionTitle",  chunk.SectionTitle ?? "");
        cmd.Parameters.AddWithValue("chunkText",     chunk.ChunkText);
        cmd.Parameters.AddWithValue("chunkIndex",    chunk.ChunkIndex);
        cmd.Parameters.AddWithValue("embedding",     new Vector(bodyEmbedding));
        cmd.Parameters.AddWithValue("topic",         chunk.Topic        ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("tags",          chunk.Tags         ?? Array.Empty<string>());
        cmd.Parameters.AddWithValue("titleWordCount",chunk.TitleWordCount);

        // Nullable new columns
        if (chunk.TitleEmbedding?.Length > 0)
            cmd.Parameters.AddWithValue("titleEmbedding", new Vector(chunk.TitleEmbedding));
        else
            cmd.Parameters.AddWithValue("titleEmbedding", DBNull.Value);

        if (chunk.QuestionsEmbedding?.Length > 0)
            cmd.Parameters.AddWithValue("questionsEmbedding", new Vector(chunk.QuestionsEmbedding));
        else
            cmd.Parameters.AddWithValue("questionsEmbedding", DBNull.Value);

        if (chunk.QuestionsText?.Length > 0)
            cmd.Parameters.AddWithValue("questionsText", chunk.QuestionsText);
        else
            cmd.Parameters.AddWithValue("questionsText", DBNull.Value);

        await cmd.ExecuteNonQueryAsync();
    }

    // ================================================================
    // CLEAR EXISTING CHUNKS
    // ================================================================
    private async Task ClearExistingChunksAsync()
    {
        var dsb = new NpgsqlDataSourceBuilder(_connectionString);
        dsb.UseVector();
        await using var ds   = dsb.Build();
        await using var conn = await ds.OpenConnectionAsync();
        await using var cmd  = new NpgsqlCommand(
            "TRUNCATE knowledge_chunks RESTART IDENTITY CASCADE", conn);
        await cmd.ExecuteNonQueryAsync();
        _logger.LogInformation("Cleared existing chunks");
    }
}