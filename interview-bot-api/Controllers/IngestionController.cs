using Microsoft.AspNetCore.Mvc;
using interview_bot_api.Services;

namespace interview_bot_api.Controllers;

[ApiController]
[Route("api")]
public class IngestionController : ControllerBase
{
    private readonly IngestionService _ingestion;
    private readonly IConfiguration _config;

    public IngestionController(IngestionService ingestion, IConfiguration config)
    {
        _ingestion = ingestion;
        _config = config;
    }

    [HttpPost("ingest")]
    public async Task<IActionResult> Ingest(
        [FromHeader(Name = "X-Admin-Key")] string adminKey)
    {
        if (adminKey != _config["ADMIN_INGEST_KEY"])
            return Unauthorized(new { error = "Invalid admin key" });

        var kbPath = Path.GetFullPath(
                     Path.Combine(Directory.GetCurrentDirectory(),
                        "knowledge-base"));

        if (!Directory.Exists(kbPath))
            return BadRequest(new
            {
                error = "knowledge-base folder not found",
                lookedAt = kbPath
            });

        var result = await _ingestion.IngestDirectoryAsync(kbPath);

        return Ok(new
        {
            message = "Ingestion complete ✅",
            filesProcessed = result.FilesProcessed,
            chunksCreated = result.ChunksCreated,
            filesIngested = result.FilesIngested,
            errors = result.Errors
        });
    }
}