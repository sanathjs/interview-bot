using Microsoft.AspNetCore.Mvc;
using interview_bot_api.Models;
using interview_bot_api.Services;

namespace interview_bot_api.Controllers;

[ApiController]
[Route("api")]
public class ChatController : ControllerBase
{
    private readonly ChatService _chat;
    private readonly ILogger<ChatController> _logger;

    public ChatController(ChatService chat,
        ILogger<ChatController> logger)
    {
        _chat = chat;
        _logger = logger;
    }

    // ================================================================
    // POST /api/chat — main chat endpoint
    // ================================================================
    [HttpPost("chat")]
    public async Task<ActionResult<ChatResponse>> Chat(
        [FromBody] ChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { error = "Message cannot be empty" });

        if (string.IsNullOrWhiteSpace(request.SessionId))
            return BadRequest(new { error = "SessionId cannot be empty" });

        try
        {
            var response = await _chat.ChatAsync(request);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Chat error");
            return StatusCode(500, new { error = "Something went wrong" });
        }
    }

    // ================================================================
    // GET /api/sessions/{sessionId}/transcript — full chat history
    // ================================================================
    [HttpGet("sessions/{sessionId}/transcript")]
    public async Task<IActionResult> GetTranscript(string sessionId)
    {
        try
        {
            var response = await _chat.GetTranscriptAsync(sessionId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Transcript error");
            return StatusCode(500, new { error = "Something went wrong" });
        }
    }

    // ================================================================
    // GET /api/unanswered — Sanath's prep dashboard
    // ================================================================
    [HttpGet("unanswered")]
    public async Task<IActionResult> GetUnanswered()
    {
        try
        {
            var response = await _chat.GetUnansweredAsync();
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unanswered fetch error");
            return StatusCode(500, new { error = "Something went wrong" });
        }
    }

    // PATCH /api/unanswered/{id}/answer
[HttpPatch("unanswered/{id}/answer")]
public async Task<IActionResult> SaveAnswer(
    int id, [FromBody] SaveAnswerRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Answer))
        return BadRequest(new { error = "Answer cannot be empty" });

    var success = await _chat.SaveAnswerAsync(id, request.Answer);
    if (!success)
        return NotFound(new { error = "Question not found" });

    return Ok(new { message = "Answer saved ✅" });
}

// POST /api/unanswered/{id}/promote
[HttpPost("unanswered/{id}/promote")]
public async Task<IActionResult> PromoteToKb(int id)
{
    var success = await _chat.PromoteToKbAsync(id);
    if (!success)
        return BadRequest(new {
            error = "Promote failed — make sure answer is saved first" });

    return Ok(new { message = "Added to knowledge base ✅" });
}

// DELETE /api/unanswered/{id}
[HttpDelete("unanswered/{id}")]
public async Task<IActionResult> DeleteUnanswered(int id)
{
    var success = await _chat.DeleteUnansweredAsync(id);
    if (!success)
        return NotFound(new { error = "Question not found" });

    return Ok(new { message = "Deleted ✅" });
}

// Add both of these inside ChatController, alongside your existing endpoints

// ================================================================
// GET /api/sessions — list all sessions
// ================================================================
[HttpGet("sessions")]
public async Task<IActionResult> GetSessions()
{
    try
    {
        var response = await _chat.GetSessionsAsync();
        return Ok(response);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Sessions fetch error");
        return StatusCode(500, new { error = "Something went wrong" });
    }
}

// ================================================================
// GET /api/sessions/{id}/detail — session + transcript by numeric id
// Note: keep your existing GET /api/sessions/{sessionId}/transcript
// if anything else uses it. This is a NEW endpoint for the history UI.
// ================================================================
[HttpGet("sessions/{id:int}/detail")]
public async Task<IActionResult> GetSessionDetail(int id)
{
    try
    {
        var response = await _chat.GetTranscriptByIdAsync(id);
        if (response == null)
            return NotFound(new { error = "Session not found" });
        return Ok(response);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Session detail error for id {Id}", id);
        return StatusCode(500, new { error = "Something went wrong" });
    }
}
}