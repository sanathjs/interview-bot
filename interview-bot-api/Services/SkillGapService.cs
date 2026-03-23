using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using interview_bot_api.Models;
using Npgsql;

namespace interview_bot_api.Services;

public class SkillGapService
{
    private readonly IConfiguration       _config;
    private readonly HttpClient           _http;
    private readonly ILogger<SkillGapService> _logger;
    private readonly string               _connString;

    // Sanath's known skill profile — extracted from KB files.
    // This is the source of truth for "what Sanath knows".
    // Update this list when new skills are added to KB.
    private static readonly List<string> SanathSkills = new List<string>()
    {
        // Core .NET
        ".net", "c#", "asp.net core", "asp.net", ".net 8", ".net 6", "entity framework",
        "linq", "dependency injection", "rest api", "web api", "microservices",

        // Frontend
        "react", "next.js", "angular", "typescript", "javascript", "html", "css", "tailwind",

        // AI / RAG
        "rag", "retrieval augmented generation", "pgvector", "vector search",
        "embeddings", "llm", "groq", "huggingface", "semantic search", "ai",

        // Databases
        "sql server", "postgresql", "postgres", "redis", "supabase",

        // Cloud / DevOps
        "azure", "azure devops", "docker", "ci/cd", "teamcity", "railway",

        // Architecture
        "microservices", "system design", "api gateway", "jwt", "oauth",
        "event-driven", "cqrs", "clean architecture", "solid",

        // Tools & Integrations
        "git", "github", "zendesk", "contentstack", "splunk", "mixpanel",
        "zinrelo", "iterable", "swagger", "postman",

        // Practices
        "agile", "scrum", "code review", "unit testing", "xunit", "tdd",

        // Soft skills
        "team lead", "mentoring", "technical leadership", "stakeholder management"
    };

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy        = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition      = JsonIgnoreCondition.WhenWritingNull,
    };

    public SkillGapService(IConfiguration config, ILogger<SkillGapService> logger)
    {
        _config     = config;
        _logger     = logger;
        _connString = config["DATABASE_URL"]!;
        _http       = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        _http.DefaultRequestHeaders.Add("User-Agent", "InterviewBot/1.0");
    }

    // ================================================================
    // MAIN ENTRY POINT
    // ================================================================
    public async Task<SkillGapResponse> AnalyzeAsync(SkillGapRequest req)
    {
        _logger.LogInformation("SkillGap analysis started — keywords: {K}, location: {L}",
            req.Keywords, req.Location);

        // 1. Fetch jobs from both sources in parallel
        var (adzunaJobs, remotiveJobs) = await FetchAllJobsAsync(req);
        var allJobs = adzunaJobs.Concat(remotiveJobs).ToList();

        _logger.LogInformation("Fetched {Total} jobs ({A} Adzuna, {R} Remotive)",
            allJobs.Count, adzunaJobs.Count, remotiveJobs.Count);

        if (allJobs.Count == 0)
        {
            return new SkillGapResponse
            {
                TotalJobsFound = 0,
                SkillGap       = new SkillProfile { YourSkills = SanathSkills }
            };
        }

        // 2. Extract skills from JDs using Groq (batch)
        var allRequiredSkills = new List<string>();
        var allNiceToHave     = new List<string>();
        var allTrending       = new List<string>();

        // Process in batches of 5 JDs at a time to stay within Groq token limits
        var batches = allJobs.Chunk(5).ToList();
        foreach (var batch in batches)
        {
            try
            {
                var extracted = await ExtractSkillsFromBatchAsync(batch.ToList());
                allRequiredSkills.AddRange(extracted.Required);
                allNiceToHave.AddRange(extracted.NiceToHave);
                allTrending.AddRange(extracted.Trending);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Skill extraction failed for a batch — continuing");
            }
            await Task.Delay(500); // Respect Groq rate limits
        }

        // 3. Score each job against Sanath's profile
        foreach (var job in allJobs)
        {
            job.AtsScore   = ComputeAtsScore(job.Description, SanathSkills);
            job.MatchScore = ComputeMatchScore(job.RequiredSkills, SanathSkills);
        }

        // 4. Sort by match score descending
        allJobs = allJobs.OrderByDescending(j => j.MatchScore).ToList();

        // 5. Build skill gap profile
        var skillGap = BuildSkillGap(allRequiredSkills, allNiceToHave, allTrending);

        // 6. Salary insights from Adzuna data
        var salary = BuildSalaryInsights(adzunaJobs);

        // 7. Top companies
        var topCompanies = allJobs
            .Where(j => !string.IsNullOrEmpty(j.Company))
            .GroupBy(j => j.Company, StringComparer.OrdinalIgnoreCase)
            .Select(g => new CompanyInsight
            {
                Name     = g.Key,
                JobCount = g.Count(),
                IsRemote = g.Any(j => j.IsRemote)
            })
            .OrderByDescending(c => c.JobCount)
            .Take(10)
            .ToList();

        // 8. Persist to DB (fire-and-forget)
        _ = PersistJobsAsync(allJobs);

        return new SkillGapResponse
        {
            Jobs           = allJobs.Take(req.MaxJobs).ToList(),
            SkillGap       = skillGap,
            Salary         = salary,
            TopCompanies   = topCompanies,
            TotalJobsFound = allJobs.Count,
            GeneratedAt    = DateTime.UtcNow,
        };
    }

    // ================================================================
    // FETCH FROM ADZUNA
    // ================================================================
    private async Task<List<JobListing>> FetchAdzunaJobsAsync(SkillGapRequest req)
    {
        var appId  = _config["Adzuna:AppId"];
        var appKey = _config["Adzuna:AppKey"];

        if (string.IsNullOrEmpty(appId) || string.IsNullOrEmpty(appKey))
        {
            _logger.LogWarning("Adzuna credentials not configured — skipping");
            return new();
        }

        var jobs    = new List<JobListing>();
        var country = "in"; // India — change to "gb" or "us" for other regions
        var encoded = Uri.EscapeDataString(req.Keywords);
        var location = Uri.EscapeDataString(req.Location);

        // Adzuna paginates at 20 per page — fetch 2 pages for 40 results
        for (int page = 1; page <= 2; page++)
        {
            try
            {
                var url = $"https://api.adzuna.com/v1/api/jobs/{country}/search/{page}" +
                          $"?app_id={appId}&app_key={appKey}" +
                          $"&what={encoded}&where={location}" +
                          $"&results_per_page=20&content-type=application/json" +
                          $"&sort_by=relevance";

                var resp = await _http.GetAsync(url);
                if (!resp.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Adzuna returned {Status} on page {Page}",
                        resp.StatusCode, page);
                    break;
                }

                var raw = await resp.Content.ReadAsStringAsync();

                // Adzuna uses camelCase with some pascal — parse manually
                var doc = JsonDocument.Parse(raw);
                var results = doc.RootElement.GetProperty("results");

                foreach (var item in results.EnumerateArray())
                {
                    try
                    {
                        var salaryMin = item.TryGetProperty("salary_min", out var sMin)
                            ? (int?)Convert.ToInt32(sMin.GetDouble()) : null;
                        var salaryMax = item.TryGetProperty("salary_max", out var sMax)
                            ? (int?)Convert.ToInt32(sMax.GetDouble()) : null;

                        jobs.Add(new JobListing
                        {
                            Source      = "adzuna",
                            ExternalId  = $"adzuna_{item.GetProperty("id").GetString()}",
                            Title       = item.TryGetProperty("title", out var t)       ? t.GetString()! : "",
                            Description = item.TryGetProperty("description", out var d)  ? d.GetString()! : "",
                            JobUrl      = item.TryGetProperty("redirect_url", out var u) ? u.GetString()! : "",
                            Company     = item.TryGetProperty("company", out var c) &&
                                          c.TryGetProperty("display_name", out var cn)  ? cn.GetString()! : "",
                            Location    = item.TryGetProperty("location", out var l) &&
                                          l.TryGetProperty("display_name", out var ln)  ? ln.GetString()! : req.Location,
                            IsRemote    = false,
                            SalaryMin   = salaryMin,
                            SalaryMax   = salaryMax,
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to parse an Adzuna job item");
                    }
                }

                await Task.Delay(300); // Be polite to Adzuna
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Adzuna fetch failed on page {Page}", page);
                break;
            }
        }

        _logger.LogInformation("Adzuna returned {Count} jobs", jobs.Count);
        return jobs;
    }

    // ================================================================
    // FETCH FROM REMOTIVE
    // ================================================================
    private async Task<List<JobListing>> FetchRemotiveJobsAsync(SkillGapRequest req)
    {
        if (!req.IncludeRemote) return new();

        var jobs = new List<JobListing>();

        // Remotive categories relevant for .NET developers
        var categories = new[] { "software-dev", "devops-sysadmin" };

        foreach (var category in categories)
        {
            try
            {
                var url = $"https://remotive.com/api/remote-jobs?category={category}&limit=20";
                var resp = await _http.GetAsync(url);
                if (!resp.IsSuccessStatusCode) continue;

                var raw = await resp.Content.ReadAsStringAsync();
                var doc = JsonDocument.Parse(raw);

                if (!doc.RootElement.TryGetProperty("jobs", out var jobsEl)) continue;

                foreach (var item in jobsEl.EnumerateArray())
                {
                    try
                    {
                        var title = item.TryGetProperty("title", out var t) ? t.GetString()! : "";

                        // Filter for .NET / C# / backend relevance
                        var relevant = IsRelevantToProfile(title,
                            item.TryGetProperty("description", out var dd) ? dd.GetString()! : "");

                        if (!relevant) continue;

                        jobs.Add(new JobListing
                        {
                            Source      = "remotive",
                            ExternalId  = $"remotive_{(item.TryGetProperty("id", out var id) ? id.GetInt32() : 0)}",
                            Title       = title,
                            Description = item.TryGetProperty("description", out var desc) ? StripHtml(desc.GetString()!) : "",
                            JobUrl      = item.TryGetProperty("url", out var u)             ? u.GetString()!  : "",
                            Company     = item.TryGetProperty("company_name", out var co)   ? co.GetString()! : "",
                            Location    = "Remote",
                            IsRemote    = true,
                            SalaryMin   = null,
                            SalaryMax   = null,
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to parse a Remotive job item");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Remotive fetch failed for category {Cat}", category);
            }
        }

        _logger.LogInformation("Remotive returned {Count} relevant jobs", jobs.Count);
        return jobs;
    }

    // Fetch both in parallel
    private async Task<(List<JobListing> adzuna, List<JobListing> remotive)> FetchAllJobsAsync(
        SkillGapRequest req)
    {
        var adzunaTask   = FetchAdzunaJobsAsync(req);
        var remotiveTask = FetchRemotiveJobsAsync(req);
        await Task.WhenAll(adzunaTask, remotiveTask);
        return (adzunaTask.Result, remotiveTask.Result);
    }

    // ================================================================
    // GROQ SKILL EXTRACTION — batch of JDs
    // ================================================================
    private async Task<ExtractedJobSkills> ExtractSkillsFromBatchAsync(List<JobListing> jobs)
    {
        var combined = string.Join("\n\n---JOB---\n\n",
            jobs.Select(j => $"Title: {j.Title}\n{j.Description[..Math.Min(j.Description.Length, 800)]}"));

        var prompt = $@"You are a technical recruiter. Analyse these {jobs.Count} job descriptions and extract skills.

Return ONLY valid JSON in this exact format, nothing else:
{{
  ""required"": [""skill1"", ""skill2""],
  ""nice_to_have"": [""skill3"", ""skill4""],
  ""trending"": [""skill5"", ""skill6""]
}}

Rules:
- ""required"": skills mentioned as mandatory in most JDs
- ""nice_to_have"": skills mentioned as optional/preferred  
- ""trending"": skills appearing frequently across JDs that signal market direction
- Use short lowercase skill names: "".net 8"" not "".NET Framework 8.0""
- Max 20 items per array
- No explanation, no markdown, ONLY the JSON object

JOB DESCRIPTIONS:
{combined}";

        var groqApiKey  = _config["Groq:ApiKey"];
        var groqModel   = _config["Groq:Model"] ?? "llama-3.3-70b-versatile";
        var groqBaseUrl = _config["Groq:BaseUrl"] ?? "https://api.groq.com/openai/v1";

        var requestBody = new
        {
            model    = groqModel,
            messages = new[]
            {
                new { role = "system", content = "You are a skill extraction assistant. Always respond with valid JSON only." },
                new { role = "user",   content = prompt }
            },
            max_tokens  = 600,
            temperature = 0.1
        };

        var req = new HttpRequestMessage(HttpMethod.Post, $"{groqBaseUrl}/chat/completions");
        req.Headers.Add("Authorization", $"Bearer {groqApiKey}");
        req.Content = new StringContent(
            JsonSerializer.Serialize(requestBody),
            System.Text.Encoding.UTF8,
            "application/json");

        var resp = await _http.SendAsync(req);
        resp.EnsureSuccessStatusCode();

        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var raw  = json.GetProperty("choices")[0]
                       .GetProperty("message")
                       .GetProperty("content")
                       .GetString() ?? "{}";

        // Clean any accidental markdown fences
        raw = raw.Trim().TrimStart('`').TrimEnd('`').Replace("json", "").Trim();

        // Also store per-job required skills
        try
        {
            var parsed  = JsonDocument.Parse(raw).RootElement;
            var result  = new ExtractedJobSkills();

            if (parsed.TryGetProperty("required", out var req2))
                result.Required = req2.EnumerateArray()
                    .Select(x => x.GetString()?.ToLower() ?? "")
                    .Where(s => !string.IsNullOrEmpty(s))
                    .ToList();

            if (parsed.TryGetProperty("nice_to_have", out var nth))
                result.NiceToHave = nth.EnumerateArray()
                    .Select(x => x.GetString()?.ToLower() ?? "")
                    .Where(s => !string.IsNullOrEmpty(s))
                    .ToList();

            if (parsed.TryGetProperty("trending", out var tr))
                result.Trending = tr.EnumerateArray()
                    .Select(x => x.GetString()?.ToLower() ?? "")
                    .Where(s => !string.IsNullOrEmpty(s))
                    .ToList();

            // Tag per-job required skills for match scoring
            foreach (var job in jobs)
                job.RequiredSkills = result.Required.Take(10).ToList();

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse Groq skill extraction response: {Raw}", raw);
            return new ExtractedJobSkills();
        }
    }

    // ================================================================
    // SCORING
    // ================================================================

    // ATS Score: how many keywords from Sanath's skills appear in the JD text
    private static float ComputeAtsScore(string jdText, List<string> profileSkills)
    {
        if (string.IsNullOrEmpty(jdText)) return 0f;
        var lower = jdText.ToLower();
        var hits  = profileSkills.Count(s => lower.Contains(s.ToLower()));
        return Math.Min(100f, (hits / (float)Math.Max(profileSkills.Count, 1)) * 100f * 2.5f);
    }

    // Match Score: how many of the JD's required skills Sanath has
    private static float ComputeMatchScore(List<string> required, List<string> profileSkills)
    {
        if (required.Count == 0) return 50f; // neutral if no skills extracted
        var hits = required.Count(r =>
            profileSkills.Any(p => p.Contains(r, StringComparison.OrdinalIgnoreCase) ||
                                   r.Contains(p, StringComparison.OrdinalIgnoreCase)));
        return (hits / (float)required.Count) * 100f;
    }

    // ================================================================
    // SKILL GAP BUILDER
    // ================================================================
    private SkillProfile BuildSkillGap(
        List<string> allRequired,
        List<string> allNiceToHave,
        List<string> allTrending)
    {
        // Count frequency of each required skill across all JDs
        var freq = allRequired
            .GroupBy(s => s, StringComparer.OrdinalIgnoreCase)
            .OrderByDescending(g => g.Count())
            .ToList();

        var matched = new List<string>();
        var missing = new List<string>();

        foreach (var g in freq.Take(30))
        {
            var skill = g.Key;
            var have  = SanathSkills.Any(s =>
                s.Contains(skill, StringComparison.OrdinalIgnoreCase) ||
                skill.Contains(s, StringComparison.OrdinalIgnoreCase));

            if (have) matched.Add(skill);
            else      missing.Add(skill);
        }

        // Trending = skills in top 40% frequency that Sanath doesn't have yet
        var trending = allTrending
            .GroupBy(s => s, StringComparer.OrdinalIgnoreCase)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .Where(s => !SanathSkills.Any(p =>
                p.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                s.Contains(p, StringComparison.OrdinalIgnoreCase)))
            .Take(10)
            .ToList();

        var overallMatch = matched.Count + missing.Count > 0
            ? (matched.Count / (float)(matched.Count + missing.Count)) * 100f
            : 0f;

        return new SkillProfile
        {
            YourSkills     = SanathSkills.Take(20).ToList(),
            MatchedSkills  = matched.Distinct(StringComparer.OrdinalIgnoreCase).Take(15).ToList(),
            MissingSkills  = missing.Distinct(StringComparer.OrdinalIgnoreCase).Take(15).ToList(),
            TrendingSkills = trending,
            OverallMatch   = MathF.Round(overallMatch, 1),
        };
    }

    // ================================================================
    // SALARY INSIGHTS
    // ================================================================
    private static SalaryInsight BuildSalaryInsights(List<JobListing> jobs)
    {
        var withSalary = jobs
            .Where(j => j.SalaryMin.HasValue && j.SalaryMin > 0)
            .ToList();

        if (withSalary.Count == 0)
        {
            // Fallback — market estimate for Lead .NET in India (LPA in INR)
            return new SalaryInsight
            {
                Min      = 2000000,
                Max      = 4000000,
                Median   = 2800000,
                Currency = "INR"
            };
        }

        var mins    = withSalary.Select(j => j.SalaryMin!.Value).ToList();
        var maxs    = withSalary.Where(j => j.SalaryMax.HasValue).Select(j => j.SalaryMax!.Value).ToList();
        var allVals = mins.Concat(maxs).OrderBy(x => x).ToList();

        return new SalaryInsight
        {
            Min      = mins.Min(),
            Max      = maxs.Count > 0 ? maxs.Max() : mins.Max() * 2,
            Median   = allVals[allVals.Count / 2],
            Currency = "INR"
        };
    }

    // ================================================================
    // DB PERSISTENCE
    // ================================================================
    private async Task PersistJobsAsync(List<JobListing> jobs)
    {
        try
        {
            var ds = new Npgsql.NpgsqlDataSourceBuilder(_connString).Build();
            await using var conn = await ds.OpenConnectionAsync();

            foreach (var job in jobs.Take(50)) // cap at 50 persisted
            {
                try
                {
                    await using var cmd = new Npgsql.NpgsqlCommand(@"
                        INSERT INTO job_listings
                            (source, external_id, title, company, location, is_remote,
                             salary_min, salary_max, job_url, description,
                             required_skills, ats_score, match_score)
                        VALUES
                            (@source, @extId, @title, @company, @loc, @remote,
                             @salMin, @salMax, @url, @desc,
                             @skills::jsonb, @ats, @match)
                        ON CONFLICT (external_id) DO UPDATE
                            SET ats_score   = EXCLUDED.ats_score,
                                match_score = EXCLUDED.match_score,
                                fetched_at  = NOW()", conn);

                    cmd.Parameters.AddWithValue("source",  job.Source);
                    cmd.Parameters.AddWithValue("extId",   job.ExternalId);
                    cmd.Parameters.AddWithValue("title",   job.Title);
                    cmd.Parameters.AddWithValue("company", job.Company);
                    cmd.Parameters.AddWithValue("loc",     job.Location);
                    cmd.Parameters.AddWithValue("remote",  job.IsRemote);
                    cmd.Parameters.AddWithValue("salMin",  job.SalaryMin.HasValue ? job.SalaryMin.Value : DBNull.Value);
                    cmd.Parameters.AddWithValue("salMax",  job.SalaryMax.HasValue ? job.SalaryMax.Value : DBNull.Value);
                    cmd.Parameters.AddWithValue("url",     job.JobUrl);
                    cmd.Parameters.AddWithValue("desc",    job.Description[..Math.Min(job.Description.Length, 2000)]);
                    cmd.Parameters.AddWithValue("skills",  JsonSerializer.Serialize(job.RequiredSkills));
                    cmd.Parameters.AddWithValue("ats",     job.AtsScore);
                    cmd.Parameters.AddWithValue("match",   job.MatchScore);

                    await cmd.ExecuteNonQueryAsync();
                }
                catch { /* skip individual insert failures */ }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Job persistence failed — non-critical");
        }
    }

    // ================================================================
    // HELPERS
    // ================================================================

    // Filter Remotive jobs to only .NET / backend relevant ones
    private static bool IsRelevantToProfile(string title, string description)
    {
        var keywords = new[] {
            ".net", "c#", "dotnet", "backend", "full stack", "fullstack",
            "software engineer", "lead engineer", "senior engineer",
            "api", "azure", "cloud", "typescript", "react"
        };
        var combined = (title + " " + description).ToLower();
        return keywords.Any(k => combined.Contains(k));
    }

    // Strip HTML tags from Remotive descriptions
    private static string StripHtml(string html)
    {
        if (string.IsNullOrEmpty(html)) return "";
        return System.Text.RegularExpressions.Regex
            .Replace(html, "<.*?>", " ")
            .Replace("&amp;", "&")
            .Replace("&lt;", "<")
            .Replace("&gt;", ">")
            .Replace("&nbsp;", " ")
            .Replace("\n\n\n", "\n\n")
            .Trim();
    }

    // ================================================================
    // SAVED JOBS (for tracking)
    // ================================================================
    public async Task<bool> SaveJobApplicationAsync(SaveJobRequest req)
    {
        try
        {
            var ds = new Npgsql.NpgsqlDataSourceBuilder(_connString).Build();
            await using var conn = await ds.OpenConnectionAsync();
            await using var cmd  = new Npgsql.NpgsqlCommand(@"
                INSERT INTO job_applications (job_id, status, notes)
                VALUES (@jobId, @status, @notes)
                ON CONFLICT (job_id) DO UPDATE
                    SET status = EXCLUDED.status,
                        notes  = EXCLUDED.notes,
                        applied_at = CASE WHEN EXCLUDED.status = 'applied'
                                     THEN NOW() ELSE job_applications.applied_at END", conn);

            cmd.Parameters.AddWithValue("jobId",  req.JobId);
            cmd.Parameters.AddWithValue("status", req.Status);
            cmd.Parameters.AddWithValue("notes",  req.Notes ?? "");
            await cmd.ExecuteNonQueryAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SaveJobApplication failed");
            return false;
        }
    }

    public async Task<List<object>> GetSavedJobsAsync()
    {
        var results = new List<object>();
        try
        {
            var ds = new Npgsql.NpgsqlDataSourceBuilder(_connString).Build();
            await using var conn = await ds.OpenConnectionAsync();
            await using var cmd  = new Npgsql.NpgsqlCommand(@"
                SELECT jl.id, jl.title, jl.company, jl.location, jl.is_remote,
                       jl.job_url, jl.match_score, jl.ats_score,
                       ja.status, ja.applied_at, ja.notes
                FROM job_applications ja
                JOIN job_listings jl ON jl.id = ja.job_id
                ORDER BY ja.created_at DESC", conn);

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new
                {
                    id         = reader.GetInt32(0),
                    title      = reader.GetString(1),
                    company    = reader.GetString(2),
                    location   = reader.GetString(3),
                    isRemote   = reader.GetBoolean(4),
                    jobUrl     = reader.IsDBNull(5)  ? null          : reader.GetString(5),
                    matchScore = reader.GetFloat(6),
                    atsScore   = reader.GetFloat(7),
                    status     = reader.GetString(8),
                    appliedAt  = reader.IsDBNull(9)  ? (DateTime?)null : reader.GetDateTime(9),
                    notes      = reader.IsDBNull(10) ? null          : reader.GetString(10),
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetSavedJobs failed");
        }
        return results;
    }

    // ================================================================
    // USER SETTINGS (auto-digest toggle)
    // ================================================================
    public async Task UpsertSettingAsync(string key, string value)
    {
        var ds = new Npgsql.NpgsqlDataSourceBuilder(_connString).Build();
        await using var conn = await ds.OpenConnectionAsync();
        await using var cmd  = new Npgsql.NpgsqlCommand(@"
            INSERT INTO user_settings (key, value, updated_at)
            VALUES (@key, @value, NOW())
            ON CONFLICT (key) DO UPDATE
                SET value = EXCLUDED.value, updated_at = NOW()", conn);
        cmd.Parameters.AddWithValue("key",   key);
        cmd.Parameters.AddWithValue("value", value);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<string?> GetSettingAsync(string key)
    {
        var ds = new Npgsql.NpgsqlDataSourceBuilder(_connString).Build();
        await using var conn = await ds.OpenConnectionAsync();
        await using var cmd  = new Npgsql.NpgsqlCommand(
            "SELECT value FROM user_settings WHERE key = @key", conn);
        cmd.Parameters.AddWithValue("key", key);
        return await cmd.ExecuteScalarAsync() as string;
    }
}