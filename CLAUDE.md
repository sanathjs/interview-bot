# CLAUDE.md — Project Context for Claude Code

> This file is auto-loaded into every Claude Code session in this repo. It captures conventions, architecture, and gotchas so Claude can be useful immediately.
>
> For full feature/architecture documentation, see [README.md](README.md). This file only covers what Claude specifically needs to know.

---

## What this project is

**Interview Bot** — an AI-powered interview assistant. RAG over a personal knowledge base, voice I/O, session history, skill-gap analysis. Owner: Sanath Kumar J S (skumar@ingenio.com).

Two apps in one repo:

- `interview-bot-ui/` — **Next.js 14** (App Router, TypeScript). Deployed to Vercel.
- `interview-bot-api/` — **.NET 8** Web API. Deployed to Render.com via Docker.

Stack: PostgreSQL 16 + pgvector · Groq (LLM + Whisper STT) · HuggingFace embeddings · Adzuna + Remotive (jobs).

---

## How to run locally

```powershell
# Backend (terminal 1) — http://localhost:5267
cd interview-bot-api
dotnet run

# Frontend (terminal 2) — http://localhost:3000
cd interview-bot-ui
npm run dev

# Re-ingest knowledge base after .md changes (~5 min for ~100 chunks)
curl -X POST http://localhost:5267/api/ingest -H "X-Admin-Key: <key from appsettings.json>"
```

Secrets live in `interview-bot-api/appsettings.json` (gitignored) and `interview-bot-ui/.env.local` (gitignored). Example files: `appsettings.example.json`, `.env.example`.

---

## Knowledge base authoring rules

The knowledge base is the entire set of `.md` files in [interview-bot-api/knowledge-base/](interview-bot-api/knowledge-base/). These get chunked, embedded, and searched at chat time. The chunker has specific behavior — get this wrong and search breaks.

### Chunking

- `IngestionService.SplitIntoChunks()` splits each file on **`^## `** (level-2 headers) via regex `(?=^##\s)`. See [interview-bot-api/Services/IngestionService.cs:205-250](interview-bot-api/Services/IngestionService.cs#L205-L250).
- **Every `##` heading becomes one DB row in `knowledge_chunks`** with three embeddings: body, title, AI-generated question variants (Groq generates 5 question phrasings per chunk).
- Anything before the first `##` is dropped. `#` (h1) is ignored.
- A chunk with body < 30 chars is dropped silently.
- Section titles should read as **the exact question an interviewer would ask** — these get embedded and matched against the user's query.

### File exclusion

[interview-bot-api/Services/ChunkMetadataHelper.cs](interview-bot-api/Services/ChunkMetadataHelper.cs#L27-L47) has `IsExcludedFromSearch()` with a list of filename patterns to skip during ingestion. Currently excluded:

- `answering-guidelines.md` — internal prompt for the LLM, not interview content.
- `dotnet-interview-prep-v2.md` — superseded by `dotnet-interview-prep.md`.
- `dotnet-interview-qa.md` — superseded by `dotnet-interview-prep.md`.

To exclude a new file, add its slug to `ExcludedFilePatterns` — substring match on lowercased filename.

### Prep UI reader (mobile read mode)

[interview-bot-ui/app/prepare/page.tsx](interview-bot-ui/app/prepare/page.tsx) renders chunks as cards.

- **Markdown is NOT parsed.** Body is shown as plain text with `whiteSpace: pre-wrap`. Tables, code fences, links, and anchors render as literal text.
- Each `##` chunk = one card. Authoring guidance: one self-contained topic per `##`, with a category prefix in the heading for scannability (e.g. `## C# Core — Records vs Classes`).
- Mobile width caps at 780px and stacks below 640px — keep tables narrow (3 columns max) or convert to bullet lists.
- Anchor cross-references (`[link](#some-section)`) don't work in this reader — inline the content or write `(see the X card)` instead.

### Re-ingestion always TRUNCATEs

`IngestionService.ClearExistingChunksAsync()` runs `TRUNCATE knowledge_chunks RESTART IDENTITY CASCADE` at the start of every ingest. There is no incremental ingestion. Plan accordingly when modifying KB files.

---

## Architecture conventions

### Database access — always via `DatabaseConnectionManager`

[interview-bot-api/Services/DatabaseConnectionManager.cs](interview-bot-api/Services/DatabaseConnectionManager.cs) is a singleton that wraps Npgsql with automatic Supabase → Neon failover. **Never instantiate `NpgsqlConnection` directly.** Use:

```csharp
await using var db = await _dbManager.OpenConnectionAsync();
await using var cmd = new NpgsqlCommand("...", db.Connection);
```

`FALLBACK_DATABASE_URL` is optional — code works with primary only if absent.

### 3-signal RAG search

[interview-bot-api/Services/KnowledgeSearchService.cs](interview-bot-api/Services/KnowledgeSearchService.cs) merges three parallel vector searches (body / title / questions) into one weighted score. See README "How RAG Works" section for the formula. Weights are tuned — change with care and re-test confidence buckets.

### Themes

5 chat themes in [interview-bot-ui/lib/themes.ts](interview-bot-ui/lib/themes.ts), consumed via `useTheme()` in chat components. Theme persists in `localStorage` as `ib_theme`.

### Sequence numbers, not React IDs

Chat feedback (thumbs up/down) is keyed by `chat_messages.sequence_number` (DB column), **not** by React-side `msg-N` IDs. `ChatResponse` includes `botSequenceNumber`. Don't conflate these.

---

## Things not to do

- **Don't** rename `answering-guidelines.md` — the exclusion check is substring-match on that string.
- **Don't** bypass `DatabaseConnectionManager` — you'll lose the fallback logic and the `/health` endpoint will lie.
- **Don't** delete chunks from `knowledge_chunks` manually — re-ingest is the source of truth; manual edits get wiped on next ingest.
- **Don't** use `#` (h1) to start a topic in a KB file. Only `##` is chunked.
- **Don't** add wide markdown tables to KB files — the prep reader is plain-text and they look broken on mobile.
- **Don't** rely on anchor links in KB content — markdown isn't parsed in the reader.
- **Don't** commit `appsettings.json` or `.env.local`. The example files (`appsettings.example.json`, `.env.example`) are the templates.

---

## Common operations cheat sheet

| Want to… | Do this |
|---|---|
| Add a Q to the KB | Add `## Category — Question text` block to the right file in `knowledge-base/`, then re-ingest. |
| Exclude a KB file | Add slug to `ExcludedFilePatterns` in `ChunkMetadataHelper.cs`. |
| Change RAG weights | Edit `KnowledgeSearchService.cs` — re-run a few sample queries to compare confidence. |
| Add a new chat theme | Add entry to `lib/themes.ts`; theme picker on homepage auto-picks it up. |
| Bump LLM model | Set `Groq:Model` in `appsettings.json` (local) and `Groq__Model` env var on Render. |
| Add a new chat-message column | Update `chat_messages` schema in [docs/schema.sql](docs/schema.sql), `ChatService.cs` insert, and `GetTranscriptByIdAsync`. |
| Keep Render warm | cron-job.org pings `/health` every 10 min. Don't disable. |

---

## Repo-specific quirks

- **Windows + PowerShell** is the primary dev environment. Bash is available too. Path separators in tool calls can be either, but the working tree uses `c:\Users\DELL\Documents\AI Projects\interview-bot`.
- The `.sln` file is `interview-bot.sln` at repo root; the .NET project file is `interview-bot-api/interview-bot-api.csproj`.
- `Render` uses port **10000** — `ASPNETCORE_URLS=http://+:10000`. Local dev uses the default Kestrel port 5267.
- `interview-bot-api/Microsoft.Extensions.Http`, `Npgsql`, and `Pgvector` folders at the API root are **extracted NuGet sources** committed to the repo (not standard). Don't delete — the csproj references them.
- The `bin/` and `obj/` folders are committed in `.gitignore` exclusions — leave them alone.

---

## When the user asks something ambiguous

- "Re-ingest" / "ingest" → `POST /api/ingest` with `X-Admin-Key` header. Always TRUNCATEs first.
- "The KB" / "knowledge base" → the `.md` files in `interview-bot-api/knowledge-base/`.
- "The chat" / "chat mode" → `interview-bot-ui/app/chat/page.tsx`.
- "Prep mode" → `interview-bot-ui/app/prep/page.tsx` (admin dashboard for unanswered questions). PIN-protected.
- "Prepare mode" / "read mode" / "interview prep mode" → `interview-bot-ui/app/prepare/page.tsx` (KB reader, mobile-friendly cards).
- "Skill gap" → `interview-bot-ui/app/skill-gap/page.tsx` + `interview-bot-api/Controllers/SkillGapController.cs`.
