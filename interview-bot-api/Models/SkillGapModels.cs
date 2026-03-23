namespace interview_bot_api.Models;

// ================================================================
// REQUEST MODELS
// ================================================================

public class SkillGapRequest
{
    public string Keywords    { get; set; } = "Lead .NET Engineer Senior C# Developer";
    public string Location    { get; set; } = "Bengaluru";
    public bool   IncludeRemote { get; set; } = true;
    public int    MaxJobs     { get; set; } = 30;
}

// ================================================================
// JOB LISTING MODELS
// ================================================================

public class JobListing
{
    public int     Id           { get; set; }
    public string  Source       { get; set; } = "";   // "adzuna" | "remotive"
    public string  ExternalId   { get; set; } = "";
    public string  Title        { get; set; } = "";
    public string  Company      { get; set; } = "";
    public string  Location     { get; set; } = "";
    public bool    IsRemote     { get; set; }
    public int?    SalaryMin    { get; set; }
    public int?    SalaryMax    { get; set; }
    public string  JobUrl       { get; set; } = "";
    public string  Description  { get; set; } = "";
    public float   AtsScore     { get; set; }
    public float   MatchScore   { get; set; }
    public List<string> RequiredSkills  { get; set; } = new();
    public List<string> NiceToHave      { get; set; } = new();
    public DateTime FetchedAt   { get; set; } = DateTime.UtcNow;
}

// ================================================================
// SKILL GAP ANALYSIS MODELS
// ================================================================

public class SkillProfile
{
    public List<string> YourSkills      { get; set; } = new();
    public List<string> MatchedSkills   { get; set; } = new();
    public List<string> MissingSkills   { get; set; } = new();
    public List<string> TrendingSkills  { get; set; } = new();
    public float        OverallMatch    { get; set; }  // 0–100
}

public class SalaryInsight
{
    public int    Min      { get; set; }
    public int    Max      { get; set; }
    public int    Median   { get; set; }
    public string Currency { get; set; } = "INR";
}

public class CompanyInsight
{
    public string Name       { get; set; } = "";
    public int    JobCount   { get; set; }
    public bool   IsRemote   { get; set; }
}

// ================================================================
// MAIN RESPONSE MODEL
// ================================================================

public class SkillGapResponse
{
    public List<JobListing>    Jobs            { get; set; } = new();
    public SkillProfile        SkillGap        { get; set; } = new();
    public SalaryInsight       Salary          { get; set; } = new();
    public List<CompanyInsight> TopCompanies   { get; set; } = new();
    public int                 TotalJobsFound  { get; set; }
    public DateTime            GeneratedAt     { get; set; } = DateTime.UtcNow;
}

// ================================================================
// GROQ EXTRACTION MODELS (internal)
// ================================================================

public class ExtractedJobSkills
{
    public List<string> Required    { get; set; } = new();
    public List<string> NiceToHave  { get; set; } = new();
    public List<string> Trending    { get; set; } = new();
}

// ================================================================
// ADZUNA RAW API MODELS
// ================================================================

public class AdzunaResponse
{
    public List<AdzunaJob> Results { get; set; } = new();
    public int Count { get; set; }
}

public class AdzunaJob
{
    public string  Id          { get; set; } = "";
    public string  Title       { get; set; } = "";
    public string  Description { get; set; } = "";
    public string  RedirectUrl { get; set; } = "";
    public AdzunaCompany? Company    { get; set; }
    public AdzunaLocation? Location  { get; set; }
    public AdzunaSalary?   Salary    { get; set; }
    public DateTime        Created   { get; set; }
}

public class AdzunaCompany  { public string DisplayName { get; set; } = ""; }
public class AdzunaLocation { public string DisplayName { get; set; } = ""; }
public class AdzunaSalary
{
    public double? Min { get; set; }
    public double? Max { get; set; }
}

// ================================================================
// REMOTIVE RAW API MODELS
// ================================================================

public class RemotiveResponse
{
    public List<RemotiveJob> Jobs { get; set; } = new();
}

public class RemotiveJob
{
    public int    Id              { get; set; }
    public string Title           { get; set; } = "";
    public string CompanyName     { get; set; } = "";
    public string Description     { get; set; } = "";
    public string Url             { get; set; } = "";
    public string JobType         { get; set; } = "";
    public string CandidateRequiredLocation { get; set; } = "";
    public string Salary          { get; set; } = "";
    public DateTime PublicationDate { get; set; }
}

// ================================================================
// SETTINGS + TRACKING MODELS
// ================================================================

public class UserSetting
{
    public string Key       { get; set; } = "";
    public string Value     { get; set; } = "";
}

public class SaveJobRequest
{
    public int    JobId  { get; set; }
    public string Status { get; set; } = "saved"; // saved|applied|rejected|interview
    public string Notes  { get; set; } = "";
}