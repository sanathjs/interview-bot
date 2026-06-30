# .NET Full Stack Developer — Interview Prep Guide

> Combined, deduplicated reference covering C#, ASP.NET Core, Web API, SQL Server, React, Azure, GitHub Actions, OpenTelemetry, Grafana, SOLID, JWT Authentication, Generics, Threading, Angular, and scenario-based questions.
>
> Each section below is a self-contained card. Topics are prefixed with a category tag (e.g. `C# Core — …`) so you can scan by area.

---

## How to Use This Guide

Topics are grouped by category and each question is a self-contained card optimised for mobile reading.

**Categories covered:**

- C# Core
- ASP.NET Core MVC & Middleware
- Web API
- SQL Server
- React.js
- Microsoft Azure
- GitHub Actions
- OpenTelemetry
- Grafana
- SOLID Principles
- JWT Authentication
- Generics in C#
- Threading and async/await
- Angular
- ASP.NET Core Deep Dive (Junior → Senior)
- HttpClient and Resilience
- Entity Framework Core
- .NET Roadmap 2026 *(coming soon)*
- KPMG Interview Strategy *(coming soon)*
- Scenario-Based Questions *(coming soon)*

> Tip: tap a section title to expand the card on a small screen.

---

## C# Core — Value Types vs Reference Types

**Quick rule:** Value types live on the stack (or inline). Reference types live on the heap and you only carry a pointer around.

- **Value types** — `int`, `bool`, `float`, `struct`, `enum`. Assignment copies the data.
- **Reference types** — `class`, `interface`, `delegate`, `string`, arrays. Assignment copies the reference; both variables point to the same object.
- **Equality** — value types compare by value by default; reference types compare by reference unless `Equals` is overridden.
- **`string` is special** — a reference type that behaves like a value type because it's immutable and interned.

```csharp
int a = 5;
int b = a;          // independent copy
b = 10;
Console.WriteLine(a); // 5 — unchanged

var p1 = new Person { Name = "Alice" };
var p2 = p1;        // both point to same object
p2.Name = "Bob";
Console.WriteLine(p1.Name); // "Bob" — same reference
```

**Struct vs class — when to use struct:** small, short-lived, immutable data (a coordinate pair, a colour value) where avoiding heap allocation matters. Structs cannot inherit from other structs or classes (only interfaces). For modern immutable scenarios prefer `record` — value semantics with reference-type performance.

---

## C# Core — Boxing and Unboxing

- **Boxing** — converting a value type → `object` (heap allocation).
- **Unboxing** — casting back from `object` → value type (explicit, can throw `InvalidCastException`).

```csharp
int x = 42;
object obj = x;        // boxing — heap allocated
int y = (int)obj;      // unboxing
```

**Performance tip:** Avoid boxing in hot paths. Use generics (`List<int>`) instead of `ArrayList` to prevent implicit boxing.

---

## C# Core — Abstract Class vs Interface

| Feature | Abstract Class | Interface |
|---|---|---|
| Implementation | Yes | Yes (default methods, C# 8+) |
| Multiple inheritance | No | Yes |
| Fields / state | Yes | No |
| Constructors | Yes | No |
| Access modifiers | Yes | Public only |

**Use abstract class** when you want shared base implementation and an IS-A relationship — e.g. a base `Repository` class with common DB connection logic.

**Use interface** when you want a contract that multiple unrelated types implement — `IDisposable`, `IComparable`. A class can implement many interfaces but inherit from only one abstract class.

**Practical note:** at Ingenio I use interfaces heavily for dependency injection — every service has an interface so it can be mocked in unit tests.

```csharp
public abstract class Animal {
    public string Name { get; set; }
    public abstract void Speak();        // must override
    public void Breathe() => Console.WriteLine("Breathing"); // shared impl
}

public interface IFlyable { void Fly(); }

public class Eagle : Animal, IFlyable {
    public override void Speak() => Console.WriteLine("Screech!");
    public void Fly() => Console.WriteLine("Flying high");
}
```

---

## C# Core — `==` vs `.Equals()` vs `ReferenceEquals`

- For **value types**, both `==` and `Equals` compare values — effectively the same.
- For **reference types**, `==` compares references by default (same object in memory). `Equals` can be overridden to compare by value.
- **`string`** overrides both to do value comparison, which is why `"hello" == "hello"` is true even for different string instances.

**My rule:**
- Use `==` for primitives and strings.
- Use `Equals` when you've overridden it for value semantics on a class.
- Use `ReferenceEquals` when you explicitly need to check if two variables point to the same object.

---

## C# Core — Delegates, Events, and Lambda Expressions

- **Delegate** — type-safe function pointer.
- **Event** — a delegate wrapped with publish-subscribe semantics.
- **Lambda** — inline anonymous function syntax.

```csharp
// Delegate
public delegate int MathOperation(int a, int b);
MathOperation add = (a, b) => a + b;
Console.WriteLine(add(3, 4)); // 7

// Event
public class Button {
    public event EventHandler Clicked;
    public void Click() => Clicked?.Invoke(this, EventArgs.Empty);
}

// Lambda with built-in delegate types
Func<int, int> square = x => x * x;
Action<string> log = msg => Console.WriteLine(msg);
Predicate<int> isEven = n => n % 2 == 0;
```

---

## C# Core — Garbage Collection

The GC automatically manages heap memory using a **generational model**:

- **Gen 0** — short-lived objects (collected most frequently and cheaply).
- **Gen 1** — survived one GC; medium lifetime.
- **Gen 2** — long-lived objects (collected rarely; expensive).

The GC marks reachable objects, sweeps unmarked ones, and compacts the remainder to reduce fragmentation. The **Large Object Heap (LOH)** holds objects ≥ 85 KB and is collected with Gen 2.

You cannot control when GC runs, but you can influence it by implementing `IDisposable` for unmanaged resources and using the `using` statement. Finalizers are a last resort.

```csharp
// Force GC (avoid in production)
GC.Collect();
GC.WaitForPendingFinalizers();

// Implement IDisposable for deterministic cleanup of unmanaged resources
public class FileManager : IDisposable {
    private FileStream _stream;
    public void Dispose() {
        _stream?.Dispose();
        GC.SuppressFinalize(this); // skip finalizer since we cleaned up
    }
}

// Always use 'using' to ensure Dispose is called
using var fm = new FileManager();
```

---

## C# Core — `using` Statement and IDisposable

`IDisposable` is an interface with a single method — `Dispose()` — for deterministic cleanup of unmanaged resources. The `using` statement guarantees `Dispose` is called even if an exception is thrown.

```csharp
// Classic form — syntactic sugar for try/finally
using (var conn = new SqlConnection(connStr)) {
    // ...
} // Dispose called here

// C# 8+ declaration form — disposes at end of enclosing scope
using var conn = new SqlConnection(connStr);

// Async disposal
await using var stream = File.OpenWrite("data.bin");
```

**Use for:** database connections, HTTP response messages, file streams, anything holding external resources. At Ingenio every Npgsql connection and command is inside `using` or `await using`.

---

## C# Core — IEnumerable vs IQueryable vs ICollection vs IList

| Feature | IEnumerable | IQueryable | ICollection | IList |
|---|---|---|---|---|
| Execution | In-memory, deferred | Translated to SQL, deferred | Immediate | Immediate |
| Source | Any sequence | `IQueryProvider` (EF, LINQ to SQL) | In-memory collection | In-memory list |
| Knows count | No | No | Yes | Yes |
| Index access | No | No | No | Yes |
| Add / Remove | No | No | Yes | Yes |

**Rule of thumb:** accept the most restrictive interface a method actually needs.

- Only iterate → `IEnumerable`.
- Need `Count` / `Add` → `ICollection`.
- Need indexed access → `IList`.
- Building DB queries → `IQueryable` (translates `Where`, `Select` into SQL).

```csharp
// IQueryable — WHERE runs in SQL on the database
IQueryable<User> query = dbContext.Users.Where(u => u.IsActive);

// IEnumerable — filters already-loaded data in memory
IEnumerable<User> filtered = users.Where(u => u.IsActive);

// IList — supports index access and modification
IList<User> list = new List<User> { new User(), new User() };
list.Add(new User());
Console.WriteLine(list[0].Name);
```

**Deferred execution trap:** if you return `IQueryable` but the DB context is disposed before enumeration, you get an exception. Materialise with `.ToList()` when the scope is uncertain.

**Common mistake:** calling `ToList()` too early and then filtering, which pulls far more rows than needed. Compose the query as `IQueryable`, then materialise once at the end.

---

## C# Core — Dependency Injection

DI is a design pattern where dependencies are provided to a class from outside rather than created internally — the Inversion of Control (IoC) principle. In .NET Core it's built-in via `IServiceCollection`.

```csharp
// Register in Program.cs
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddSingleton<IConfiguration>(config);
builder.Services.AddTransient<IEmailSender, SmtpEmailSender>();

// Inject via constructor
public class UserController : ControllerBase {
    private readonly IUserService _userService;
    public UserController(IUserService userService) {
        _userService = userService;
    }
}
```

**Why use DI:** decouples object construction from use, makes code testable (inject mock implementations), centralises configuration. At Ingenio every service, repository, and HTTP client is registered in the DI container.

---

## C# Core — Singleton vs Scoped vs Transient Lifetimes

| Lifetime | Instance created | Best for |
|---|---|---|
| `AddSingleton` | Once for app lifetime | Config, caches, stateless helpers |
| `AddScoped` | Once per HTTP request | `DbContext`, unit-of-work |
| `AddTransient` | Every time requested | Lightweight stateless services |

**The classic mistake:** injecting a Scoped service into a Singleton — the Singleton outlives the request and holds a stale or disposed scoped instance. .NET will throw `InvalidOperationException` if scope validation is enabled, which it should be in development.

---

## C# Core — `Span<T>` and Allocation-Free Memory

`Span<T>` is a stack-allocated `ref struct` providing a safe, type-safe view over a contiguous region of memory (array, stack, or unmanaged) **without allocation**. It enables high-performance scenarios by avoiding heap allocation and copying.

```csharp
// Slicing without allocation
string text = "Hello, World!";
ReadOnlySpan<char> span = text.AsSpan();
ReadOnlySpan<char> hello = span.Slice(0, 5); // "Hello" — no allocation

// Parsing numbers without substring allocation
bool success = int.TryParse(span.Slice(7), out int result);

// Stack allocation
Span<int> numbers = stackalloc int[10];
numbers[0] = 42;
```

**Use `Span<T>` when:**

- Parsing or processing large strings / byte arrays in hot paths.
- Writing low-allocation APIs (serializers, parsers).
- Avoiding substring copies in string manipulation.

**Limitation:** cannot be stored on the heap (no fields in classes), cannot cross `await` boundaries — use `Memory<T>` for that.

---

## C# Core — Records vs Classes

Use `record` when you want **value-based equality** and **immutability by default**. Records are ideal for DTOs, value objects, and domain events.

```csharp
// Record — value-based equality, immutable by default
public record UserDto(int Id, string Name, string Email);

var u1 = new UserDto(1, "Alice", "alice@example.com");
var u2 = new UserDto(1, "Alice", "alice@example.com");
Console.WriteLine(u1 == u2); // true — value equality

// Non-destructive mutation with 'with'
var u3 = u1 with { Name = "Bob" };

// Class — reference equality by default
public class UserClass { public int Id { get; set; } public string Name { get; set; } }
var c1 = new UserClass { Id = 1, Name = "Alice" };
var c2 = new UserClass { Id = 1, Name = "Alice" };
Console.WriteLine(c1 == c2); // false — different references
```

- **Use `record` for:** DTOs, API request/response models, query results, domain events, value objects.
- **Use `class` for:** entities with identity, mutable state, services, controllers.

I use records for all API DTOs in .NET 8 projects — cleaner than classes with manual equality and a lot less boilerplate.

---

## C# Core — Extension Methods

Extension methods let you add methods to existing types without modifying or inheriting from them. Define them as static methods in a static class with the first parameter prefixed `this`.

```csharp
public static class StringExtensions {
    public static bool IsValidEmail(this string value)
        => !string.IsNullOrWhiteSpace(value) && value.Contains('@');
}

// Usage
"alice@example.com".IsValidEmail();
```

LINQ is entirely built on extension methods — `Where`, `Select`, `OrderBy` extend `IEnumerable<T>`. At Ingenio I use them to extend `IQueryable` with reusable filters and `HttpClient` with typed wrapper methods. They keep code readable and avoid utility-class sprawl.

---

## C# Core — String vs StringBuilder

`string` is **immutable** — every concatenation creates a new object. Building a string from N pieces with `+` is O(n²) because each iteration copies all previous content.

`StringBuilder` is a mutable buffer that amortises allocations, making repeated appends O(n) overall.

**Rule:** use `+` or string interpolation for simple one-off concatenations. Use `StringBuilder` when building strings in a loop or from more than a handful of pieces.

```csharp
var sb = new StringBuilder();
foreach (var line in lines) sb.AppendLine(line);
string result = sb.ToString();
```

In modern C# (7+), `Span<char>` and `stackalloc` can do even better for performance-critical string building, but `StringBuilder` is the right default for business logic.

---

## C# Core — .NET Framework vs .NET Core vs .NET 5+

- **.NET Framework** — Windows-only, ships with Windows, in maintenance mode.
- **.NET Core** — the cross-platform rewrite (Windows, Linux, macOS, containers).
- **.NET 5** — unified the two under the single ".NET" brand (no more "Core" suffix).
- **.NET 6** — LTS release.
- **.NET 8** — current LTS, supported until November 2026.

I build exclusively on .NET 8 now — best performance, cross-platform container support, and long support window. The interview bot API and the Keen platform services I work on at Ingenio are all .NET 8.

---

## ASP.NET Core — Request Lifecycle

1. HTTP request arrives → Kestrel web server receives it.
2. Middleware pipeline processes the request (exception handling, auth, routing, etc.).
3. Router matches the URL to a controller/action.
4. Model binding maps request data to action parameters.
5. Filters run: **Authorization → Resource → Action → Result → Exception**.
6. Action method executes and returns `IActionResult`.
7. View (Razor) or JSON is rendered and written to the HTTP response.

---

## ASP.NET Core — MVC vs Razor Pages

| | MVC | Razor Pages |
|---|---|---|
| Pattern | Controller + Model + View | Page-centric (self-contained) |
| Best for | Complex apps with shared controllers | Simple CRUD forms |
| Routing | Attribute or conventional | File-path based |
| Code organisation | Controllers can handle many routes | Each page owns its logic |

---

## ASP.NET Core — Middleware

Middleware is software assembled into a pipeline that handles HTTP requests and responses. Each component can short-circuit or call `_next` to pass to the next component.

```csharp
public class LoggingMiddleware {
    private readonly RequestDelegate _next;
    public LoggingMiddleware(RequestDelegate next) { _next = next; }

    public async Task InvokeAsync(HttpContext context) {
        Console.WriteLine($"→ {context.Request.Path}");
        await _next(context);
        Console.WriteLine($"← {context.Response.StatusCode}");
    }
}

// Register in Program.cs
app.UseMiddleware<LoggingMiddleware>();
```

**Built-in middleware order (order matters!):**

```
UseExceptionHandler → UseHsts → UseHttpsRedirection → UseStaticFiles
→ UseRouting → UseAuthentication → UseAuthorization → MapControllers
```

At Ingenio I write custom middleware for request logging, correlation ID injection, and API key validation. Exception-handling middleware comes first so it catches exceptions from everything downstream.

---

## ASP.NET Core — Short-Circuiting the Pipeline in Middleware

Simply do **not** call `await _next(context)`. Optionally write a response directly.

```csharp
public async Task InvokeAsync(HttpContext context) {
    if (!context.Request.Headers.ContainsKey("X-Api-Key")) {
        context.Response.StatusCode = 401;
        await context.Response.WriteAsync("Missing API key");
        return; // short-circuit — _next is never called
    }
    await _next(context);
}
```

---

## ASP.NET Core — Filters

Filters execute code at specific stages of the request pipeline:

| Filter Type | When it runs | Common use |
|---|---|---|
| Authorization | First | Check if user is allowed |
| Resource | After auth, before model binding | Caching, early short-circuit |
| Action | Before / after action execution | Logging, validation |
| Result | Before / after result execution | Modify response format |
| Exception | On unhandled exception | Global error handling |

```csharp
public class LogActionFilter : IActionFilter {
    public void OnActionExecuting(ActionExecutingContext context) {
        Console.WriteLine($"Executing: {context.ActionDescriptor.DisplayName}");
    }
    public void OnActionExecuted(ActionExecutedContext context) {
        if (context.Exception != null) Console.WriteLine("Action threw an exception");
    }
}

// Register globally
builder.Services.AddControllers(options => {
    options.Filters.Add<LogActionFilter>();
});
```

---

## ASP.NET Core — Passing Parameters to Custom Filters

Via constructor arguments on the filter attribute:

```csharp
public class RequireRoleFilter : IAuthorizationFilter {
    private readonly string _role;
    public RequireRoleFilter(string role) { _role = role; }
    public void OnAuthorization(AuthorizationFilterContext ctx) {
        if (!ctx.HttpContext.User.IsInRole(_role))
            ctx.Result = new ForbidResult();
    }
}

// IFilterFactory approach for DI-friendly parameterised filters
public class RequireRoleAttribute : Attribute, IFilterFactory {
    private readonly string _role;
    public RequireRoleAttribute(string role) { _role = role; }
    public IFilterMetadata CreateInstance(IServiceProvider sp) =>
        new RequireRoleFilter(_role);
    public bool IsReusable => false;
}

[RequireRole("Admin")]
public IActionResult Admin() => Ok();
```

---

## ASP.NET Core — Performance Impact of Filters

- Filters add method-call overhead on every request matching the registration scope.
- **Global filters** run for every request — keep them lightweight.
- Synchronous filters block the thread. Implement `IAsyncActionFilter` for I/O work.
- Resource filters run before model binding — ideal for early short-circuit (e.g. ETag caching).
- Avoid heavy computation, DB calls, or external API calls in filters without caching.

---

## ASP.NET Core — Model Binding and Validation

```csharp
public class CreateUserDto {
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; }

    [EmailAddress]
    public string Email { get; set; }

    [Range(18, 120)]
    public int Age { get; set; }
}

[HttpPost]
public IActionResult Create([FromBody] CreateUserDto dto) {
    if (!ModelState.IsValid)
        return BadRequest(ModelState);
    // proceed
    return Ok();
}
```

**Binding sources:** `[FromBody]`, `[FromQuery]`, `[FromRoute]`, `[FromHeader]`, `[FromForm]`.

---

## ASP.NET Core — Custom Model Binder

A custom model binder transforms request data into a complex type that default binding can't handle. Implement `IModelBinder` and register it.

```csharp
public class CommaSeparatedIntsBinder : IModelBinder {
    public Task BindModelAsync(ModelBindingContext ctx) {
        var value = ctx.ValueProvider.GetValue(ctx.ModelName).FirstValue;
        if (value == null) { ctx.Result = ModelBindingResult.Failed(); return Task.CompletedTask; }
        var ids = value.Split(',').Select(int.Parse).ToList();
        ctx.Result = ModelBindingResult.Success(ids);
        return Task.CompletedTask;
    }
}

// Usage in action
public IActionResult GetByIds([ModelBinder(typeof(CommaSeparatedIntsBinder))] List<int> ids) { ... }
```

---

## ASP.NET Core — Authentication vs Authorization

- **Authentication** = who you are (JWT, cookies, OAuth).
- **Authorization** = what you can do (roles, policies, claims).

```csharp
// JWT Auth setup
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(config["Jwt:Key"]))
        };
    });

// Policy-based Authorization
builder.Services.AddAuthorization(options => {
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
    options.AddPolicy("MinAge", policy =>
        policy.RequireAssertion(ctx =>
            ctx.User.HasClaim(c => c.Type == "age" && int.Parse(c.Value) >= 18)));
});

[Authorize(Policy = "AdminOnly")]
public IActionResult AdminDashboard() => Ok("Admin area");
```

---

## ASP.NET Core — Cookie Auth vs JWT Bearer

| | Cookie Auth | JWT Bearer |
|---|---|---|
| Storage | Server-side session + client cookie | Client-side token (header) |
| State | Stateful (session lookup needed) | Stateless |
| Best for | Server-rendered web apps (MVC, Razor) | REST APIs, mobile, SPAs |
| CSRF risk | Yes (mitigate with anti-forgery token) | No (if in `Authorization` header) |
| Logout | Immediate (invalidate session) | Needs token blacklist or short expiry |

---

## ASP.NET Core — Session Management

ASP.NET Core session is stored server-side, identified by a cookie. Useful for server-rendered apps; avoid in stateless REST APIs (use JWT claims instead).

```csharp
// Setup
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options => {
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});
app.UseSession();

// Usage
HttpContext.Session.SetString("UserId", userId.ToString());
var id = HttpContext.Session.GetString("UserId");
```

---

## ASP.NET Core — MVC Performance Tuning

- Use **Response Caching** and **Output Caching** for read-heavy pages.
- Enable **Bundling & Minification** for CSS / JS assets.
- Use **async action methods** for I/O-bound operations.
- Cache data with `IMemoryCache` or `IDistributedCache`.
- Use **Tag Helpers** and **Partial Views** instead of full page reloads.
- Deploy behind a **CDN** for static assets.
- Enable **HTTP/2** in Kestrel configuration.

---

## ASP.NET Core — `IActionResult` vs Concrete Return Type

- `IActionResult` — flexible; return different status codes and content types from the same action.
- Concrete type (e.g. `User`) — simpler, but always returns 200 OK with no way to signal errors.
- `ActionResult<T>` — best of both: type-safe and flexible.

```csharp
public ActionResult<UserDto> GetUser(int id) {
    var user = _service.Get(id);
    if (user == null) return NotFound();
    return Ok(user); // or just: return user;
}
```

---

## ASP.NET Core — `IOptions<T>` vs `IOptionsSnapshot<T>` vs `IOptionsMonitor<T>`

| | `IOptions<T>` | `IOptionsSnapshot<T>` | `IOptionsMonitor<T>` |
|---|---|---|---|
| Lifetime | Singleton | Scoped (per request) | Singleton |
| Reloads config | No | Yes (per request) | Yes (real-time) |
| Use in | Singletons | Controllers, Scoped services | Long-running services |

```csharp
builder.Services.Configure<SmtpSettings>(config.GetSection("Smtp"));

public class EmailService(IOptionsSnapshot<SmtpSettings> opts) {
    private readonly SmtpSettings _settings = opts.Value;
}
```

---

## ASP.NET Core — Middleware Execution Order

Middleware executes in the order registered. Request flows **in** through each middleware; response flows **out** in reverse.

```
Request →  ExceptionHandler → Auth → Routing → Endpoint
Response ← ExceptionHandler ← Auth ← Routing ← Endpoint
```

**Order mistakes that cause bugs:**

- `UseAuthentication` must come before `UseAuthorization`.
- `UseRouting` must come before `UseAuthentication` (for endpoint-aware auth).
- `UseStaticFiles` before `UseRouting` — static files intentionally bypass auth.

---

## ASP.NET Core — Reading and Modifying the Request Body

The request body is a forward-only stream. Enable buffering first.

```csharp
public async Task InvokeAsync(HttpContext context) {
    context.Request.EnableBuffering(); // allow re-reading
    using var reader = new StreamReader(context.Request.Body, leaveOpen: true);
    var body = await reader.ReadToEndAsync();
    context.Request.Body.Position = 0; // rewind for next middleware

    // Modify response
    var originalBody = context.Response.Body;
    using var ms = new MemoryStream();
    context.Response.Body = ms;
    await _next(context);
    ms.Seek(0, SeekOrigin.Begin);
    var responseBody = await new StreamReader(ms).ReadToEndAsync();
    // modify responseBody here
    ms.Seek(0, SeekOrigin.Begin);
    await ms.CopyToAsync(originalBody);
}
```

---

## ASP.NET Core — Method Injection vs Constructor Injection

- **Constructor Injection** — dependency injected at object creation. Use for required, always-needed dependencies.
- **Method Injection** — dependency passed as an action method parameter via `[FromServices]`. Use for optional or action-specific dependencies.

```csharp
[HttpGet]
public IActionResult GetReport([FromServices] IReportGenerator gen) {
    return Ok(gen.Generate());
}
```

---

## ASP.NET Core — Structured Logging

Structured logging stores log data as key-value pairs (not plain text strings), enabling machine-readable, queryable logs.

```csharp
// Bad — unstructured; can't query by OrderId
_logger.LogInformation("Order 12345 placed by user alice@example.com");

// Good — structured; OrderId and Email are queryable fields
_logger.LogInformation("Order {OrderId} placed by {Email}", orderId, email);
```

Use **Serilog** + Seq or Application Insights for structured log querying.

---

## ASP.NET Core — Adding Custom Fields to Log Messages

Use `BeginScope` or Serilog's `LogContext.PushProperty`:

```csharp
// Serilog enrichment
using (LogContext.PushProperty("RequestId", context.TraceIdentifier))
using (LogContext.PushProperty("UserId", userId)) {
    _logger.LogInformation("Processing request");
}

// Or use ILogger scopes (built-in)
using (_logger.BeginScope(new Dictionary<string, object> {
    ["RequestId"] = context.TraceIdentifier,
    ["UserId"] = userId
})) {
    _logger.LogInformation("Processing request");
}
```

---

## ASP.NET Core — Handling Sensitive Data in Logs (GDPR)

- Use **destructuring policies** in Serilog to exclude sensitive fields.
- Define a `[PersonalData]` or `[Sensitive]` attribute and filter at log sink.
- Mask PII in log templates: `"User {Email:masked} logged in"`.
- Apply log scrubbing middleware.
- Store sensitive logs in a separate, restricted sink.

```csharp
Log.Logger = new LoggerConfiguration()
    .Destructure.ByTransforming<User>(u => new { u.Id, Email = "***" })
    .WriteTo.Console()
    .CreateLogger();
```

---

## Web API — REST vs Web API

- **REST** is an architectural style: stateless, resource-based URLs, standard HTTP verbs, cacheable.
- **Web API** is a framework (.NET) for implementing RESTful services.

---

## Web API — HTTP Verbs

| Verb | Purpose | Idempotent | Request Body |
|---|---|---|---|
| GET | Retrieve resource | Yes | No |
| POST | Create resource | No | Yes |
| PUT | Replace entire resource | Yes | Yes |
| PATCH | Partial update | No | Yes |
| DELETE | Delete resource | Yes | Optional |

---

## Web API — Global Exception Handling

```csharp
// Program.cs — using Problem Details (RFC 7807)
builder.Services.AddProblemDetails();

app.UseExceptionHandler(errorApp => {
    errorApp.Run(async context => {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        var feature = context.Features.Get<IExceptionHandlerFeature>();
        await context.Response.WriteAsJsonAsync(new ProblemDetails {
            Title  = "An unexpected error occurred",
            Detail = feature?.Error.Message,
            Status = 500
        });
    });
});
```

Map specific exception types to appropriate status codes:

```csharp
app.UseExceptionHandler(errorApp => {
    errorApp.Run(async context => {
        var feature = context.Features.Get<IExceptionHandlerFeature>();
        var ex = feature?.Error;
        context.Response.StatusCode = ex is NotFoundException ? 404 : 500;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new ProblemDetails {
            Title  = ex?.GetType().Name,
            Detail = ex?.Message,
            Status = context.Response.StatusCode
        });
    });
});
```

---

## Web API — Versioning

```csharp
builder.Services.AddApiVersioning(options => {
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    // Strategies: URL segment, query string, or header
});

[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class UsersV1Controller : ControllerBase { }

[ApiVersion("2.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class UsersV2Controller : ControllerBase { }
```

---

## Web API — Securing APIs

- Use **HTTPS** always.
- Implement **JWT Bearer tokens** for stateless auth.
- Apply **Rate Limiting** (`AddRateLimiter` in .NET 7+).
- Validate all inputs (model validation, FluentValidation).
- Configure **CORS** policies — don't use `AllowAnyOrigin` in production.
- Know the **OWASP Top 10**: injection, broken auth, sensitive data exposure, XXE, security misconfiguration, etc.
- Use **Azure Key Vault** for secrets — never hard-code them.

---

## Web API — Swagger / OpenAPI

```csharp
builder.Services.AddSwaggerGen(c => {
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "My API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement {
        { new OpenApiSecurityScheme {
            Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
          }, new string[] {} }
    });
});

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "My API v1"));
```

---

## Web API — Caching for Performance

```csharp
// Response caching (HTTP cache headers)
builder.Services.AddResponseCaching();
app.UseResponseCaching();

[HttpGet]
[ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]
public IActionResult GetProducts() { ... }

// Distributed cache (Redis)
builder.Services.AddStackExchangeRedisCache(options => {
    options.Configuration = "localhost:6379";
});

public async Task<IActionResult> GetUser(int id) {
    var cacheKey = $"user:{id}";
    var cached = await _cache.GetStringAsync(cacheKey);
    if (cached != null) return Ok(JsonSerializer.Deserialize<User>(cached));

    var user = await _db.Users.FindAsync(id);
    await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(user),
        new DistributedCacheEntryOptions {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
        });
    return Ok(user);
}
```

---

## SQL Server — Primary Key vs Unique Key

| | Primary Key | Unique Key |
|---|---|---|
| NULLs allowed | No | One NULL per column |
| Count per table | Only one | Multiple |
| Clustered index | Auto-created | Optional |
| Purpose | Identify row | Enforce uniqueness on non-PK |

---

## SQL Server — Clustered vs Non-Clustered Index

- **Clustered** — physically sorts table rows by the index key. One per table. The leaf level *is* the table data.
- **Non-clustered** — separate structure with pointers (row locators) to actual rows. Multiple allowed.

```sql
-- Clustered (typically on PK — SQL Server does this automatically)
CREATE CLUSTERED INDEX IX_Users_Id ON Users(Id);

-- Non-Clustered (for frequently queried columns)
CREATE NONCLUSTERED INDEX IX_Users_Email ON Users(Email);

-- Covering index — includes extra columns to avoid key lookups
CREATE NONCLUSTERED INDEX IX_Orders_Date ON Orders(OrderDate)
INCLUDE (UserId, Total, Status);
```

---

## SQL Server — Stored Procedures

```sql
CREATE PROCEDURE GetActiveUsers
    @MinAge INT = 18,
    @PageSize INT = 20,
    @PageNumber INT = 1
AS
BEGIN
    SELECT Id, Name, Email
    FROM Users
    WHERE IsActive = 1 AND Age >= @MinAge
    ORDER BY Name
    OFFSET (@PageNumber - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END;

EXEC GetActiveUsers @MinAge = 21, @PageSize = 10, @PageNumber = 2;
```

---

## SQL Server — Views

```sql
-- Create a reusable view
CREATE VIEW vw_ActiveUserOrders AS
    SELECT u.Id, u.Name, COUNT(o.Id) AS OrderCount, SUM(o.Total) AS TotalSpend
    FROM Users u
    LEFT JOIN Orders o ON u.Id = o.UserId
    WHERE u.IsActive = 1
    GROUP BY u.Id, u.Name;

-- Query the view like a table
SELECT * FROM vw_ActiveUserOrders WHERE TotalSpend > 1000;
```

---

## SQL Server — CTEs (Common Table Expressions)

```sql
-- Simple CTE
WITH ActiveUsersCTE AS (
    SELECT Id, Name, Email FROM Users WHERE IsActive = 1
)
SELECT u.Name, o.OrderCount
FROM ActiveUsersCTE u
JOIN (SELECT UserId, COUNT(*) AS OrderCount FROM Orders GROUP BY UserId) o
  ON u.Id = o.UserId;

-- Recursive CTE (org hierarchy)
WITH OrgHierarchy AS (
    SELECT Id, Name, ManagerId, 0 AS Level
    FROM Employees WHERE ManagerId IS NULL   -- root
    UNION ALL
    SELECT e.Id, e.Name, e.ManagerId, h.Level + 1
    FROM Employees e
    INNER JOIN OrgHierarchy h ON e.ManagerId = h.Id
)
SELECT * FROM OrgHierarchy ORDER BY Level;
```

---

## SQL Server — DELETE vs TRUNCATE vs DROP

| Command | Removes | WHERE | Triggers | Rollbackable | Resets identity |
|---|---|---|---|---|---|
| DELETE | Specific rows | Yes | Yes | Yes | No |
| TRUNCATE | All rows | No | No | Yes (in tx) | Yes |
| DROP | Table + schema | No | No | No | N/A |

---

## SQL Server — Transactions and ACID

- **Atomicity** — all operations succeed or all roll back.
- **Consistency** — data remains valid (constraints enforced).
- **Isolation** — concurrent transactions don't see each other's intermediate state.
- **Durability** — committed transactions persist even after a crash.

```sql
BEGIN TRY
    BEGIN TRANSACTION;
        UPDATE Accounts SET Balance = Balance - 100 WHERE Id = 1;
        UPDATE Accounts SET Balance = Balance + 100 WHERE Id = 2;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    THROW;
END CATCH;
```

---

## SQL Server — Window Functions

```sql
-- ROW_NUMBER, RANK, DENSE_RANK
SELECT Name, Salary,
    ROW_NUMBER() OVER (PARTITION BY DeptId ORDER BY Salary DESC) AS RowNum,
    RANK()       OVER (PARTITION BY DeptId ORDER BY Salary DESC) AS Rank,
    DENSE_RANK() OVER (PARTITION BY DeptId ORDER BY Salary DESC) AS DenseRank
FROM Employees;

-- Running total
SELECT Name, Amount,
    SUM(Amount) OVER (ORDER BY OrderDate ROWS UNBOUNDED PRECEDING) AS RunningTotal
FROM Sales;

-- LAG / LEAD
SELECT OrderDate, Total,
    LAG(Total, 1) OVER (ORDER BY OrderDate) AS PreviousTotal,
    Total - LAG(Total, 1) OVER (ORDER BY OrderDate) AS Diff
FROM Orders;
```

---

## SQL Server — JOINs

```sql
-- INNER JOIN — only matching rows
SELECT u.Name, o.Total FROM Users u INNER JOIN Orders o ON u.Id = o.UserId;

-- LEFT JOIN — all Users, even without orders (NULL for order columns)
SELECT u.Name, o.Total FROM Users u LEFT JOIN Orders o ON u.Id = o.UserId;

-- RIGHT JOIN — all Orders, even if user deleted
SELECT u.Name, o.Total FROM Users u RIGHT JOIN Orders o ON u.Id = o.UserId;

-- FULL OUTER JOIN — all rows from both sides
SELECT u.Name, o.Total FROM Users u FULL OUTER JOIN Orders o ON u.Id = o.UserId;

-- CROSS JOIN — Cartesian product
SELECT u.Name, p.ProductName FROM Users u CROSS JOIN Products p;
```

---

## SQL Server — Optimising Slow Queries

**Investigation steps:**

```sql
-- Step 1: Check execution plan
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
-- Run your query, look for "Table Scan" → should be "Index Seek"

-- Step 2: Make queries sargable (index-friendly)
-- Bad — function on column prevents index use
SELECT * FROM Orders WHERE YEAR(CreatedAt) = 2024;

-- Good — sargable, index can be used
SELECT * FROM Orders
WHERE CreatedAt >= '2024-01-01' AND CreatedAt < '2025-01-01';

-- Step 3: Add a covering index
CREATE NONCLUSTERED INDEX IX_Orders_Date
ON Orders(CreatedAt) INCLUDE (UserId, Total, Status);

-- Step 4: Fix N+1 — use JOIN instead of looping queries
-- Use Include() in EF Core
var users = dbContext.Users.Include(u => u.Orders).ToList();

-- Step 5: Update statistics
UPDATE STATISTICS Orders;

-- Step 6: Use EXISTS instead of IN for subqueries
SELECT * FROM Users u WHERE EXISTS (
    SELECT 1 FROM Orders o WHERE o.UserId = u.Id
);
```

**Checklist:**

- Avoid `SELECT *`.
- Add indexes on `WHERE` / `JOIN` / `ORDER BY` columns.
- Use query parameterisation to enable plan reuse.
- Break complex queries into CTEs or temp tables.
- Review actual vs estimated row counts in the execution plan.
- Consider read replicas for heavy read workloads.

---

## React — Virtual DOM

The Virtual DOM is a lightweight in-memory representation of the actual DOM. When state changes, React creates a new VDOM tree, diffs it against the previous one (reconciliation via the Fiber algorithm), and applies only the minimal necessary changes to the real DOM — making updates highly efficient.

---

## React — State and Props

- **Props** — read-only data passed from parent to child.
- **State** — mutable data local to a component.

```jsx
function Greeting({ name }) {         // Props
    return <h1>Hello, {name}!</h1>;
}

function Counter() {                  // State
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>;
}
```

---

## React — Hooks Overview

| Hook | Purpose |
|---|---|
| `useState` | Local state |
| `useEffect` | Side effects (fetch, subscriptions, DOM mutations) |
| `useContext` | Consume context without prop drilling |
| `useRef` | DOM refs or mutable values that don't trigger re-render |
| `useMemo` | Memoize expensive calculations |
| `useCallback` | Memoize function references |
| `useReducer` | Complex state with actions (like mini-Redux) |

---

## React — `useEffect` Patterns

```jsx
// Runs after EVERY render
useEffect(() => { doSomething(); });

// Runs ONCE on mount (componentDidMount equivalent)
useEffect(() => { fetchInitialData(); }, []);

// Runs when `id` changes
useEffect(() => {
    const user = fetchUser(id);
    return () => cancelRequest(user); // cleanup on unmount or before next effect
}, [id]);
```

---

## React — Functional vs Class Components

| | Functional | Class |
|---|---|---|
| Syntax | Function / arrow | `extends React.Component` |
| State | `useState` hook | `this.state` |
| Lifecycle | `useEffect` | `componentDidMount` etc. |
| Performance | Slightly lighter | Slightly heavier |
| Preferred | Modern standard | Legacy |

---

## React — Context API

```jsx
const ThemeContext = createContext('light');

// Provider wraps the tree
<ThemeContext.Provider value="dark">
    <App />
</ThemeContext.Provider>

// Consumer uses useContext
function Button() {
    const theme = useContext(ThemeContext);
    return <button className={theme}>Click</button>;
}
```

---

## React — Redux vs Context API

| | Redux | Context API |
|---|---|---|
| Complexity | Higher | Lower |
| DevTools | Excellent | Basic |
| Middleware | Yes (thunk, saga) | No |
| Performance | Optimised via selectors | Re-renders all consumers on change |
| Best for | Large apps, complex state | Auth, theme, locale |

---

## React — Component Lifecycle

1. **Mounting** → `constructor` → `render` → `componentDidMount` (`useEffect(fn, [])`).
2. **Updating** → `render` → `componentDidUpdate` (`useEffect(fn, [deps])`).
3. **Unmounting** → `componentWillUnmount` (cleanup in `useEffect`).

---

## React — Lazy Loading

```jsx
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

function App() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <HeavyComponent />
        </Suspense>
    );
}
```

---

## React — Performance Optimisation

- `React.memo` — skip re-render if props unchanged.
- `useMemo` / `useCallback` — memoize computed values and function references.
- `React.lazy` + `Suspense` — code splitting.
- Virtualise long lists with `react-window` or `react-virtual`.
- Avoid inline object / function creation in JSX (new reference every render).
- Use production builds (`NODE_ENV=production`).
- Profile with React DevTools Profiler.

---

## Azure — App Service vs Virtual Machine

| | App Service | Virtual Machine |
|---|---|---|
| Type | PaaS | IaaS |
| OS access | Limited | Full |
| Scaling | Built-in autoscale | VMSS or manual |
| Cost | Higher per unit, lower ops | Lower unit, higher ops |
| Best for | Web apps, APIs | Custom software, legacy workloads |

---

## Azure — Storage Types

- **Blob Storage** — unstructured data (files, images, backups, logs).
- **Table Storage** — NoSQL key-value, massive scale, cheap.
- **Queue Storage** — async message queuing between services.
- **File Storage** — SMB file shares for lift-and-shift.

---

## Azure — SQL Database

Fully managed PaaS SQL Server. Features: built-in HA, geo-replication, automatic backups (point-in-time restore), elastic pools for multi-tenant cost sharing, serverless tier.

---

## Azure — Functions

Serverless, event-driven compute. Triggers: HTTP, Timer, Service Bus, Event Hub, Blob, Cosmos DB.

```csharp
[Function("ProcessOrder")]
public async Task Run(
    [ServiceBusTrigger("orders-queue", Connection = "ServiceBusConnection")]
    OrderMessage message,
    FunctionContext context) {
    var log = context.GetLogger<ProcessOrderFunction>();
    log.LogInformation($"Processing order {message.OrderId}");
    await _orderService.ProcessAsync(message);
}
```

---

## Azure — DevOps

Integrated ALM suite: Azure Repos (Git), Azure Pipelines (CI/CD), Boards (Kanban / Scrum), Artifacts (NuGet / npm feeds), Test Plans.

---

## Azure — Key Vault

Centralised secrets, keys, and certificate management. Use with **Managed Identity** to avoid credentials in config.

```csharp
builder.Configuration.AddAzureKeyVault(
    new Uri("https://my-vault.vault.azure.net/"),
    new DefaultAzureCredential()); // uses Managed Identity in Azure, dev identity locally
```

---

## Azure — Active Directory (Entra ID)

Identity platform for OAuth 2.0 / OpenID Connect. Used for SSO, app registrations, Managed Identities, RBAC, Conditional Access.

---

## Azure — Deploying .NET Applications

```yaml
# GitHub Actions deploy to Azure App Service
- name: Deploy to Azure
  uses: azure/webapps-deploy@v2
  with:
    app-name: my-api
    publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
    package: ./publish
```

Options: App Service (WebDeploy, zip deploy, GitHub Actions), AKS (Docker + Helm), Azure Functions (func CLI / pipeline).

---

## Azure — Monitor and Application Insights

```csharp
builder.Services.AddApplicationInsightsTelemetry(
    options => options.ConnectionString = config["AppInsights:ConnectionString"]);
```

Features: request tracing, dependency tracking, exception logging, custom events / metrics, live metrics stream, KQL queries, smart detection for anomalies.

---

## GitHub Actions — Step vs Action vs Job

- **Step** — individual task inside a job (run a shell command or call an action).
- **Action** — reusable unit packaged as a step (e.g. `actions/checkout@v4`).
- **Job** — collection of steps running on one runner. Jobs run in **parallel** by default; use `needs:` to sequence.

---

## GitHub Actions — Reusable Workflows vs Composite Actions

- **Reusable Workflows** — entire `.yml` workflow called from another workflow. Accepts `inputs` and `secrets`. Runs on its own runner.
- **Composite Actions** — bundle multiple steps into a single `action.yml`. Runs in the calling job's runner.

---

## GitHub Actions — Secure Cloud Auth (OIDC)

```yaml
# Recommended: OpenID Connect (no stored secrets)
- uses: azure/login@v1
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

Use OIDC federation instead of long-lived service principal secrets.

---

## GitHub Actions — Matrix Strategy and fail-fast

```yaml
strategy:
  fail-fast: false   # continue other matrix jobs even if one fails
  matrix:
    os: [ubuntu-latest, windows-latest]
    dotnet: ['7.0', '8.0']
runs-on: ${{ matrix.os }}
```

---

## GitHub Actions — Passing Data Between Jobs

```yaml
jobs:
  build:
    steps:
      - run: dotnet publish -o ./publish
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: ./publish
  deploy:
    needs: build
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
```

---

## GitHub Actions — Concurrency Groups

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Prevents multiple runs of the same branch / workflow simultaneously. The running job is cancelled when a newer push arrives.

---

## GitHub Actions — Optimising with Caching

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.nuget/packages
    key: nuget-${{ hashFiles('**/*.csproj') }}
    restore-keys: nuget-
```

---

## GitHub Actions — Security Best Practices

- Store secrets in **Encrypted Secrets** (repo or org level).
- Use **OIDC** instead of long-lived credentials.
- Pin action versions to a commit SHA: `actions/checkout@abc1234`.
- Limit `GITHUB_TOKEN` permissions using the `permissions:` block.
- Scan for secrets with `gitleaks` or GitHub's built-in secret scanning.
- Avoid self-hosted runners on public repos (risk of malicious PRs).

---

## OpenTelemetry — API vs SDK

- **API** — vendor-neutral interfaces (Tracer, Meter, Logger). Zero-dependency. Use in libraries.
- **SDK** — full implementation with exporters, processors, and samplers. Use in applications.

---

## OpenTelemetry — Core Data Pillars (M.E.L.T.)

- **Metrics** — numeric measurements over time (request rate, latency, CPU %).
- **Events** — discrete occurrences with metadata.
- **Logs** — text records of what happened at a point in time.
- **Traces** — distributed call chain across services (parent / child spans).

---

## OpenTelemetry — Collector

An agent / sidecar that receives telemetry from apps via OTLP, processes / filters / batches it, and exports to multiple backends (Jaeger, Prometheus, Grafana Cloud, DataDog, Azure Monitor) — without changing app code.

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
exporters:
  jaeger:
    endpoint: jaeger:14250
  prometheus:
    endpoint: 0.0.0.0:8889
service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [jaeger]
```

---

## OpenTelemetry — Pipeline Lifecycle in Collector

`Receiver → Processor (filter, batch, transform) → Exporter`

---

## OpenTelemetry — Context Propagation

The mechanism for passing trace context (`TraceId`, `SpanId`, `TraceFlags`) across service boundaries via HTTP headers. Standard: **W3C `traceparent`** header. Enables distributed traces to connect spans across microservices.

```csharp
// Automatic with AddHttpClientInstrumentation — no manual work needed
// Manual span creation
using var activity = ActivitySource.StartActivity("ProcessOrder");
activity?.SetTag("orderId", orderId);
```

---

## OpenTelemetry — Head vs Tail-Based Sampling

| | Head-based | Tail-based |
|---|---|---|
| Decision made | At trace start | After trace completes |
| Typical rate | Random % (e.g. 5%) | Based on outcome (sample all errors) |
| Collector needed | No | Yes (needs full trace) |
| Use case | Cost reduction | Smart sampling for quality |

---

## OpenTelemetry — Auto vs Manual Instrumentation

- **Auto** — add NuGet packages (`AddAspNetCoreInstrumentation`, `AddHttpClientInstrumentation`, `AddSqlClientInstrumentation`). Zero code change.
- **Manual** — create custom spans with `ActivitySource` for domain-specific tracing.

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddSource("MyApp")
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddSqlClientInstrumentation()
        .AddOtlpExporter())
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddPrometheusExporter());
```

---

## OpenTelemetry — Semantic Conventions

Standardised attribute names for common concepts:

- `http.method`, `http.status_code`, `http.url`
- `db.system`, `db.statement`
- `messaging.system`, `messaging.destination`

Using conventions enables consistent dashboards across teams.

---

## OpenTelemetry — Tracking Exceptions

```csharp
using var activity = ActivitySource.StartActivity("ProcessPayment");
try {
    await ProcessPaymentAsync();
} catch (Exception ex) {
    activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
    activity?.RecordException(ex);
    throw;
}
```

---

## Grafana — Classic vs Unified Alerting

- **Classic** — per-panel alerts, limited routing, deprecated.
- **Unified Alerting** — centralised rule engine, multi-dimensional (one rule → many alert instances), integrates with Alertmanager for routing / silencing / grouping.

---

## Grafana — Dashboard Variables and Performance

Use template variables (`$instance`, `$service`, `$env`) to build dynamic, reusable dashboards. Use `$__interval` for auto time bucketing to reduce query load.

```promql
rate(http_requests_total{service="$service", env="$env"}[$__interval])
```

---

## Grafana — Transformations

Transformations are applied to query results before display:

- **Filter by name** — show only specific fields.
- **Group by + reduce** — aggregate series.
- **Join by field** — merge results from multiple queries.
- **Add field from calculation** — computed columns.

---

## Grafana — Multi-tenancy and Access Control

Use Grafana **Organizations** for full isolation, or **Teams + folder permissions** for lighter isolation within one org. RBAC (Grafana Enterprise) for granular permission control.

---

## Grafana — Loki, Mimir, Tempo

- **Loki** — log aggregation, label-based indexing (like Prometheus for logs). Query with LogQL.
- **Mimir** — horizontally scalable long-term Prometheus metrics storage.
- **Tempo** — distributed tracing backend. Query with TraceQL.

All three integrate natively in Grafana, enabling **correlated observability**: click a log line → jump to its trace; click a span → view related metrics.

---

## Grafana — Provisioning (Dashboard-as-Code)

```yaml
# provisioning/datasources/prometheus.yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true
    jsonData:
      timeInterval: "15s"
```

Store dashboard JSON files in `provisioning/dashboards/` and point Grafana at the folder — no manual UI clicks needed.

---

## Grafana — Resolving Performance Lag / Crashes

1. Check request-rate and error-rate panels — spot the spike.
2. Drill into Loki logs for error messages around the incident time.
3. Follow the trace in Tempo to find the slow span (DB call? External API?).
4. Check metric cardinality — too many unique label combinations kills Prometheus / Mimir.
5. Set up alerts on p99 latency thresholds, not just averages.

---

## Grafana — Dashboard Links and Data Links

- **Dashboard Links** — navigate between related dashboards.
- **Data Links** — click a data point → open a filtered view in another dashboard or external system (e.g. Loki logs for that time range and service).

```json
{
  "dataLinks": [{
    "title": "View Logs",
    "url": "/explore?left={\"datasource\":\"Loki\",\"queries\":[{\"expr\":\"{service=\\\"${__field.labels.service}\\\"}\" }]}"
  }]
}
```

---

## SOLID — Overview

A guide, not a law. Apply it where code grows and lives long — skip it for throwaway scripts.

- **S** — Single Responsibility Principle
- **O** — Open / Closed Principle
- **L** — Liskov Substitution Principle
- **I** — Interface Segregation Principle
- **D** — Dependency Inversion Principle

Each principle is broken into its own card below.

---

## SOLID — Single Responsibility Principle (S)

> A class should have only ONE reason to change.

```csharp
// Bad — one class does too much
class EmployeeService {
    void Save() { }
    void SendEmail() { }
    void GenerateReport() { }
}

// Good — each class has one job
class EmployeeRepository { void Save() { } }
class EmailService { void SendEmail() { } }
class ReportService { void GenerateReport() { } }
```

**Pros:** easy to maintain, high cohesion, fewer bugs, easy to test.
**Cons:** more classes; initial design takes a little more time.

---

## SOLID — Open / Closed Principle (O)

> Open for extension, closed for modification.

```csharp
// Bad — every new payment type requires modifying the existing class
class PaymentProcessor {
    void Process(string type) {
        if (type == "CreditCard") { }
        else if (type == "UPI") { }
    }
}

// Good — new payment type = new class only
interface IPayment { void Pay(); }
class CreditCardPayment : IPayment { public void Pay() { } }
class UpiPayment       : IPayment { public void Pay() { } }
class WalletPayment    : IPayment { public void Pay() { } } // just add this
```

---

## SOLID — Liskov Substitution Principle (L)

> Subclasses must be substitutable for their base class without breaking behaviour.

```csharp
// Bad — Penguin breaks the Bird contract
class Bird { public virtual void Fly() { } }
class Penguin : Bird {
    public override void Fly() => throw new NotSupportedException();
}

// Good — segregate flying into its own interface
abstract class Bird { }
interface IFlyable { void Fly(); }
class Sparrow : Bird, IFlyable { public void Fly() { } }
class Penguin : Bird { } // no Fly method — no violation
```

---

## SOLID — Interface Segregation Principle (I)

> Don't force classes to implement methods they don't use.

```csharp
// Bad — Robot forced to implement Eat()
interface IWorker { void Work(); void Eat(); }
class Robot : IWorker {
    public void Work() { }
    public void Eat() { } // meaningless for Robot
}

// Good — split into focused interfaces
interface IWorkable { void Work(); }
interface IEatable { void Eat(); }
class Robot : IWorkable { public void Work() { } }
class Human : IWorkable, IEatable { public void Work() {} public void Eat() {} }
```

---

## SOLID — Dependency Inversion Principle (D)

> High-level modules should depend on abstractions, not concrete implementations.

```csharp
// Bad — tightly coupled to FileLogger
class OrderService {
    private FileLogger _logger = new FileLogger();
    public void PlaceOrder() => _logger.Log("Order placed");
}

// Good — depend on interface; DI container injects implementation
interface ILogger { void Log(string message); }
class FileLogger  : ILogger { public void Log(string msg) { /* write to file  */ } }
class AzureLogger : ILogger { public void Log(string msg) { /* write to Azure */ } }

class OrderService {
    private readonly ILogger _logger;
    public OrderService(ILogger logger) { _logger = logger; }
    public void PlaceOrder() => _logger.Log("Order placed");
}

builder.Services.AddScoped<ILogger, AzureLogger>();
```

---

## JWT — Authentication Flow End-to-End

```
1. Client → POST /api/auth/login { username, password }
2. Server validates credentials against Users DB
3. If valid → Server generates JWT signed with Secret Key
4. Server returns { accessToken, refreshToken } to client
5. Client stores token (HttpOnly cookie preferred for web)
6. Client sends: Authorization: Bearer <accessToken>
7. Server middleware validates: signature, expiry, claims
8. If valid → process request; if invalid → 401 Unauthorized
9. When accessToken expires → client sends refreshToken to /api/auth/refresh
10. Server validates refreshToken from DB → issues new accessToken
```

---

## JWT — Structure and Claims

```
Header.Payload.Signature
eyJ...  .eyJ...  .SfI...
```

- **Header** — algorithm + type (e.g. `{ "alg": "HS256", "typ": "JWT" }`).
- **Payload** — claims (user data). **Not encrypted — only signed.** Anyone can decode the payload.
- **Signature** — `HMACSHA256(base64url(header) + "." + base64url(payload), secret)`.

**Common claims:**

| Claim | Meaning |
|---|---|
| `sub` | Subject (User ID) |
| `iss` | Issuer |
| `aud` | Audience |
| `exp` | Expiration Time (Unix timestamp) |
| `iat` | Issued At |
| `jti` | JWT ID (for revocation) |

---

## JWT — Implementation in .NET Core

```csharp
// Generate JWT
private string GenerateToken(User user) {
    var tokenHandler = new JwtSecurityTokenHandler();
    var key = Encoding.ASCII.GetBytes(_config["Jwt:Key"]);
    var tokenDescriptor = new SecurityTokenDescriptor {
        Subject = new ClaimsIdentity(new[] {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        }),
        Expires = DateTime.UtcNow.AddMinutes(60),
        Issuer = _config["Jwt:Issuer"],
        Audience = _config["Jwt:Audience"],
        SigningCredentials = new SigningCredentials(
            new SymmetricSecurityKey(key),
            SecurityAlgorithms.HmacSha256Signature)
    };
    var token = tokenHandler.CreateToken(tokenDescriptor);
    return tokenHandler.WriteToken(token);
}

// Validate in Program.cs
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuer = true,
            ValidIssuer = config["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = config["Jwt:Audience"],
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(config["Jwt:Key"]))
        };
    });
```

---

## JWT — Refresh Token Strategy

- **Access token** — short-lived JWT (15–60 minutes), sent with every request.
- **Refresh token** — long-lived opaque token stored in DB, used only to issue new access tokens.
- On access token expiry → client silently calls `/auth/refresh` with the refresh token.
- Server validates the refresh token, **revokes it (rotation)**, and issues both a new access and a new refresh token.

```csharp
public class RefreshToken {
    public string Token { get; set; }       // stored securely in DB
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; }
    public int UserId { get; set; }
}

[HttpPost("refresh")]
public async Task<IActionResult> Refresh([FromBody] RefreshRequest req) {
    var stored = await _db.RefreshTokens
        .FirstOrDefaultAsync(t => t.Token == req.RefreshToken && !t.IsRevoked);
    if (stored == null || stored.ExpiresAt < DateTime.UtcNow)
        return Unauthorized();

    stored.IsRevoked = true;  // rotate: revoke old, issue new
    var user        = await _db.Users.FindAsync(stored.UserId);
    var newAccess   = GenerateToken(user);
    var newRefresh  = GenerateRefreshToken(user.Id);
    await _db.SaveChangesAsync();
    return Ok(new { AccessToken = newAccess, RefreshToken = newRefresh.Token });
}
```

---

## JWT — Best Practices

- Use **HTTPS** always — JWT payloads are base64-encoded, not encrypted.
- Store secrets in **Azure Key Vault** or environment variables.
- Keep access tokens **short-lived** (15–60 minutes).
- Use **refresh tokens** stored as `HttpOnly` cookies or securely in DB.
- Never store tokens in `localStorage` for sensitive apps (XSS risk).
- Implement **token revocation** via a blacklist or token family for refresh tokens.
- Always validate `exp`, `iss`, and `aud`.

---

## Generics — Why Use Them

- **Type safety** — compile-time errors instead of runtime `InvalidCastException`.
- **Performance** — avoids boxing / unboxing (huge gain for value types).
- **Reusability** — write once, use for any type.

---

## Generics — Classes and Methods

```csharp
public class Repository<T> {
    private readonly List<T> _items = new();
    public void Add(T item) => _items.Add(item);
    public List<T> GetAll() => _items;
    public T GetById(Func<T, bool> predicate) => _items.FirstOrDefault(predicate);
}

// Generic method
public static T GetFirst<T>(List<T> items) => items[0];

// Usage
var userRepo = new Repository<User>();
userRepo.Add(new User { Name = "Alice" });
var first = GetFirst(userRepo.GetAll());
```

---

## Generics — Interfaces

```csharp
public interface IRepository<T> {
    void Add(T entity);
    T GetById(int id);
    IEnumerable<T> GetAll();
}

public class UserRepository : IRepository<User> {
    public void Add(User user) { /* EF Core insert */ }
    public User GetById(int id) => _db.Users.Find(id);
    public IEnumerable<User> GetAll() => _db.Users.ToList();
}
```

---

## Generics — Constraints

```csharp
where T : class          // reference type only
where T : struct         // value type only
where T : new()          // must have parameterless constructor
where T : IDisposable    // must implement interface
where T : BaseEntity     // must inherit from class
where T : BaseEntity, IDisposable, new()  // multiple constraints
```

---

## Generics — Delegates

```csharp
Func<int, int>     square   = x => x * x;            // returns value
Action<string>     log      = Console.WriteLine;     // no return value
Predicate<int>     isEven   = n => n % 2 == 0;       // returns bool
EventHandler<OrderEventArgs> onOrder;                // event delegate
```

---

## Generics — Covariance and Contravariance

```csharp
// Covariance (out) — use more derived type than specified (read-only direction)
IEnumerable<string> strings = new List<string>();
IEnumerable<object> objects = strings; // OK — IEnumerable<out T>

// Contravariance (in) — use less derived type (write-only direction)
Action<object> logger = x => Console.WriteLine(x);
Action<string> strLogger = logger; // OK — Action<in T>
```

---

## Generics — Common Built-in Generic Types

| Type | Description |
|---|---|
| `List<T>` | Dynamic array |
| `Dictionary<TKey, TValue>` | Key-value pairs |
| `HashSet<T>` | Unique collection |
| `Queue<T>` | FIFO |
| `Stack<T>` | LIFO |
| `IEnumerable<T>` | Enumerable sequence |
| `Task<T>` | Asynchronous result |
| `Nullable<T>` | Value types that can be null |

---

## Threading — Thread (Real OS Thread)

```csharp
Thread t = new Thread(() => {
    Console.WriteLine("Running on dedicated thread");
});
t.IsBackground = true;   // won't prevent app exit
t.Priority = ThreadPriority.AboveNormal;
t.Start();
t.Join(); // block until thread finishes
```

**Use when:** you need low-level control — thread priority, foreground / background, apartment state for COM interop. Rare in modern .NET.

---

## Threading — Task (ThreadPool Abstraction)

```csharp
// Fire and forget (careful — exceptions are swallowed)
Task task = Task.Run(() => DoWork());

// With result
Task<int> calcTask = Task.Run(() => {
    Thread.Sleep(1000);
    return 42;
});
int result = await calcTask;
```

**Use `Task.Run` for CPU-bound work** to offload from the UI / request thread. Avoid it for I/O-bound work — use `async/await` instead.

---

## Threading — async/await (Non-Blocking I/O)

`async/await` is C#'s syntactic sugar over the Task-based Asynchronous Pattern. When you mark a method `async` and await a `Task`, the compiler rewrites it into a state machine. The thread is released back to the thread pool while waiting for the awaited operation — it does not block.

```csharp
public async Task<string> FetchDataAsync(string url) {
    using var client = new HttpClient();
    // Thread returned to pool while waiting for network
    string data = await client.GetStringAsync(url);
    return data;
}

// ConfigureAwait(false) — don't capture SynchronizationContext (use in libraries)
var data = await client.GetStringAsync(url).ConfigureAwait(false);

// Avoid async void — use async Task (except event handlers)
// Bad
public async void LoadData() { await FetchAsync(); }

// Good
public async Task LoadDataAsync() { await FetchAsync(); }
```

**Common mistakes:** using `.Result` or `.Wait()` which blocks the thread and can deadlock in ASP.NET; and not awaiting in a loop when you should use `Task.WhenAll` for parallel execution.

---

## Threading — Task.WhenAll vs Task.WhenAny

- **`Task.WhenAll`** — waits for all provided tasks to complete; returns an array of results. Use when operations are independent and you want them to run in parallel.
- **`Task.WhenAny`** — returns as soon as the first task completes. Use for timeout patterns (race a real task against `Task.Delay`) or "first successful result" from multiple sources.

```csharp
// WhenAll — parallel execution
await Task.WhenAll(
    SendEmailAsync(),
    UpdateDbAsync(),
    LogAsync()
);

// WhenAny — first one wins
var firstDone = await Task.WhenAny(task1, task2, task3);
```

At Ingenio I use `Task.WhenAll` in the advisor search pipeline to run multiple attribute scoring operations in parallel — cuts total latency from sum-of-sequential to the longest single operation.

---

## Threading — Thread vs Task vs async/await (Summary)

| | Thread | Task | async/await |
|---|---|---|---|
| Level | OS thread | ThreadPool abstraction | Compiler sugar over Task |
| Best for | Low-level control, COM | CPU-bound parallel work | I/O-bound operations |
| Blocks calling thread? | Yes (Join) | No (when awaited) | No |
| Return value | No direct support | `Task<T>` | `Task<T>` |
| Exception handling | `Thread.Join` + check | `.Result` throws AggregateException | Standard try / catch |

**Rule:**

- `async/await` for API calls, DB queries, file I/O, network ops.
- `Task.Run` for CPU-bound work to offload from the request / UI thread.
- `Thread` only when you need low-level control (rare in modern .NET).

---

## Angular — Application Flow (High Level)

```
User → Router → Guards → Lazy Loaded Module → Component → Service → Backend API
              (blocked/allowed)          (lifecycle hooks)  (HttpClient + Interceptors)
```

1. User interacts → Router matches URL to route config.
2. Guards validate access (auth, roles).
3. Lazy module loaded on demand.
4. Component initialised (lifecycle hooks triggered).
5. Service makes API call via `HttpClient`.
6. HTTP interceptor can modify request (add token, headers) and response (handle errors globally).
7. API returns data → component receives it.
8. Change detection updates the DOM.

---

## Angular — Lifecycle Hooks (Execution Order)

1. `ngOnChanges()` — when `@Input` changes (before init).
2. `ngOnInit()` — after component initialised (once).
3. `ngDoCheck()` — every change-detection cycle.
4. `ngAfterContentInit()` — after content projection init.
5. `ngAfterContentChecked()` — after content checked.
6. `ngAfterViewInit()` — after DOM init.
7. `ngAfterViewChecked()` — after view checked.
8. `ngOnDestroy()` — before destroy. **Always unsubscribe RxJS subscriptions here.**

---

## Angular — RxJS Common Operators

```typescript
obs$.pipe(map(x => x * 2));                                   // transform
obs$.pipe(filter(x => x > 0));                                // filter
searchTerm$.pipe(switchMap(term => api.search(term)));        // cancel previous
ids$.pipe(mergeMap(id => api.get(id)));                       // parallel
obs$.pipe(concatMap(id => api.get(id)));                      // sequential
obs$.pipe(exhaustMap(id => api.get(id)));                     // ignore until done
obs$.pipe(takeUntil(this.destroy$));                          // cleanup on destroy
```

---

## Angular — NgRx State Management

```typescript
// Action
const loadUsers        = createAction('[Users] Load');
const loadUsersSuccess = createAction('[Users] Load Success', props<{ users: User[] }>());

// Effect
loadUsers$ = createEffect(() => this.actions$.pipe(
    ofType(loadUsers),
    switchMap(() => this.api.getUsers().pipe(
        map(users => loadUsersSuccess({ users })),
        catchError(err => of(loadUsersFailed({ error: err })))
    ))
));

// Selector
const selectUsers = createSelector(selectUsersFeature, state => state.users);
```

---

## Entity Framework Core — Overview

Entity Framework Core is an ORM — it maps C# classes to database tables and lets you write LINQ queries instead of raw SQL. It handles migrations, change tracking, and relationship loading.

At Ingenio I've used EF Core for the Keen platform — models mapped to PostgreSQL tables, migrations managed via `dotnet ef migrations add`.

**Preferences I follow:**

- Prefer **explicit loading** or **projection** (`Select` into DTOs) over lazy loading — lazy loading can generate N+1 queries silently.
- For high-performance queries or complex joins, drop down to Dapper or raw SQL via `FromSqlRaw`.
- For specialised operations not in EF Core's expression tree (e.g. pgvector similarity search), use raw Npgsql commands.

EF Core is great for standard CRUD; reach for raw SQL when you need things EF can't express.

---

## HttpClient — Common Mistakes and Correct Usage

**Key rule:** do not create a new `HttpClient` per request — it does not release socket connections immediately and causes socket exhaustion under load.

The correct approach is **`IHttpClientFactory`** registered in DI, which manages pooling and lifetime. Named clients or typed clients are the cleanest patterns.

**Common mistakes:**

- Creating `HttpClient` in a `using` block — disposes the client but not the underlying socket immediately.
- Not setting timeouts — default is 100 seconds, too long for most APIs.
- Not handling transient HTTP errors with retry policies.

```csharp
// Typed client registration
builder.Services.AddHttpClient<IZendeskClient, ZendeskClient>(client => {
    client.BaseAddress = new Uri(config["Zendesk:BaseUrl"]);
    client.Timeout = TimeSpan.FromSeconds(10);
});
```

At Ingenio all external API calls — Iterable, Zendesk, Zinrelo, ContentStack — go through typed `HttpClient` registrations with Polly retry and circuit-breaker policies.

---

## Polly — Resilience for External Calls

Polly is a resilience library for .NET — adds retry, circuit breaker, timeout, bulkhead, and fallback policies to any code.

**Pattern I use at Ingenio:** register the typed `HttpClient` with `AddHttpClient` and chain `AddPolicyHandler` with:

- **Retry policy** — retry 3 times with exponential backoff on transient errors.
- **Circuit breaker** — open after 5 consecutive failures, reset after 30 seconds.

This means a slow or failing external API (e.g. Zendesk) does not cascade into our service — the circuit breaker opens and fails fast instead of queuing threads waiting on a timeout.

```csharp
builder.Services.AddHttpClient<IZendeskClient, ZendeskClient>()
    .AddPolicyHandler(HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(3, attempt =>
            TimeSpan.FromSeconds(Math.Pow(2, attempt))))
    .AddPolicyHandler(HttpPolicyExtensions
        .HandleTransientHttpError()
        .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30)));
```

The interview bot uses a simpler version — exponential-backoff retry on Groq 429 responses.

---

## Roadmap — .NET Roadmap 2026 *(coming soon)*

> This section is reserved for the .NET 2026 roadmap notes. Add content here when ready (release timeline, new C# language features, performance improvements, ASP.NET Core updates, EF Core updates, etc.).

---

## Strategy — KPMG Interview Preparation *(coming soon)*

> Reserved for the KPMG-specific interview prep notes (panel structure, technical rounds, behavioural focus areas, things to emphasise on the CV, common past questions).

---

## Scenarios — Scenario-Based Questions *(coming soon)*

> Reserved for scenario-based question walk-throughs (zero-downtime deployment, slow SQL query diagnosis, race conditions, cache invalidation strategies, distributed system failure modes, etc.).
