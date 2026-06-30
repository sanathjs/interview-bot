# Recent Projects — Keen Platform (Ingenio) and Beyond

## Recent Projects — Quick Overview Menu

> If asked **"tell me about your recent projects"** or any variant, give the numbered menu **first** and then ask which project to go deeper on. Do not dive into one project without offering the menu.

**The five projects I lead with**

1. **Semantic Advisor Search (Ingenio / Keen)** — production RAG pipeline; semantic search over thousands of advisor profiles; results in 300–800 ms; built in C# / .NET 8 on Azure.
2. **Advisor Feedback Search (Ingenio / Keen)** — production RAG pipeline; semantic search over **100,000+ reviews** per advisor profile; incremental ingestion; pure retrieval with no LLM generation step; built in C# / .NET 8 on Azure.
3. **This Interview Bot** *(personal project, outside work)* — AI-powered interview assistant representing me; full RAG pipeline; Next.js + .NET 8 + pgvector + Groq; runs entirely on free tiers.
4. **JWT Authentication Migration (Ingenio / Keen)** — platform-wide migration from session-based auth to JWT; zero downtime; dual-token validation during transition; all clients and APIs.
5. **Third-Party Integrations & Platform Features (Ingenio / Keen)** — Zinrelo loyalty, Iterable marketing, Zendesk support, Contentstack CMS, A/B tests, and smaller platform features.

> After listing these, ask: **"Which one would you like me to go deeper on? Just say the number or the project name."**

## Recent Projects — What Keen Is (The Product)

> Two-sided marketplace connecting users with psychics, tarot readers, and astrologers for paid online consultations. High-availability — any downtime hits live paid sessions.

**Product shape**

- **Keen** is a consumer marketplace connecting users with **psychics, tarot card readers, astrologers, and spiritual advisors** for online chat or phone consultations.
- E-commerce style platform with **real-time advisor matching**, session management, billing, **loyalty rewards**, and marketing automation at scale.
- Two-sided marketplace — users on one side, advisors on the other — with **high availability requirements** because any downtime directly impacts live paid sessions.

**My time on Keen**

> At Ingenio since 2020 — **6+ years**. Joined as senior engineer, grew into **Lead Software Engineer** leading a cross-functional team of **20+** (designers, PMs, QE, developers).

## Recent Projects — My Role at Ingenio

> **Lead Software Engineer.** Hands-on across backend and frontend, owning architecture decisions and mentoring the team.

**What I own**

- **Architecture decisions** across the platform.
- **Engineering team leadership** — code reviews, design sessions, mentorship of junior developers.
- **Hands-on across the full stack** — backend, frontend, infrastructure.

**The stack I work in daily**

- **Backend:** .NET / C# (Web API, microservices)
- **Frontend:** React, Next.js
- **Data:** PostgreSQL and SQL Server
- **Cloud:** Microsoft Azure
- **CI/CD:** TeamCity, Azure DevOps
- **Source control:** GitHub
- **Observability:** Splunk (logs), Mixpanel (events)

## Recent Projects — Semantic Advisor Search (RAG)

> **First AI project at Ingenio.** Production semantic search over advisor profiles. Vector similarity + 7-factor attribute scoring. Sub-second results.

**The problem**

Users search Keen with emotionally vague queries like *"I need guidance about my relationship falling apart"* — keyword search fails completely.

**The solution**

A RAG pipeline that combines **vector similarity search over pre-computed advisor embeddings** with a **7-factor attribute scoring engine**, returning ranked results in **300–800 ms**.

> This is **not a chatbot** — it is a search and ranking system.

**Components**

- **Azure OpenAI `text-embedding-3-small`** — advisor and query embeddings.
- **PostgreSQL + pgvector** — vector similarity search via **HNSW** indexes.
- **Azure OpenAI `gpt-4.1-nano`** — lazy per-advisor match summaries.
- **Pure-logic attribute scoring** — keywords, categories, communication style, methods, satisfaction, experience, empathy.
- **Final ranking:** semantic score `40%` + attribute score `60%`.

Built entirely in **C# / .NET 8**. Live in production on Azure.

**The biggest challenge — multi-embedding design + latency**

A single embedding per advisor profile wasn't nuanced enough. A query about *"tarot love reading"* needs to match **keyword relevance**, **domain expertise**, and **overall profile meaning** as **separate signals**.

My solution:

- **Pre-computed 6 separate embedding columns** per advisor.
- **Queried 3 simultaneously** at search time with weighted scoring (`50/30/20`).

**Latency challenge** — generating AI match summaries for all 20 results upfront would add 4 seconds.

- **Decoupled summary generation** into a lazy endpoint called per-advisor as the user scrolls.
- Main search stayed at **300–800 ms** while summaries load progressively.

## Recent Projects — Advisor Feedback Search (RAG)

> **Second AI project at Ingenio.** Same RAG approach, completely different problem: semantic search over **100,000+ reviews** per advisor.

**The problem**

A popular advisor on Keen can have **over 100,000 customer reviews**. Showing all of them is useless. Sorting by date or rating still misses what the user actually wants.

> Queries like *"show me feedback where customers felt the advisor was genuinely honest"* or *"find reviews about accurate career readings"* are **semantic intent**, not keyword search. A `LIKE '%honest%'` query cannot surface them.

**The solution**

A full RAG pipeline for reviews:

- Every review embedded using **Azure OpenAI `text-embedding-3-small`**.
- Stored in **pgvector**, **partitioned by advisor**.
- User query is embedded at search time → **cosine similarity** against only that advisor's review embeddings.
- Top semantically relevant reviews surface immediately.

> Out of 100,000 reviews, the user sees the **5–10 most relevant** to exactly what they asked.

**Architecture parallels with Advisor Search**

- Pre-computed embeddings in PostgreSQL + pgvector.
- HNSW indexes for sub-second retrieval.
- Azure OpenAI for query embedding.
- Ranked results in real time.
- **Pure retrieval — no LLM generation step.**

**The biggest challenge — embedding volume + incremental ingestion**

- 100,000+ reviews per advisor × thousands of advisors = embedding volume **orders of magnitude larger** than Advisor Search.
- **Pre-computing required careful batching.**
- **Incremental ingestion** had to be built so new reviews get embedded and indexed automatically after every completed session — no manual re-ingest.
- **Per-advisor partitioning** enforced in both storage schema and query layer so a search on advisor A never touches advisor B.

> Getting the incremental pipeline right — new review comes in → gets embedded → gets indexed → shows up in search **within seconds** — was the hardest operational problem.

## Recent Projects — JWT Authentication Migration

> **Platform-wide auth migration.** Session-based → JWT. Zero downtime. Dual-token validation during transition. Touched every API endpoint and every client.

**Scope**

Migrated Keen's authentication system from legacy session-based auth to JWT-based authentication. Cross-cutting infrastructure change with **zero tolerance for errors**.

- **Every API endpoint** updated.
- **Every client** (web and mobile) coordinated.
- **Session management layer** rewritten.
- **No downtime** and **no broken sessions** for existing logged-in users.

**The biggest challenge — zero-downtime cutover with live paid sessions**

> You cannot force all users to log out simultaneously — that kills active advisor sessions, which are **live paid interactions**.

**How I designed the cutover**

- **Dual-token validation layer** — API accepted both session tokens and JWTs during the migration window.
- **New logins issued JWTs only.**
- **Existing sessions continued** on the old token format.
- Once the old token pool **drained to zero** through natural expiry, the session-based code path was removed.

Coordinating this across **web, mobile, and API simultaneously** with feature flags and zero user-facing errors was the most operationally complex part of the project.

## Recent Projects — Third-Party Platform Integrations

> **Four external platforms wired into Keen** — Zinrelo, Iterable, Zendesk, Contentstack. Failure isolation + idempotency were the hard problems.

**The integrations**

- **Zinrelo — loyalty rewards.** Powers Keen's advisor and user loyalty program: points accrual, redemption, tier management.
- **Iterable — marketing campaigns.** Email, SMS, push notifications triggered by user behaviour on Keen; lifecycle automation and re-engagement flows.
- **Zendesk — customer support.** User support requests from Keen flow into Zendesk with full context attached.
- **Contentstack — headless CMS.** Powers content management across the Keen platform.

> These are **business capability integrations on top of Keen** — not Azure integrations. Azure is the cloud we run on; these are vendor APIs we orchestrate.

**The biggest challenge — failure isolation and idempotency**

> A failure in any one external platform **must not cascade** into the Keen experience. A Zendesk outage must not affect a live advisor session. An Iterable timeout must not block a booking.

**How I solved it**

- **Circuit breakers** around every third-party call — timeout thresholds, failure counters, fallback behaviour.
- When a circuit opens, the platform **queues the event for retry** instead of propagating the error upstream.
- **Idempotency keys** per integration — a loyalty points event retried three times must not credit the user three times. Each integration needed its own idempotency strategy.

## Recent Projects — Interview Bot (Personal Project)

> **What I built outside of my day job.** This very assistant you're talking to.

**What it is**

This interview bot is a **personal RAG project** I created to represent myself in technical interviews.

**Architecture**

- **Knowledge base** — markdown files about my experience.
- **Backend:** .NET 8 Web API with a full RAG pipeline.
- **Database:** PostgreSQL + pgvector on Supabase (with Neon failover).
- **Embeddings:** HuggingFace `BAAI/bge-base-en-v1.5` (768d).
- **LLM:** Groq `llama-3.3-70b-versatile` for chat; Groq Whisper for STT.
- **Frontend:** Next.js 14, deployed to Vercel.

> The entire stack runs **for free on free tiers**.

**Why I built it**

To demonstrate **applied AI engineering** — not just knowledge of the concepts, but actually **shipping a working system end-to-end**, including graceful degradation when the primary database is paused (auto-failover to Neon).

## Recent Projects — What I Am Most Proud Of at Ingenio

> **Two things.** The team I built, and the AI search systems I shipped.

**1. Growing into the Lead Software Engineer role**

- Built a team culture where engineers **own their work end-to-end**.
- Mentored junior developers from "needs review on every PR" to "owns an entire feature".

**2. The two AI search systems**

- **Advisor search** — live in production, real user traffic, built entirely by me.
- **Feedback search** — same.
- Both solve problems that **keyword search simply cannot**.

> The other moment that stands out: seeing the **circuit breaker hold during a third-party outage** without any user noticing.

## Recent Projects — What I Would Do Differently

> Two things I would change if I were starting over.

**1. Automated integration testing for third-party services from day one**

- When you have **four external platforms** all integrated into one system, testing them against mocked APIs from day one saves enormous debugging time later.
- I would invest in this **before** the first integration goes live, not after the third one breaks in production.

**2. Better observability tooling earlier**

- Specifically **distributed tracing across third-party calls and embedding pipeline stages**.
- When something breaks at 2 am you need to know **exactly which integration** and **which step** failed — not "something in the pipeline is slow".
- OpenTelemetry would have been the right investment from day one.

## Recent Projects — The Keen Tech Stack

> One-glance reference for every technology in the Keen platform.

| Layer | Technology |
|---|---|
| Backend | .NET / .NET Core, C#, Web API, REST APIs |
| Frontend | React, Next.js, TypeScript |
| Database | SQL Server, PostgreSQL |
| Cloud | Microsoft Azure |
| CI/CD | TeamCity, Azure DevOps |
| Source control | GitHub |
| Logging | **Splunk** — centralised across all services |
| Analytics | **Mixpanel** — event tracking and user behaviour |
| Support | Zendesk |
| Loyalty | Zinrelo |
| Marketing | Iterable |
| CMS | Contentstack |
| AI | Azure OpenAI (`text-embedding-3-small`, `gpt-4.1-nano`), pgvector |
