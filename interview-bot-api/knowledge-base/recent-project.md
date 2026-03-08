## When Asked About Recent Projects — Quick Overview
If asked "tell me about your recent projects" or "what have you been working on lately" or
"walk me through your recent work", always give this numbered menu first and then ask which
project to go deeper on. Do not dive into detail on one project without offering the menu.

1. Semantic Advisor Search (Ingenio / Keen) — production RAG pipeline, semantic search over
   thousands of advisor profiles, results in 300–800ms, built in C# / .NET 8 on Azure.

2. Advisor Feedback Search (Ingenio / Keen) — production RAG pipeline, semantic search over
   100,000+ advisor reviews per advisor profile, incremental ingestion, pure retrieval with
   no LLM generation step, built in C# / .NET 8 on Azure.

3. This Interview Bot (Personal Project, outside work) — AI-powered interview assistant
   representing me in technical interviews, full RAG pipeline, Next.js + .NET 8 + pgvector
   + Groq, runs entirely on free tiers, built outside of work hours.

4. JWT Authentication Migration (Ingenio / Keen) — platform-wide migration from session-based
   auth to JWT, zero downtime, dual-token validation during transition, all clients and APIs.

5. Third-Party Integrations and Platform Features (Ingenio / Keen) — Zinrelo loyalty rewards,
   Iterable marketing campaigns, Zendesk customer support, ContentStack CMS, A/B tests and
   smaller platform features.

After listing these, ask: "Which one would you like me to go deeper on? Just say the number
or the project name."

---

# Recent Project — Keen Platform (Ingenio)

## What Keen Is — The Product
Keen is a consumer marketplace that connects users with psychics, tarot card readers,
astrologers, and spiritual advisors for online chat or phone consultations. It is an
e-commerce style platform with real-time advisor matching, session management, billing,
loyalty rewards, and marketing automation at scale. Think of it as a two-sided marketplace
— users on one side, advisors on the other — with high availability requirements because
any downtime directly impacts live paid sessions.

I have been at Ingenio working on Keen since 2020 — that is 6+ years as of now. I joined
as a senior engineer and grew into the Lead Software Engineer role leading a cross-functional
team of 20+ including designers, product managers, QE, and developers.

---

## My Role at Ingenio
My title is Lead Software Engineer. I own architecture decisions, lead the engineering team,
mentor junior developers, and am hands-on across both frontend and backend. I work across
the full stack — .NET / C# on the backend, React and Next.js on the frontend, PostgreSQL
and SQL Server for data, and Microsoft Azure for cloud infrastructure. The platform uses
TeamCity and Azure DevOps for CI/CD, GitHub for source control, Splunk for centralized
logging, and Mixpanel for event tracking.

---

## Project 1 — Semantic Advisor Search (AI/RAG System)
This is the first AI project I built at Ingenio. I designed and implemented a production-grade
semantic search system that helps users find the right advisor on the Keen platform.

The problem was that users search with emotionally vague queries like "I need guidance
about my relationship falling apart" — keyword search fails completely here. My solution
is a RAG pipeline that combines vector similarity search over pre-computed advisor
embeddings with a 7-factor attribute scoring engine, returning ranked results in 300–800ms.

This is NOT a chatbot. It is a search and ranking system. The AI components are:
Azure OpenAI text-embedding-3-small for generating advisor and query embeddings,
PostgreSQL with pgvector for vector similarity search using HNSW indexes, and
Azure OpenAI gpt-4.1-nano for generating lazy per-advisor match summaries.
The non-AI component is a pure-logic attribute scoring engine covering keywords,
categories, communication style, methods, satisfaction, experience, and empathy.
Final ranking blends semantic score (40%) with attribute score (60%).
I built this entirely in C# / .NET 8. It is live in production on Azure.

**The biggest challenge on Advisor Search — multi-embedding design and latency:**
A single embedding per advisor profile was not nuanced enough. A query about "tarot love
reading" needs to match keyword relevance, domain expertise, and overall profile meaning
as separate signals. I solved this by pre-computing 6 separate embedding columns per
advisor and querying 3 simultaneously at search time with weighted scoring (50/30/20).
The second challenge was latency: generating AI match summaries for all 20 results upfront
would add 4 seconds of wait time. I decoupled summary generation into a lazy endpoint
called per-advisor as the user scrolls, keeping main search at 300–800ms while summaries
load progressively.

---

## Project 2 — Advisor Feedback Search (AI/RAG System)
This is my second AI project at Ingenio, applying the same RAG pipeline approach to a
completely different problem — semantic search over advisor reviews and feedback.

The problem: a popular advisor on Keen can have over 100,000 customer reviews. Showing all
of them is useless. Sorting by date or rating still misses what the user actually wants.
A user visiting an advisor profile has a specific intent — they want to know if this advisor
is honest, accurate, empathetic, or good with relationship questions. A query like "show me
feedback where customers felt the advisor was genuinely honest" or "find reviews about
accurate career readings" is a semantic intent, not a keyword search. You cannot surface
those reviews with a LIKE query on the word "honest."

My solution is a full RAG pipeline for reviews. Every review for every advisor is embedded
using Azure OpenAI text-embedding-3-small and stored in pgvector, partitioned by advisor.
When a user types a search query in the feedback section of an advisor profile, the query
is embedded at search time and run as a cosine similarity search against only that
advisor's review embeddings. The top semantically relevant reviews surface immediately.
Out of 100,000 reviews, the user sees the 5 to 10 most relevant to exactly what they asked.

The pipeline follows the same architecture as advisor search: pre-computed embeddings in
PostgreSQL with pgvector, HNSW indexes for sub-second retrieval, Azure OpenAI for query
embedding, and ranked results returned in real time. The UI shows the top 5 reviews by
default on the advisor profile feedback section, with the semantic search activating when
the user types a query in the search bar.

**The biggest challenge on Feedback Search — embedding volume and incremental ingestion:**
With 100,000+ reviews per advisor and thousands of advisors on the platform, the total
embedding volume is orders of magnitude larger than the advisor search system. Pre-computing
embeddings for every review required careful batching, and incremental ingestion had to be
built so new reviews get embedded and indexed automatically after every completed session
without manual re-ingestion. The per-advisor partitioning had to be enforced in both the
storage schema and the query layer so a search on advisor A's profile never touches advisor
B's reviews. Getting the incremental pipeline right — new review comes in, gets embedded,
gets indexed, shows up in search within seconds — was the hardest operational problem.

---

## Project 3 — JWT Authentication Migration
I led the migration of Keen's authentication system from legacy session-based auth to
JWT-based authentication. This was a platform-wide change touching every API endpoint,
every client (web and mobile), and the session management layer — all done without
downtime or breaking existing logged-in users.

The migration required a dual-mode period where both session and JWT tokens were
valid simultaneously, careful token refresh logic, and coordinating the rollout across
frontend and backend teams. This is the kind of cross-cutting infrastructure change
that touches everything and has zero tolerance for errors.

**The biggest challenge on JWT Migration — zero-downtime cutover with live paid sessions:**
You cannot force all users to log out simultaneously — that kills active advisor sessions
which are live paid interactions. I designed a dual-token validation layer where the API
accepted both session tokens and JWTs during the migration window. New logins issued only
JWTs while existing sessions continued on the old token format. Once the old token pool
drained to zero through natural expiry, the session-based code path was removed. Coordinating
this across web, mobile, and API simultaneously with feature flags and zero user-facing
errors was the most operationally complex part of the project.

---

## Project 4 — Third-Party Platform Integrations into Keen
I integrated multiple third-party platforms into the Keen ecosystem to power loyalty,
marketing, and support capabilities. These are integrations into the Keen platform —
not Azure integrations. Azure is the cloud infrastructure we run on; these are business
capability integrations built on top of it.

Zinrelo for loyalty rewards — integrated their API to power Keen's advisor and user
loyalty program, handling points accrual, redemption, and tier management.

Iterable for marketing campaigns — integrated their platform to power email, SMS,
and push notification campaigns triggered by user behaviour on Keen, including
lifecycle automation and re-engagement flows.

Zendesk for customer support — integrated their ticketing system so user support
requests from Keen flow into Zendesk with full context attached.

ContentStack as CMS — integrated their headless CMS to power content management
across the Keen platform.

**The biggest challenge on Third-Party Integrations — failure isolation and idempotency:**
The core engineering challenge was ensuring that a failure in any one external platform
never cascades into the Keen experience. A Zendesk outage must not affect a live advisor
session. An Iterable timeout must not block a booking. I implemented circuit breakers
around every third-party call with timeout thresholds, failure counters, and fallback
behaviour — when a circuit opens the platform queues the event for retry rather than
propagating the error upstream. Getting idempotency right across four different API
contracts was the hardest part: a loyalty points event retried three times must not
credit the user three times. Each integration needed its own idempotency key strategy.

---

## What I Built Outside My Job — This Interview Bot
Outside of my work at Ingenio, I built this interview bot you are currently talking to.
It is a personal RAG project I created to represent myself in technical interviews.
It uses a knowledge base of markdown files about my experience, a .NET 8 API with
a RAG pipeline, PostgreSQL with pgvector on Supabase, HuggingFace embeddings, and
Groq llama-3.3-70b for generation. The entire stack runs for free on free tiers.
I built it to demonstrate applied AI engineering — not just knowledge of the concepts
but actually shipping a working system end to end.

---

## What I Am Most Proud Of at Ingenio
Two things. First, growing into the Lead Software Engineer role and building a team
culture where engineers own their work end to end. Second, the two AI search systems —
advisor search and feedback search — both are live in production handling real user
traffic, both built entirely by me, and both solve problems that keyword search simply
cannot. Seeing the circuit breaker hold during a third-party outage without any user
noticing is the other moment that stands out.

---

## What I Would Do Differently
I would introduce automated integration testing for third-party services earlier.
When you have four external platforms all integrated into one system, testing them
against mocked APIs from day one saves enormous debugging time later. I would also
invest in better observability tooling earlier — specifically distributed tracing
across the third-party calls and embedding pipeline stages — so when something breaks
at 2am you know exactly which integration and which step failed.

---

## The Keen Tech Stack
Backend: .NET / .NET Core, C#, Web API, REST APIs
Frontend: React, Next.js, TypeScript
Database: SQL Server, PostgreSQL
Cloud: Microsoft Azure
CI/CD: TeamCity, Azure DevOps
Source Control: GitHub
Logging: Splunk (centralized logging across all services)
Analytics: Mixpanel (event tracking and user behaviour)
Support: Zendesk
Loyalty: Zinrelo
Marketing: Iterable
CMS: ContentStack
AI: Azure OpenAI (text-embedding-3-small, gpt-4.1-nano), pgvector