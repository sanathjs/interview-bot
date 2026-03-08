# System Design Answers

## Design a URL Shortener (e.g. bit.ly)

My approach starts with the core read/write asymmetry — shortening is rare, redirects are
extremely frequent, so the system must be optimised for reads above everything else.

**ID generation:** I would use base62 encoding (a-z, A-Z, 0-9) over a 7-character ID, giving
62^7 which is roughly 3.5 trillion unique URLs — more than enough. The ID is generated from
an auto-increment sequence in the database, base62-encoded. I would avoid random UUIDs because
they fragment B-tree indexes badly at scale. At very high write volume I would move to a
distributed ID generator like Twitter Snowflake to avoid the single-sequence bottleneck.

**Database choice:** PostgreSQL. The data model is simple — short code, long URL, created_at,
user_id, hit_count. SQL gives me ACID guarantees on writes, and the read pattern is a single
primary key lookup which is extremely fast. I would not reach for NoSQL here — the access
pattern is too simple and PostgreSQL handles this comfortably up to tens of billions of rows
with proper indexing and partitioning.

**Caching:** Redis in front of the DB for the redirect path. A GET /abc123 lookup hits Redis
first with a TTL of 24 hours. Cache hit rate should be very high since popular URLs get the
vast majority of traffic — this is a Zipf distribution. On cache miss, fall through to
PostgreSQL and repopulate Redis.

**Redirect speed:** The full path is DNS to load balancer to app server to Redis hit to
301/302 redirect. With Redis this should be under 10ms end to end. I would use 301
(permanent) for SEO-irrelevant links and 302 (temporary) when I need accurate analytics
since 301 gets cached by the browser and bypasses the server on repeat visits.

**Analytics:** Async — write click events to a message queue rather than blocking the
redirect. A background worker consumes the queue and increments counters in a separate
analytics store. Never block a redirect for analytics writes. This is the same pattern I
use at Ingenio for Mixpanel event tracking — events are fire-and-forget, never in the
critical path.

**Scaling:** The redirect service is stateless so horizontal scaling behind a load balancer
is straightforward. Read replicas for PostgreSQL handle read scale. Redis Cluster for cache
scale.

---

## Design a Notification System

I have built parts of this at Ingenio — the Iterable integration handles email, SMS, and push
campaigns for Keen. Here is how I would design a full system from scratch.

**Multi-channel routing:** A single Notification Service receives events and routes them based
on user preferences and channel availability — email via SendGrid or SES, SMS via Twilio,
push via FCM or APNs. The service should be channel-agnostic at the API level. Callers send
"notify user X about event Y at priority Z" and the service decides which channels to use.

**Priority queues:** Separate queues per priority level — critical (OTP, password reset),
high (order confirmation, payment), normal (marketing, reminders). Critical messages bypass
batching and go immediately. Normal priority messages are batched and rate-limited to avoid
hitting provider rate limits.

**Retry logic with exponential backoff:** Every delivery attempt is written to a notifications
log table with status — pending, sent, failed, delivered. Failed deliveries retry with
exponential backoff at 1m, 5m, 30m, 2h, 24h intervals. After max retries the notification
is marked dead and surfaced in a dead letter queue. Idempotency keys on every send prevent
double-delivery on retries.

**Fan-out at scale:** For broadcast notifications to millions of users, synchronous fan-out
is not viable. A fan-out worker reads target user segments in batches, writes individual
notification records to the queue, and delivery workers consume at their own pace. This
decouples send time from delivery time — exactly the pattern used in the Keen Iterable
integration where a single campaign event fans out to thousands of user notifications.

**Idempotency:** Every notification has a stable ID derived from event_type, user_id, and
event_id. If the same event is processed twice, the second attempt detects the existing
record and skips the send. This was a real engineering requirement in the Zinrelo loyalty
integration — a points event retried three times must not credit the user three times.

---

## Design a Rate Limiter

**Algorithm choice:** I default to the sliding window counter algorithm — more accurate than
fixed window (avoids the boundary burst problem) and simpler to implement than token bucket.
Token bucket is better when you want to allow short bursts above the average rate, useful
for API clients that batch requests. For a public API I use sliding window.

**Implementation with Redis:** Store a sorted set per client keyed by client_id and window.
Each request adds a timestamp to the set with ZADD and removes entries older than the window
with ZREMRANGEBYSCORE. The count of remaining entries is the request count in the current
window. If count exceeds the limit, reject with 429. The entire operation runs as a Lua
script for atomicity — critical in a distributed system to avoid race conditions between
the read and increment.

**Where it lives:** At the API gateway level for coarse rate limiting (per client, per IP),
and at the service level for fine-grained limits on expensive operations. Gateway rate
limiting protects the entire system. Service-level rate limiting protects specific expensive
calls like embedding API requests or LLM completions.

**Directly relevant to my work:** The Groq API on the interview bot has a 30 requests per
minute limit. I handle this with exponential backoff retry on 429 responses. At scale I
would add a Redis-backed sliding window rate limiter in front of all LLM calls to smooth
traffic before it hits the provider limit rather than relying on reactive retry.

---

## Design a Chat System (like WhatsApp)

**Connection layer:** WebSockets for active users — persistent connections maintained by a
WebSocket gateway. When a user sends a message it goes to the gateway which publishes to a
message broker. The recipient's WebSocket gateway subscribes to their user channel and pushes
the message if they are online. For offline users, messages are queued and delivered on
reconnection. This real-time connection management is similar to how Keen handles live advisor
session state — we track connection presence and route messages accordingly.

**Message storage:** Append-only writes to a messages table partitioned by conversation_id.
For WhatsApp scale I would use Cassandra because the access pattern — give me the last N
messages for conversation X — is a range scan by time within a partition, which Cassandra
handles extremely well. For Keen-scale, PostgreSQL with a composite index on conversation_id
and created_at DESC works fine. My rule: default to PostgreSQL, only move to Cassandra when
the write volume and partition access pattern genuinely demands it.

**Delivery receipts:** Two states — delivered (message reached the device) and read (user
opened the conversation). Both are event-driven. The client sends an ACK to the server on
message receive and on message view. The server updates message status and pushes the receipt
back to the sender via their WebSocket connection.

**Group messaging fan-out:** For small groups, write a message record per recipient — fan-out
on write, simple and fast to read. For very large groups or broadcast channels, store one
message and fan out on read — each client fetches on scroll. The threshold is around a few
hundred members; above that, fan-out on write becomes expensive.

**Offline message queue:** Messages for offline users are stored with status undelivered.
On reconnect, the client sends its last seen message_id and the server streams newer messages.
Push notifications via FCM or APNs prompt the user to reconnect.

---

## How I'd Design This Interview Bot at Scale

I have thought about this directly. My current setup handles maybe 20 to 50 concurrent
users before the free tier bottlenecks kick in. Here is how I would scale to 10,000.

**Current bottlenecks in order of failure:** Railway single instance runs out of memory
around 50 concurrent requests. Groq free tier rate-limits at 30 requests per minute. 
HuggingFace free embedding API is shared infrastructure with no SLA. Supabase free tier
allows only 60 direct PostgreSQL connections.

**API layer:** The .NET 8 API is already stateless — sessions live in PostgreSQL, not in
memory. Horizontal scaling behind a load balancer is straightforward. On Azure I would use
Azure Container Apps with autoscaling rules on CPU and request queue depth.

**Embedding caching with Redis:** The same question asked by 100 different interviewers
generates the identical embedding vector. Cache query embeddings in Redis keyed by a hash
of the question text with a 1-hour TTL. Under real load, common questions like "tell me
about yourself" dominate traffic — cache hit rates above 80% are realistic, which cuts
embedding API costs and latency dramatically.

**LLM throughput:** Move from Groq free tier to Azure OpenAI with provisioned throughput
units — guaranteed capacity, no rate limits, predictable latency. Add Azure Service Bus
in front of LLM calls so traffic spikes queue rather than drop.

**Vector search at scale:** pgvector with HNSW indexes handles millions of chunks comfortably
on a single PostgreSQL instance. For very large KB growth I would shard the knowledge base
by topic domain — each domain gets its own vector index. Pre-filtering by domain before
vector search keeps query time constant as KB size grows.

**Database connections:** Switch from direct connections to PgBouncer pooling — Supabase
already provides this via the pooled connection string. Eliminates the 60-connection limit.

**Async ingestion pipeline:** Move KB ingestion from a synchronous admin endpoint to an
async pipeline — file upload triggers a queue message, a worker chunks and embeds in batches
and writes to PostgreSQL. No timeout risk, observable progress, retryable on failure.

---

## How I Think About Database Choices

My default is PostgreSQL. It handles 95% of use cases and with pgvector it now covers vector
search without adding a separate system. I start here and only deviate with a specific reason.

I reach for Redis when I need sub-millisecond reads, distributed locking, or rate limiting
counters. Redis is not a primary store for me — it is a cache and coordination layer on top
of PostgreSQL. At Ingenio, Redis sits in front of PostgreSQL for high-frequency Keen platform
lookups. In the interview bot I would use Redis for embedding vector caching.

I reach for Kafka or Azure Service Bus when I need guaranteed delivery with retry for async
workflows, fan-out to multiple consumers, or event replay. At Ingenio I use Azure Service Bus
for the integration event pipeline — Keen events trigger Iterable, Zendesk, and Zinrelo
through a queue rather than synchronous HTTP calls. Kafka makes sense when you need consumer
groups, log compaction, or very high write throughput event streams.

I consider a document store like MongoDB when the schema is genuinely unpredictable or when
the access pattern is always fetch the full document by ID with no relational joins. In
practice this rarely justifies the operational overhead — PostgreSQL with JSONB covers most
of these cases while keeping the relational model available.

Graph databases like Neo4j are for genuinely graph-structured data — social networks, fraud
detection, knowledge graphs. I have not needed one in production and would not add one
without a clear graph traversal requirement that SQL cannot serve.

For vector search specifically: I default to pgvector in PostgreSQL because I am already
running PostgreSQL and adding a separate vector database means another system to operate,
monitor, and pay for. At Keen scale, pgvector with HNSW indexes handles millions of
embeddings with sub-100ms query times — I have this running in production on two separate
systems.

---

## How I Handle High Availability and Zero-Downtime Deploys

At Ingenio the standard approach is blue-green deployments with feature flags. This is what
I used for every major platform change including the JWT auth migration.

**Blue-green deployments:** Two identical environments — blue live and green new version.
Deploy to green, run smoke tests, switch the load balancer. Rollback is instant — flip back
to blue. On Azure this is App Service deployment slots or Container Apps revision management.

**Feature flags:** I use feature flags for any change that affects user behaviour — new
features, API contract changes, auth system changes. This decouples deployment from release.
The code ships behind a flag, we verify at low traffic, then roll out to 100%. The JWT
migration used this exactly — dual-token validation was behind a flag per client type with
independent rollout controls and an instant kill-switch. A Zendesk outage or a bad deploy
never takes down the core Keen experience because the integrations sit behind flags with
circuit breakers.

**Canary releases:** For high-risk changes, route 5% of traffic to the new version first.
Monitor error rates, latency, and business metrics. If clean, increase gradually. Azure
Container Apps supports traffic splitting between revisions natively.

**Health checks:** Every service exposes /health for liveness and /ready for readiness.
The load balancer polls /health and removes unhealthy instances automatically. The readiness
probe gates traffic to a new instance until it has warmed up — prevents routing traffic to
a starting instance before it has established DB connections or loaded caches.

**Database migrations:** Always backward-compatible, always run before code deploy. Add
columns as nullable first, deploy code that handles both schemas, then backfill, then
make the column required in a follow-up migration. Never drop a column in the same deploy
that removes references to it. This expand-contract pattern is how I handled JWT migration
schema changes at Ingenio — the new token columns existed alongside the old session columns
for the entire transition window.