using interview_bot_api.Models;
using interview_bot_api.Services;
using Microsoft.AspNetCore.Mvc;

namespace interview_bot_api.Controllers;

[ApiController]
[Route("api/skill-gap")]
public class SkillGapController : ControllerBase
{
    private readonly SkillGapService          _service;
    private readonly ILogger<SkillGapController> _logger;

    public SkillGapController(SkillGapService service, ILogger<SkillGapController> logger)
    {
        _service = service;
        _logger  = logger;
    }

    // POST /api/skill-gap
    // Main analysis endpoint — fetch jobs + run gap analysis
    [HttpPost]
    public async Task<IActionResult> Analyze([FromBody] SkillGapRequest request)
    {
        try
        {
            var result = await _service.AnalyzeAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SkillGap analysis failed");
            return StatusCode(500, new { error = "Analysis failed. Please try again." });
        }
    }

    // POST /api/skill-gap/save-job
    // Save or update a job application status
    [HttpPost("save-job")]
    public async Task<IActionResult> SaveJob([FromBody] SaveJobRequest request)
    {
        var ok = await _service.SaveJobApplicationAsync(request);
        return ok ? Ok(new { success = true }) : StatusCode(500, new { error = "Save failed" });
    }

    // GET /api/skill-gap/saved-jobs
    // Get all saved/tracked jobs
    [HttpGet("saved-jobs")]
    public async Task<IActionResult> GetSavedJobs()
    {
        var jobs = await _service.GetSavedJobsAsync();
        return Ok(new { jobs });
    }

    // GET /api/skill-gap/settings
    // Get user settings (e.g. auto_digest_enabled)
    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var autoDigest = await _service.GetSettingAsync("auto_digest_enabled") ?? "false";
        var keywords   = await _service.GetSettingAsync("digest_keywords")     ?? "Lead .NET Engineer Senior C# Developer";
        var location   = await _service.GetSettingAsync("digest_location")     ?? "Bengaluru";

        return Ok(new { autoDigest = autoDigest == "true", keywords, location });
    }

    // POST /api/skill-gap/settings
    // Update user settings
    [HttpPost("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] Dictionary<string, string> settings)
    {
        foreach (var (key, value) in settings)
            await _service.UpsertSettingAsync(key, value);

        return Ok(new { success = true });
    }
}