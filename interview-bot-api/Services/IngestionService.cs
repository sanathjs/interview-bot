using Npgsql;
using Pgvector;
using Pgvector.Npgsql;
using System.Text.RegularExpressions;
using interview_bot_api.Models;

namespace interview_bot_api.Services;

public class IngestionService
{
    private readonly string _connectionString;
    private readonly HttpClient _httpClient;
    private readonly ILogger<IngestionService> _logger;
    private readonly EmbeddingService _embedding;

    public IngestionService(
        IConfiguration config,
        ILogger<IngestionService> logger,
        EmbeddingService embedding)
    {
        _logger           = logger;
        _connectionString = config["DATABASE_URL"]!;
        _embedding        = embedding;
        _httpClient       = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
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
            try
            {
                var content = await File.ReadAllTextAsync(filePath);
                var chunks  = SplitIntoChunks(content, fileName);

                _logger.LogInformation("{File} → {Count} chunks", fileName, chunks.Count);

                foreach (var chunk in chunks)
                {
                    var embedding = await _embedding.GetEmbeddingAsync(chunk.ChunkText);

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

            // Embed only: topic header + section heading + raw body content.
            // Do NOT include "Related questions" aliases in the embedded text —
            // they bloat the vector with generic interview phrases that cause
            // career-journey chunks to score 90%+ on every question.
            var enrichedText =
                $"Topic: {fileNameClean}\n" +
                $"Section: {heading}\n\n" +
                body;

            // ── derive topic and tags for this chunk ───────────────────────
            var topic = ChunkMetadataHelper.ExtractTopic(fileName);
            var tags  = ChunkMetadataHelper.ExtractTags(heading, body);

            _logger.LogInformation(
                "  {File} | {Heading} | topic={Topic} | tags=[{Tags}]",
                fileName, heading, topic, string.Join(", ", tags));

            chunks.Add(new KnowledgeChunk
            {
                SourceFile   = fileName,
                SectionTitle = heading,
                ChunkText    = enrichedText,
                ChunkIndex   = index++,
                Topic        = topic,
                Tags         = tags,
            });
        }

        return chunks;
    }

    // ================================================================
    // SAVE CHUNK — includes topic and tags
    // ================================================================
    private async Task SaveChunkAsync(KnowledgeChunk chunk, float[] embedding)
    {
        var dataSourceBuilder = new NpgsqlDataSourceBuilder(_connectionString);
        dataSourceBuilder.UseVector();
        await using var dataSource = dataSourceBuilder.Build();
        await using var conn = await dataSource.OpenConnectionAsync();

        await using var cmd = new NpgsqlCommand(@"
            INSERT INTO knowledge_chunks
                (source_file, section_title, chunk_text, chunk_index, embedding, topic, tags)
            VALUES
                (@sourceFile, @sectionTitle, @chunkText, @chunkIndex, @embedding, @topic, @tags)",
            conn);

        cmd.Parameters.AddWithValue("sourceFile",   chunk.SourceFile);
        cmd.Parameters.AddWithValue("sectionTitle", chunk.SectionTitle ?? "");
        cmd.Parameters.AddWithValue("chunkText",    chunk.ChunkText);
        cmd.Parameters.AddWithValue("chunkIndex",   chunk.ChunkIndex);
        cmd.Parameters.AddWithValue("embedding",    new Vector(embedding));
        cmd.Parameters.AddWithValue("topic",        chunk.Topic        ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("tags",         chunk.Tags         ?? Array.Empty<string>());

        await cmd.ExecuteNonQueryAsync();
    }

    // ================================================================
    // CLEAR EXISTING CHUNKS
    // ================================================================
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