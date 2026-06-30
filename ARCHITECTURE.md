# Architecture Diagrams

> Visual reference for the Interview Bot system. All diagrams are Mermaid — GitHub renders them inline; in VSCode use the Mermaid Preview extension or open this on GitHub. Icons use FontAwesome via `fa:fa-…` plus emoji for clarity.
>
> For the prose explanation of each flow, see [README.md](README.md). For Claude Code's session context, see [CLAUDE.md](CLAUDE.md).

---

## 1. System Overview — Who talks to whom

```mermaid
flowchart LR
    User["fa:fa-user Interviewer / Candidate"]

    subgraph Frontend["🎨 Frontend — Vercel"]
        UI["fa:fa-desktop Next.js 14<br/><i>App Router · TypeScript</i>"]
    end

    subgraph Backend["⚙️ Backend — Render.com"]
        API["fa:fa-server .NET 8 Web API<br/><i>Kestrel · Docker · port 10000</i>"]
    end

    subgraph Data["💾 Data Layer"]
        Primary[("fa:fa-database Supabase<br/><i>Primary · pgvector</i>")]
        Fallback[("fa:fa-database Neon<br/><i>Fallback · serverless</i>")]
    end

    subgraph AI["🤖 AI Services"]
        Groq["fa:fa-bolt Groq Cloud<br/><i>LLM + Whisper STT</i>"]
        HF["fa:fa-brain HuggingFace<br/><i>bge-base-en-v1.5 (768d)</i>"]
    end

    subgraph Jobs["💼 Job Market APIs"]
        Adzuna["fa:fa-briefcase Adzuna<br/><i>IN → GB → US fallback</i>"]
        Remotive["fa:fa-globe Remotive<br/><i>Remote jobs</i>"]
    end

    Cron["fa:fa-clock cron-job.org<br/><i>Keep-alive ping /10min</i>"]

    User -->|HTTPS| UI
    UI -->|REST / JSON| API
    API -->|Npgsql| Primary
    API -.->|auto-failover| Fallback
    API -->|HTTPS| Groq
    API -->|HTTPS| HF
    API -->|HTTPS| Adzuna
    API -->|HTTPS| Remotive
    Cron -->|GET /health| API

    classDef frontend fill:#0070f3,color:#fff,stroke:#0050b3
    classDef backend  fill:#512bd4,color:#fff,stroke:#3a1f9c
    classDef data     fill:#336791,color:#fff,stroke:#1e3f5a
    classDef ai       fill:#ff6b6b,color:#fff,stroke:#c93838
    classDef jobs     fill:#f5a623,color:#000,stroke:#b07412
    classDef ext      fill:#444,color:#fff,stroke:#222

    class UI frontend
    class API backend
    class Primary,Fallback data
    class Groq,HF ai
    class Adzuna,Remotive jobs
    class Cron,User ext
```

---

## 2. Chat / RAG Flow — From question to answer

```mermaid
flowchart TD
    Start(["fa:fa-comments User asks a question"]) --> Mode{Voice or text?}

    Mode -->|Voice| Mic["fa:fa-microphone MediaRecorder captures audio"]
    Mic --> Whisper["fa:fa-bolt POST /api/transcribe<br/>Groq Whisper STT"]
    Whisper --> Text

    Mode -->|Text| Text["fa:fa-keyboard Plain text input"]

    Text --> Chat["fa:fa-server POST /api/chat<br/>ChatService.cs"]
    Chat --> Inject{"fa:fa-shield Prompt injection?<br/><i>24 phrase patterns</i>"}
    Inject -->|Yes ❌| Reject["Return persona-guard response"]
    Inject -->|No ✅| Embed["fa:fa-brain Embed query<br/>HuggingFace bge-base-en-v1.5 → 768d vector"]

    Embed --> Search["fa:fa-search KnowledgeSearchService<br/><i>3 parallel SQL queries with HNSW index</i>"]

    Search --> S1["Signal 1: top 15 by body_embedding"]
    Search --> S2["Signal 2: top 15 by title_embedding"]
    Search --> S3["Signal 3: top 15 by questions_embedding"]

    S1 --> Merge["fa:fa-code-branch Merge by chunk_id<br/>Compute weighted score"]
    S2 --> Merge
    S3 --> Merge

    Merge --> Boost["fa:fa-plus-circle Boost:<br/>tag overlap (+0.05)<br/>file keyword (+0.05–0.08)"]
    Boost --> Gate{"fa:fa-tachometer-alt Confidence gate"}

    Gate -->|"≥ 0.62 HIGH"| LLM
    Gate -->|"≥ 0.52 MEDIUM"| LLM
    Gate -->|"< 0.52 LOW"| Unanswered["fa:fa-question-circle Store in<br/>unanswered_questions"]

    LLM["fa:fa-bolt Groq<br/>llama-3.3-70b-versatile"] --> Save["fa:fa-save Save to chat_messages<br/>with confidence + source"]
    Save --> Resp(["fa:fa-comment-dots Return answer +<br/>confidence + sources +<br/>botSequenceNumber"])

    Unanswered --> RespLow(["fa:fa-comment-dots Return fallback +<br/>track for prep dashboard"])

    classDef ai        fill:#ff6b6b,color:#fff,stroke:#c93838
    classDef search    fill:#9b59b6,color:#fff,stroke:#6c3a85
    classDef decision  fill:#f39c12,color:#000,stroke:#b07412
    classDef store     fill:#27ae60,color:#fff,stroke:#196f3d
    classDef terminal  fill:#34495e,color:#fff,stroke:#1f2d3a

    class Whisper,LLM,Embed ai
    class Search,S1,S2,S3,Merge,Boost search
    class Mode,Inject,Gate decision
    class Save,Unanswered store
    class Start,Resp,RespLow,Reject terminal
```

### Score formula (reference)

```
titleWeight = title_word_count >= 5 ? 0.30 : 0.15
bodyWeight  = title_word_count >= 5 ? 0.25 : 0.40
finalScore  = (questionsSim × 0.45)
            + (titleSim     × titleWeight)
            + (bodySim      × bodyWeight)
            + tag/file boost
```

---

## 3. Knowledge Base Ingestion Flow

```mermaid
flowchart TD
    Trigger(["fa:fa-bolt POST /api/ingest<br/>X-Admin-Key header"]) --> Truncate["fa:fa-trash TRUNCATE knowledge_chunks<br/>RESTART IDENTITY CASCADE"]
    Truncate --> List["fa:fa-folder-open Read all *.md files<br/>from knowledge-base/"]

    List --> Loop{"fa:fa-redo For each file"}
    Loop --> Exclude{"fa:fa-filter ChunkMetadataHelper<br/>.IsExcludedFromSearch()?"}
    Exclude -->|Yes ⏭️| Skip["Skip file<br/><i>answering-guidelines,<br/>dotnet-interview-prep-v2,<br/>dotnet-interview-qa</i>"]
    Skip --> Loop

    Exclude -->|No ✅| Split["fa:fa-cut Regex split on ^## <br/><i>SplitIntoChunks()</i>"]
    Split --> ChunkLoop{"fa:fa-redo For each ## section"}

    ChunkLoop --> Validate{"fa:fa-check Body ≥ 30 chars?"}
    Validate -->|No| ChunkLoop
    Validate -->|Yes| Enrich["fa:fa-tags Add metadata:<br/>topic, tags, prefix<br/>'Topic: X / Section: Y'"]

    Enrich --> E1["fa:fa-brain Body embedding<br/>HuggingFace → 768d"]
    Enrich --> E2["fa:fa-brain Title embedding<br/>HuggingFace → 768d"]
    Enrich --> QGen["fa:fa-bolt Groq generates<br/>5 question variants"]
    QGen --> E3["fa:fa-brain Questions embedding<br/>HuggingFace → 768d"]

    E1 --> Insert["fa:fa-database INSERT INTO knowledge_chunks<br/>3 vectors + text + tags + questions"]
    E2 --> Insert
    E3 --> Insert
    Insert --> Delay["fa:fa-pause Task.Delay(100ms)<br/><i>HF rate-limit guard</i>"]
    Delay --> ChunkLoop

    ChunkLoop -->|done| Loop
    Loop -->|done| End(["fa:fa-check-circle Return IngestionResult<br/>chunks created + files processed"])

    classDef ai      fill:#ff6b6b,color:#fff,stroke:#c93838
    classDef db      fill:#336791,color:#fff,stroke:#1e3f5a
    classDef logic   fill:#9b59b6,color:#fff,stroke:#6c3a85
    classDef decide  fill:#f39c12,color:#000,stroke:#b07412
    classDef start   fill:#34495e,color:#fff,stroke:#1f2d3a

    class E1,E2,E3,QGen ai
    class Truncate,Insert db
    class Split,Enrich logic
    class Loop,ChunkLoop,Exclude,Validate decide
    class Trigger,End start
```

---

## 4. Database Failover — Supabase ↔ Neon

```mermaid
stateDiagram-v2
    direction LR

    [*] --> CheckPrimary

    CheckPrimary: 🟢 Try Primary<br/>(Supabase)
    UsingPrimary: ✅ Active Primary
    CooldownCheck: ⏱️ In 5-min<br/>cooldown?
    TryFallback: 🟡 Switch to Fallback<br/>(Neon)
    UsingFallback: ✅ Active Fallback
    BothDown: ❌ Both Down<br/>(error to caller)

    CheckPrimary --> UsingPrimary: Success
    CheckPrimary --> CooldownCheck: Failure

    CooldownCheck --> UsingPrimary: Cooldown expired<br/>→ retry primary
    CooldownCheck --> TryFallback: Within cooldown<br/>→ skip primary

    TryFallback --> UsingFallback: Success
    TryFallback --> BothDown: Failure

    UsingPrimary --> CheckPrimary: Next request
    UsingFallback --> CheckPrimary: After 5 min<br/>retry primary

    note right of CheckPrimary
        DatabaseConnectionManager.cs
        Singleton — wraps every
        Npgsql call.
    end note

    note right of UsingFallback
        /health endpoint reports
        which DB is active.
        /ping runs SELECT 1 to
        keep both warm.
    end note
```

---

## 5. Skill Gap Analyzer Flow

```mermaid
flowchart TD
    Input(["fa:fa-user-tie User: role keywords + location"]) --> Submit["fa:fa-paper-plane POST /api/skill-gap"]

    Submit --> Parallel{{"fa:fa-random Fetch jobs in parallel"}}

    Parallel --> Ad1["fa:fa-briefcase Adzuna IN"]
    Ad1 --> AdCheck{"&lt; 10 jobs?"}
    AdCheck -->|Yes| Ad2["fa:fa-briefcase Adzuna GB"]
    AdCheck -->|No| Combine
    Ad2 --> AdCheck2{"&lt; 10 jobs?"}
    AdCheck2 -->|Yes| Ad3["fa:fa-briefcase Adzuna US"]
    AdCheck2 -->|No| Combine
    Ad3 --> Combine

    Parallel --> Rem["fa:fa-globe Remotive<br/>(remote jobs)"]
    Rem --> Combine

    Combine["fa:fa-object-group Merge job listings"] --> Extract["fa:fa-bolt Groq extracts skills<br/>required / nice-to-have / trending<br/><i>batched per JD</i>"]

    Extract --> Profile["fa:fa-id-badge Load Sanath's KB-derived<br/>skill profile"]
    Profile --> Score["fa:fa-balance-scale Score each job:<br/>ATS = keyword match %<br/>Match = required skill overlap %"]

    Score --> Rank["fa:fa-sort-amount-down Rank jobs by score"]
    Rank --> Persist["fa:fa-database Persist to job_listings<br/><i>external_id unique → no dupes</i>"]

    Persist --> Resp(["fa:fa-chart-bar Return:<br/>Ranked jobs + ATS scores<br/>Matched / Missing / Trending skills<br/>Salary range · Top companies"])

    classDef ext      fill:#f5a623,color:#000,stroke:#b07412
    classDef ai       fill:#ff6b6b,color:#fff,stroke:#c93838
    classDef logic    fill:#9b59b6,color:#fff,stroke:#6c3a85
    classDef db       fill:#336791,color:#fff,stroke:#1e3f5a
    classDef decide   fill:#f39c12,color:#000,stroke:#b07412
    classDef start    fill:#34495e,color:#fff,stroke:#1f2d3a

    class Ad1,Ad2,Ad3,Rem ext
    class Extract ai
    class Combine,Profile,Score,Rank logic
    class Persist db
    class Parallel,AdCheck,AdCheck2 decide
    class Input,Submit,Resp start
```

---

## 6. Knowledge Base — From .md file to UI card

How a single `##` heading in a markdown file flows all the way to a card in the prep UI.

```mermaid
flowchart LR
    subgraph File["📄 dotnet-interview-prep.md"]
        H1["# Title (ignored)"]
        H2A["## C# Core — Records<br/>Body text..."]
        H2B["## C# Core — Spans<br/>Body text..."]
        H2C["## ASP.NET — Middleware<br/>Body text..."]
    end

    subgraph Chunker["⚙️ IngestionService"]
        Split["Regex split on ^## "]
        Validate["Body ≥ 30 chars?"]
        Embed3["3 embeddings per chunk<br/>+ AI question variants"]
    end

    subgraph DB["💾 knowledge_chunks table"]
        Row1[("section_title: 'C# Core — Records'<br/>chunk_text, 3 vectors, tags")]
        Row2[("section_title: 'C# Core — Spans'<br/>chunk_text, 3 vectors, tags")]
        Row3[("section_title: 'ASP.NET — Middleware'<br/>chunk_text, 3 vectors, tags")]
    end

    subgraph UI["📱 Prepare UI (mobile)"]
        Card1["fa:fa-credit-card Card 1<br/>'C# Core — Records'"]
        Card2["fa:fa-credit-card Card 2<br/>'C# Core — Spans'"]
        Card3["fa:fa-credit-card Card 3<br/>'ASP.NET — Middleware'"]
    end

    H2A --> Split
    H2B --> Split
    H2C --> Split
    H1 -.->|dropped| Skip[ ]

    Split --> Validate --> Embed3
    Embed3 --> Row1
    Embed3 --> Row2
    Embed3 --> Row3

    Row1 -->|GET /api/knowledge/files/X| Card1
    Row2 --> Card2
    Row3 --> Card3

    classDef file   fill:#fff3cd,color:#000,stroke:#856404
    classDef proc   fill:#9b59b6,color:#fff,stroke:#6c3a85
    classDef db     fill:#336791,color:#fff,stroke:#1e3f5a
    classDef ui     fill:#0070f3,color:#fff,stroke:#0050b3
    classDef skip   fill:#aaa,color:#000,stroke:#888,stroke-dasharray:5 5

    class H1,H2A,H2B,H2C file
    class Split,Validate,Embed3 proc
    class Row1,Row2,Row3 db
    class Card1,Card2,Card3 ui
    class Skip skip
```

**Key rule:** every `##` heading = one DB row = one UI card. Drop a `##` and you lose a card. Add one and you gain one. The `#` (h1) is dropped entirely.

---

## 7. Request Lifecycle — A single `/api/chat` call

Sequence diagram showing every actor involved when a question is asked.

```mermaid
sequenceDiagram
    autonumber
    actor U as 🧑 User
    participant UI as 🎨 Next.js UI
    participant API as ⚙️ .NET API
    participant DCM as 🔌 DBConnMgr
    participant DB as 🗄️ Postgres
    participant HF as 🧠 HuggingFace
    participant G as ⚡ Groq

    U->>UI: Type or speak question
    opt Voice input
        UI->>API: POST /api/transcribe (audio)
        API->>G: Whisper STT
        G-->>API: Transcribed text
        API-->>UI: text
    end

    UI->>API: POST /api/chat { sessionCode, question }
    API->>API: IsPromptInjection()<br/>(24 phrase check)
    API->>HF: Embed query → 768d vector
    HF-->>API: queryVec

    par 3-signal vector search
        API->>DCM: SELECT top 15 by body_embedding
        DCM->>DB: pgvector <=> query
        DB-->>DCM: rows
        DCM-->>API: body candidates
    and
        API->>DCM: SELECT top 15 by title_embedding
        DCM->>DB: pgvector <=> query
        DB-->>DCM: rows
        DCM-->>API: title candidates
    and
        API->>DCM: SELECT top 15 by questions_embedding
        DCM->>DB: pgvector <=> query
        DB-->>DCM: rows
        DCM-->>API: question candidates
    end

    API->>API: Merge + weighted score<br/>+ tag/file boost
    alt confidence ≥ 0.52
        API->>G: Generate answer<br/>(llama-3.3-70b)
        G-->>API: answer
        API->>DCM: INSERT chat_messages
        DCM->>DB: write
        API-->>UI: { answer, confidence, sources, botSequenceNumber }
    else confidence < 0.52
        API->>DCM: INSERT unanswered_questions
        DCM->>DB: write
        API-->>UI: { fallback message, low confidence }
    end

    UI-->>U: Render response<br/>(+ optional TTS via Web Speech API)
```

---

## Color legend

| Color | Meaning |
|---|---|
| 🟦 Blue (`#0070f3`) | Frontend (Next.js / Vercel) |
| 🟪 Purple (`#512bd4` / `#9b59b6`) | Backend (.NET) / business logic |
| 🟫 Slate (`#336791`) | Postgres / database |
| 🟥 Coral (`#ff6b6b`) | AI services (Groq, HuggingFace) |
| 🟧 Amber (`#f5a623` / `#f39c12`) | External APIs / decision points |
| 🟩 Green (`#27ae60`) | Persistence / save actions |
| ⬛ Dark (`#34495e`) | User input / terminal nodes |

---

## Rendering these diagrams

- **GitHub** — renders inline automatically when you open this file in the repo.
- **VSCode** — install the [Mermaid Preview](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension; the built-in markdown preview will then render the diagrams.
- **Export to image** — paste a single ` ```mermaid ` block into [mermaid.live](https://mermaid.live) and use *Actions → PNG/SVG download*.
- **Embed elsewhere** — same: copy a single Mermaid block into any tool that supports Mermaid (Notion, Obsidian, Confluence, etc.).
