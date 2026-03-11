using interview_bot_api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSingleton<EmbeddingService>(); 
builder.Services.AddSingleton<IngestionService>();
builder.Services.AddSingleton<KnowledgeSearchService>();
builder.Services.AddSingleton<ChatService>();

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
app.Run();