# AI & RAG Experience

## My AI Background
I've been working hands-on with AI systems since before it became mainstream in engineering teams.
My deepest experience is building production-grade RAG pipelines — not just experimenting with APIs,
but designing systems that handle real traffic, degrade gracefully, and return results in under a second.
I've built two RAG systems end to end: the Keen advisor search platform at Ingenio, and this interview
bot you're talking to right now. Both are in production, both built entirely by me.

---

## The Keen Advisor Search System — What It Is
At Ingenio I designed and built a production RAG-powered search system for the Keen platform —
a marketplace connecting users seeking psychic, tarot, and spiritual guidance with the right advisors.

The problem: users search with emotionally loaded, vague queries like "I need guidance about my
relationship falling apart." Simple keyword search fails completely here. You need semantic
understanding of both the query and the advisor profiles.

My solution combines LLM-based semantic search, a 7-factor attribute scoring engine, and a
hybrid ranking pipeline. It processes thousands of advisor listings and returns the most relevant
matches based on user intent, emotional tone, and advisor expertise — all within 300–800ms.
Built entirely in C# / .NET 8 on Azure.

---

## How the Keen RAG Pipeline Works — Step by Step
The pipeline has 6 stages:

**Step 1 — Pre-compute advisor embeddings (offline).** Each advisor profile is embedded across
6 dimensions using Azure OpenAI text-embedding-3-small and stored in PostgreSQL with pgvector:
semantic description, keywords, expertise, tags, abilities, and tools. Pre-computing means only
1 API call per search instead of 1,000+ at query time.

**Step 2 — Embed the user query.** The user's search query is sent to Azure OpenAI, returning
a float[1536] vector wrapped in a Pgvector.Vector object for Npgsql type mapping.

**Step 3 — Multi-embedding pgvector search.** A single SQL query runs cosine similarity against
3 embedding columns simultaneously: semantic description (50% weight), keywords (30%), expertise
(20%). The formula `1 - (embedding <=> query_vector)` converts cosine distance to a 0–1 similarity
score. HNSW indexes on all 3 columns keep this fast.

**Step 4 — 7-factor attribute scoring engine.** Running in parallel with the vector search, a
pure-logic scoring engine evaluates keywords (25%), categories (20%), communication style (15%),
methods (10%), satisfaction score (10%), experience confidence (10%), and empathy match (10%).
No AI, zero latency, runs synchronously.

**Step 5 — Hybrid ranking.** Final score = semantic score × 40% + attribute score × 60%.
Sorted descending, top N returned (default 20, max 500).

**Step 6 — Lazy AI match summaries.** A separate endpoint generates a 2-sentence explanation
of why an advisor matches the query, using gpt-4.1-nano (~200ms). Called per-advisor as the
user scrolls — never during the main search — so initial search latency stays low.

---

## Why Multi-Embedding Instead of One Embedding Per Advisor
A single embedding per advisor profile wasn't nuanced enough. A query about "tarot love reading"
needs to match keyword relevance, domain expertise, and overall profile meaning differently —
they're different signals.

My solution was to pre-compute 6 separate embedding columns per advisor covering different
aspects of the profile. At query time, 3 of them are queried simultaneously with weighted scoring
(50/30/20). This gives far more nuanced retrieval than any single embedding could — it's the
same principle as multi-vector retrieval but implemented directly in PostgreSQL without an
external vector DB.

---

## Graceful Degradation — How the System Handles Failures
This was one of the design decisions I'm most proud of. If Azure OpenAI goes down, the system
doesn't fail — it degrades gracefully.

I built a circuit breaker directly in the embedding service: each call has a 4-second timeout,
and after 2 consecutive failures the circuit opens for 60 seconds. While open, calls return
an empty vector immediately and the search falls back to attribute-only scoring.

Users still get relevant, ranked results — they just lose the semantic component temporarily.
The attribute scoring engine carries 60% of the weight by design, specifically so it can run
the whole show if AI is unavailable. PostgreSQL going down is the only full failure scenario.

---

## Latency vs Quality Trade-off — How I Solved It
Running AI summaries for all 20 search results upfront would add ~4 seconds of latency
(200ms × 20 advisors). That's a non-starter for search UX.

The solution was decoupling the summary generation entirely from the search. The main search
endpoint returns structured match reasons instantly. The AI summary endpoint is called lazily
by the frontend per-advisor as the user interacts with results — so the user sees results
immediately and summaries appear progressively as they scroll. This pattern keeps main search
at 300–800ms while still delivering AI-quality explanations.

---

## Why RAG Over Fine-Tuning for This Use Case
For Keen, RAG was the clear choice for three reasons. First, advisor data changes constantly —
new advisors, updated profiles, changing availability. RAG handles this with a re-embed and
re-index; fine-tuning would require retraining every time. Second, explainability mattered —
the attribute scoring engine gives structured, debuggable match reasons that the product team
could inspect and tune. Third, graceful degradation: the attribute engine still works if AI
is unavailable. A fine-tuned model going down means complete search failure.

---

## This Interview Bot — My Second RAG System
Beyond Keen, I built this interview bot as a personal RAG project. It represents me in
technical interviews using a personal knowledge base of markdown files.

The stack: Next.js 14 frontend on Vercel, .NET 8 API on Railway, PostgreSQL with pgvector
on Supabase, BAAI/bge-base-en-v1.5 embeddings via HuggingFace (768 dimensions), Groq
llama-3.3-70b for generation, Groq Whisper for voice input. Total cost: $0/month on free tiers.

Key differences from Keen: single embedding per chunk (not multi-embedding), file-boost
re-ranking layer (+0.15 to +0.20 based on keyword-to-file mapping), three-tier confidence
thresholding (HIGH ≥0.65 / MED ≥0.58 / LOW <0.58) that decides whether to answer or log
the question for KB improvement. The unanswered question loop is the bot's self-improvement
mechanism — every gap gets captured, reviewed, and added back to the KB.

---

## My View on Naive RAG vs Graph RAG
Both systems I've built are Enhanced Naive RAG — flat vector chunks with custom re-ranking
on top. Graph RAG builds a knowledge graph of entities and relationships and traverses it at
query time. It's powerful for large corporates with complex relationships but massively over-engineered
for focused, single-domain use cases like advisor profiles or a personal career KB.

My rule: start with well-tuned Naive RAG. The next improvements I'd make to either system
are hybrid search (BM25 + vector combined) and a cross-encoder reranker as a second pass —
both give significant quality gains without the complexity of graph construction.

---

## Tech Stack Summary — AI Projects

| Component | Keen (Ingenio) | Interview Bot |
|-----------|---------------|---------------|
| Language | C# / .NET 8 | C# / .NET 8 + Next.js 14 |
| Embeddings | Azure OpenAI text-embedding-3-small (1536d) | HuggingFace BAAI/bge-base-en-v1.5 (768d) |
| LLM | Azure OpenAI gpt-4.1-nano | Groq llama-3.3-70b-versatile |
| Vector DB | PostgreSQL + pgvector (Azure) | PostgreSQL + pgvector (Supabase) |
| Vector Index | HNSW cosine ops | HNSW cosine ops |
| Retrieval | Multi-embedding weighted cosine | Single embedding + file boost |
| Ranking | Hybrid (semantic 40% + attribute 60%) | Confidence thresholds (HIGH/MED/LOW) |
| Cloud | Microsoft Azure | Vercel + Railway + Supabase (free tier) |