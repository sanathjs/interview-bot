# .NET Experience

## How Long & What Versions
I have been working with .NET for 10+ years.
Started with .NET Framework in early career (2012), progressed through .NET Core, and now work with modern .NET versions.
I am a Microsoft Certified Solutions Developer.

## What I Build With .NET
- REST APIs using ASP.NET Core Web API
- Background services using Worker Services / Hosted Services
- Microservices architecture
- Full-stack applications combining .NET backend with React/Next.js frontend

## My Strongest .NET Areas
- Web API design and best practices
- Entity Framework Core (code first, migrations, query optimization)
- Dependency Injection and clean architecture
- Middleware and filters
- Performance optimization (async/await, caching, profiling)
- SQL Server integration and query optimization

## Design Patterns I Use Regularly
- Repository pattern
- CQRS with MediatR
- Factory pattern
- Microservice architecture patterns
- Monolithic architecture (when appropriate)

## Key Concepts I Know Well

### async/await
I use async/await for all I/O bound operations.
Avoid async void (except event handlers), use ConfigureAwait(false) in libraries.

### Dependency Injection
.NET has built-in DI. I register services as Singleton, Scoped, or Transient
depending on their lifetime. Scoped per HTTP request is most common.

### Middleware Pipeline
Request goes through middleware in order. I have written custom middleware for
logging, exception handling, and request correlation IDs.

### Cloud & DevOps with .NET
I deploy .NET applications to Microsoft Azure, and manage CI/CD pipelines
using TeamCity and Azure DevOps. I use GitHub for source control.

## Tools & Platforms Alongside .NET
- Splunk for centralized logging
- Mixpanel for event tracking
- Zendesk for support platform integration
- Content Stack as CMS
- SQL Server as primary database
- REST APIs for all service communication
