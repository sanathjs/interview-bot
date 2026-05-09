using interview_bot_api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSingleton<DatabaseConnectionManager>(); // must be registered before services that depend on it
builder.Services.AddSingleton<EmbeddingService>();
builder.Services.AddSingleton<IngestionService>();
builder.Services.AddSingleton<KnowledgeSearchService>();
builder.Services.AddSingleton<ChatService>();
builder.Services.AddScoped<SkillGapService>();

// Allow CORS for Next.js frontend later
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        //policy.WithOrigins("http://localhost:3000","https://interview-bot-delta-flax.vercel.app","https://sanathjs-interview-bot-sanathjs-projects.vercel.app")
            policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
});

var app = builder.Build();

app.UseCors();
app.MapControllers();

// /ping — keeps BOTH Render (spin-down) AND Supabase/Neon (pause) alive.
// Touches the DB via SELECT 1 so neither service goes idle.
app.MapGet("/ping", async (DatabaseConnectionManager dbManager) =>
{
    var error = await dbManager.ProbeAsync();
    return error is null
        ? Results.Ok("pong")
        : Results.Json(new { status = "unhealthy", error }, statusCode: 503);
});

// /health — full-stack diagnostic endpoint. Shows which DB is currently active.
app.MapGet("/health", async (DatabaseConnectionManager dbManager) =>
{
    var error = await dbManager.ProbeAsync();
    return error is null
        ? Results.Ok(new { status = "healthy", db = dbManager.ActiveDb })
        : Results.Json(new { status = "unhealthy", db = dbManager.ActiveDb, error }, statusCode: 503);
});

app.Run();
