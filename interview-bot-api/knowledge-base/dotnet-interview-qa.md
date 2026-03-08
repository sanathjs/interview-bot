# .NET Interview Questions & Answers

## What is the difference between a struct and a class in C#?
A struct is a value type stored on the stack; a class is a reference type stored on the heap.
When you assign a struct to a new variable, the value is copied. When you assign a class, only
the reference is copied — both variables point to the same object. Structs cannot inherit from
other structs or classes (only interfaces). I use structs for small, short-lived, immutable
data — like a coordinate pair or a colour value — where avoiding heap allocation matters.
Classes are the default for everything else. In .NET, records (introduced in C# 9) give you
value semantics with reference type performance, which I prefer over structs for most modern
immutable data scenarios.

## What is the difference between value types and reference types in C#?
Value types (int, bool, float, struct, enum) store their data directly and live on the stack
(or inline in containing objects). Reference types (class, interface, delegate, string, arrays)
store a reference to heap memory. The key practical difference: assigning a value type copies
the data; assigning a reference type copies the pointer. This affects equality checks —
value types compare by value by default, reference types compare by reference unless you
override Equals. Strings are a special case — they are reference types but behave like value
types because they are immutable and have interning.

## What is the difference between IEnumerable, ICollection, and IList in C#?
IEnumerable is the base — read-only, forward-only iteration, deferred execution with LINQ.
ICollection extends IEnumerable and adds Count, Add, Remove, Contains — it knows its size
and supports modification. IList extends ICollection and adds index-based access — you can
do list[i]. My rule: accept the most restrictive interface your method actually needs. If you
only iterate, take IEnumerable. If you need Count or Add, take ICollection. If you need
index access, take IList. This keeps callers flexible — they can pass arrays, lists, or
custom collections without adapters.

## What is the difference between == and .Equals() in C#?
For value types, both compare values — effectively the same. For reference types, == compares
references by default (same object in memory) while Equals can be overridden to compare
by value. String overrides both to do value comparison, which is why "hello" == "hello" is
true even for different string instances. In practice: use == for primitives and strings.
Use Equals when you have overridden it for value semantics on a class. Use ReferenceEquals
when you explicitly need to check if two variables point to the same object.

## What is the difference between abstract class and interface in C#?
An interface defines a contract — what a type can do — with no implementation (before C# 8)
or optional default implementations (C# 8+). An abstract class can have both abstract members
(must be overridden) and concrete implementations. A class can implement multiple interfaces
but can only inherit from one abstract class. I use interfaces when I want to define capability
across unrelated types — IDisposable, IComparable. I use abstract classes when I have shared
implementation that subclasses should inherit — a base Repository class with common DB
connection logic, for example. At Ingenio I use interfaces heavily for dependency injection —
every service has an interface so it can be mocked in unit tests.

## What is dependency injection and how do you use it in .NET?
Dependency injection is a pattern where a class receives its dependencies from outside rather
than creating them internally. In .NET, the built-in DI container in Program.cs registers
services — AddSingleton, AddScoped, AddTransient — and the framework injects them into
constructors automatically. Singleton creates one instance for the app lifetime. Scoped
creates one per HTTP request. Transient creates a new instance every time. I use it on every
.NET project — at Ingenio all services, repositories, and HTTP clients are registered in the
DI container. It makes the codebase testable because you can inject mock implementations
in tests, and it decouples the construction of objects from their use.

## What is the difference between Singleton, Scoped, and Transient in .NET DI?
Singleton: one instance shared across the entire application lifetime — use for stateless
services like configuration helpers or HTTP clients. Scoped: one instance per HTTP request —
use for database contexts (DbContext), unit of work objects, anything that should be shared
within a request but not across requests. Transient: new instance every time it is requested —
use for lightweight stateless services. The classic mistake is injecting a Scoped service
into a Singleton — the Singleton outlives the request and holds a stale or disposed scoped
instance. .NET will throw an InvalidOperationException for this if you have scope validation
enabled, which you always should in development.

## What is async/await in C# and how does it work?
Async/await is C#'s syntactic sugar over the Task-based Asynchronous Pattern. When you mark
a method async and await a Task, the compiler rewrites it into a state machine. The thread
is released back to the thread pool while waiting for the awaited operation to complete —
it does not block. When the operation completes, execution resumes, potentially on a different
thread. This is critical for I/O-bound work — database queries, HTTP calls, file reads. At
Ingenio every service method that touches the DB or an external API is async. The common
mistakes: using .Result or .Wait() which blocks the thread and can deadlock in ASP.NET,
and not awaiting in a loop when you should use Task.WhenAll for parallel execution.

## What is the difference between Task.WhenAll and Task.WhenAny?
Task.WhenAll waits for all provided tasks to complete and returns an array of results. Use it
when all operations are independent and you want them to run in parallel — for example,
calling three external APIs simultaneously and combining results. At Ingenio I use this in
the advisor search pipeline to run multiple attribute scoring operations in parallel, cutting
total latency from sequential sum to the longest single operation. Task.WhenAny returns as
soon as the first task completes — use it for timeout patterns (race a real task against
Task.Delay) or when you want the first successful result from multiple sources.

## What is Entity Framework Core and how have you used it?
Entity Framework Core is an ORM — it maps C# classes to database tables and lets you write
LINQ queries instead of raw SQL. It handles migrations, change tracking, and relationship
loading. I have used EF Core at Ingenio for the Keen platform — models mapped to PostgreSQL
tables, migrations managed via dotnet ef migrations add. I prefer explicit loading or
projection (Select into DTOs) over lazy loading because lazy loading can generate N+1
queries silently. For high-performance queries or complex joins I drop down to Dapper or
raw SQL via FromSqlRaw. EF Core is great for standard CRUD; for the vector similarity
search in the advisor pipeline I use raw Npgsql commands because pgvector operations are
not in EF Core's expression tree.

## What is middleware in ASP.NET Core?
Middleware is a pipeline of components that handle HTTP requests and responses. Each component
can short-circuit the pipeline or pass the request to the next component. In ASP.NET Core
you configure the pipeline in Program.cs with app.Use, app.Map, app.Run. Built-in middleware
includes authentication, authorisation, routing, static files, CORS, and exception handling.
At Ingenio I write custom middleware for request logging, correlation ID injection, and API
key validation. The order of middleware registration matters — authentication must come before
authorisation, and exception handling middleware should be first so it catches exceptions
from everything downstream.

## What are extension methods in C#?
Extension methods let you add methods to existing types without modifying or inheriting from
them. You define them as static methods in a static class with the first parameter prefixed
with this. LINQ is entirely built on extension methods — Where, Select, OrderBy are all
extension methods on IEnumerable. I use extension methods frequently at Ingenio — for
example, extending IQueryable with reusable filter methods, or extending HttpClient with
typed wrapper methods for external APIs. They keep code readable and avoid utility class
sprawl.

## What is the difference between IQueryable and IEnumerable in LINQ?
IEnumerable executes the query in memory — the data is already loaded. IQueryable defers
execution and translates the LINQ expression tree to SQL, executing it at the database. The
practical difference: filtering an IQueryable does a WHERE clause in SQL and returns only
matching rows. Filtering an IEnumerable loads all rows first and then filters in memory.
Always work with IQueryable when building queries on top of EF Core or Dapper — only
materialise to a list when you are done composing the query. The classic mistake is calling
ToList() too early and then filtering the result, which loads far more data than needed.

## What is garbage collection in .NET and how does it work?
The .NET garbage collector automatically reclaims memory for objects that are no longer
reachable. It uses a generational model — Gen 0 (short-lived objects), Gen 1 (medium-lived),
Gen 2 (long-lived). Most objects die young, so Gen 0 collections are frequent and fast. Gen 2
collections are rare and expensive. The Large Object Heap holds objects over 85KB and is
collected with Gen 2. You cannot control when GC runs, but you can influence it by implementing
IDisposable for unmanaged resources and using the using statement. The Dispose pattern is for
deterministic cleanup — file handles, DB connections, HTTP clients. Finalizers are a last
resort for unmanaged resources when Dispose was not called.

## What is the using statement and IDisposable in C#?
IDisposable is an interface with a single method — Dispose() — for deterministic cleanup of
unmanaged resources. The using statement ensures Dispose is called even if an exception is
thrown. using (var conn = new SqlConnection(...)) { } is syntactic sugar for a try/finally
block. In C# 8+ you can use the declaration form — using var conn = new SqlConnection(...) —
which disposes at the end of the enclosing scope. I use this for database connections, HTTP
response messages, file streams, and any object that holds external resources. At Ingenio
every Npgsql connection and command is inside a using block or uses the await using pattern
for async disposal.

## What is the difference between string and StringBuilder in C#?
String is immutable — every concatenation creates a new string object. For a loop that builds
a string from N pieces, naive concatenation is O(n²) because each iteration copies all
previous content. StringBuilder is a mutable buffer that amortises allocations, making
repeated appends O(n) overall. My rule: use + or string interpolation for simple one-off
concatenations. Use StringBuilder when building strings in a loop or from more than a handful
of pieces. In modern C# (7+), Span and stackalloc can do even better for performance-critical
string building, but StringBuilder is the right default for most business logic.

## What are records in C# and when do you use them?
Records (C# 9+) are reference types with value-based equality, immutability by default, and
built-in ToString, GetHashCode, and Equals. They are ideal for DTOs, API request/response
models, and domain value objects where you want immutable data with structural equality.
record Person(string Name, int Age) gives you a constructor, properties, deconstruction,
and with expressions (var updated = person with { Age = 31 }) for non-destructive mutation.
I use records for all API DTOs in .NET 8 projects — they are cleaner than classes with
manual equality and reduce boilerplate significantly.

## How does the .NET HttpClient work and what are common mistakes?
HttpClient is the standard HTTP client for .NET. The key rule: do not create a new HttpClient
per request — it does not release socket connections immediately and causes socket exhaustion
under load. The correct approach is IHttpClientFactory registered in DI, which manages
pooling and lifetime. Named clients or typed clients are the cleanest patterns. Common
mistakes I have seen and fixed: creating HttpClient in a using block (disposes the client
but not the underlying socket immediately), not setting timeouts (default is 100 seconds,
too long for most APIs), and not handling transient HTTP errors with retry policies. At
Ingenio all external API calls — Iterable, Zendesk, Zinrelo, ContentStack — go through
typed HttpClient registrations with Polly retry and circuit breaker policies.

## What is Polly and how do you use it in .NET?
Polly is a resilience library for .NET — it adds retry, circuit breaker, timeout, bulkhead,
and fallback policies to any code. I use it for all external HTTP calls at Ingenio. The
pattern: register the typed HttpClient with AddHttpClient and chain AddPolicyHandler with a
retry policy (retry 3 times with exponential backoff on transient errors) and a circuit
breaker (open after 5 consecutive failures, reset after 30 seconds). This means a slow or
failing Zendesk API does not cascade into Keen — the circuit breaker opens and fails fast
instead of queuing threads waiting on a timeout. The interview bot uses a simpler version
of this — exponential backoff retry on Groq 429 responses.

## What is the difference between .NET Framework, .NET Core, and .NET 5+?
.NET Framework is Windows-only, ships with Windows, and is in maintenance mode. .NET Core
was the cross-platform rewrite — runs on Windows, Linux, macOS, supports containers. .NET 5
unified the two under the single .NET brand (no more Core suffix). .NET 6 was an LTS release,
.NET 8 is the current LTS release. I build exclusively on .NET 8 now — it has the best
performance, cross-platform container support, and will receive updates until 2026. The
interview bot API and the Keen platform services I work on are all .NET 8.
