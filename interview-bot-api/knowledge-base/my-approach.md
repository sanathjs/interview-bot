# System Design — My Approach

## System Design — URL Shortener (bit.ly)

> **Read-heavy by orders of magnitude.** Shortening is rare; redirects are extremely frequent. Optimise for reads above everything else.

**ID generation**

- **base62 encoding** (`a–z`, `A–Z`, `0–9`) over a **7-character ID** → `62^7 ≈ 3.5 trillion` unique URLs.
- Generated from an **auto-increment sequence** in the DB, then base62-encoded.
- **Avoid random UUIDs** — they fragment B-tree indexes badly at scale.
- At very high write volume → **distributed ID generator** like Twitter Snowflake to avoid the single-sequence bottleneck.

**Database choice — PostgreSQL**

- Simple data model: `short_code`, `long_url`, `created_at`, `user_id`, `hit_count`.
- ACID guarantees on writes.
- Read pattern is a **single primary-key lookup** — extremely fast.
- **Not NoSQL** — access pattern is too simple; PostgreSQL handles tens of billions of rows comfortably with proper indexing and partitioning.

**Caching with Redis**

- Redis in front of the DB for the redirect path.
- `GET /abc123` hits Redis first with a **24-hour TTL**.
- Cache hit rate is **very high** — popular URLs dominate traffic (Zipf distribution).
- Cache miss → fall through to PostgreSQL and repopulate Redis.

**Redirect speed**

> DNS → load balancer → app server → Redis hit → `301/302` redirect. **Under 10 ms** end-to-end.

- **`301` permanent** — for SEO-irrelevant links.
- **`302` temporary** — when accurate analytics matter (301 gets cached by the browser and bypasses the server on repeat visits).

**Analytics — async**

- Write click events to a **message queue** rather than blocking the redirect.
- Background worker consumes the queue and increments counters in a separate analytics store.
- **Never block a redirect for analytics writes.**

> Same pattern I use at Ingenio for Mixpanel — events are fire-and-forget, never in the critical path.

**Scaling**

- Redirect service is **stateless** → horizontal scaling behind a load balancer.
- **Read replicas** for PostgreSQL handle read scale.
- **Redis Cluster** for cache scale.

## System Design — Notification System

> **Built parts of this at Ingenio** — the Iterable integration handles email, SMS, and push for Keen. Here's how I'd design the full system from scratch.

**Multi-channel routing**

- Single **Notification Service** receives events and routes them based on user preferences and channel availability.
- Channels: **email** (SendGrid / SES), **SMS** (Twilio), **push** (FCM / APNs).
- **Channel-agnostic API** — callers send *"notify user X about event Y at priority Z"* and the service decides which channels to use.

**Priority queues — separate per level**

| Priority | Examples | Behaviour |
|---|---|---|
| **Critical** | OTP, password reset | Bypass batching, send immediately |
| **High** | Order confirmation, payment | Send promptly |
| **Normal** | Marketing, reminders | Batched + rate-limited to respect provider quotas |

**Retry logic with exponential backoff**

- Every delivery attempt logged with status: `pending → sent → failed → delivered`.
- Failed deliveries retry at **1 min → 5 min → 30 min → 2 h → 24 h**.
- After max retries → dead-letter queue.
- **Idempotency keys** on every send prevent double-delivery on retries.

**Fan-out at scale**

> For broadcasts to millions, synchronous fan-out isn't viable.

- A **fan-out worker** reads target user segments in batches.
- Writes individual notification records to the queue.
- **Delivery workers** consume at their own pace.

> This decouples send time from delivery time — exactly the pattern in the Keen Iterable integration, where a single campaign event fans out to thousands of user notifications.

**Idempotency**

Every notification has a **stable ID** derived from `event_type + user_id + event_id`. If the same event is processed twice, the second attempt detects the existing record and skips the send.

> Real engineering requirement in the **Zinrelo loyalty integration** — a points event retried three times must not credit the user three times.

## System Design — Rate Limiter

> **Default: sliding window counter.** More accurate than fixed-window (no boundary burst) and simpler than token bucket.

**Algorithm choice**

- **Sliding window counter** — my default for public APIs.
- **Token bucket** — better when you want to allow short bursts above the average rate (good for API clients that batch).
- **Fixed window** — avoid because of boundary-burst problem.

**Implementation with Redis**

```text
ZADD          → add request timestamp to sorted set
ZREMRANGEBYSCORE → remove entries older than the window
ZCARD         → count of remaining entries = current request count
```

- Wrap in a **Lua script for atomicity** — critical in a distributed system to avoid race conditions between the read and increment.
- If count exceeds limit → reject with `429`.

**Where it lives**

- **API gateway level** — coarse rate limits per client / per IP. Protects the entire system.
- **Service level** — fine-grained limits on expensive operations (embedding API calls, LLM completions). Protects specific endpoints.

**Directly relevant to my work**

> The Groq API on this interview bot has a **30 req/min limit**. I handle it with exponential backoff retry on `429` responses.

At scale I would add a **Redis-backed sliding window** in front of all LLM calls to **smooth traffic before** it hits the provider limit, rather than relying on reactive retry.

## System Design — Chat System (WhatsApp-style)

> **WebSockets for active connections + append-only message storage + event-driven delivery receipts.**

**Connection layer**

- **WebSockets** for active users — persistent connections maintained by a WebSocket gateway.
- User sends a message → gateway publishes to a **message broker**.
- Recipient's gateway subscribes to their user channel and pushes the message if online.
- **Offline users** — messages queued and delivered on reconnection.

> Similar to how Keen handles live advisor session state — connection presence tracked and messages routed accordingly.

**Message storage**

- **Append-only writes** to a messages table partitioned by `conversation_id`.
- **WhatsApp scale** → Cassandra (range scan by time within a partition is exactly what Cassandra excels at).
- **Keen scale** → PostgreSQL with a composite index on `(conversation_id, created_at DESC)` works fine.

> My rule: **default to PostgreSQL.** Only move to Cassandra when write volume + partition access pattern genuinely demand it.

**Delivery receipts**

- Two states — **delivered** (message reached the device) and **read** (user opened the conversation).
- Both are **event-driven**: client sends `ACK` on receive and on view.
- Server updates status and pushes the receipt back to the sender via their WebSocket connection.

**Group messaging fan-out**

| Group size | Strategy | Why |
|---|---|---|
| Small groups (< ~100) | **Fan-out on write** — one message record per recipient | Simple and fast to read |
| Large groups / channels | **Fan-out on read** — store one message, each client fetches on scroll | Cheaper at write time |

Threshold: a few hundred members; above that, fan-out on write becomes expensive.

**Offline message queue**

- Messages for offline users stored with status `undelivered`.
- On reconnect, client sends its last seen `message_id` and the server streams newer messages.
- **Push notifications** via FCM / APNs prompt the user to reconnect.

## System Design — Scaling This Interview Bot

> **Current cap is ~50 concurrent users.** Here's how I'd scale to 10,000.

**Current bottlenecks (in order of failure)**

1. Render single instance runs out of memory around **50 concurrent requests**.
2. **Groq free tier** rate-limits at 30 req/min.
3. **HuggingFace free embedding API** — shared infrastructure with no SLA.
4. **Supabase free tier** allows only 60 direct PostgreSQL connections.

**API layer — horizontal scaling**

- .NET 8 API is already **stateless** — sessions live in PostgreSQL, not in memory.
- On Azure → **Azure Container Apps** with autoscaling rules on CPU and request queue depth.

**Embedding caching with Redis**

> The same question asked by 100 different interviewers generates the **identical embedding vector**.

- Cache query embeddings in Redis keyed by a **hash of the question text**.
- **1-hour TTL**.
- Under real load, common questions like *"tell me about yourself"* dominate traffic — **cache hit rates above 80%** are realistic.
- Cuts embedding API costs and latency dramatically.

**LLM throughput**

- Move from Groq free tier to **Azure OpenAI with provisioned throughput units** — guaranteed capacity, no rate limits, predictable latency.
- Add **Azure Service Bus** in front of LLM calls so traffic spikes **queue rather than drop**.

**Vector search at scale**

- pgvector with HNSW indexes handles **millions of chunks** comfortably on a single PostgreSQL instance.
- For very large KB growth → **shard the knowledge base by topic domain**.
- Each domain gets its own vector index.
- Pre-filter by domain before vector search → query time stays constant as KB grows.

**Database connections — PgBouncer pooling**

- Switch from direct connections to **PgBouncer pooling**.
- Supabase provides this via the pooled connection string.
- Eliminates the 60-connection limit.

**Async ingestion pipeline**

- Move KB ingestion from a synchronous admin endpoint to an **async pipeline**.
- File upload → queue message → worker chunks and embeds in batches → writes to PostgreSQL.
- **No timeout risk**, **observable progress**, **retryable on failure**.

## System Design — How I Think About Database Choices

> **Default: PostgreSQL.** It handles 95% of use cases. Only deviate with a specific reason.

**PostgreSQL — my default**

- Handles 95% of use cases.
- With **pgvector**, it now covers vector search without adding a separate system.
- Start here.

**Redis — cache and coordination, not primary store**

> Sub-millisecond reads, distributed locking, rate-limit counters.

- At Ingenio: Redis sits in front of PostgreSQL for high-frequency Keen platform lookups.
- In the interview bot: I would use Redis for embedding vector caching.

**Kafka / Azure Service Bus — async event pipelines**

> Guaranteed delivery with retry, fan-out to multiple consumers, event replay.

- At Ingenio: **Azure Service Bus** for the integration event pipeline — Keen events trigger Iterable, Zendesk, and Zinrelo through a queue rather than synchronous HTTP.
- **Kafka** makes sense when you need consumer groups, log compaction, or very high write-throughput event streams.

**MongoDB / document stores**

> When the schema is **genuinely unpredictable** or the access pattern is always *fetch full document by ID with no joins*.

In practice rarely justifies the operational overhead — **PostgreSQL + JSONB** covers most of these cases while keeping the relational model available.

**Graph databases (Neo4j)**

For **genuinely graph-structured data** — social networks, fraud detection, knowledge graphs. I haven't needed one in production and would not add one without a clear graph-traversal requirement that SQL cannot serve.

**Vector search — pgvector**

> Default to pgvector because I'm already running PostgreSQL. Adding a separate vector DB means another system to operate, monitor, and pay for.

At Keen scale, pgvector with HNSW indexes handles **millions of embeddings with sub-100 ms query times**. Running in production on two separate systems.

## System Design — High Availability and Zero-Downtime Deploys

> **Blue-green deployments + feature flags + canary releases.** Used for every major platform change at Ingenio, including the JWT auth migration.

**Blue-green deployments**

- Two identical environments — **blue** (live) and **green** (new version).
- Deploy to green → run smoke tests → switch the load balancer.
- **Rollback is instant** — flip back to blue.
- On Azure: **App Service deployment slots** or **Container Apps revision management**.

**Feature flags**

> Used for any change that affects user behaviour — new features, API contract changes, auth system changes.

- **Decouples deployment from release.**
- Code ships behind a flag → verify at low traffic → roll out to 100%.
- JWT migration: **dual-token validation behind a flag per client type** with independent rollout controls and an **instant kill-switch**.
- A Zendesk outage or a bad deploy never takes down core Keen because integrations sit behind flags with circuit breakers.

**Canary releases**

- For high-risk changes, route **5% of traffic** to the new version first.
- Monitor error rates, latency, and business metrics.
- If clean, increase gradually.
- **Azure Container Apps** supports traffic splitting between revisions natively.

**Health checks**

- Every service exposes `/health` (liveness) and `/ready` (readiness).
- Load balancer polls `/health` and removes unhealthy instances automatically.
- **Readiness probe gates traffic** to a new instance until it has warmed up — prevents routing traffic before DB connections and caches are established.

**Database migrations — expand / contract**

> Always backward-compatible. Always run before code deploy.

1. Add columns as **nullable** first.
2. Deploy code that handles **both schemas**.
3. **Backfill** the new column.
4. Make the column required in a **follow-up migration**.
5. **Never drop a column in the same deploy** that removes references to it.

> This is how I handled JWT migration schema changes at Ingenio — the new token columns existed alongside the old session columns for the entire transition window.
