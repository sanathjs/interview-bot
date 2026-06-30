# .NET Experience

## .NET Experience — How Long and What Versions

> **12+ years working with .NET.**

- **Started** with .NET Framework in early career (2012).
- **Progressed** through .NET Core (2.x, 3.x).
- **Now working with** modern .NET (.NET 6, 7, 8).
- **Certification:** Microsoft Certified Solutions Developer.

## .NET Experience — What I Build with .NET

**The shapes of services I ship most often.**

- **REST APIs** using ASP.NET Core Web API
- **Background services** using Worker Services / Hosted Services
- **Microservices** architecture (multiple services behind an API gateway)
- **Full-stack applications** combining .NET backend with React / Next.js frontend

## .NET Experience — My Strongest .NET Areas

**Where I am most confident in a technical interview.**

- **Web API design** and REST best practices
- **Entity Framework Core** — code-first, migrations, query optimisation
- **Dependency Injection** and clean architecture
- **Middleware and filters** — custom pipelines for cross-cutting concerns
- **Performance optimisation** — `async`/`await`, caching, profiling
- **SQL Server** integration and query optimisation

## .NET Experience — Design Patterns I Use Regularly

**Patterns I reach for by default.**

- **Repository pattern** — encapsulate data access behind an interface
- **CQRS with MediatR** — split commands and queries cleanly
- **Factory pattern** — defer construction of complex objects
- **Microservice architecture** patterns (when scale demands it)
- **Monolithic architecture** — when the problem is small enough that microservices add cost without benefit

## .NET Experience — Key Concepts I Use Daily

> A quick tour of the .NET concepts I lean on every single sprint.

**`async` / `await`**

- I use `async` / `await` for **all I/O-bound operations** (DB calls, HTTP calls, file I/O).
- **Avoid `async void`** (except for event handlers).
- Use `ConfigureAwait(false)` in **libraries** to skip capturing the synchronisation context.

**Dependency Injection**

- .NET has built-in DI via `IServiceCollection`.
- I register services as **Singleton**, **Scoped**, or **Transient** depending on lifetime.
- **Scoped per HTTP request** is the most common choice (DbContext, unit-of-work).

**Middleware Pipeline**

- Request flows through middleware **in registration order**.
- I have written **custom middleware** for logging, exception handling, and request correlation IDs.

**Cloud & DevOps**

- Deploy .NET applications to **Microsoft Azure**.
- Manage CI/CD pipelines using **TeamCity** and **Azure DevOps**.
- Use **GitHub** for source control.

## .NET Experience — Tools and Platforms Alongside .NET

**Stack I integrate with daily at Ingenio.**

- **Splunk** — centralised logging
- **Mixpanel** — event tracking and product analytics
- **Zendesk** — support platform integration
- **Contentstack** — headless CMS
- **SQL Server** — primary OLTP database
- **REST APIs** — default service-to-service communication
