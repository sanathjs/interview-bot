# System Design — My Approach

## How I Structure a System Design Interview
1. Clarify requirements (functional + non-functional) — 5 mins
2. Estimate scale (users, RPS, storage) — 3 mins
3. High level design (components and connections) — 10 mins
4. Deep dive into key components — 15 mins
5. Identify bottlenecks and scaling strategies — 5 mins

## Questions I Always Ask First
- How many users? DAU/MAU?
- Read heavy or write heavy?
- Consistency vs availability priority? (CAP theorem trade-off)
- Any specific latency requirements?
- Global or single region?

## Core Components I Know Well
- Load Balancer: distribute traffic, health checks, sticky sessions
- CDN: static assets, edge caching, reduce latency globally
- API Gateway: rate limiting, auth, routing, SSL termination
- Cache (Redis): session data, hot reads, leaderboard, pub/sub
- Message Queue: async processing, decoupling services, retry logic
- Database: SQL for ACID, NoSQL for flexible schema / horizontal scale

## Scaling Strategies I Know
- Vertical scaling: bigger machine (limits exist)
- Horizontal scaling: more machines + load balancer
- Read replicas: offload reads from primary DB
- Sharding: partition data across multiple DB instances
- Caching: reduce DB hits with Redis / Memcached
- CDN: push static content to edge nodes

## Common Design Patterns
- CQRS: separate read/write models for scale
- Event sourcing: store events, derive state
- Cache-aside: check cache first, load from DB on miss, populate cache
- Circuit breaker: stop calling failing services, fail fast
