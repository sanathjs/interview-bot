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

// ── 2. GET SESSIONS — auto-expires stale active sessions ─────────────────────
// Sessions stuck as "active" for more than 2 hours are auto-marked completed.
// This is the server-side safety net for when ALL client-side signals fail
// (killed browser process, network drop, device crash, etc.)

[HttpGet("sessions")]
public async Task<IActionResult> GetSessions()
{
    try
    {
        // Auto-expire sessions active for more than 2 hours before fetching
        // This runs fast — it's a single UPDATE with a WHERE clause + index on started_at
        await _chat.AutoExpireStaleSessionsAsync();

        var sessions = await _chat.GetSessionsAsync();
        return Ok(new { sessions });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error fetching sessions");
        return StatusCode(500, new { error = "Failed to fetch sessions" });
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
// ================================================================
// ADD THESE TWO ENDPOINTS TO ChatController.cs
// Place them after the existing GetSessionDetail endpoint
// ================================================================

// PATCH /api/sessions/{sessionCode}/details
// Called right after session is created — saves interviewer name + company
[HttpPatch("sessions/{sessionCode}/details")]
public async Task<IActionResult> UpdateSessionDetails(
    string sessionCode,
    [FromBody] UpdateSessionDetailsRequest request)
{
    try
    {
        await _chat.UpdateSessionDetailsAsync(sessionCode, request);
        return Ok(new { message = "Session details updated ✅" });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "UpdateSessionDetails error for {Code}", sessionCode);
        return StatusCode(500, new { error = "Something went wrong" });
    }
}

// ── 1. END SESSION endpoint ───────────────────────────────────────────────────
// Handles ALL three ways a session can end:
//   a) Manual "End Session" button  → JSON POST
//   b) Page unload / tab close      → sendBeacon (text/plain, no body)
//   c) SPA navigation away          → fetch with keepalive:true
//   d) Tab hidden / phone locked    → sendBeacon from visibilitychange
//
// IMPORTANT: Do NOT use [FromBody] — sendBeacon sends Content-Type: text/plain
// with no JSON body, so [FromBody] will cause a 400 on beacon requests.

[HttpPost("sessions/{sessionCode}/end")]
public async Task<IActionResult> EndSession(string sessionCode)
{
    try
    {
        await _chat.EndSessionAsync(sessionCode);
        return Ok(new { message = "Session ended", sessionCode });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error ending session {SessionCode}", sessionCode);
        // Still return 200 — client doesn't need to retry on partial failures
        return Ok(new { message = "Session end attempted", sessionCode });
    }
}

// PATCH /api/messages/{sequenceNumber}/feedback
// Called when interviewer clicks 👍 or 👎
[HttpPatch("messages/{sequenceNumber}/feedback")]
public async Task<IActionResult> MessageFeedback(
    int sequenceNumber,
    [FromBody] MessageFeedbackRequest request)
{
    try
    {
        await _chat.SaveMessageFeedbackAsync(
            request.SessionCode, sequenceNumber, request.Helpful);
        return Ok(new { message = "Feedback saved ✅" });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Feedback error");
        return StatusCode(500, new { error = "Something went wrong" });
    }
}
}