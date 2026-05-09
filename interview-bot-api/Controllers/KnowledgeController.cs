using Microsoft.AspNetCore.Mvc;
using Npgsql;
using interview_bot_api.Services;

namespace interview_bot_api.Controllers;

[ApiController]
[Route("api/knowledge")]
public class KnowledgeController : ControllerBase
{
    private readonly DatabaseConnectionManager _dbManager;
    private readonly ILogger<KnowledgeController> _logger;

    public KnowledgeController(
        DatabaseConnectionManager dbManager,
        ILogger<KnowledgeController> logger)
    {
        _dbManager = dbManager;
        _logger    = logger;
    }

    // ================================================================
    // GET /api/knowledge/files
    // Returns the list of knowledge-source files with display names
    // and the number of chunks each file has.
    // Excludes answering-guidelines (internal prompt, not KB content).
    // ================================================================
    [HttpGet("files")]
    public async Task<IActionResult> GetFiles()
    {
        try
        {
            await using var db = await _dbManager.OpenConnectionAsync();

            await using var cmd = new NpgsqlCommand(@"
                SELECT source_file, COUNT(*)::int AS chunk_count
                FROM knowledge_chunks
                WHERE source_file NOT LIKE '%answering-guidelines%'
                GROUP BY source_file
                ORDER BY source_file", db.Connection);

            var files = new List<object>();
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var sourceFile  = reader.GetString(0);
                var chunkCount  = reader.GetInt32(1);
                var displayName = FormatDisplayName(sourceFile);
                files.Add(new { sourceFile, displayName, chunkCount });
            }

            return Ok(new { files });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching knowledge files");
            return StatusCode(500, new { error = "Failed to fetch knowledge files" });
        }
    }

    // ================================================================
    // GET /api/knowledge/files/{sourceFile}
    // Returns all chunks for a given source file, ordered by chunk_index.
    // Body text has the "Topic: X\nSection: Y\n\n" prefix stripped.
    // questions_text (AI-generated question variants) is included when present.
    // ================================================================
    [HttpGet("files/{sourceFile}")]
    public async Task<IActionResult> GetFileChunks(string sourceFile)
    {
        try
        {
            await using var db = await _dbManager.OpenConnectionAsync();

            await using var cmd = new NpgsqlCommand(@"
                SELECT section_title, chunk_text, questions_text
                FROM knowledge_chunks
                WHERE source_file = @sourceFile
                ORDER BY chunk_index", db.Connection);

            cmd.Parameters.AddWithValue("sourceFile", sourceFile);

            var chunks = new List<object>();
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var sectionTitle = reader.IsDBNull(0) ? "" : reader.GetString(0);
                var chunkText    = reader.GetString(1);
                var body         = StripChunkPrefix(chunkText);

                // questions_text is a text[] column; Npgsql reads it as string[]
                string[]? questions = null;
                if (!reader.IsDBNull(2))
                    questions = reader.GetFieldValue<string[]>(2);

                chunks.Add(new { sectionTitle, body, questions });
            }

            if (chunks.Count == 0)
                return NotFound(new { error = "No chunks found for this file" });

            var displayName = FormatDisplayName(sourceFile);
            return Ok(new { sourceFile, displayName, chunks });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching chunks for {File}", sourceFile);
            return StatusCode(500, new { error = "Failed to fetch file content" });
        }
    }

    // ================================================================
    // Strips the "Topic: X\nSection: Y\n\n" prefix that IngestionService
    // prepends to every chunk before embedding.
    // ================================================================
    private static string StripChunkPrefix(string chunkText)
    {
        var idx = chunkText.IndexOf("\n\n", StringComparison.Ordinal);
        return idx >= 0 ? chunkText[(idx + 2)..].Trim() : chunkText.Trim();
    }

    // ================================================================
    // Converts a source filename to a human-readable display name.
    // E.g. "dotnet-interview-qa.md" → "DotNet Interview Q&A"
    // ================================================================
    private static readonly Dictionary<string, string> WordOverrides =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["dotnet"]   = "DotNet",
            ["qa"]       = "Q&A",
            ["hr"]       = "HR",
            ["ai"]       = "AI",
            ["rag"]      = "RAG",
            ["dp"]       = "DP",
            ["my"]       = "My",
        };

    private static string FormatDisplayName(string sourceFile)
    {
        // Remove ".md" extension, split on hyphens, title-case each word
        var name = System.IO.Path.GetFileNameWithoutExtension(sourceFile);
        var words = name.Split('-', StringSplitOptions.RemoveEmptyEntries);
        var formatted = words.Select(w =>
            WordOverrides.TryGetValue(w, out var ov) ? ov
            : char.ToUpper(w[0]) + w[1..].ToLower());
        return string.Join(" ", formatted);
    }
}
