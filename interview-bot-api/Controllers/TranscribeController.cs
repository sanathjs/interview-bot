using Microsoft.AspNetCore.Mvc;

namespace interview_bot_api.Controllers;

[ApiController]
[Route("api")]
public class TranscribeController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ILogger<TranscribeController> _logger;
    private readonly HttpClient _httpClient;

    public TranscribeController(
        IConfiguration config,
        ILogger<TranscribeController> logger)
    {
        _config = config;
        _logger = logger;
        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(30)
        };
    }

    // ================================================================
    // POST /api/transcribe
    // Receives audio blob from browser, forwards to Groq Whisper
    // ================================================================
    [HttpPost("transcribe")]
    [RequestSizeLimit(25 * 1024 * 1024)]   // 25 MB max
    public async Task<IActionResult> Transcribe(IFormFile audio)
    {
        if (audio == null || audio.Length == 0)
            return BadRequest(new { error = "No audio file received" });

        try
        {
            var apiKey  = _config["Groq:ApiKey"];
            var baseUrl = _config["Groq:BaseUrl"]
                          ?? "https://api.groq.com/openai/v1";

            // Read uploaded audio into memory
            using var ms = new MemoryStream();
            await audio.CopyToAsync(ms);
            ms.Position = 0;

            // Build multipart form for Groq Whisper
            using var form = new MultipartFormDataContent();

            var audioContent = new ByteArrayContent(ms.ToArray());

            // Strip codec params — MediaTypeHeaderValue rejects "audio/webm;codecs=opus"
            var rawMime = audio.ContentType ?? "audio/webm";
            var cleanMime = rawMime.Split(';')[0].Trim();  // → "audio/webm"

            audioContent.Headers.ContentType =
                new System.Net.Http.Headers.MediaTypeHeaderValue(cleanMime);

            // Groq requires the filename to have the right extension
            var ext = audio.FileName.EndsWith(".ogg") ? "ogg" : "webm";
            form.Add(audioContent, "file", $"recording.{ext}");
            form.Add(new StringContent("whisper-large-v3-turbo"), "model");
            form.Add(new StringContent("en"),  "language");
            form.Add(new StringContent("text"), "response_format");

            var request = new HttpRequestMessage(
                HttpMethod.Post, $"{baseUrl}/audio/transcriptions");
            request.Headers.Add("Authorization", $"Bearer {apiKey}");
            request.Content = form;

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                _logger.LogError("Groq Whisper error: {Err}", err);
                return StatusCode(502, new { error = "Transcription service error" });
            }

            // Groq returns plain text when response_format=text
            var transcribedText = await response.Content.ReadAsStringAsync();
            transcribedText = transcribedText.Trim();

            _logger.LogInformation("Transcribed: {Text}", transcribedText);

            return Ok(new { text = transcribedText });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Transcribe endpoint failed");
            return StatusCode(500, new { error = "Transcription failed" });
        }
    }
}