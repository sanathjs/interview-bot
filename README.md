# 🤖 Interview Bot

An AI-powered interview assistant that represents **Sanath Kumar J S** in technical interviews using a personal knowledge base, multi-signal RAG search, real-time voice interaction, and a live job market skill gap analyzer.

> Built with Next.js 14 · .NET 8 · PostgreSQL + pgvector · Groq LLM · HuggingFace Embeddings · Groq Whisper STT

---

## ✨ Features

- 🧠 **3-signal RAG search** — Body embedding + title embedding + AI-generated question variants per chunk
- 🎙️ **Voice input** — Interviewer asks questions via microphone (Groq Whisper STT)
- 🔊 **Voice playback** — Answers read aloud via browser TTS (Web Speech API)
- 📝 **Unanswered question tracking** — Questions outside KB stored for prep
- 📚 **Prep dashboard** — Review, answer, and promote unanswered questions to KB
- 📋 **Session history** — Browse past interviews with full transcripts
- 📊 **Confidence scoring** — Every answer shows confidence % from weighted vector similarity
- 🔒 **Security** — Prompt injection detection, system prompt protection, persona guard
- 🎯 **Skill Gap Analyzer** — Live job search from Adzuna + Remotive, skill matching, salary insights, company rankings, auto-digest toggle
- 📱 **Mobile responsive** — Works on all screen sizes

---

## 🏗️ Architecture

```
┌─────────────────────┐     HTTP      ┌──────────────────────┐
│   Next.js 14 UI     │ ──────────── │   .NET 8 Web API     │
│   (Vercel)          │              │   (Render.com)        │
└─────────────────────┘              └──────────┬───────────┘
                                                │
                    ┌───────────────────────────┼──────────────────────┐
                    │                           │                      │
          ┌─────────▼──────┐         ┌──────────▼─────┐     ┌────────▼──────┐
          │  PostgreSQL 16  │         │   Groq Cloud   │     │  HuggingFace  │
          │  + pgvector    │         │  LLM + STT     │     │  Embeddings   │
          │  (Supabase)    │         │  (Free tier)   │     │  (Free tier)  │
          └────────────────┘         └────────────────┘     └───────────────┘
                    │
          ┌─────────▼──────┐         ┌────────────────┐
          │  Adzuna API    │         │  Remotive API  │
          │  (Job search)  │         │  (Remote jobs) │
          └────────────────┘         └────────────────┘
```

---

## 📁 Project Structure

```
interview-bot/
├── interview-bot-ui/                  # Next.js 14 frontend
│   ├── app/
│   │   ├── page.tsx                   # Home page
│   │   ├── chat/page.tsx              # Chat interface
│   │   ├── prep/page.tsx              # Prep dashboard (PIN protected)
│   │   ├── skill-gap/page.tsx         # Skill Gap Analyzer
│   │   └── sessions/
│   │       ├── page.tsx               # Session list
│   │       └── [id]/page.tsx          # Transcript view
│   ├── components/
│   │   ├── Navbar.tsx
│   │   └── chat/
│   │       ├── InputBar.tsx
│   │       ├── MessageBubble.tsx
│   │       └── TypingIndicator.tsx
│   └── lib/api.ts                     # All fetch wrappers
│
├── interview-bot-api/                 # .NET 8 Web API
│   ├── Controllers/
│   │   ├── ChatController.cs
│   │   ├── TranscribeController.cs
│   │   ├── IngestionController.cs
│   │   └── SkillGapController.cs
│   ├── Services/
│   │   ├── ChatService.cs
│   │   ├── KnowledgeSearchService.cs
│   │   ├── IngestionService.cs
│   │   ├── EmbeddingService.cs
│   │   ├── ChunkMetadataHelper.cs
│   │   └── SkillGapService.cs
│   ├── Models/
│   │   ├── ChatModels.cs
│   │   ├── KnowledgeChunk.cs
│   │   └── SkillGapModels.cs
│   ├── knowledge-base/                # Personal KB — .md files
│   │   ├── introduction.md
│   │   ├── career-journey.md
│   │   ├── ai-rag.md
│   │   ├── dotnet.md
│   │   ├── dotnet-interview-qa.md
│   │   └── ...
│   └── Dockerfile                     # Used by Render.com for deployment
│
└── docs/
    ├── schema.sql                     # Core DB schema
    ├── skill_gap_migration.sql        # Skill Gap tables migration
    └── RENDER_MIGRATION.md            # Step-by-step Render.com setup guide
```

---

## 🧠 How RAG Works — 3-Signal Search

```
Question asked
      ↓
HuggingFace BAAI/bge-base-en-v1.5 → embed query (768d)
      ↓
3 parallel SQL queries (all use HNSW index):
  Signal 1: top 15 by body_embedding      <=> queryVec
  Signal 2: top 15 by title_embedding     <=> queryVec
  Signal 3: top 15 by questions_embedding <=> queryVec
      ↓
Merge all candidates by chunk_id in C#
      ↓
Compute weighted score per chunk:
  titleWeight = title_word_count >= 5 ? 0.30 : 0.15
  bodyWeight  = title_word_count >= 5 ? 0.25 : 0.40
  finalScore  = (questionsSim × 0.45)
              + (titleSim     × titleWeight)
              + (bodySim      × bodyWeight)
      ↓
Tag overlap soft boost (+0.05) + file keyword boost (+0.05–0.08)
      ↓
Confidence gate:
  ≥ 0.62 → HIGH   → Answer from KB
  ≥ 0.52 → MEDIUM → Answer from KB
  < 0.52 → LOW    → Store as unanswered question
      ↓
Groq llama-3.3-70b-versatile generates answer
      ↓
Save to chat_messages with confidence score
```

### Why 3 signals?

| Signal | Weight | Purpose |
|---|---|---|
| `questions_embedding` | **0.45** | 5 AI-generated question variants per chunk at ingest time. Q↔Q matching is the most accurate signal — solves the Q↔A vector space mismatch. |
| `title_embedding` | **0.30 / 0.15** | Section heading embedded alone. Adaptive: 5+ word headings get 0.30; short headings get 0.15. |
| `body_embedding` | **0.25 / 0.40** | Semantic content of the full chunk. Safety net for paraphrasing. Gets higher weight when title is short. |

---

## 🎯 Skill Gap Analyzer

Live job market analysis comparing Sanath's profile against current job postings.

```
User enters role keywords + location
        ↓
POST /api/skill-gap
        ↓
Adzuna API (IN → GB → US fallback) + Remotive (remote) fetched in parallel
        ↓
Groq LLM extracts required / nice-to-have / trending skills from JDs in batches
        ↓
Compare extracted skills against Sanath's KB-derived skill profile
        ↓
Score each job:
  ATS Score   = keyword match % (Sanath's skills vs JD text)
  Match Score = required skill overlap %
        ↓
Return:
  - Ranked job listings with ATS + match scores
  - Matched skills ✅ | Missing skills ❌ | Trending skills 🔥
  - Salary range (min / median / max from Adzuna data)
  - Top hiring companies ranked by job count
        ↓
Jobs persisted to DB (job_listings table)
User can save jobs → tracked in job_applications table
Auto-digest toggle → settings stored in user_settings table
```

### Skill Gap API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/skill-gap` | Run full analysis — fetch jobs + gap report |
| POST | `/api/skill-gap/save-job` | Save / update job application status |
| GET | `/api/skill-gap/saved-jobs` | List all saved + tracked jobs |
| GET | `/api/skill-gap/settings` | Get user settings (auto-digest, keywords) |
| POST | `/api/skill-gap/settings` | Update user settings |

---

## 🗄️ Database Schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_chunks (
    id                   SERIAL PRIMARY KEY,
    source_file          TEXT,
    section_title        TEXT,
    chunk_text           TEXT,
    chunk_index          INTEGER,
    embedding            VECTOR(768),
    topic                TEXT,
    tags                 TEXT[],
    hit_count            INTEGER DEFAULT 0,
    last_used_at         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    title_embedding      VECTOR(768),
    questions_embedding  VECTOR(768),
    questions_text       TEXT[],
    title_word_count     INT
);

CREATE TABLE interview_sessions (
    id               SERIAL PRIMARY KEY,
    session_code     TEXT UNIQUE,
    company_name     TEXT,
    interviewer_name TEXT,
    round_number     INTEGER,
    started_at       TIMESTAMPTZ DEFAULT NOW(),
    ended_at         TIMESTAMPTZ,
    status           TEXT DEFAULT 'active',
    overall_rating   SMALLINT,
    notes            TEXT
);

CREATE TABLE chat_messages (
    id                SERIAL PRIMARY KEY,
    session_id        INTEGER REFERENCES interview_sessions(id),
    sequence_number   INTEGER,
    role              TEXT,
    message_text      TEXT,
    confidence_score  FLOAT,
    answer_source     TEXT,
    fallback_provider TEXT,
    response_time_ms  INTEGER,
    was_helpful       BOOLEAN,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE unanswered_questions (
    id                  SERIAL PRIMARY KEY,
    session_id          INTEGER REFERENCES interview_sessions(id),
    message_id          INTEGER REFERENCES chat_messages(id),
    question_text       TEXT,
    question_embedding  VECTOR(768),
    times_asked         INTEGER DEFAULT 1,
    status              TEXT DEFAULT 'new',
    priority            TEXT DEFAULT 'low',
    sanath_answer       TEXT,
    kb_chunk_id         INTEGER REFERENCES knowledge_chunks(id),
    question_category   TEXT,
    sanath_answered_at  TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ,
    first_asked_at      TIMESTAMPTZ DEFAULT NOW(),
    last_asked_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE session_analytics (
    id                   SERIAL PRIMARY KEY,
    session_id           INTEGER REFERENCES interview_sessions(id) UNIQUE,
    total_questions      INTEGER DEFAULT 0,
    answered_from_kb     INTEGER DEFAULT 0,
    unanswered_count     INTEGER DEFAULT 0,
    avg_confidence_score FLOAT,
    top_kb_files         JSONB,
    weak_topic_areas     JSONB,
    duration_minutes     INTEGER
);

-- Skill Gap tables (run docs/skill_gap_migration.sql)
CREATE TABLE job_listings ( ... );
CREATE TABLE job_applications ( ... );
CREATE TABLE user_settings ( ... );

-- HNSW indexes
CREATE INDEX ON knowledge_chunks USING hnsw (embedding           vector_cosine_ops);
CREATE INDEX ON knowledge_chunks USING hnsw (title_embedding     vector_cosine_ops);
CREATE INDEX ON knowledge_chunks USING hnsw (questions_embedding vector_cosine_ops);
```

---

## 📝 Knowledge Base

14 `.md` files in `interview-bot-api/knowledge-base/`. `answering-guidelines.md` excluded from search.

| File | Chunks | Topic |
|---|---|---|
| `introduction.md` | 7 | Who I am, career summary, specialization |
| `career-journey.md` | 5 | Toyota Tsusho, Capgemini, Euromonitor, Ingenio |
| `recent-project.md` | 11 | RAG systems, JWT migration, integrations |
| `ai-rag.md` | 13 | 3 production RAG pipelines, tech decisions |
| `dotnet-interview-qa.md` | 20 | 20 Q&A pairs: DI, async/await, GC, EF Core, Polly |
| `dotnet.md` | 6 | Years, strongest areas, design patterns |
| `leadership.md` | 4 | 3 leadership stories + philosophy |
| `general-hr.md` | 9 | Strengths, weakness, salary, notice, education |
| `my-approach.md` | 7 | System design examples |
| `arrays-strings.md` | 7 | DSA: two pointers, sliding window, hashmap |
| `trees.md` | 6 | BST, traversal, DFS vs BFS |
| `dynamic-programming.md` | 4 | DP patterns and approach |
| `complexity-cheatsheet.md` | 4 | Big-O reference |
| `answering-guidelines.md` | — | EXCLUDED — internal prompt instructions |

**Total indexed: 101 chunks across 13 files**

---

## 🚀 Getting Started (Local)

```bash
# 1. Clone
git clone https://github.com/sanathjs/interview-bot.git
cd interview-bot

# 2. Backend
cd interview-bot-api
cp appsettings.example.json appsettings.json
dotnet restore && dotnet run          # http://localhost:5267

# 3. Frontend (new terminal)
cd interview-bot-ui
cp .env.example .env.local
npm install && npm run dev            # http://localhost:3000

# 4. Ingest KB
curl -X POST http://localhost:5267/api/ingest -H "X-Admin-Key: your-key"
```

---

## ⚙️ Configuration

### Backend — `appsettings.json`

```json
{
  "DATABASE_URL": "Host=localhost;...",
  "ADMIN_INGEST_KEY": "your-secret-key",
  "LlmProvider": "groq",
  "HuggingFace": { "ApiKey": "hf_..." },
  "Groq": {
    "ApiKey": "gsk_...",
    "Model": "llama-3.3-70b-versatile",
    "BaseUrl": "https://api.groq.com/openai/v1"
  },
  "Adzuna": {
    "AppId":  "your_adzuna_app_id",
    "AppKey": "your_adzuna_app_key"
  }
}
```

### Frontend — `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5267
NEXT_PUBLIC_PREP_PIN=1234
```

### Render Environment Variables

```
DATABASE_URL         = (Supabase pooler connection string)
ADMIN_INGEST_KEY     = your-secret-key
LlmProvider          = groq
Groq__ApiKey         = gsk_...
Groq__Model          = llama-3.3-70b-versatile
Groq__BaseUrl        = https://api.groq.com/openai/v1
HuggingFace__ApiKey  = hf_...
Adzuna__AppId        = your_adzuna_app_id
Adzuna__AppKey       = your_adzuna_app_key
ASPNETCORE_URLS      = http://+:10000
PORT                 = 10000
```

> Render Docker services use port **10000** by default.

### Vercel Environment Variables

```
NEXT_PUBLIC_API_URL  = https://your-app.onrender.com
NEXT_PUBLIC_PREP_PIN = your-pin
```

---

## 🔑 API Keys Required

| Service | Purpose | Get it at | Cost |
|---|---|---|---|
| Groq | LLM chat + Whisper STT | console.groq.com | Free |
| HuggingFace | BAAI/bge-base-en-v1.5 embeddings | huggingface.co/settings/tokens | Free |
| Adzuna | Job search API (India + global fallback) | developer.adzuna.com | Free (1000 calls/day) |
| Remotive | Remote job search | remotive.com/api | Free, no key needed |

---

## 📡 API Endpoints

### Chat & Sessions

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/chat` | RAG chat — answer + confidence + sources | None |
| GET | `/api/sessions` | List sessions with stats | None |
| GET | `/api/sessions/{id}/detail` | Full transcript | None |
| GET | `/api/unanswered` | Prep dashboard questions | None |
| PATCH | `/api/unanswered/{id}/answer` | Save answer | None |
| POST | `/api/unanswered/{id}/promote` | Add answer to KB | None |
| DELETE | `/api/unanswered/{id}` | Delete question | None |
| POST | `/api/transcribe` | Audio → Groq Whisper → text | None |
| POST | `/api/ingest` | Re-ingest all KB files | X-Admin-Key header |
| GET | `/ping` | Health check / keep-alive for Render | None |

### Skill Gap

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/skill-gap` | Fetch jobs + run full gap analysis | None |
| POST | `/api/skill-gap/save-job` | Save / update job application status | None |
| GET | `/api/skill-gap/saved-jobs` | List all saved + tracked jobs | None |
| GET | `/api/skill-gap/settings` | Get user settings | None |
| POST | `/api/skill-gap/settings` | Update user settings | None |

---

## 🌐 Deployment

### Free Stack — $0/month forever

| Layer | Platform | Cost | Notes |
|---|---|---|---|
| Frontend | Vercel | Free forever | Auto-deploys on git push |
| Backend | Render.com | Free forever | Spins down after 15 min idle |
| Database | Supabase | Free forever | 500MB limit |
| Embeddings | HuggingFace | Free forever | |
| LLM + STT | Groq | Free forever | |
| Job Search | Adzuna + Remotive | Free forever | 1000 calls/day |
| Keep-alive | cron-job.org | Free forever | Pings `/ping` every 10 min |
| **Total** | | **$0/month** | |

> **Cold start:** Render free tier spins down after 15 min idle. First request takes ~30s. Set up a [cron-job.org](https://cron-job.org) ping to `https://your-app.onrender.com/ping` every 10 minutes to prevent this completely.

### Production Stack (future)

| Layer | Platform | Cost |
|---|---|---|
| Frontend | Vercel | Free |
| Backend | Render Starter | ~$7/mo (always on) |
| Database | Supabase Pro | ~$25/mo |
| Embeddings | OpenAI text-embedding-3-small | ~$0.01/mo |
| LLM | gpt-4o-mini | ~$1–3/mo |

### Deploy Checklist

```bash
# 1. Run Skill Gap migration in Supabase SQL Editor
#    Copy contents of docs/skill_gap_migration.sql → run in Supabase

# 2. Set up Render (see docs/RENDER_MIGRATION.md for full steps)

# 3. Push code — Render + Vercel auto-deploy on push
git add .
git commit -m "your message"
git push origin main

# 4. Re-ingest KB after any .md changes
curl -X POST https://your-app.onrender.com/api/ingest \
  -H "X-Admin-Key: your-key"

# 5. Update NEXT_PUBLIC_API_URL in Vercel → Settings → Environment Variables
#    Set to your Render URL
```

---

## 🛠️ Development Notes

- `session_analytics` has no auto-trigger — stats fall back to live subqueries from `chat_messages`
- `answering-guidelines.md` excluded from search at ingest time — do not rename it
- Voice input: `MediaRecorder` → Groq Whisper → auto-sends transcribed text
- Voice playback: `window.speechSynthesis` (browser TTS, no API needed)
- Prep dashboard is PIN-protected via `NEXT_PUBLIC_PREP_PIN` env variable
- Admin gear icon visible only when `localStorage.ib_role === "admin"`
- Re-ingest required after any KB change — ~5 min for 101 chunks
- KB headings should be written as the **exact question an interviewer would ask**
- Prompt injection blocked pre-LLM via `IsPromptInjection()` — 24 phrases detected
- Adzuna fetches IN → GB → US; falls back to international if India returns fewer than 10 jobs
- `job_listings.external_id` is unique — re-running analysis updates scores, no duplicates
- Render uses port `10000` — set `ASPNETCORE_URLS=http://+:10000` and `PORT=10000`
- Keep Render warm: cron-job.org pings `/ping` every 10 minutes

---

## 🗺️ Roadmap

### Phase 2 — Resume & Cover Letter
- [ ] Upload PDF resume → ingest into KB as `resume.md`
- [ ] `POST /api/skill-gap/resume` → Groq tailors resume to JD → `.docx` download
- [ ] `POST /api/skill-gap/cover` → Groq writes cover letter → `.docx` download
- [ ] ATS score with keyword breakdown per job

### Phase 3 — Tracking & Automation
- [ ] Job application status board (saved → applied → interview → offer)
- [ ] `IHostedService` daily background job at 9am
- [ ] Auto-digest — top 10 matched jobs saved daily when enabled

### Future
- [ ] End session UI — star rating + notes modal
- [ ] Analytics dashboard — KB hit rate, weak topics, confidence trends
- [ ] ElevenLabs voice cloning (~$6/mo)
- [ ] Upgrade embeddings to OpenAI `text-embedding-3-small`

---

## 🔐 Security

- `appsettings.json` and `.env.local` gitignored
- Old exposed keys rotated; git history purged via `filter-branch`
- `appsettings.example.json` and `.env.example` have no real values
- Prep dashboard PIN-protected via env variable
- API endpoints have no auth currently — add JWT for production
- Prompt injection blocked pre-LLM: 24 phrases in `ChatService.cs`
- System prompt never revealed — LLM-level security rules in Groq system message

---

## 📄 License

MIT — feel free to fork and adapt for your own interview assistant.

---

Built with ❤️ by [Sanath Kumar J S](https://github.com/sanathjs)