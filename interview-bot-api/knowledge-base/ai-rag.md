# AI & RAG Experience

## AI/RAG — My AI Background

> **Production RAG pipelines, not API experiments.** I have built three end-to-end RAG systems, all live, all built by me.

**What sets my AI work apart**

- I have been working hands-on with AI systems **before** it became mainstream in engineering teams.
- Deepest experience is **building production-grade RAG pipelines** — designing systems that handle real traffic, degrade gracefully, and return results in under a second.
- Three RAG systems built end-to-end, all in production:
  1. **Keen Advisor Search** (Ingenio)
  2. **Keen Advisor Feedback Search** (Ingenio)
  3. **This Interview Bot** (personal)

## AI/RAG — Keen Advisor Search (Production RAG #1)

> **Search and ranking system — NOT a chatbot.** Helps users find the most relevant advisor from thousands of profiles. Sub-second results in 300–800 ms.

**The problem**

Users search Keen with emotionally loaded, vague queries like *"I need guidance about my relationship falling apart."* **Keyword search fails completely.** You need semantic understanding of both the query and the advisor profiles to surface the right match.

**The solution**

A RAG pipeline combining:

- **LLM-based semantic search** over pre-computed advisor embeddings
- A **7-factor attribute scoring engine**
- A **hybrid ranking layer**

Processes thousands of advisor listings and returns the most relevant ranked results based on user intent, emotional tone, and advisor expertise — all within **300–800 ms**.

Built entirely in **C# / .NET 8** on Azure.

## AI/RAG — Advisor Search Pipeline (Step by Step)

> **6-stage pipeline.** Pre-compute offline, query in real time, lazy summaries on scroll.

**Step 1 — Pre-compute advisor embeddings (offline)**

Each advisor profile is embedded across **6 dimensions** using **Azure OpenAI `text-embedding-3-small`** and stored in PostgreSQL with pgvector:

- semantic description
- keywords
- expertise
- tags
- abilities
- tools

> Pre-computing means only **1 embedding API call per search** instead of thousands at query time.

**Step 2 — Embed the user query**

The user's search query is sent to Azure OpenAI, returning a `float[1536]` vector wrapped in a `Pgvector.Vector` object for Npgsql type mapping.

**Step 3 — Multi-embedding pgvector search**

A single SQL query runs cosine similarity against **3 embedding columns simultaneously**:

| Column | Weight |
|---|---|
| semantic description | **50%** |
| keywords | **30%** |
| expertise | **20%** |

```sql
1 - (embedding <=> query_vector)
```

That formula converts cosine distance to a `0..1` similarity score. **HNSW indexes** on all 3 columns keep this fast even at scale.

**Step 4 — 7-factor attribute scoring engine** *(parallel)*

Pure-logic scoring engine evaluating:

| Factor | Weight |
|---|---|
| keywords | 25% |
| categories | 20% |
| communication style | 15% |
| methods | 10% |
| satisfaction score | 10% |
| experience confidence | 10% |
| empathy match | 10% |

**No AI involved, zero added latency**, runs synchronously alongside the vector search.

**Step 5 — Hybrid ranking**

```text
finalScore = (semantic × 0.40) + (attribute × 0.60)
```

Sorted descending; top N returned (default `20`, max `500`).

**Step 6 — Lazy AI match summaries**

A separate endpoint generates a **2-sentence explanation** of why an advisor matches the query, using `gpt-4.1-nano` (~200 ms per advisor). Called **per-advisor as the user scrolls** — never during the main search — so initial latency stays low.

## AI/RAG — Why Multi-Embedding Beats Single Embedding

> A single embedding collapses keyword, expertise, and overall meaning into one vector. You lose the nuance.

**The problem with one embedding**

A query about *"tarot love reading"* needs to match three completely different signals:

- **Keyword relevance** — does the advisor profile use those words?
- **Domain expertise** — is this a love-reading specialist?
- **Overall profile meaning** — does the bio convey emotional safety?

Collapsing all of that into one vector loses the nuance.

**My solution**

- **Pre-compute 6 separate embedding columns** per advisor covering different aspects of the profile.
- At query time, **3 of them are queried simultaneously** with weighted scoring (`50/30/20`).

> This is the same principle as multi-vector retrieval but **implemented directly in PostgreSQL** without an external vector database.

## AI/RAG — Graceful Degradation on Advisor Search

> Azure OpenAI going down does NOT kill the search. The system degrades to attribute-only scoring.

**Circuit breaker design**

- Each embedding call has a **4-second timeout**.
- After **2 consecutive failures** the circuit opens for **60 seconds**.
- While open, calls **return an empty vector immediately** and the search falls back to attribute-only scoring.

**Why this works**

> The attribute scoring engine carries **60% of the final weight by design** — specifically so it can run the whole show if AI is unavailable.

- Users still get **relevant, ranked results** during an outage.
- They temporarily lose the semantic component, not the search.
- **Only full failure scenario:** PostgreSQL going down.

## AI/RAG — Keen Feedback Search (Production RAG #2)

> **Semantic search over 100,000+ reviews per advisor.** Same RAG approach, completely different problem.

**The problem**

A popular advisor can have **over 100,000 customer reviews**. Showing all of them is useless. Sorting by date or rating still misses what the user actually wants.

A user visiting an advisor profile has **specific intent** — they want to know if this advisor is honest, accurate, empathetic, or good with relationship questions.

> Queries like *"show me feedback where customers felt the advisor was genuinely honest"* are **semantic intent**, not keyword search.

You **cannot** find those reviews with a `LIKE '%honest%'` query — the review might say *"she never told me what I wanted to hear, only what was true"* without the word *honest* appearing at all.

**The solution**

A full RAG pipeline for reviews:

- Every review embedded using **Azure OpenAI `text-embedding-3-small`**.
- Stored in **pgvector**, **partitioned by advisor ID**.
- User query embedded at search time → cosine similarity against only that advisor's review embeddings.
- Out of 100,000 reviews, the user sees the **5–10 most relevant**.

**UI behaviour**

- Top 5 reviews shown by default on the feedback section.
- Typing in the search bar **activates semantic search** and replaces the default view with most-relevant results.

## AI/RAG — Feedback Search Pipeline (Step by Step)

> **4-stage pipeline.** Incremental ingestion + scoped cosine similarity.

**Step 1 — Pre-compute review embeddings (incremental)**

- Every review submitted after a completed session is embedded using **Azure OpenAI `text-embedding-3-small`**.
- Stored in pgvector with **advisor ID as partition key**.
- **New reviews ingested automatically** as they come in — no manual re-ingestion step.

**Step 2 — Embed the user query**

Sent to Azure OpenAI, returned as a `float[1536]` vector. Same as advisor search.

**Step 3 — Scoped cosine similarity search**

```sql
WHERE advisor_id = @advisor_id
ORDER BY embedding <=> @query
LIMIT @k
```

The `WHERE advisor_id = ?` filter combined with the HNSW index ensures results are always scoped to the advisor being viewed and keeps the search fast even when the total review table is enormous.

**Step 4 — Ranked results returned**

Top K reviews by cosine similarity returned and displayed, replacing the default top-5 view.

## AI/RAG — Feedback Search Challenges (Scale + Incremental Ingestion)

> The volume is orders of magnitude larger than Advisor Search. The hard problem is **near-real-time ingestion**, not retrieval.

**The challenges**

- **100,000+ reviews per advisor × thousands of advisors** = embedding volume orders of magnitude larger than advisor search.
- Pre-computing embeddings for the entire review history required **careful batching strategy**.

**The harder problem — incremental ingestion**

> New reviews arrive continuously and need to be embedded and indexed automatically so they appear in search results within seconds.

- **Per-advisor partitioning** enforced at storage AND query layer — searches never cross advisor boundaries.
- **Idempotency:** a review that triggers the embedding job twice must not create duplicate vectors. Subtle but critical correctness requirement.

## AI/RAG — Advisor Search vs Feedback Search (Key Differences)

> Same stack, different shapes. Side-by-side comparison.

| Aspect | Advisor Search | Feedback Search |
|---|---|---|
| **Scope** | Entire advisor pool | Scoped to a single advisor's reviews |
| **Ranking** | Hybrid: semantic + 7-factor attribute | Pure semantic cosine similarity |
| **Post-retrieval** | Lazy AI match summaries (`gpt-4.1-nano`) | Returns raw review text (already human-written) |
| **Ingestion** | Batch offline pre-compute | Incremental, near-real-time per review |
| **Why no attribute scoring** | Profiles have structured fields | Reviews are unstructured free text |

Both use the **same Azure OpenAI + pgvector + HNSW stack**. The differences are in **scope and data shape**.

## AI/RAG — Interview Bot (Personal RAG)

> **RAG project I built outside work** to represent myself in technical interviews. $0/month on free tiers.

**The stack**

| Layer | Tech |
|---|---|
| Frontend | **Next.js 14** on Vercel |
| Backend | **.NET 8** Web API on Render |
| Database | **PostgreSQL + pgvector** on Supabase (Neon fallback) |
| Embeddings | **HuggingFace `BAAI/bge-base-en-v1.5`** (768d) |
| LLM | **Groq `llama-3.3-70b-versatile`** |
| STT | **Groq Whisper** for voice input |
| Cost | **$0 / month** |

**Key differences from the Keen systems**

- **Single embedding per chunk** (not multi-embedding) — knowledge base is smaller and more focused.
- **3-signal search** instead — body + title + AI-generated question variants embedded separately.
- **File-boost re-ranking** (+0.05 to +0.08) based on keyword-to-file mapping.
- **3-tier confidence thresholding** — `HIGH ≥ 0.62 / MEDIUM ≥ 0.52 / LOW < 0.52` decides whether to answer or log the question for KB improvement.
- **Unanswered-question loop** — every gap captured, reviewed, and added back to the KB. The bot's self-improvement mechanism.

## AI/RAG — Why RAG Over Fine-Tuning

> RAG wins on **all three** systems because the data changes constantly, explainability matters, and graceful degradation is built-in.

**The case for RAG**

- **Data changes constantly** — advisor profiles, reviews, and personal KB all evolve. RAG handles this with **re-embed and re-index**; fine-tuning would require retraining on every data change.
- **Explainability** — the attribute scoring engine and structured retrieval give **debuggable results** the product team can inspect and tune. Fine-tuned model output is opaque.
- **Graceful degradation built-in** — the attribute engine still works if Azure OpenAI is unavailable. A fine-tuned model going down means **complete failure** with no fallback.

> Fine-tuning would have been the wrong tool for every one of these systems.

## AI/RAG — My View on Naive RAG vs Graph RAG

> All three systems are **Enhanced Naive RAG**. Graph RAG is over-engineered for focused single-domain corpora.

**What I have built**

- **Enhanced Naive RAG** — flat vector chunks with custom re-ranking on top.
- Multi-embedding, attribute scoring, file boosts, confidence thresholding — all add nuance without the complexity of graph construction.

**What Graph RAG adds**

- Builds a **knowledge graph** of entities and relationships.
- Traverses it at query time.
- Powerful for **large corpora with complex entity relationships**.

**My rule**

> Start with **well-tuned Naive RAG.**

Next improvements I would make to any of these systems:

- **Hybrid search** — BM25 + vector combined.
- **Cross-encoder reranker** as a second pass.

Both give significant quality gains **without** graph construction.

## AI/RAG — Tech Stack Comparison (All Three Projects)

> Side-by-side reference for every layer of the three RAG systems I have built.

| Component | Advisor Search (Keen) | Feedback Search (Keen) | Interview Bot |
|---|---|---|---|
| Language | C# / .NET 8 | C# / .NET 8 | C# / .NET 8 + Next.js 14 |
| Embeddings | Azure OpenAI `text-embedding-3-small` (1536d) | Azure OpenAI `text-embedding-3-small` (1536d) | HuggingFace `bge-base-en-v1.5` (768d) |
| LLM | Azure OpenAI `gpt-4.1-nano` | None (retrieval only) | Groq `llama-3.3-70b-versatile` |
| Vector DB | PostgreSQL + pgvector (Azure) | PostgreSQL + pgvector (Azure) | PostgreSQL + pgvector (Supabase) |
| Vector Index | HNSW cosine | HNSW cosine | HNSW cosine |
| Retrieval | Multi-embedding weighted cosine | Single embedding, advisor-scoped | 3-signal (body + title + questions) + file boost |
| Ranking | Hybrid (semantic 40% + attribute 60%) | Pure semantic cosine | Confidence-thresholded (HIGH / MED / LOW) |
| Ingestion | Batch offline pre-compute | Incremental real-time | Manual re-ingest via admin endpoint |
| Cloud | Microsoft Azure | Microsoft Azure | Vercel + Render + Supabase (free tier) |
