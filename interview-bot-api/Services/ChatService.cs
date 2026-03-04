using Npgsql;
using Pgvector;
using Pgvector.Npgsql;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using interview_bot_api.Models;

namespace interview_bot_api.Services;

public class ChatService
{
    private readonly IConfiguration _config;
    private readonly string _llmProvider;
    private readonly KnowledgeSearchService _search;
    private readonly string _connectionString;
    private readonly HttpClient _httpClient;
    private readonly ILogger<ChatService> _logger;
    private readonly string _ollamaBaseUrl;
    private readonly string _chatModel;

    public ChatService(
        KnowledgeSearchService search,
        IConfiguration config,
        ILogger<ChatService> logger)
    {
        _search = search;
        _logger = logger;
        _connectionString = config["DATABASE_URL"]!;
        _ollamaBaseUrl = config["Ollama:BaseUrl"] ?? "http://localhost:11434";
        _chatModel = config["Ollama:ChatModel"] ?? "llama3.2";
        _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(180) };
        _config = config;
        _llmProvider = config["LlmProvider"] ?? "ollama";
    }

    // ================================================================
    // MAIN CHAT METHOD
    // ================================================================
    public async Task<ChatResponse> ChatAsync(ChatRequest request)
    {
        // Step 1: Make sure session exists in DB
        await EnsureSessionExistsAsync(request.SessionId);

        // Step 2: Save interviewer's question to chat_messages
        var questionMsgId = await SaveMessageAsync(
            request.SessionId,
            "interviewer",
            request.Message,
            null, null, null);

        // Step 3: Search knowledge base
        var (results, topScore) = await _search.SearchAsync(request.Message, topK: 10);
        var confidenceLevel = _search.GetConfidenceLevel(topScore);

        _logger.LogInformation(
            "Confidence: {Level} ({Score:F3}) for: {Q}",
            confidenceLevel, topScore, request.Message);

        ChatResponse response;

        // Step 4: Decide what to do based on confidence
        if (confidenceLevel == "low" && !request.UseFallback)
        {
            // NOT in knowledge base — store as unanswered
            response = await HandleUnansweredAsync(
                request, questionMsgId, topScore);
        }
        else if (request.UseFallback)
        {
            // User chose to use Ollama as fallback
            response = await HandleFallbackAsync(request, topScore);
        }
        else
        {
            // Found in knowledge base — answer as Sanath
            response = await HandleKnowledgeBaseAnswerAsync(
                request, results, topScore, confidenceLevel);
        }

        // Step 5: Save bot response to chat_messages
        await SaveMessageAsync(
            request.SessionId,
            "bot",
            response.Answer,
            topScore,
            response.AnswerSource,
            response.UsedFallback ? "ollama" : null);

        return response;
    }

    // ================================================================
    // HIGH/MEDIUM CONFIDENCE — answer from knowledge base
    // ================================================================
    private async Task<ChatResponse> HandleKnowledgeBaseAnswerAsync(
    ChatRequest request,
    List<SearchResult> results,
    double topScore,
    string confidenceLevel)
{
    var questionLower = request.Message.ToLower();

    // For career questions → fetch ALL career chunks directly
 var isCareerQuestion = new[] {
    "career", "journey", "work history", "walk me through",
    "companies you worked", "previous companies"
}.Any(k => questionLower.Contains(k));

// ADD THIS:
var isChallengeQuestion = new[] {
    "challenge", "difficult", "tough", "obstacle",
    "hard situation", "problem you faced", "conflict"
}.Any(k => questionLower.Contains(k));

var isLeadershipQuestion = new[] {
    "led a team", "leadership", "mentored", "managed a team",
    "led people", "team lead"
}.Any(k => questionLower.Contains(k));

List<SearchResult> contextChunks;

if (isCareerQuestion)
{
    contextChunks = await GetAllChunksFromFileAsync("career-journey.md");
    if (contextChunks.Count == 0)
        contextChunks = results.Take(5).ToList();
}
else if (isChallengeQuestion)
{
    contextChunks = await GetAllChunksFromFileAsync("challenges.md");
    if (contextChunks.Count == 0)
        contextChunks = results.Take(3).ToList();
}
else if (isLeadershipQuestion)
{
    contextChunks = await GetAllChunksFromFileAsync("leadership.md");
    if (contextChunks.Count == 0)
        contextChunks = results.Take(3).ToList();
}
else
{
    var filtered = results
        .Where(r => r.Similarity >= topScore - 0.08)
        .Take(3)
        .ToList();

    var topFile = filtered.First().SourceFile;
    var sameFile = filtered
        .Where(r => r.SourceFile == topFile)
        .ToList();

    contextChunks = sameFile.Count >= 1 ? sameFile : filtered;
}
    var context = string.Join("\n\n---\n\n",
        contextChunks.Select(r =>
            $"[From {r.SourceFile} — {r.SectionTitle}]\n{r.ChunkText}"));

    var prompt = $@"You are Sanath Kumar J S, a Lead Software Engineer
based in Bengaluru with 10+ years of .NET experience.

CRITICAL RULES:
1. Answer in FIRST PERSON as Sanath. You ARE Sanath.
2. ONLY use facts from the CONTEXT below. Nothing else.
3. NEVER say 'if I recall' or any uncertain phrase.
4. NEVER invent projects, people, or experiences.
5. NEVER add information not asked for in the question.
6. Be confident and natural like a real interview.
7. Do not start your answer with 'I'.

FORMATTING RULES — apply ONLY if the question matches:
- If question asks about career journey, work history,
  or companies worked at:
  → List companies MOST RECENT FIRST (Ingenio first, Toyota last)
  → Company Names should be displayed in bold
  → One line per company: Company (years) — Role — one key thing
  → End with one sentence about what you are looking for next

- If question asks about a specific topic (RAG, .NET,
  design patterns, leadership, challenges, strengths):
  → Answer ONLY that topic in 3-5 sentences
  → Do NOT list companies unless directly relevant
  → Do NOT add career history unprompted

- If question is an introduction:
  → 3-4 sentences max, high level only

CONTEXT:
{context}

QUESTION: {request.Message}

ANSWER (answer ONLY what was asked, use ONLY context facts):";

    var answer = _llmProvider == "groq"
        ? await CallGroqAsync(prompt)
        : await CallOllamaAsync(prompt);

    return new ChatResponse
    {
        Answer = answer,
        AnswerSource = "knowledge_base",
        ConfidenceScore = topScore,
        UsedFallback = false,
        SessionId = request.SessionId,
        Sources = contextChunks.Take(3).Select(r => new SourceChunk
        {
            SourceFile = r.SourceFile,
            SectionTitle = r.SectionTitle,
            Similarity = r.Similarity
        }).ToList()
    };
}
    // ================================================================
    // LOW CONFIDENCE — store as unanswered, return polite message
    // ================================================================
    private async Task<ChatResponse> HandleUnansweredAsync(
        ChatRequest request,
        int questionMsgId,
        double topScore)
    {
        // Save to unanswered_questions table
        await SaveUnansweredQuestionAsync(
            request.SessionId,
            questionMsgId,
            request.Message);

        var answer =
            "I'm sorry, I couldn't find that in my knowledge base right now. " +
            "Sanath can answer you directly on this one.\n\n" +
            "I've stored your question so Sanath can prepare a proper answer " +
            "and come back to it next time! 📝\n\n" +
            "Would you like Sanath to answer this live, " +
            "or shall we move on to the next question?";

        return new ChatResponse
        {
            Answer = answer,
            AnswerSource = "unanswered",
            ConfidenceScore = topScore,
            UsedFallback = false,
            SessionId = request.SessionId,
            Sources = new List<SourceChunk>()
        };
    }

    // ================================================================
    // FALLBACK — user chose to use Ollama directly
    // ================================================================
    private async Task<ChatResponse> HandleFallbackAsync(
        ChatRequest request,
        double topScore)
    {
        var prompt = $@"Answer this job interview question for a senior 
        .NET full-stack developer role. Be professional, technically 
        accurate, and concise. Answer in 3-5 sentences maximum.

        QUESTION: {request.Message}

        ANSWER:";

   var answer = _llmProvider == "groq"
    ? await CallGroqAsync(prompt)
    : await CallOllamaAsync(prompt);

        return new ChatResponse
        {
            Answer = $"[AI-assisted answer]\n\n{answer}",
            AnswerSource = "fallback_ai",
            ConfidenceScore = topScore,
            UsedFallback = true,
            SessionId = request.SessionId,
            Sources = new List<SourceChunk>()
        };
    }

    // ================================================================
    // CALL OLLAMA — send prompt, get response
    // ================================================================
    private async Task<string> CallOllamaAsync(string prompt)
{
    try
    {
        var request = new
        {
            model = _chatModel,
            prompt = prompt,
            stream = false,
            options = new
            {
                num_predict = 300,
                temperature = 0.2,  // ← very low = strict, no hallucination
                top_p = 0.9,
                top_k = 40,
                repeat_penalty = 1.1
            }
        };

        var response = await _httpClient.PostAsJsonAsync(
            $"{_ollamaBaseUrl}/api/generate", request);

        response.EnsureSuccessStatusCode();

        var json = await response.Content
            .ReadFromJsonAsync<JsonElement>();

        return json.GetProperty("response")
            .GetString() ?? "I could not generate a response.";
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Ollama chat failed");
        return "I encountered an error generating a response. Please try again.";
    }
}
    // ================================================================
    // DB HELPERS
    // ================================================================

    private async Task EnsureSessionExistsAsync(string sessionId)
    {
        var dataSourceBuilder =
            new NpgsqlDataSourceBuilder(_connectionString);
        dataSourceBuilder.UseVector();
        await using var dataSource = dataSourceBuilder.Build();
        await using var conn = await dataSource.OpenConnectionAsync();

        await using var cmd = new NpgsqlCommand(@"
            INSERT INTO interview_sessions
                (session_code, status)
            VALUES
                (@code, 'active')
            ON CONFLICT (session_code) DO NOTHING",
            conn);

        cmd.Parameters.AddWithValue("code", sessionId);
        await cmd.ExecuteNonQueryAsync();
    }

    private async Task<int> SaveMessageAsync(
        string sessionId,
        string role,
        string messageText,
        double? confidence,
        string? answerSource,
        string? fallbackProvider)
    {
        var dataSourceBuilder =
            new NpgsqlDataSourceBuilder(_connectionString);
        dataSourceBuilder.UseVector();
        await using var dataSource = dataSourceBuilder.Build();
        await using var conn = await dataSource.OpenConnectionAsync();

        // Get next sequence number for this session
        await using var seqCmd = new NpgsqlCommand(@"
            SELECT COALESCE(MAX(sequence_number), 0) + 1
            FROM chat_messages
            WHERE session_id = (
                SELECT id FROM interview_sessions
                WHERE session_code = @code
            )", conn);
        seqCmd.Parameters.AddWithValue("code", sessionId);
        var seqNum = (int)(await seqCmd.ExecuteScalarAsync() ?? 1);

        await using var cmd = new NpgsqlCommand(@"
            INSERT INTO chat_messages
                (session_id, sequence_number, role, message_text,
                 confidence_score, answer_source, fallback_provider)
            VALUES (
                (SELECT id FROM interview_sessions WHERE session_code = @code),
                @seqNum, @role, @message,
                @confidence, @answerSource, @fallbackProvider
            )
            RETURNING id",
            conn);

        cmd.Parameters.AddWithValue("code", sessionId);
        cmd.Parameters.AddWithValue("seqNum", seqNum);
        cmd.Parameters.AddWithValue("role", role);
        cmd.Parameters.AddWithValue("message", messageText);
        cmd.Parameters.AddWithValue("confidence",
            confidence.HasValue ? confidence.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("answerSource",
            answerSource ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("fallbackProvider",
            fallbackProvider ?? (object)DBNull.Value);

        var id = await cmd.ExecuteScalarAsync();
        return Convert.ToInt32(id);
    }

    private async Task SaveUnansweredQuestionAsync(
        string sessionId,
        int messageId,
        string questionText)
    {
        var dataSourceBuilder =
            new NpgsqlDataSourceBuilder(_connectionString);
        dataSourceBuilder.UseVector();
        await using var dataSource = dataSourceBuilder.Build();
        await using var conn = await dataSource.OpenConnectionAsync();

        await using var cmd = new NpgsqlCommand(@"
            INSERT INTO unanswered_questions
                (session_id, message_id, question_text,
                 status, priority)
            VALUES (
                (SELECT id FROM interview_sessions
                 WHERE session_code = @code),
                @messageId,
                @questionText,
                'new',
                'medium'
            )", conn);

        cmd.Parameters.AddWithValue("code", sessionId);
        cmd.Parameters.AddWithValue("messageId", messageId);
        cmd.Parameters.AddWithValue("questionText", questionText);

        await cmd.ExecuteNonQueryAsync();

        _logger.LogInformation(
            "Saved unanswered question: {Q}", questionText);
    }

    // ================================================================
    // GET TRANSCRIPT — full chat history for a session
    // ================================================================
    public async Task<object> GetTranscriptAsync(string sessionId)
    {
        var dataSourceBuilder =
            new NpgsqlDataSourceBuilder(_connectionString);
        dataSourceBuilder.UseVector();
        await using var dataSource = dataSourceBuilder.Build();
        await using var conn = await dataSource.OpenConnectionAsync();

        await using var cmd = new NpgsqlCommand(@"
            SELECT m.sequence_number, m.role, m.message_text,
                   m.answer_source, m.confidence_score, m.created_at
            FROM chat_messages m
            JOIN interview_sessions s ON s.id = m.session_id
            WHERE s.session_code = @code
            ORDER BY m.sequence_number", conn);

        cmd.Parameters.AddWithValue("code", sessionId);

        var messages = new List<object>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            messages.Add(new
            {
                sequenceNumber = reader.GetInt32(0),
                role = reader.GetString(1),
                message = reader.GetString(2),
                answerSource = reader.IsDBNull(3)
                    ? null : reader.GetString(3),
                confidence = reader.IsDBNull(4)
                    ? (double?)null : reader.GetDouble(4),
                timestamp = reader.GetDateTime(5)
            });
        }

        return new { sessionId, messages };
    }

    // ================================================================
    // GET UNANSWERED — Sanath's prep dashboard
    // ================================================================
    public async Task<object> GetUnansweredAsync()
    {
        var dataSourceBuilder =
            new NpgsqlDataSourceBuilder(_connectionString);
        dataSourceBuilder.UseVector();
        await using var dataSource = dataSourceBuilder.Build();
        await using var conn = await dataSource.OpenConnectionAsync();

        await using var cmd = new NpgsqlCommand(@"
            SELECT uq.id, uq.question_text, uq.question_category,
                   uq.times_asked, uq.priority, uq.status,
                   uq.first_asked_at, s.company_name, s.session_code
            FROM unanswered_questions uq
            JOIN interview_sessions s ON s.id = uq.session_id
            WHERE uq.status != 'added_to_kb'
            ORDER BY
                CASE uq.priority
                    WHEN 'high' THEN 1
                    WHEN 'medium' THEN 2
                    ELSE 3
                END,
                uq.times_asked DESC", conn);

        var questions = new List<object>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            questions.Add(new
            {
                id = reader.GetInt32(0),
                questionText = reader.GetString(1),
                category = reader.IsDBNull(2)
                    ? "unknown" : reader.GetString(2),
                timesAsked = reader.GetInt32(3),
                priority = reader.GetString(4),
                status = reader.GetString(5),
                firstAskedAt = reader.GetDateTime(6),
                company = reader.IsDBNull(7)
                    ? null : reader.GetString(7),
                sessionCode = reader.GetString(8)
            });
        }

        return new { total = questions.Count, questions };
    }

    private async Task<string> CallGroqAsync(string prompt)
{
    try
    {
        var apiKey = _config["Groq:ApiKey"];
        var model = _config["Groq:Model"] ?? "llama-3.1-70b-versatile";
        var baseUrl = _config["Groq:BaseUrl"] ?? "https://api.groq.com/openai/v1";

        var requestBody = new
        {
            model = model,
            messages = new[]
            {
                new {
                    role = "system",
                    content = "You are Sanath Kumar J S, a Lead Software Engineer. Answer ONLY using the provided context. Never invent information."
                },
                new {
                    role = "user",
                    content = prompt
                }
            },
            max_tokens = 300,
            temperature = 0.2
        };

        var httpRequest = new HttpRequestMessage(
            HttpMethod.Post, $"{baseUrl}/chat/completions");
        httpRequest.Headers.Add("Authorization", $"Bearer {apiKey}");
        httpRequest.Content = new StringContent(
            System.Text.Json.JsonSerializer.Serialize(requestBody),
            System.Text.Encoding.UTF8,
            "application/json");

        var response = await _httpClient.SendAsync(httpRequest);
        response.EnsureSuccessStatusCode();

        var json = await response.Content
            .ReadFromJsonAsync<System.Text.Json.JsonElement>();

        return json
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "No response generated.";
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Groq API call failed");
        return "I encountered an error generating a response.";
    }
}

private async Task<List<SearchResult>> GetAllChunksFromFileAsync(
    string sourceFile)
{
    var results = new List<SearchResult>();

    try
    {
        var dataSourceBuilder =
            new NpgsqlDataSourceBuilder(_connectionString);
        dataSourceBuilder.UseVector();
        await using var dataSource = dataSourceBuilder.Build();
        await using var conn = await dataSource.OpenConnectionAsync();

        await using var cmd = new NpgsqlCommand(@"
            SELECT id, source_file, section_title,
                   chunk_text, 0.9 AS similarity
            FROM knowledge_chunks
            WHERE source_file = @sourceFile
            ORDER BY chunk_index",
            conn);

        cmd.Parameters.AddWithValue("sourceFile", sourceFile);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            results.Add(new SearchResult
            {
                ChunkId = reader.GetInt32(0),
                SourceFile = reader.GetString(1),
                SectionTitle = reader.IsDBNull(2)
                    ? "" : reader.GetString(2),
                ChunkText = reader.GetString(3),
                Similarity = reader.GetDouble(4)
            });
        }
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "GetAllChunksFromFile failed: {File}",
            sourceFile);
    }

    return results;
}
// ================================================================
// SAVE ANSWER — Sanath types his answer
// ================================================================
public async Task<bool> SaveAnswerAsync(int id, string answer)
{
    try
    {
        var dataSourceBuilder =
            new NpgsqlDataSourceBuilder(_connectionString);
        dataSourceBuilder.UseVector();
        await using var dataSource = dataSourceBuilder.Build();
        await using var conn = await dataSource.OpenConnectionAsync();

        await using var cmd = new NpgsqlCommand(@"
            UPDATE unanswered_questions
            SET sanath_answer = @answer,
                status = 'ready',
                sanath_answered_at = NOW()
            WHERE id = @id", conn);

        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("answer", answer);
        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "SaveAnswer failed for id {Id}", id);
        return false;
    }
}

// ================================================================
// PROMOTE TO KB — embed answer and add to knowledge_chunks
// ================================================================
public async Task<bool> PromoteToKbAsync(int id)
{
    try
    {
        var dataSourceBuilder =
            new NpgsqlDataSourceBuilder(_connectionString);
        dataSourceBuilder.UseVector();
        await using var dataSource = dataSourceBuilder.Build();
        await using var conn = await dataSource.OpenConnectionAsync();

        // Get the question and answer
        await using var getCmd = new NpgsqlCommand(@"
            SELECT question_text, sanath_answer
            FROM unanswered_questions
            WHERE id = @id AND sanath_answer IS NOT NULL",
            conn);
        getCmd.Parameters.AddWithValue("id", id);

        await using var reader = await getCmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return false;

        var questionText = reader.GetString(0);
        var answerText = reader.GetString(1);
        await reader.CloseAsync();

        // Build enriched chunk text
        var chunkText =
            $"Topic: prep question\n" +
            $"Section: {questionText}\n" +
            $"Related questions: {questionText}\n\n" +
            $"## {questionText}\n{answerText}";

        // Embed the chunk
        var embedding = await GetEmbeddingForPromoteAsync(chunkText);
        if (embedding.Length == 0)
            return false;

        // Insert into knowledge_chunks
        await using var insertCmd = new NpgsqlCommand(@"
            INSERT INTO knowledge_chunks
                (source_file, section_title, chunk_text,
                 chunk_index, embedding)
            VALUES
                ('prep-answers.md', @section, @chunkText,
                 0, @embedding)
            RETURNING id", conn);

        insertCmd.Parameters.AddWithValue("section", questionText);
        insertCmd.Parameters.AddWithValue("chunkText", chunkText);
        insertCmd.Parameters.AddWithValue("embedding",
            new Pgvector.Vector(embedding));

        var newChunkId = Convert.ToInt32(
            await insertCmd.ExecuteScalarAsync());

        // Update unanswered_questions status
        await using var updateCmd = new NpgsqlCommand(@"
            UPDATE unanswered_questions
            SET status = 'added_to_kb',
                kb_chunk_id = @chunkId
            WHERE id = @id", conn);

        updateCmd.Parameters.AddWithValue("chunkId", newChunkId);
        updateCmd.Parameters.AddWithValue("id", id);
        await updateCmd.ExecuteNonQueryAsync();

        _logger.LogInformation(
            "Promoted question {Id} to KB as chunk {ChunkId}",
            id, newChunkId);
        return true;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "PromoteToKb failed for id {Id}", id);
        return false;
    }
}

// ================================================================
// DELETE — remove unanswered question
// ================================================================
public async Task<bool> DeleteUnansweredAsync(int id)
{
    try
    {
        var dataSourceBuilder =
            new NpgsqlDataSourceBuilder(_connectionString);
        dataSourceBuilder.UseVector();
        await using var dataSource = dataSourceBuilder.Build();
        await using var conn = await dataSource.OpenConnectionAsync();

        await using var cmd = new NpgsqlCommand(@"
            DELETE FROM unanswered_questions
            WHERE id = @id", conn);

        cmd.Parameters.AddWithValue("id", id);
        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Delete failed for id {Id}", id);
        return false;
    }
}

// ================================================================
// EMBED helper for promote (reuses Ollama)
// ================================================================
private async Task<float[]> GetEmbeddingForPromoteAsync(string text)
{
    try
    {
        var request = new { model = "nomic-embed-text", prompt = text };
        var httpClient = new HttpClient {
            Timeout = TimeSpan.FromSeconds(30) };
        var ollamaUrl = _config["Ollama:BaseUrl"]
            ?? "http://localhost:11434";

        var response = await httpClient.PostAsJsonAsync(
            $"{ollamaUrl}/api/embeddings", request);
        response.EnsureSuccessStatusCode();

        var json = await response.Content
            .ReadFromJsonAsync<System.Text.Json.JsonElement>();
        return json.GetProperty("embedding")
            .EnumerateArray()
            .Select(e => (float)e.GetDouble())
            .ToArray();
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Embed for promote failed");
        return Array.Empty<float>();
    }
}

// ================================================================
// GET SESSIONS — list all sessions with analytics
// Stats are pulled from session_analytics if the row exists,
// otherwise computed live from chat_messages / unanswered_questions.
// Add this method to ChatService.cs
// ================================================================
public async Task<object> GetSessionsAsync()
{
    var dataSourceBuilder = new NpgsqlDataSourceBuilder(_connectionString);
    dataSourceBuilder.UseVector();
    await using var dataSource = dataSourceBuilder.Build();
    await using var conn = await dataSource.OpenConnectionAsync();

    await using var cmd = new NpgsqlCommand(@"
        SELECT
            s.id,
            s.session_code,
            s.company_name,
            s.interviewer_name,
            s.round_number,
            s.started_at,
            s.ended_at,
            s.status,
            s.overall_rating,

            -- Prefer session_analytics row; fall back to live counts
            COALESCE(
                a.total_questions,
                (SELECT COUNT(*)
                 FROM chat_messages m
                 WHERE m.session_id = s.id
                   AND m.role = 'interviewer')
            )::int AS total_questions,

            COALESCE(
                a.answered_from_kb,
                (SELECT COUNT(*)
                 FROM chat_messages m
                 WHERE m.session_id = s.id
                   AND m.answer_source = 'knowledge_base')
            )::int AS answered_from_kb,

            COALESCE(
                a.unanswered_count,
                (SELECT COUNT(*)
                 FROM unanswered_questions uq
                 WHERE uq.session_id = s.id)
            )::int AS unanswered_count,

            COALESCE(
                a.avg_confidence_score,
                (SELECT AVG(m.confidence_score)
                 FROM chat_messages m
                 WHERE m.session_id = s.id
                   AND m.confidence_score IS NOT NULL)
            ) AS avg_confidence_score

        FROM interview_sessions s
        LEFT JOIN session_analytics a ON a.session_id = s.id
        ORDER BY s.started_at DESC", conn);

    var sessions = new List<object>();
    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        sessions.Add(new
        {
            id              = reader.GetInt32(0),
            sessionCode     = reader.GetString(1),
            companyName     = reader.IsDBNull(2)  ? null : reader.GetString(2),
            interviewerName = reader.IsDBNull(3)  ? null : reader.GetString(3),
            roundNumber     = reader.IsDBNull(4)  ? (int?)null    : reader.GetInt32(4),
            startedAt       = reader.GetDateTime(5),
            endedAt         = reader.IsDBNull(6)  ? (DateTime?)null : reader.GetDateTime(6),
            status          = reader.GetString(7),
            overallRating   = reader.IsDBNull(8)  ? (int?)null    : reader.GetInt32(8),
            totalQuestions  = reader.GetInt32(9),
            answeredFromKb  = reader.GetInt32(10),
            unansweredCount = reader.GetInt32(11),
            avgConfidenceScore = reader.IsDBNull(12) ? (double?)null : reader.GetDouble(12),
        });
    }

    return new { sessions };
}


// ================================================================
// GET TRANSCRIPT BY NUMERIC ID
// Returns full session info + all messages ordered by sequence.
// Replace the existing GetTranscriptAsync in ChatService.cs
// ================================================================
public async Task<object?> GetTranscriptByIdAsync(int sessionId)
{
    var dataSourceBuilder = new NpgsqlDataSourceBuilder(_connectionString);
    dataSourceBuilder.UseVector();
    await using var dataSource = dataSourceBuilder.Build();
    await using var conn = await dataSource.OpenConnectionAsync();

    // ── Session row + live-computed stats ───────────────────────
    await using var sessionCmd = new NpgsqlCommand(@"
        SELECT
            s.id,
            s.session_code,
            s.company_name,
            s.interviewer_name,
            s.round_number,
            s.started_at,
            s.ended_at,
            s.status,
            s.overall_rating,
            s.notes,

            COALESCE(
                a.total_questions,
                (SELECT COUNT(*) FROM chat_messages m
                 WHERE m.session_id = s.id AND m.role = 'interviewer')
            )::int AS total_questions,

            COALESCE(
                a.answered_from_kb,
                (SELECT COUNT(*) FROM chat_messages m
                 WHERE m.session_id = s.id
                   AND m.answer_source = 'knowledge_base')
            )::int AS answered_from_kb,

            COALESCE(
                a.unanswered_count,
                (SELECT COUNT(*) FROM unanswered_questions uq
                 WHERE uq.session_id = s.id)
            )::int AS unanswered_count,

            COALESCE(
                a.avg_confidence_score,
                (SELECT AVG(m.confidence_score) FROM chat_messages m
                 WHERE m.session_id = s.id
                   AND m.confidence_score IS NOT NULL)
            ) AS avg_confidence_score

        FROM interview_sessions s
        LEFT JOIN session_analytics a ON a.session_id = s.id
        WHERE s.id = @id", conn);

    sessionCmd.Parameters.AddWithValue("id", sessionId);

    await using var sr = await sessionCmd.ExecuteReaderAsync();
    if (!await sr.ReadAsync()) return null;   // → 404 in controller

    var sess = new
    {
        id              = sr.GetInt32(0),
        sessionCode     = sr.GetString(1),
        companyName     = sr.IsDBNull(2)  ? null : sr.GetString(2),
        interviewerName = sr.IsDBNull(3)  ? null : sr.GetString(3),
        roundNumber     = sr.IsDBNull(4)  ? (int?)null    : sr.GetInt32(4),
        startedAt       = sr.GetDateTime(5),
        endedAt         = sr.IsDBNull(6)  ? (DateTime?)null : sr.GetDateTime(6),
        status          = sr.GetString(7),
        overallRating   = sr.IsDBNull(8)  ? (int?)null    : sr.GetInt32(8),
        notes           = sr.IsDBNull(9)  ? null : sr.GetString(9),
        totalQuestions  = sr.GetInt32(10),
        answeredFromKb  = sr.GetInt32(11),
        unansweredCount = sr.GetInt32(12),
        avgConfidenceScore = sr.IsDBNull(13) ? (double?)null : sr.GetDouble(13),
    };
    await sr.CloseAsync();

    // ── Messages ─────────────────────────────────────────────────
    // chat_messages columns used:
    //   id, session_id, sequence_number, role, message_text,
    //   confidence_score, answer_source, fallback_provider,
    //   response_time_ms, was_helpful, created_at
    await using var msgCmd = new NpgsqlCommand(@"
        SELECT
            m.id,
            m.sequence_number,
            m.role,
            m.message_text,
            m.answer_source,
            m.confidence_score,
            m.fallback_provider,
            m.response_time_ms,
            m.created_at
        FROM chat_messages m
        WHERE m.session_id = @id
        ORDER BY m.sequence_number", conn);

    msgCmd.Parameters.AddWithValue("id", sessionId);

    var messages = new List<object>();
    await using var mr = await msgCmd.ExecuteReaderAsync();
    while (await mr.ReadAsync())
    {
        messages.Add(new
        {
            id               = mr.GetInt32(0),
            sequenceNumber   = mr.GetInt32(1),
            role             = mr.GetString(2),
            messageText      = mr.GetString(3),
            answerSource     = mr.IsDBNull(4) ? null : mr.GetString(4),
            confidenceScore  = mr.IsDBNull(5) ? (double?)null : mr.GetDouble(5),
            fallbackProvider = mr.IsDBNull(6) ? null : mr.GetString(6),
            responseTimeMs   = mr.IsDBNull(7) ? (int?)null    : mr.GetInt32(7),
            createdAt        = mr.GetDateTime(8),
        });
    }

    return new
    {
        sess.id,
        sess.sessionCode,
        sess.companyName,
        sess.interviewerName,
        sess.roundNumber,
        sess.startedAt,
        sess.endedAt,
        sess.status,
        sess.overallRating,
        sess.notes,
        sess.totalQuestions,
        sess.answeredFromKb,
        sess.unansweredCount,
        sess.avgConfidenceScore,
        messages,
    };
}

}