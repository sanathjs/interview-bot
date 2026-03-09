# 🤖 Interview Bot

An AI-powered interview assistant that represents **Sanath Kumar J S** in technical interviews using a personal knowledge base, multi-signal RAG search, and real-time voice interaction.

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
- 📱 **Mobile responsive** — Works on all screen sizes

---

## 🏗️ Architecture

```
┌─────────────────────┐     HTTP      ┌──────────────────────┐
│   Next.js 14 UI     │ ──────────── │   .NET 8 Web API     │
│   (Vercel)          │              │   (Railway)           │
└─────────────────────┘              └──────────┬───────────┘
                                                │
                              ┌─────────────────┼─────────────────┐
                              │                 │                 │
                    ┌─────────▼──────┐  ┌───────▼──────┐  ┌─────▼───────┐
                    │  PostgreSQL 16  │  │  Groq Cloud  │  │ HuggingFace │
                    │  + pgvector    │  │  LLM + STT   │  │  Embeddings │
                    │  (Supabase)    │  │  (Free tier) │  │  (Free tier)│
                    └────────────────┘  └──────────────┘  └─────────────┘
```

---

## 📁 Project Structure

```
interview-bot/
├── interview-bot-ui/          # Next.js 14 frontend
│   ├── app/
│   │   ├── page.tsx           # Home page
│   │   ├── chat/page.tsx      # Chat interface
│   │   ├── prep/page.tsx      # Prep dashboard (PIN protected)
│   │   └── sessions/
│   │       ├── page.tsx       # Session list
│   │       └── [id]/page.tsx  # Transcript view
│   ├── components/
│   │   ├── Navbar.tsx
│   │   └── chat/
│   │       ├── InputBar.tsx
│   │       ├── MessageBubble.tsx
│   │       └── TypingIndicator.tsx
│   └── lib/api.ts
│
├── interview-bot-api/         # .NET 8 Web API
│   ├── Controllers/
│   │   ├── ChatController.cs
│   │   ├── TranscribeController.cs
│   │   └── IngestionController.cs
│   ├── Services/
│   │   ├── ChatService.cs
│   │   ├── KnowledgeSearchService.cs
│   │   ├── IngestionService.cs
│   │   ├── EmbeddingService.cs
│   │   └── ChunkMetadataHelper.cs
│   ├── Models/
│   │   ├── ChatModels.cs
│   │   └── KnowledgeChunk.cs
│   └── knowledge-base/        # Personal KB — .md files
│       ├── introduction.md
│       ├── career-journey.md
│       ├── ai-rag.md
│       ├── dotnet.md
│       ├── dotnet-interview-qa.md
│       └── ...
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
| `questions_embedding` | **0.45** | AI generated 5 question variants per chunk at ingest time. Question-to-question matching is the most accurate signal — same vector space as the query. Solves the Q↔A vector space mismatch problem. |
| `title_embedding` | **0.30 / 0.15** | Section heading embedded alone (not diluted by body). Adaptive: 5+ word headings (e.g. "Tell Me About Yourself") get 0.30 weight; short headings (e.g. "Who I Am") get 0.15. |
| `body_embedding` | **0.25 / 0.40** | Semantic content of the full chunk. Safety net for paraphrasing and technical knowledge questions. Gets higher weight when title is short. |

---

## 🗄️ Database Schema

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Core KB table
CREATE TABLE knowledge_chunks (
    id                   SERIAL PRIMARY KEY,
    source_file          TEXT,
    section_title        TEXT,
    chunk_text           TEXT,              -- Topic + Section + body (body embedding)
    chunk_index          INTEGER,
    embedding            VECTOR(768),       -- body embedding
    topic                TEXT,
    tags                 TEXT[],            -- keyword tags for soft boost
    hit_count            INTEGER DEFAULT 0,
    last_used_at         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    -- ── Added for 3-signal search ─────────────────────────────────────
    title_embedding      VECTOR(768),       -- section heading embedded alone
    questions_embedding  VECTOR(768),       -- 5 AI-generated question variants joined + embedded
    questions_text       TEXT[],            -- raw questions (for inspection in Supabase)
    title_word_count     INT                -- drives adaptive title weight
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
    role              TEXT,                 -- 'interviewer' or 'bot'
    message_text      TEXT,
    confidence_score  FLOAT,
    answer_source     TEXT,                 -- knowledge_base | not_found | llm_general | fallback_ai
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
    question_category   TEXT,              -- added via ALTER TABLE
    sanath_answered_at  TIMESTAMPTZ,       -- added via ALTER TABLE
    updated_at          TIMESTAMPTZ,       -- added via ALTER TABLE
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

-- HNSW indexes for fast vector search
CREATE INDEX ON knowledge_chunks USING hnsw (embedding          vector_cosine_ops);
CREATE INDEX ON knowledge_chunks USING hnsw (title_embedding    vector_cosine_ops);
CREATE INDEX ON knowledge_chunks USING hnsw (questions_embedding vector_cosine_ops);
```

---

## 📝 Knowledge Base

14 `.md` files in `interview-bot-api/knowledge-base/`. `answering-guidelines.md` is excluded from search (internal style instructions only).

| File | Chunks | Topic |
|---|---|---|
| `introduction.md` | 7 | Who I am, Tell Me About Yourself, career summary, specialization |
| `career-journey.md` | 5 | Toyota Tsusho, Capgemini, Euromonitor, Ingenio, why looking |
| `recent-project.md` | 11 | Keen product, RAG systems, JWT migration, integrations |
| `ai-rag.md` | 13 | 3 production RAG pipelines, how each works, tech decisions |
| `dotnet-interview-qa.md` | 20 | 20 Q&A pairs: DI, async/await, GC, EF Core, Polly, records etc. |
| `dotnet.md` | 6 | Years, what I build, strongest areas, design patterns |
| `leadership.md` | 4 | 3 leadership stories + philosophy |
| `general-hr.md` | 9 | Strengths, weakness, salary, notice, education |
| `my-approach.md` | 7 | System design: URL shortener, notifications, rate limiter, chat |
| `arrays-strings.md` | 7 | DSA: two pointers, sliding window, hashmap, Kadane |
| `trees.md` | 6 | BST, traversal, DFS vs BFS |
| `dynamic-programming.md` | 4 | DP identification, approach, patterns |
| `complexity-cheatsheet.md` | 4 | Big-O reference |
| `answering-guidelines.md` | — | EXCLUDED — internal instructions |

**Total indexed: 101 chunks across 13 files**

**To add new content:**
1. Edit or add a `.md` file — use `## Section Title` headings
2. Write headings as the **exact question an interviewer would ask** (improves title + questions embedding match)
3. Push to GitHub, then re-ingest:

```bash
curl -X POST https://interview-bot-production.up.railway.app/api/ingest \
  -H "X-Admin-Key: your-key"
# Takes ~5 minutes — embeds body + title + generates 5 question variants per chunk
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Frontend |
| .NET SDK | 8.0 | Backend |
| PostgreSQL | 16 | Database |
| pgvector | 0.7 | Vector search |
| Docker | Optional | DB containerisation |

### 1. Clone

```bash
git clone https://github.com/sanathjs/interview-bot.git
cd interview-bot
```

### 2. Database setup

```bash
docker run --name interview-bot-db \
  -e POSTGRES_PASSWORD=postgres123 \
  -e POSTGRES_DB=interview_bot \
  -p 5432:5432 \
  -d pgvector/pgvector:pg16

psql -U postgres -d interview_bot -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Run `docs/schema.sql` to create all tables and indexes.

### 3. Backend

```bash
cd interview-bot-api
cp appsettings.example.json appsettings.json
# Fill in your values
dotnet restore
dotnet run
# Runs on http://localhost:5267
```

### 4. Frontend

```bash
cd interview-bot-ui
cp .env.example .env.local
# Fill in values
npm install
npm run dev
# Runs on http://localhost:3000
```

### 5. Ingest KB

```bash
curl -X POST http://localhost:5267/api/ingest -H "X-Admin-Key: your-key"
# Takes ~5 minutes locally
```

---

## ⚙️ Configuration

### Backend — `appsettings.json`

```json
{
  "DATABASE_URL": "Host=localhost;Port=5432;Database=interview_bot;Username=postgres;Password=postgres123",
  "ADMIN_INGEST_KEY": "your-secret-key",
  "LlmProvider": "groq",
  "HuggingFace": {
    "ApiKey": "hf_..."
  },
  "Groq": {
    "ApiKey": "gsk_...",
    "Model": "llama-3.3-70b-versatile",
    "BaseUrl": "https://api.groq.com/openai/v1"
  }
}
```

### Frontend — `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5267
NEXT_PUBLIC_PREP_PIN=1234
```

---

## 📡 API Endpoints

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

---

## 🌐 Deployment

### Free Stack (current)

| Layer | Platform | Cost |
|---|---|---|
| Frontend | Vercel | Free |
| Backend | Railway | Free ($5 credit/mo) |
| Database | Supabase | Free (500MB) |
| Embeddings | HuggingFace | Free |
| LLM + STT | Groq | Free |
| **Total** | | **$0/month** |

### Production Stack (future)

| Layer | Platform | Cost |
|---|---|---|
| Frontend | Vercel / Azure Static Web Apps | Free |
| Backend | Azure App Service B1 | ~$13/mo |
| Database | Azure PostgreSQL Flexible | ~$14/mo |
| Embeddings | OpenAI text-embedding-3-small | ~$0.01/mo |
| LLM | gpt-4o-mini | ~$1–3/mo |

---

## 🛠️ Development Notes

- `session_analytics` has no auto-trigger — stats fall back to live subqueries from `chat_messages`
- `answering-guidelines.md` is excluded from search at ingest time and from SQL queries — do not rename it
- Voice input uses `MediaRecorder` → Groq Whisper → auto-sends transcribed text
- Voice playback uses `window.speechSynthesis` (browser TTS, no API needed)
- Prep dashboard is PIN-protected via `NEXT_PUBLIC_PREP_PIN` env variable
- Admin gear icon visible only when `localStorage.ib_role === "admin"`
- Re-ingest required after any KB change — takes ~5 min for 101 chunks (3 embeddings + 1 Groq call per chunk)
- KB headings should be written as the **exact question** an interviewer would ask — this maximises title and questions embedding accuracy

---

## 📄 License

MIT — feel free to fork and adapt for your own interview assistant.

---

Built with ❤️ by [Sanath Kumar J S](https://github.com/sanathjs)