# AI & RAG Experience

## My AI Background
I have been working hands-on with AI systems since before it became mainstream in engineering
teams. My deepest experience is building production-grade RAG pipelines — not just experimenting
with APIs, but designing systems that handle real traffic, degrade gracefully, and return results
in under a second. I have built three RAG systems end to end: the Keen advisor search system at
Ingenio, the Keen advisor feedback search system at Ingenio, and this interview bot you are
talking to right now. All three are in production, all three built entirely by me.

---

## RAG System 1 — Keen Advisor Search (Ingenio)
At Ingenio I designed and built a production RAG-powered advisor search and ranking system
for the Keen platform. This is a search system — NOT a chatbot, NOT a conversational AI,
NOT a virtual assistant for users. It is a search and ranking pipeline that helps users
find the most relevant advisor for their needs from thousands of advisor profiles.

The problem: users search with emotionally loaded, vague queries like "I need guidance about my
relationship falling apart." Simple keyword search fails completely here. You need semantic
understanding of both the query and the advisor profiles to surface the right match.

My solution combines LLM-based semantic search over pre-computed advisor embeddings with a
7-factor attribute scoring engine and a hybrid ranking pipeline. It processes thousands of
advisor listings and returns the most relevant ranked results based on user intent, emotional
tone, and advisor expertise — all within 300–800ms. Built entirely in C# / .NET 8 on Azure.

---

## How the Advisor Search RAG Pipeline Works — Step by Step
The pipeline has 6 stages:

**Step 1 — Pre-compute advisor embeddings (offline).** Each advisor profile is embedded across
6 dimensions using Azure OpenAI text-embedding-3-small and stored in PostgreSQL with pgvector:
semantic description, keywords, expertise, tags, abilities, and tools. Pre-computing means only
1 embedding API call per search instead of thousands at query time.

**Step 2 — Embed the user query.** The user's search query is sent to Azure OpenAI, returning
a float[1536] vector wrapped in a Pgvector.Vector object for Npgsql type mapping.

**Step 3 — Multi-embedding pgvector search.** A single SQL query runs cosine similarity against
3 embedding columns simultaneously: semantic description (50% weight), keywords (30%), expertise
(20%). The formula 1 - (embedding <=> query_vector) converts cosine distance to a 0-1 similarity
score. HNSW indexes on all 3 columns keep this fast even at scale.

**Step 4 — 7-factor attribute scoring engine.** Running in parallel with the vector search, a
pure-logic scoring engine evaluates keywords (25%), categories (20%), communication style (15%),
methods (10%), satisfaction score (10%), experience confidence (10%), and empathy match (10%).
No AI involved, zero added latency, runs synchronously.

**Step 5 — Hybrid ranking.** Final score = semantic score x 40% + attribute score x 60%.
Sorted descending, top N returned (default 20, max 500).

**Step 6 — Lazy AI match summaries.** A separate endpoint generates a 2-sentence explanation
of why an advisor matches the query, using gpt-4.1-nano (~200ms per advisor). Called per-advisor
as the user scrolls — never during the main search — so initial search latency stays low.

---

## Why Multi-Embedding Instead of One Embedding Per Advisor
A single embedding per advisor profile was not nuanced enough. A query about "tarot love reading"
needs to match keyword relevance, domain expertise, and overall profile meaning as completely
different signals — collapsing all of that into one vector loses the nuance.

My solution was to pre-compute 6 separate embedding columns per advisor covering different
aspects of the profile. At query time, 3 of them are queried simultaneously with weighted scoring
(50/30/20). This gives far more nuanced retrieval than a single embedding — it is the same
principle as multi-vector retrieval but implemented directly in PostgreSQL without an
external vector database.

---

## Graceful Degradation — How Advisor Search Handles Failures
If Azure OpenAI goes down, the system does not fail — it degrades gracefully. I built a circuit
breaker directly in the embedding service: each call has a 4-second timeout, and after 2
consecutive failures the circuit opens for 60 seconds. While open, calls return an empty
vector immediately and the search falls back to attribute-only scoring.

Users still get relevant, ranked results — they just lose the semantic component temporarily.
The attribute scoring engine carries 60% of the weight by design, specifically so it can run
the whole show if AI is unavailable. PostgreSQL going down is the only full failure scenario.

---

## RAG System 2 — Keen Advisor Feedback Search (Ingenio)
This is my second production RAG system at Ingenio, applying the same pipeline approach to
a completely different problem — semantic search over advisor reviews and feedback.

The problem: a popular advisor on Keen can have over 100,000 customer reviews. Showing all
of them is useless. Sorting by date or rating still misses what the user actually wants.
A user visiting an advisor profile has a specific intent — they want to know if this advisor
is honest, accurate, empathetic, or good with relationship questions. A query like "show me
feedback where customers felt the advisor was genuinely honest" or "find reviews about
accurate career readings" is a semantic intent, not a keyword match. You cannot find those
reviews with a LIKE query on the word "honest" — the review might say "she never told me
what I wanted to hear, only what was true" without the word honest appearing at all.

My solution is a full RAG pipeline for reviews. Every review for every advisor is embedded
using Azure OpenAI text-embedding-3-small and stored in pgvector, partitioned by advisor ID.
When a user types a search query in the feedback section of an advisor profile, the query
is embedded at search time and run as a cosine similarity search against only that advisor's
review embeddings. The top semantically relevant reviews surface immediately. Out of 100,000
reviews, the user sees the 5 to 10 most relevant to exactly what they searched for.

The UI shows the top 5 reviews by default on the advisor profile feedback section. When the
user types anything into the search bar, the semantic search activates and replaces the
default view with the most relevant results for their query.

---

## How the Feedback Search RAG Pipeline Works — Step by Step
The pipeline has 4 stages:

**Step 1 — Pre-compute review embeddings (incremental).** Every review submitted after a
completed session is embedded using Azure OpenAI text-embedding-3-small and stored in
pgvector with the advisor ID as a partition key. New reviews are ingested automatically
as they come in — there is no manual re-ingestion step.

**Step 2 — Embed the user search query.** When the user types a query in the feedback search
bar, it is sent to Azure OpenAI and returned as a float[1536] vector, same as advisor search.

**Step 3 — Scoped cosine similarity search.** The pgvector query runs against only the current
advisor's reviews using a WHERE advisor_id = ? filter combined with the HNSW index. This
ensures results are always scoped to the advisor being viewed and keeps the search fast even
when the total review table is enormous.

**Step 4 — Ranked results returned.** Top K reviews by cosine similarity are returned and
displayed in the feedback section, replacing the default top-5 view.

---

## The Key Challenge on Feedback Search — Scale and Incremental Ingestion
With 100,000+ reviews per advisor and thousands of advisors on the platform, the total
embedding volume is orders of magnitude larger than the advisor search system. Pre-computing
embeddings for the entire review history required careful batching strategy. The more complex
problem was incremental ingestion: new reviews arrive continuously after every completed
session and need to be embedded and indexed automatically so they appear in search results
within seconds. The per-advisor partitioning had to be enforced at both the storage and query
layer so searches never cross advisor boundaries. Getting idempotency right in the ingestion
pipeline — so a review that triggers the embedding job twice does not create duplicate vectors
— was a subtle but important correctness requirement.

---

## Advisor Search vs Feedback Search — Key Differences
Both use the same Azure OpenAI + pgvector + HNSW stack. The differences are in scope and
data shape. Advisor search queries across the entire advisor pool and blends semantic scoring
with a 7-factor attribute engine. Feedback search is scoped to a single advisor's reviews
and is pure semantic — there is no attribute scoring layer because reviews are free-text
with no structured attributes to score against. Advisor search has lazy AI summaries as a
post-retrieval layer; feedback search returns the raw review text directly since the reviews
are already human-written explanations. Advisor search embeddings are pre-computed offline
in batch; feedback search embeddings are ingested incrementally in near-real-time.

---

## RAG System 3 — This Interview Bot (Personal Project)
Beyond Keen, I built this interview bot as a personal RAG project outside of work. It
represents me in technical interviews using a personal knowledge base of markdown files.

The stack: Next.js 14 frontend on Vercel, .NET 8 API on Railway, PostgreSQL with pgvector
on Supabase, BAAI/bge-base-en-v1.5 embeddings via HuggingFace (768 dimensions), Groq
llama-3.3-70b for generation, Groq Whisper for voice input. Total cost: $0/month on free tiers.

Key differences from the Keen systems: single embedding per chunk (not multi-embedding),
file-boost re-ranking layer (+0.15 to +0.20 based on keyword-to-file mapping), three-tier
confidence thresholding (HIGH >= 0.65 / MED >= 0.58 / LOW < 0.58) that decides whether to
answer or log the question for KB improvement. The unanswered question loop is the bot's
self-improvement mechanism — every gap gets captured, reviewed, and added back to the KB.

---

## Why RAG Over Fine-Tuning for These Use Cases
For all three systems, RAG was the clear choice. Advisor data and reviews change constantly —
RAG handles this with re-embed and re-index; fine-tuning would require retraining on every
data change. Explainability mattered for the Keen systems — the attribute scoring engine and
structured retrieval give debuggable results the product team can inspect and tune. Graceful
degradation is built in by design — the attribute engine still works if Azure OpenAI is
unavailable. A fine-tuned model going down means complete failure with no fallback.

---

## My View on Naive RAG vs Graph RAG
All three systems I have built are Enhanced Naive RAG — flat vector chunks with custom
re-ranking on top. Graph RAG builds a knowledge graph of entities and relationships and
traverses it at query time. It is powerful for large corpora with complex entity relationships
but massively over-engineered for focused, single-domain use cases like advisor profiles,
reviews, or a personal career knowledge base.

My rule: start with well-tuned Naive RAG. The next improvements I would make to any of
these systems are hybrid search (BM25 + vector combined) and a cross-encoder reranker as
a second pass — both give significant quality gains without the complexity of graph construction.

---

## Tech Stack Summary — All Three AI Projects

| Component | Advisor Search (Keen) | Feedback Search (Keen) | Interview Bot |
|---|---|---|---|
| Language | C# / .NET 8 | C# / .NET 8 | C# / .NET 8 + Next.js 14 |
| Embeddings | Azure OpenAI text-embedding-3-small (1536d) | Azure OpenAI text-embedding-3-small (1536d) | HuggingFace BAAI/bge-base-en-v1.5 (768d) |
| LLM | Azure OpenAI gpt-4.1-nano | None (retrieval only) | Groq llama-3.3-70b-versatile |
| Vector DB | PostgreSQL + pgvector (Azure) | PostgreSQL + pgvector (Azure) | PostgreSQL + pgvector (Supabase) |
| Vector Index | HNSW cosine ops | HNSW cosine ops | HNSW cosine ops |
| Retrieval | Multi-embedding weighted cosine | Single embedding scoped by advisor ID | Single embedding + file boost |
| Ranking | Hybrid (semantic 40% + attribute 60%) | Pure semantic cosine similarity | Confidence thresholds (HIGH/MED/LOW) |
| Ingestion | Batch offline pre-compute | Incremental real-time per review | Manual re-ingest via admin endpoint |
| Cloud | Microsoft Azure | Microsoft Azure | Vercel + Railway + Supabase (free tier) |