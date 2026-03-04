# 🤖 Interview Bot

An AI-powered interview assistant that represents **Sanath Kumar J S** in technical interviews using a personal knowledge base, RAG (Retrieval Augmented Generation), and real-time voice interaction.

> Built with Next.js 14 · .NET 8 · PostgreSQL + pgvector · Groq LLM · Whisper STT · HuggingFace Embeddings

---

## ✨ Features

- 🧠 **RAG-powered answers** — Answers interview questions using a personal knowledge base of `.md` files
- 🎙️ **Voice input** — Interviewer asks questions via microphone (Groq Whisper STT, auto-sends)
- 🔊 **Voice playback** — Bot answers read aloud via browser TTS (Web Speech API)
- 📝 **Unanswered question tracking** — Questions outside the KB are stored for prep
- 📚 **Prep dashboard** — PIN-protected. Review, answer, and promote questions to the KB
- 📋 **Session history** — Browse past interviews with full transcripts
- 📊 **Confidence scoring** — Every answer shows a confidence % based on vector similarity
- 🏠 **Home page** — Clean landing page with navigation to all routes
- 📱 **Mobile responsive** — Works on all screen sizes

---

## 🏗️ Architecture

```
┌─────────────────────┐     HTTP      ┌──────────────────────┐
│   Next.js 14 UI     │ ──────────── │   .NET 8 Web API     │
│   (Vercel)          │              │   (Railway)           │
└─────────────────────┘              └──────────┬───────────┘
                                                │
                         ┌──────────────────────┼───────────────────┐
                         │                      │                   │
               ┌─────────▼──────┐    ┌──────────▼─────┐  ┌────────▼────────┐
               │  PostgreSQL 16  │    │   Groq Cloud   │  │  HuggingFace    │
               │  + pgvector    │    │  LLM + Whisper │  │  bge-base-en    │
               │  (Supabase)    │    │  (Free tier)   │  │  Embeddings     │
               └────────────────┘    └────────────────┘  └─────────────────┘
```

---

## 📁 Project Structure

```
interview-bot/
├── interview-bot-ui/               # Next.js 14 frontend
│   ├── app/
│   │   ├── page.tsx                # Home page with route cards
│   │   ├── layout.tsx              # Root layout + metadata
│   │   ├── chat/page.tsx           # Main chat interface
│   │   ├── prep/page.tsx           # Prep dashboard (PIN protected)
│   │   └── sessions/
│   │       ├── page.tsx            # Session history list
│   │       └── [id]/page.tsx       # Full transcript view
│   ├── components/
│   │   ├── Navbar.tsx              # Shared sticky navigation
│   │   └── chat/
│   │       ├── InputBar.tsx        # Text + voice input bar
│   │       ├── MessageBubble.tsx   # Chat bubble + TTS play button
│   │       └── TypingIndicator.tsx # Animated dots while bot responds
│   └── lib/
│       └── api.ts                  # All fetch wrappers
│
├── interview-bot-api/              # .NET 8 Web API backend
│   ├── Controllers/
│   │   ├── ChatController.cs       # Chat, sessions, unanswered endpoints
│   │   ├── TranscribeController.cs # POST /api/transcribe (Groq Whisper)
│   │   └── IngestionController.cs  # POST /api/ingest (KB re-ingestion)
│   ├── Services/
│   │   ├── ChatService.cs          # RAG orchestration + DB helpers
│   │   ├── KnowledgeSearchService.cs # pgvector search + file boost
│   │   ├── IngestionService.cs     # Chunk + embed + store KB
│   │   └── EmbeddingService.cs     # HuggingFace BAAI/bge-base-en-v1.5
│   ├── Models/
│   │   └── Models.cs               # Request/response models
│   └── appsettings.example.json    # Config template (copy to appsettings.json)
│
└── knowledge-base/                 # Personal KB — .md files
    ├── introduction.md
    ├── career-journey.md
    ├── ai-rag.md
    ├── dotnet.md
    ├── challenges.md
    ├── leadership.md
    ├── general-hr.md
    ├── recent-project.md
    └── ...
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
| Docker | Optional | DB containerization |

> ⚠️ Ollama is **no longer required**. Embeddings now use HuggingFace cloud API.

### 1. Clone the repository

```bash
git clone https://github.com/sanathjs/interview-bot.git
cd interview-bot
```

### 2. Set up PostgreSQL + pgvector

```bash
# Using Docker (recommended)
docker run --name interview-bot-db \
  -e POSTGRES_PASSWORD=postgres123 \
  -e POSTGRES_DB=interview_bot \
  -p 5432:5432 \
  -d pgvector/pgvector:pg16

# Enable pgvector
psql -U postgres -d interview_bot -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 3. Backend setup

```bash
cd interview-bot-api

# Copy config template and fill in your keys
cp appsettings.example.json appsettings.json
# Edit appsettings.json with your API keys (see Configuration below)

dotnet restore
dotnet run
# API runs on http://localhost:5267
```

### 4. Frontend setup

```bash
cd interview-bot-ui

cp .env.example .env.local
# Edit .env.local with your values

npm install
npm run dev
# UI runs on http://localhost:3000
```

### 5. Ingest knowledge base

```cmd
curl -X POST http://localhost:5267/api/ingest -H "X-Admin-Key: your-admin-key"
```

Expected response: `chunksCreated: 70`

---

## ⚙️ Configuration

### Backend — `appsettings.json` (never committed — gitignored)

```json
{
  "DATABASE_URL": "Host=localhost;Port=5432;Database=interview_bot;Username=postgres;Password=yourpassword",
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

### Frontend — `.env.local` (never committed — gitignored)

```env
NEXT_PUBLIC_API_URL=http://localhost:5267
NEXT_PUBLIC_PREP_PIN=1234
```

---

## 🔑 API Keys Required

| Service | Purpose | Free tier | Get it at |
|---|---|---|---|
| Groq | LLM chat (llama-3.3-70b) + Whisper STT | ✅ Yes | console.groq.com |
| HuggingFace | Embeddings (bge-base-en-v1.5) | ✅ Yes | huggingface.co/settings/tokens |

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/chat` | Send message, get RAG answer | None |
| GET | `/api/sessions` | List all sessions with stats | None |
| GET | `/api/sessions/{id}/detail` | Full session + transcript by id | None |
| GET | `/api/unanswered` | Prep dashboard question list | None |
| PATCH | `/api/unanswered/{id}/answer` | Save answer to question | None |
| POST | `/api/unanswered/{id}/promote` | Promote answer to KB | None |
| DELETE | `/api/unanswered/{id}` | Delete question | None |
| POST | `/api/transcribe` | Audio → text via Groq Whisper | None |
| POST | `/api/ingest` | Re-ingest all KB `.md` files | X-Admin-Key header |

---

## 🗄️ Database Schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_chunks (
    id              SERIAL PRIMARY KEY,
    source_file     TEXT,
    section_title   TEXT,
    chunk_text      TEXT,
    chunk_index     INTEGER,
    embedding       VECTOR(768),
    hit_count       INTEGER DEFAULT 0,
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
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

-- HNSW index for fast vector search
CREATE INDEX ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
```

---

## 🧠 How RAG Works

```
Question asked
      ↓
Embed question → HuggingFace BAAI/bge-base-en-v1.5 (768d)
      ↓
pgvector cosine similarity search (top 15 chunks)
      ↓
Apply file boost (keyword match → +0.15 to +0.20)
      ↓
Re-rank top 10
      ↓
Confidence decision:
  ≥ 0.65 → HIGH   → Answer confidently from KB
  ≥ 0.58 → MEDIUM → Answer from top 3 chunks
  < 0.58 → LOW    → Store as unanswered
      ↓
Build prompt with context chunks
      ↓
Groq llama-3.3-70b-versatile generates answer
      ↓
Save to chat_messages with confidence score
```

---

## 🎙️ Voice Input Flow

```
User clicks mic → MediaRecorder captures audio/webm
      ↓
User clicks mic again to stop
      ↓
Audio blob → POST /api/transcribe (multipart)
      ↓
.NET → Groq whisper-large-v3-turbo → plain text
      ↓
Auto-sends as chat message
```

---

## 🌐 Deployment

### Free Stack (pre-prod)

| Layer | Platform | Cost |
|---|---|---|
| Frontend | Vercel | Free |
| Backend | Railway | Free ($5 credit/mo) |
| Database | Supabase | Free (500MB) |
| Embeddings | HuggingFace | Free |
| LLM + STT | Groq | Free |
| **Total** | | **$0/month** |

### Production Stack

| Layer | Platform | Cost |
|---|---|---|
| Frontend | Vercel / Azure Static Web Apps | Free |
| Backend | Azure App Service B1 | ~$13/mo |
| Database | Azure PostgreSQL Flexible | ~$14/mo |
| Embeddings | HuggingFace or OpenAI | ~$0–1/mo |
| LLM | Groq 70B or gpt-4o-mini | ~$0–3/mo |
| **Total** | | **~$27–30/mo** |

---

## 📝 Knowledge Base

KB lives in `/knowledge-base/*.md`. To add new content:
1. Edit or add a `.md` file
2. Call `POST /api/ingest` with your admin key
3. All 70 chunks are re-embedded (~30–60 seconds)
4. New content is immediately live in vector search

---

## 🛠️ Development Notes

- `appsettings.json` and `.env.local` are **gitignored** — never committed
- Always use `appsettings.example.json` and `.env.example` as templates
- `session_analytics` has no auto-trigger — stats fall back to live subqueries
- Voice input uses `MediaRecorder` → Groq Whisper → auto-sends transcribed text
- Voice playback uses `window.speechSynthesis` (browser TTS, no API cost)
- Embeddings use `BAAI/bge-base-en-v1.5` via HuggingFace router API (768d)

---

## 🔒 Security Notes

- Never commit `appsettings.json` — it contains your API keys
- Never commit `.env.local` — it contains your prep PIN
- Rotate API keys immediately if accidentally pushed to GitHub
- The prep dashboard PIN is set via `NEXT_PUBLIC_PREP_PIN` env variable

---

## 📄 License

MIT — feel free to fork and adapt for your own interview assistant.

---

Built with ❤️ by [Sanath Kumar J S](https://github.com/sanathjs)