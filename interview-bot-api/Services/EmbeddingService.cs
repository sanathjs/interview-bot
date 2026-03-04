using System.Net.Http.Json;
using System.Text.Json;

namespace interview_bot_api.Services;

public class EmbeddingService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<EmbeddingService> _logger;

    // BAAI/bge-base-en-v1.5:
    // - 768 dimensions (same as your existing pgvector column — no DB changes)
    // - Works perfectly on HF serverless inference API
    // - Free, fast, excellent quality for RAG
    private const string HF_URL =
        "https://router.huggingface.co/hf-inference/models/" +
        "BAAI/bge-base-en-v1.5/pipeline/feature-extraction";

    public EmbeddingService(IConfiguration config, ILogger<EmbeddingService> logger)
    {
        _logger = logger;
        var apiKey = config["HuggingFace:ApiKey"]!;
        _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
    }

    public async Task<float[]> GetEmbeddingAsync(string text)
    {
        try
        {
            var body = new
            {
                inputs = text,
                options = new { wait_for_model = true }
            };

            var response = await _httpClient.PostAsJsonAsync(HF_URL, body);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadFromJsonAsync<JsonElement>();

            if (json.ValueKind != JsonValueKind.Array)
            {
                _logger.LogError("Unexpected HF response: {Json}", json);
                return Array.Empty<float>();
            }

            // HF returns float[][] (batch) or float[] (single) — handle both
            var first = json[0];
            return first.ValueKind == JsonValueKind.Array
                ? first.EnumerateArray().Select(e => (float)e.GetDouble()).ToArray()
                : json.EnumerateArray().Select(e => (float)e.GetDouble()).ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "HuggingFace embedding failed");
            return Array.Empty<float>();
        }
    }
}