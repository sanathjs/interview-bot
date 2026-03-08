using Npgsql;
using Pgvector;
using Pgvector.Npgsql;
using System.Net.Http.Json;
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
    private readonly EmbeddingService _embedding;

    public ChatService(
        KnowledgeSearchService search,
        IConfiguration config,
        ILogger<ChatService> logger,
        EmbeddingService embedding)
    {
        _search = search;
        _logger = logger;
        _connectionString = config["DATABASE_URL"]!;
        _embedding = embedding;
        _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(180) };
        _config = config;
        _llmProvider = config["LlmProvider"] ?? "groq";
    }

    // ================================================================
    // MAIN CHAT METHOD
    // ================================================================
    public async Task<ChatResponse> ChatAsync(ChatRequest request)
    {
        await EnsureSessionExistsAsync(request.SessionId);

        var questionMsgId = await SaveMessageAsync(
            request.SessionId, "interviewer", request.Message, null, null, null);

        if (IsGreeting(request.Message))
        {
            var greetingResponse = GetGreetingResponse(request.Message);
            await SaveMessageAsync(request.SessionId, "bot", greetingResponse, null, "greeting", null);
            return new ChatResponse
            {
                Answer = greetingResponse,
                AnswerSource = "greeting",
                ConfidenceScore = 1.0,
                UsedFallback = false,
                SessionId = request.SessionId,
                Sources = new List<SourceChunk>()
            };
        }

        var (results, topScore) = await _search.SearchAsync(request.Message, topK: 10);
        var confidenceLevel = _search.GetConfidenceLevel(topScore);

        _logger.LogInformation(
            "Confidence: {Level} ({Score:F3}) for: {Q}",
            confidenceLevel, topScore, request.Message);

        ChatResponse response;

        if (confidenceLevel == "low" && !request.UseFallback)
        {
            response = await HandleUnansweredAsync(request, questionMsgId, topScore);
        }
        else if (request.UseFallback)
        {
            response = await HandleFallbackAsync(request, topScore);
        }
        else
        {
            response = await HandleKnowledgeBaseAnswerAsync(request, results, topScore, confidenceLevel);
        }

        await SaveMessageAsync(
            request.SessionId, "bot", response.Answer, topScore,
            response.AnswerSource, response.UsedFallback ? "groq" : null);

        return response;
    }

    // ================================================================
    // HIGH / MEDIUM CONFIDENCE — answer from knowledge base
    // ================================================================
    private async Task<ChatResponse> HandleKnowledgeBaseAnswerAsync(
        ChatRequest request,
        List<SearchResult> results,
        double topScore,
        string confidenceLevel)
    {
        var questionLower = request.Message.ToLower();

        var isCareerQuestion = new[] {
            "career", "journey", "work history", "walk me through",
            "companies you worked", "previous companies"
        }.Any(k => questionLower.Contains(k));

        var isChallengeQuestion = new[] {
            "challenge", "difficult", "tough", "obstacle",
            "hard situation", "problem you faced", "conflict"
        }.Any(k => questionLower.Contains(k));

        var isLeadershipQuestion = new[] {
            "led a team", "leadership", "mentored", "managed a team",
            "led people", "team lead"
        }.Any(k => questionLower.Contains(k));

        var roundContext = request.RoundType switch
        {
            "technical"     => "This is a TECHNICAL round. Focus on code, architecture, patterns, and specific technical implementations.",
            "hr"            => "This is an HR round. Focus on culture fit, motivations, teamwork, and career goals.",
            "system_design" => "This is a SYSTEM DESIGN round. Focus on scalability, infrastructure choices, trade-offs, and system architecture.",
            "behavioural"   => "This is a BEHAVIOURAL round. Use STAR method (Situation, Task, Action, Result) for answers.",
            _               => "This is a general interview."
        };

        List<SearchResult> contextChunks;

        if (isCareerQuestion)
        {
            contextChunks = await GetAllChunksFromFileAsync("career-journey.md");
            if (contextChunks.Count == 0) contextChunks = results.Take(5).ToList();
        }
        else if (isChallengeQuestion)
        {
            contextChunks = await GetAllChunksFromFileAsync("challenges.md");
            if (contextChunks.Count == 0) contextChunks = results.Take(3).ToList();
        }
        else if (isLeadershipQuestion)
        {
            contextChunks = await GetAllChunksFromFileAsync("leadership.md");
            if (contextChunks.Count == 0) contextChunks = results.Take(3).ToList();
        }
        else
        {
            var filtered = results
                .Where(r => r.Similarity >= topScore - 0.08)
                .Take(3)
                .ToList();

            var topFile  = filtered.First().SourceFile;
            var sameFile = filtered.Where(r => r.SourceFile == topFile).ToList();
            contextChunks = sameFile.Count >= 1 ? sameFile : filtered;
        }

        var context = string.Join("\n\n---\n\n",
            contextChunks.Select(r =>
                $"[From {r.SourceFile} — {r.SectionTitle}]\n{r.ChunkText}"));

        var historyText = "";
        if (request.History != null && request.History.Count > 1)
        {
            var priorTurns = request.History.SkipLast(1).ToList();
            historyText = string.Join("\n", priorTurns.Select(t =>
                t.Role == "interviewer"
                    ? $"Interviewer: {t.Text}"
                    : $"Sanath: {t.Text}"));
        }

        var historySection = string.IsNullOrEmpty(historyText)
            ? ""
            : $"CONVERSATION HISTORY (most recent exchanges):\n{historyText}\n\n";

        var prompt = $@"You are Sanath Kumar J S, a Lead Software Engineer
based in Bengaluru with 10+ years of .NET experience.

INTERVIEW CONTEXT: {roundContext}

CRITICAL RULES:
1. Answer in FIRST PERSON as Sanath. You ARE Sanath.
2. ONLY use facts from the CONTEXT below. Nothing else.
3. NEVER say 'if I recall' or any uncertain phrase.
4. NEVER invent projects, people, or experiences.
5. NEVER add information not asked for in the question.
6. Be confident and natural like a real interview.
7. Do not start your answer with 'I'.
8. Keep answers concise — 3-5 sentences unless detail is specifically asked for.
9. If the question is a follow-up or refers to something previously said,
   use the CONVERSATION HISTORY to understand the context and respond accordingly.
   Short replies like 'yes', 'tell me more', 'elaborate' should continue
   the previous topic naturally.

FORMATTING RULES — apply ONLY if the question matches:
- If question asks about career journey, work history, or companies worked at:
  → List companies MOST RECENT FIRST (Ingenio first, Toyota last)
  → Company Names should be displayed in bold
  → One line per company: Company (years) — Role — one key thing
  → End with one sentence about what you are looking for next

 - When mentioning AI experience, always say 'I have built' or 'I have shipped' 
 — never 'I am exploring' or 'I am excited about'. The work is done, not planned.

- If question asks about a specific topic (RAG, .NET, design patterns,
  leadership, challenges, strengths):
  → Answer ONLY that topic in 3-5 sentences
  → Do NOT list companies unless directly relevant
  → Do NOT add career history unprompted

- If question is an introduction:
  → 3-4 sentences max, high level only
  

{historySection}CONTEXT FROM KNOWLEDGE BASE:
{context}

QUESTION: {request.Message}

ANSWER (if this is a follow-up like 'yes', 'tell me more', 'elaborate', continue from the conversation history naturally):";

        var answer = _llmProvider == "groq"
            ? await CallGroqAsync(prompt)
            : await CallOllamaAsync(prompt);

        // Generate follow-up questions (non-critical)
        var followUps = new List<string>();
        try
        {
            var followUpPrompt = $@"Based on this interview Q&A, suggest exactly 2 natural follow-up questions
an interviewer might ask next. Return ONLY a JSON array of 2 strings, nothing else.
Example: [""Can you elaborate on X?"", ""How did you handle Y?""]

Question: {request.Message}
Answer: {answer}

Follow-ups (JSON array only):";

            var followUpRaw = _llmProvider == "groq"
                ? await CallGroqAsync(followUpPrompt)
                : await CallOllamaAsync(followUpPrompt);

            var cleaned = followUpRaw.Trim()
                .TrimStart('`').TrimEnd('`')
                .Replace("json", "").Trim();

            followUps = JsonSerializer.Deserialize<List<string>>(cleaned) ?? new();
        }
        catch { /* follow-ups are non-critical */ }

        return new ChatResponse
        {
            Answer = answer,
            AnswerSource = "knowledge_base",
            ConfidenceScore = topScore,
            UsedFallback = false,
            SessionId = request.SessionId,
            FollowUps = followUps,
            Sources = contextChunks.Take(3).Select(r => new SourceChunk
            {
                SourceFile    = r.SourceFile,
                SectionTitle  = r.SectionTitle,
                Similarity    = r.Similarity
            }).ToList()
        };
    }

public async Task EndSessionAsync(string sessionCode)
{
    await using var conn = await OpenConnectionAsync();

    // Only update if still active — idempotent, safe to call multiple times
    await conn.ExecuteAsync(@"
        UPDATE interview_sessions
        SET    status    = 'completed',
               ended_at  = CASE WHEN ended_at IS NULL THEN NOW() ELSE ended_at END
        WHERE  session_code = @sessionCode
        AND    status = 'active'
    ", new { sessionCode });
}

// ── AutoExpireStaleSessionsAsync ──────────────────────────────────────────────
// Server-side safety net: marks sessions active for > 2 hours as completed.
// Called on every GET /api/sessions so the list is always accurate.
// The ended_at is set to started_at + 2 hours (approximates real end time).
public async Task AutoExpireStaleSessionsAsync()
{
    await using var conn = await OpenConnectionAsync();

    await conn.ExecuteAsync(@"
        UPDATE interview_sessions
        SET    status   = 'completed',
               ended_at = started_at + INTERVAL '2 hours'
        WHERE  status     = 'active'
        AND    started_at < NOW() - INTERVAL '2 hours'
    ");
}
    // ================================================================
    // LOW CONFIDENCE — store as unanswered, return polite message
    // ================================================================
    private async Task<ChatResponse> HandleUnansweredAsync(
        ChatRequest request,
        int questionMsgId,
        double topScore)
    {
        await SaveUnansweredQuestionAsync(request.SessionId, questionMsgId, request.Message);

        var answer =
            "I'm sorry, I couldn't find that in my knowledge base right now. " +
            "Sanath can answer you directly on this one.\n\n" +
            "I've stored your question so Sanath can prepare a proper answer " +
            "and come back to it next time! 📝\n\n" +
            "Would you like Sanath to answer this live, " +
            "or shall we move on to the next question?";

        return new ChatResponse
        {
            Answer          = answer,
            AnswerSource    = "unanswered",
            ConfidenceScore = topScore,
            UsedFallback    = false,
            SessionId       = request.SessionId,
            Sources         = new List<SourceChunk>()
        };
    }

    // ================================================================
    // FALLBACK — user chose to use AI directly
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
            Answer          = $"[AI-assisted answer]\n\n{answer}",
            AnswerSource    = "fallback_ai",
            ConfidenceScore = topScore,
            UsedFallback    = true,
            SessionId       = request.SessionId,
            Sources         = new List<SourceChunk>()
        };
    }

    // ================================================================
    // CALL GROQ
    // ================================================================
    private async Task<string> CallGroqAsync(string prompt)
    {
        try
        {
            var apiKey  = _config["Groq:ApiKey"];
            var model   = _config["Groq:Model"] ?? "llama-3.3-70b-versatile";
            var baseUrl = _config["Groq:BaseUrl"] ?? "https://api.groq.com/openai/v1";

            var requestBody = new
            {
                model,
                messages = new[]
                {
                    new {
                        role    = "system",
                        content = "You are Sanath Kumar J S, a Lead Software Engineer. Answer ONLY using the provided context. Never invent information."
                    },
                    new {
                        role    = "user",
                        content = prompt
                    }
                },
                max_tokens  = 300,
                temperature = 0.2
            };

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions");
            httpRequest.Headers.Add("Authorization", $"Bearer {apiKey}");
            httpRequest.Content = new StringContent(
                JsonSerializer.Serialize(requestBody),
                System.Text.Encoding.UTF8,
                "application/json");

            var response = await _httpClient.SendAsync(httpRequest);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadFromJsonAsync<JsonElement>();
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

    // ================================================================
    // CALL OLLAMA (local fallback)
    // ================================================================
    private async Task<string> CallOllamaAsync(string prompt)
    {
        try
        {
            var ollamaBaseUrl = _config["Ollama:BaseUrl"] ?? "http://localhost:11434";
            var chatModel     = _config["Ollama:ChatModel"] ?? "llama3.2";

            var requestBody = new
            {
                model   = chatModel,
                prompt,
                stream  = false,
                options = new
                {
                    num_predict    = 300,
                    temperature    = 0.2,
                    top_p          = 0.9,
                    top_k          = 40,
                    repeat_penalty = 1.1
                }
            };

            var response = await _httpClient.PostAsJsonAsync(
                $"{ollamaBaseUrl}/api/generate", requestBody);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadFromJsonAsync<JsonElement>();
            return json.GetProperty("response").GetString()
                ?? "I could not generate a response.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ollama chat failed");
            return "I encountered an error generating a response. Please try again.";
        }
    }

    // ================================================================
    // GREETING HELPERS
    // ================================================================
    private static bool IsGreeting(string message)
    {
        var greetings = new[]
        {
            "hi", "hello", "hey", "good morning", "good afternoon",
            "good evening", "how are you", "how are you doing",
            "nice to meet you", "pleased to meet you", "greetings",
            "howdy", "sup", "what's up", "whats up", "hiya"
        };
        var lower = message.Trim().ToLower().TrimEnd('!', '.', '?');
        return greetings.Any(g => lower == g || lower.StartsWith(g + " "));
    }

    private static string GetGreetingResponse(string message)
    {
        var lower = message.Trim().ToLower();

        if (lower.Contains("how are you") || lower.Contains("how are you doing"))
            return "I'm doing great, thank you for asking! Ready to tell you all about Sanath's experience. What would you like to know?";

        if (lower.Contains("good morning"))
            return "Good morning! Great to have you here. Feel free to ask me anything about Sanath's background, skills, or experience.";

        if (lower.Contains("good afternoon"))
            return "Good afternoon! Happy to help. Go ahead and ask me anything about Sanath.";

        if (lower.Contains("good evening"))
            return "Good evening! Feel free to dive right in — ask me anything about Sanath's experience or skills.";

        if (lower.Contains("nice to meet") || lower.Contains("pleased to meet"))
            return "Nice to meet you too! I'm here to represent Sanath Kumar J S. What would you like to know about him?";

        return "Hello! Great to have you here. I'm Sanath's interview assistant — feel free to ask me anything about his experience, skills, or background. What would you like to start with?";
    }

    // ================================================================
    // DB HELPERS
    // ================================================================
    private NpgsqlDataSource BuildDataSource()
    {
        var builder = new NpgsqlDataSourceBuilder(_connectionString);
        builder.UseVector();
        return builder.Build();
    }

    private async Task EnsureSessionExistsAsync(string sessionId)
    {
        await using var ds   = BuildDataSource();
        await using var conn = await ds.OpenConnectionAsync();
        await using var cmd  = new NpgsqlCommand(@"
            INSERT INTO interview_sessions (session_code, status)
            VALUES (@code, 'active')
            ON CONFLICT (session_code) DO NOTHING", conn);

        cmd.Parameters.AddWithValue("code", sessionId);
        await cmd.ExecuteNonQueryAsync();
    }

    private async Task<int> SaveMessageAsync(
        string sessionId, string role, string messageText,
        double? confidence, string? answerSource, string? fallbackProvider)
    {
        await using var ds   = BuildDataSource();
        await using var conn = await ds.OpenConnectionAsync();

        await using var seqCmd = new NpgsqlCommand(@"
            SELECT COALESCE(MAX(sequence_number), 0) + 1
            FROM chat_messages
            WHERE session_id = (
                SELECT id FROM interview_sessions WHERE session_code = @code
            )", conn);
        seqCmd.Parameters.AddWithValue("code", sessionId);
        var seqNum = (int)(await seqCmd.ExecuteScalarAsync() ?? 1);

        await using var cmd = new NpgsqlCommand(@"
            INSERT INTO chat_messages
                (session_id, sequence_number, role, message_text,
                 confidence_score, answer_source, fallback_provider)
            VALUES (
                (SELECT id FROM interview_sessions WHERE session_code = @code),
                @seqNum, @role, @message, @confidence, @answerSource, @fallbackProvider
            )
            RETURNING id", conn);

        cmd.Parameters.AddWithValue("code",            sessionId);
        cmd.Parameters.AddWithValue("seqNum",          seqNum);
        cmd.Parameters.AddWithValue("role",            role);
        cmd.Parameters.AddWithValue("message",         messageText);
        cmd.Parameters.AddWithValue("confidence",      confidence.HasValue ? confidence.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("answerSource",    answerSource    ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("fallbackProvider",fallbackProvider ?? (object)DBNull.Value);

        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    private async Task SaveUnansweredQuestionAsync(
        string sessionId, int messageId, string questionText)
    {
        await using var ds   = BuildDataSource();
        await using var conn = await ds.OpenConnectionAsync();
        await using var cmd  = new NpgsqlCommand(@"
            INSERT INTO unanswered_questions
                (session_id, message_id, question_text, status, priority)
            VALUES (
                (SELECT id FROM interview_sessions WHERE session_code = @code),
                @messageId, @questionText, 'new', 'medium'
            )", conn);

        cmd.Parameters.AddWithValue("code",         sessionId);
        cmd.Parameters.AddWithValue("messageId",    messageId);
        cmd.Parameters.AddWithValue("questionText", questionText);
        await cmd.ExecuteNonQueryAsync();

        _logger.LogInformation("Saved unanswered question: {Q}", questionText);
    }

    private async Task<List<SearchResult>> GetAllChunksFromFileAsync(string sourceFile)
    {
        var results = new List<SearchResult>();
        try
        {
            await using var ds   = BuildDataSource();
            await using var conn = await ds.OpenConnectionAsync();
            await using var cmd  = new NpgsqlCommand(@"
                SELECT id, source_file, section_title, chunk_text, 0.9 AS similarity
                FROM knowledge_chunks
                WHERE source_file = @sourceFile
                ORDER BY chunk_index", conn);

            cmd.Parameters.AddWithValue("sourceFile", sourceFile);

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new SearchResult
                {
                    ChunkId      = reader.GetInt32(0),
                    SourceFile   = reader.GetString(1),
                    SectionTitle = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    ChunkText    = reader.GetString(3),
                    Similarity   = reader.GetDouble(4)
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetAllChunksFromFile failed: {File}", sourceFile);
        }
        return results;
    }

    // ================================================================
    // PUBLIC SERVICE METHODS
    // ================================================================
    public async Task<object> GetSessionsAsync()
    {
        await using var ds   = BuildDataSource();
        await using var conn = await ds.OpenConnectionAsync();
        await using var cmd  = new NpgsqlCommand(@"
            SELECT
                s.id, s.session_code, s.company_name, s.interviewer_name,
                s.round_number, s.started_at, s.ended_at, s.status, s.overall_rating,
                COALESCE(a.total_questions,
                    (SELECT COUNT(*) FROM chat_messages m
                     WHERE m.session_id = s.id AND m.role = 'interviewer'))::int,
                COALESCE(a.answered_from_kb,
                    (SELECT COUNT(*) FROM chat_messages m
                     WHERE m.session_id = s.id AND m.answer_source = 'knowledge_base'))::int,
                COALESCE(a.unanswered_count,
                    (SELECT COUNT(*) FROM unanswered_questions uq
                     WHERE uq.session_id = s.id))::int,
                COALESCE(a.avg_confidence_score,
                    (SELECT AVG(m.confidence_score) FROM chat_messages m
                     WHERE m.session_id = s.id AND m.confidence_score IS NOT NULL))
            FROM interview_sessions s
            LEFT JOIN session_analytics a ON a.session_id = s.id
            ORDER BY s.started_at DESC", conn);

        var sessions = new List<object>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            sessions.Add(new
            {
                id                 = reader.GetInt32(0),
                sessionCode        = reader.GetString(1),
                companyName        = reader.IsDBNull(2)  ? null        : reader.GetString(2),
                interviewerName    = reader.IsDBNull(3)  ? null        : reader.GetString(3),
                roundNumber        = reader.IsDBNull(4)  ? (int?)null  : reader.GetInt32(4),
                startedAt          = reader.GetDateTime(5),
                endedAt            = reader.IsDBNull(6)  ? (DateTime?)null : reader.GetDateTime(6),
                status             = reader.GetString(7),
                overallRating      = reader.IsDBNull(8)  ? (int?)null  : reader.GetInt32(8),
                totalQuestions     = reader.GetInt32(9),
                answeredFromKb     = reader.GetInt32(10),
                unansweredCount    = reader.GetInt32(11),
                avgConfidenceScore = reader.IsDBNull(12) ? (double?)null : reader.GetDouble(12),
            });
        }
        return new { sessions };
    }

    public async Task<object?> GetTranscriptByIdAsync(int sessionId)
    {
        await using var ds   = BuildDataSource();
        await using var conn = await ds.OpenConnectionAsync();

        await using var sessionCmd = new NpgsqlCommand(@"
            SELECT
                s.id, s.session_code, s.company_name, s.interviewer_name,
                s.round_number, s.started_at, s.ended_at, s.status,
                s.overall_rating, s.notes,
                COALESCE(a.total_questions,
                    (SELECT COUNT(*) FROM chat_messages m
                     WHERE m.session_id = s.id AND m.role = 'interviewer'))::int,
                COALESCE(a.answered_from_kb,
                    (SELECT COUNT(*) FROM chat_messages m
                     WHERE m.session_id = s.id AND m.answer_source = 'knowledge_base'))::int,
                COALESCE(a.unanswered_count,
                    (SELECT COUNT(*) FROM unanswered_questions uq
                     WHERE uq.session_id = s.id))::int,
                COALESCE(a.avg_confidence_score,
                    (SELECT AVG(m.confidence_score) FROM chat_messages m
                     WHERE m.session_id = s.id AND m.confidence_score IS NOT NULL))
            FROM interview_sessions s
            LEFT JOIN session_analytics a ON a.session_id = s.id
            WHERE s.id = @id", conn);

        sessionCmd.Parameters.AddWithValue("id", sessionId);

        await using var sr = await sessionCmd.ExecuteReaderAsync();
        if (!await sr.ReadAsync()) return null;

        var sess = new
        {
            id                 = sr.GetInt32(0),
            sessionCode        = sr.GetString(1),
            companyName        = sr.IsDBNull(2)  ? null        : sr.GetString(2),
            interviewerName    = sr.IsDBNull(3)  ? null        : sr.GetString(3),
            roundNumber        = sr.IsDBNull(4)  ? (int?)null  : sr.GetInt32(4),
            startedAt          = sr.GetDateTime(5),
            endedAt            = sr.IsDBNull(6)  ? (DateTime?)null : sr.GetDateTime(6),
            status             = sr.GetString(7),
            overallRating      = sr.IsDBNull(8)  ? (int?)null  : sr.GetInt32(8),
            notes              = sr.IsDBNull(9)  ? null        : sr.GetString(9),
            totalQuestions     = sr.GetInt32(10),
            answeredFromKb     = sr.GetInt32(11),
            unansweredCount    = sr.GetInt32(12),
            avgConfidenceScore = sr.IsDBNull(13) ? (double?)null : sr.GetDouble(13),
        };
        await sr.CloseAsync();

        await using var msgCmd = new NpgsqlCommand(@"
            SELECT m.id, m.sequence_number, m.role, m.message_text,
                   m.answer_source, m.confidence_score,
                   m.fallback_provider, m.response_time_ms, m.created_at
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
                id              = mr.GetInt32(0),
                sequenceNumber  = mr.GetInt32(1),
                role            = mr.GetString(2),
                messageText     = mr.GetString(3),
                answerSource    = mr.IsDBNull(4) ? null        : mr.GetString(4),
                confidenceScore = mr.IsDBNull(5) ? (double?)null : mr.GetDouble(5),
                fallbackProvider= mr.IsDBNull(6) ? null        : mr.GetString(6),
                responseTimeMs  = mr.IsDBNull(7) ? (int?)null  : mr.GetInt32(7),
                createdAt       = mr.GetDateTime(8),
            });
        }

        return new
        {
            sess.id, sess.sessionCode, sess.companyName, sess.interviewerName,
            sess.roundNumber, sess.startedAt, sess.endedAt, sess.status,
            sess.overallRating, sess.notes, sess.totalQuestions,
            sess.answeredFromKb, sess.unansweredCount, sess.avgConfidenceScore,
            messages,
        };
    }

    public async Task<object> GetUnansweredAsync()
    {
        await using var ds   = BuildDataSource();
        await using var conn = await ds.OpenConnectionAsync();
        await using var cmd  = new NpgsqlCommand(@"
            SELECT uq.id, uq.question_text, uq.question_category,
                   uq.times_asked, uq.priority, uq.status,
                   uq.first_asked_at, s.company_name, s.session_code
            FROM unanswered_questions uq
            JOIN interview_sessions s ON s.id = uq.session_id
            WHERE uq.status != 'added_to_kb'
            ORDER BY
                CASE uq.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                uq.times_asked DESC", conn);

        var questions = new List<object>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            questions.Add(new
            {
                id           = reader.GetInt32(0),
                questionText = reader.GetString(1),
                category     = reader.IsDBNull(2) ? "unknown" : reader.GetString(2),
                timesAsked   = reader.GetInt32(3),
                priority     = reader.GetString(4),
                status       = reader.GetString(5),
                firstAskedAt = reader.GetDateTime(6),
                company      = reader.IsDBNull(7) ? null : reader.GetString(7),
                sessionCode  = reader.GetString(8)
            });
        }
        return new { total = questions.Count, questions };
    }

    public async Task<bool> SaveAnswerAsync(int id, string answer)
    {
        try
        {
            await using var ds   = BuildDataSource();
            await using var conn = await ds.OpenConnectionAsync();
            await using var cmd  = new NpgsqlCommand(@"
                UPDATE unanswered_questions
                SET sanath_answer = @answer, status = 'ready', sanath_answered_at = NOW()
                WHERE id = @id", conn);

            cmd.Parameters.AddWithValue("id",     id);
            cmd.Parameters.AddWithValue("answer", answer);
            return await cmd.ExecuteNonQueryAsync() > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SaveAnswer failed for id {Id}", id);
            return false;
        }
    }

    public async Task<bool> PromoteToKbAsync(int id)
    {
        try
        {
            await using var ds   = BuildDataSource();
            await using var conn = await ds.OpenConnectionAsync();

            await using var getCmd = new NpgsqlCommand(@"
                SELECT question_text, sanath_answer
                FROM unanswered_questions
                WHERE id = @id AND sanath_answer IS NOT NULL", conn);
            getCmd.Parameters.AddWithValue("id", id);

            await using var reader = await getCmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return false;

            var questionText = reader.GetString(0);
            var answerText   = reader.GetString(1);
            await reader.CloseAsync();

            var chunkText =
                $"Topic: prep question\n" +
                $"Section: {questionText}\n" +
                $"Related questions: {questionText}\n\n" +
                $"## {questionText}\n{answerText}";

            var embedding = await _embedding.GetEmbeddingAsync(chunkText);
            if (embedding.Length == 0) return false;

            await using var insertCmd = new NpgsqlCommand(@"
                INSERT INTO knowledge_chunks
                    (source_file, section_title, chunk_text, chunk_index, embedding)
                VALUES ('prep-answers.md', @section, @chunkText, 0, @embedding)
                RETURNING id", conn);

            insertCmd.Parameters.AddWithValue("section",   questionText);
            insertCmd.Parameters.AddWithValue("chunkText", chunkText);
            insertCmd.Parameters.AddWithValue("embedding", new Vector(embedding));

            var newChunkId = Convert.ToInt32(await insertCmd.ExecuteScalarAsync());

            await using var updateCmd = new NpgsqlCommand(@"
                UPDATE unanswered_questions
                SET status = 'added_to_kb', kb_chunk_id = @chunkId
                WHERE id = @id", conn);

            updateCmd.Parameters.AddWithValue("chunkId", newChunkId);
            updateCmd.Parameters.AddWithValue("id",      id);
            await updateCmd.ExecuteNonQueryAsync();

            _logger.LogInformation("Promoted question {Id} to KB as chunk {ChunkId}", id, newChunkId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PromoteToKb failed for id {Id}", id);
            return false;
        }
    }

    public async Task<bool> DeleteUnansweredAsync(int id)
    {
        try
        {
            await using var ds   = BuildDataSource();
            await using var conn = await ds.OpenConnectionAsync();
            await using var cmd  = new NpgsqlCommand(
                "DELETE FROM unanswered_questions WHERE id = @id", conn);

            cmd.Parameters.AddWithValue("id", id);
            return await cmd.ExecuteNonQueryAsync() > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Delete failed for id {Id}", id);
            return false;
        }
    }

    public async Task UpdateSessionDetailsAsync(
        string sessionCode, UpdateSessionDetailsRequest request)
    {
        await using var ds   = BuildDataSource();
        await using var conn = await ds.OpenConnectionAsync();
        await using var cmd  = new NpgsqlCommand(@"
            UPDATE interview_sessions
            SET interviewer_name = COALESCE(@interviewerName, interviewer_name),
                company_name     = COALESCE(@companyName, company_name)
            WHERE session_code = @code", conn);

        cmd.Parameters.AddWithValue("code",            sessionCode);
        cmd.Parameters.AddWithValue("interviewerName", request.InterviewerName ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("companyName",     request.CompanyName     ?? (object)DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task SaveMessageFeedbackAsync(
        string sessionCode, int sequenceNumber, bool helpful)
    {
        await using var ds   = BuildDataSource();
        await using var conn = await ds.OpenConnectionAsync();
        await using var cmd  = new NpgsqlCommand(@"
            UPDATE chat_messages
            SET was_helpful = @helpful
            WHERE session_id = (
                SELECT id FROM interview_sessions WHERE session_code = @code
            )
            AND sequence_number = @seq", conn);

        cmd.Parameters.AddWithValue("helpful", helpful);
        cmd.Parameters.AddWithValue("code",    sessionCode);
        cmd.Parameters.AddWithValue("seq",     sequenceNumber);
        await cmd.ExecuteNonQueryAsync();
    }

    // Legacy — kept for any existing callers
    public async Task<object> GetTranscriptAsync(string sessionId)
    {
        await using var ds   = BuildDataSource();
        await using var conn = await ds.OpenConnectionAsync();
        await using var cmd  = new NpgsqlCommand(@"
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
                role           = reader.GetString(1),
                message        = reader.GetString(2),
                answerSource   = reader.IsDBNull(3) ? null   : reader.GetString(3),
                confidence     = reader.IsDBNull(4) ? (double?)null : reader.GetDouble(4),
                timestamp      = reader.GetDateTime(5)
            });
        }
        return new { sessionId, messages };
    }
}