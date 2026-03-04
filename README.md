# 🤖 Interview Bot

An AI-powered interview assistant that represents **Sanath Kumar J S** in technical interviews using a personal knowledge base, RAG (Retrieval Augmented Generation), and real-time voice interaction.

> Built with Next.js 14 · .NET 8 · PostgreSQL + pgvector · Groq LLM · Whisper STT

---

## ✨ Features

- 🧠 **RAG-powered answers** — Answers interview questions using a personal knowledge base of `.md` files
- 🎙️ **Voice input** — Interviewer can ask questions via microphone (Groq Whisper STT)
- 🔊 **Voice playback** — Bot answers can be read aloud via browser TTS
- 📝 **Unanswered question tracking** — Questions outside the KB are stored for prep
- 📚 **Prep dashboard** — Review, answer, and promote unanswered questions to the KB
- 📋 **Session history** — Browse past interviews with full transcripts
- 📊 **Confidence scoring** — Every answer shows a confidence % based on vector similarity
- 📱 **Mobile responsive** — Works on all screen sizes

---

## 🏗️ Architecture

```
┌─────────────────────┐     HTTP      ┌──────────────────────┐
│   Next.js 14 UI     │ ──────────── │   .NET 8 Web API     │
│   (Vercel)          │              │   (Railway)           │
└─────────────────────┘              └──────────┬───────────┘
                                                │
                              ┌─────────────────┼──────────────────┐
                              │                 │                  │
                    ┌─────────▼──────┐  ┌───────▼──────┐  ┌──────▼──────┐
                    │  PostgreSQL 16  │  │  Groq Cloud  │  │  Ollama     │
                    │  + pgvector    │  │  LLM + STT   │  │  Embeddings │
                    │  (Supabase)    │  │  (Free tier) │  │  (Local)    │
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
│   │   ├── Navbar.tsx         # Shared navigation
│   │   └── chat/
│   │       ├── InputBar.tsx   # Text + voice input
│   │       ├── MessageBubble.tsx
│   │       └── TypingIndicator.tsx
│   └── lib/
│       └── api.ts             # API fetch wrappers
│
├── interview-bot-api/         # .NET 8 Web API backend
│   ├── Controllers/
│   │   ├── ChatController.cs
│   │   ├── TranscribeController.cs
│   │   └── IngestionController.cs
│   ├── Services/
│   │   ├── ChatService.cs
│   │   ├── KnowledgeSearchService.cs
│   │   ├── IngestionService.cs
│   │   └── EmbeddingService.cs
│   └── Models/
│       └── Models.cs
│
└── knowledge-base/            # Personal KB — .md files
    ├── introduction.md
    ├── career-journey.md
    ├── ai-rag.md
    ├── dotnet.md
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
| Ollama | Latest | Local embeddings |
| Docker | Optional | DB containerization |

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

Run the schema setup (see `docs/schema.sql` or the Database Schema section below).

### 3. Set up Ollama (local embeddings)

```bash
# Install Ollama from https://ollama.ai
ollama pull nomic-embed-text
```

### 4. Backend setup

```bash
cd interview-bot-api

# Create appsettings.json (never committed — see appsettings.example.json)
cp appsettings.example.json appsettings.json

# Fill in your values (see Configuration section below)
# Then run:
dotnet restore
dotnet run
# API runs on http://localhost:5267
```

### 5. Frontend setup

```bash
cd interview-bot-ui

# Create environment file
cp .env.example .env.local

# Fill in values then:
npm install
npm run dev
# UI runs on http://localhost:3000
```

### 6. Ingest knowledge base

```bash
curl -X POST http://localhost:5267/api/ingest \
  -H "X-Admin-Key: your-admin-key"
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
  "Ollama": {
    "BaseUrl": "http://localhost:11434",
    "EmbeddingModel": "nomic-embed-text"
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

## 🔑 API Keys Required

| Service | Purpose | Get it at |
|---|---|---|
| Groq | LLM chat + Whisper STT | console.groq.com |
| HuggingFace | Cloud embeddings (for deployment) | huggingface.co/settings/tokens |

Both have **free tiers** sufficient for development and light production use.

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/chat` | Send message, get RAG answer | None |
| GET | `/api/sessions` | List all sessions | None |
| GET | `/api/sessions/{id}/detail` | Full transcript by session id | None |
| GET | `/api/unanswered` | Prep dashboard questions | None |
| PATCH | `/api/unanswered/{id}/answer` | Save answer to question | None |
| POST | `/api/unanswered/{id}/promote` | Add answer to KB | None |
| DELETE | `/api/unanswered/{id}` | Delete question | None |
| POST | `/api/transcribe` | Audio → text (Whisper) | None |
| POST | `/api/ingest` | Re-ingest KB files | X-Admin-Key header |

---

## 🗄️ Database Schema

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Core tables
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
CREATE INDEX ON knowledge_chunks
    USING hnsw (embedding vector_cosine_ops);
```

---

## 🧠 How RAG Works

```
Question asked
      ↓
Embed question (nomic-embed-text, 768d)
      ↓
pgvector cosine similarity search (top 15 chunks)
      ↓
Apply file boost (keyword match → +0.15 to +0.20)
      ↓
Re-rank top 10
      ↓
Confidence decision:
  ≥ 0.65 → HIGH   → Answer from KB
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

## 📝 Knowledge Base

The KB lives in `/knowledge-base/*.md` files. Each file covers a topic:

| File | Topic |
|---|---|
| `introduction.md` | Who Sanath is |
| `career-journey.md` | Work history |
| `ai-rag.md` | AI/RAG experience |
| `dotnet.md` | .NET expertise |
| `challenges.md` | Challenge examples |
| `leadership.md` | Leadership experience |
| ... | ... |

**To add new content:**
1. Edit or add a `.md` file in `/knowledge-base/`
2. Call `POST /api/ingest` with admin key
3. All chunks are re-embedded and indexed (~30–60 seconds)

---

## 🌐 Deployment

### Free Stack (Recommended for pre-prod)

| Layer | Platform | Cost |
|---|---|---|
| Frontend | Vercel | Free |
| Backend | Railway | Free ($5 credit) |
| Database | Supabase | Free (500MB) |
| Embeddings | Hugging Face | Free |
| LLM + STT | Groq | Free |

### Production Stack

| Layer | Platform | Cost |
|---|---|---|
| Frontend | Vercel / Azure Static Web Apps | Free |
| Backend | Azure App Service B1 | ~$13/mo |
| Database | Azure PostgreSQL Flexible | ~$14/mo |
| Embeddings | OpenAI text-embedding-3-small | ~$0.01/mo |
| LLM | gpt-4o-mini or Groq 70B | ~$1–3/mo |

---

## 🛠️ Development Notes

- `session_analytics` has no auto-trigger — stats fall back to live subqueries from `chat_messages`
- Ollama is used for embeddings locally only — swap to HuggingFace or OpenAI for cloud deployment
- The prep dashboard is PIN-protected via `NEXT_PUBLIC_PREP_PIN` env variable
- Voice input uses `MediaRecorder` → Groq Whisper → auto-sends transcribed text
- Voice playback uses `window.speechSynthesis` (browser TTS, no API needed)

---

## 📄 License

MIT — feel free to fork and adapt for your own interview assistant.

---

Built with ❤️ by [Sanath Kumar J S](https://github.com/sanathjs)