# Knowledge Base — Authoring Style Guide

> This file is **excluded from ingestion** (filename starts with `_`, and the slug is added to `ChunkMetadataHelper.ExcludedFilePatterns`). It documents the conventions every `.md` file in this folder should follow so the prep reader stays consistent and RAG search performs well.

---

## Why a convention?

- The chunker splits on `^## ` — **every `## ` heading becomes one DB row** in `knowledge_chunks` (one card in the prep UI). Headings shape the embeddings and the AI-generated question variants.
- The prep reader (`MarkdownBody.tsx`) renders markdown properly: bold, code blocks, tables, blockquotes, lists. Authors can use real markdown — no need to write plain text.
- Consistency makes the prep UI scannable on mobile and helps Groq generate cleaner question variants at ingest time.

---

## The 5 rules

### 1. Heading shape: `## Category — Topic or Question`

Use an **em dash** (`—`, not hyphen `-`) between category and question. The category prefix groups related cards in the sidebar. The question/topic half should read like the actual interviewer prompt because it is embedded and matched against the user's query.

```md
## C# Core — Value Types vs Reference Types
## SQL Server — Clustered vs Non-Clustered Index
## Leadership — Time I Led a Cross-Team Migration
## HR — Tell Me About Yourself
```

**Don't** use `# h1`, `### h3`, or no prefix:

```md
# C# Core (h1 is ignored by chunker)
### Records (too deep — not chunked)
## What is dependency injection? (no category — harder to scan)
```

### 2. Open with a one-line lead

Each card starts with **either** a bold lead line **or** a blockquote summary. This gives mobile readers the TL;DR before they scroll and gives Groq a clean anchor for question variants.

```md
## C# Core — Records vs Classes

**Quick rule:** Use `record` for value-based equality and immutability; `class` for entities with identity and mutable state.

…rest of the answer…
```

Or:

```md
## Leadership — Handling Conflict in a Team

> I treat conflict as a signal, not a problem. The goal is to surface the disagreement early and move toward a decision the team owns.

…rest of the answer…
```

### 3. Code examples in fenced blocks with a language tag

The reader shows a language badge in the top-right corner of code blocks (`CSHARP`, `SQL`, `YAML`, `TYPESCRIPT`, `JSX`, `BASH`). Without the tag the badge is missing.

````md
```csharp
public record UserDto(int Id, string Name);
```

```sql
SELECT * FROM Users WHERE Id = @id;
```
````

Inline code uses single backticks: `IEnumerable<T>`, `Task.WhenAll`.

### 4. Highlight important facts; use lists for enumerations

- **Bold** rules, definitions, and key terms (`**Quick rule:** …`, `**Use when:** …`).
- Bullet lists for items at the same level of importance.
- Numbered lists for sequences or steps.
- Tables (max 3–4 columns) for genuine comparisons. The reader puts wide tables in a horizontally scrollable container, but narrow tables read better on mobile.

```md
**Use `record` for:** DTOs, query results, domain events.
**Use `class` for:** entities with identity, mutable state.

| Feature | record | class |
|---|---|---|
| Equality | Value-based | Reference-based |
| Default mutability | Immutable | Mutable |
```

### 5. Section structure inside a card

A typical card has 3 movements: **lead → body → optional code**.

```md
## Category — Topic

**Lead in one line.**

Short paragraph or bullets explaining the concept.

Practical note ("I use this at Ingenio for…") — optional, but adds interview signal.

```csharp
// concrete example
```
```

Keep cards **self-contained**. Don't write "see the X card" — anchor links don't render in the reader. Inline what's needed.

---

## What the chunker enforces

Regardless of formatting, ingestion will:

| Rule | Effect |
|---|---|
| Split on `^## ` | New chunk per `##` heading |
| Drop content above first `##` | Top-of-file intros / TOCs are not indexed |
| Drop chunks with body < 30 chars | Skeleton sections silently disappear |
| Strip the `"Topic: X\nSection: Y\n\n"` prefix at read time | The prep UI never shows the ingestion metadata header |

This means your formatting choices below `##` are **purely for human + LLM readability** — the chunker doesn't care about them. You can use any valid markdown.

---

## What it should NOT look like

- ❌ A wall of plain text with no bold, no bullets, no code blocks. Adds nothing the chunker can use to rank, and is unreadable on mobile.
- ❌ Code without a language tag. Loses the language badge in the UI.
- ❌ Cross-section anchor links (`[see this](#refresh-token-strategy)`). The reader doesn't parse anchors — the link renders but does nothing.
- ❌ More than ~4 columns in a table on a card you expect to read on a phone. The horizontal scroll works but the experience is worse than a bullet list.
- ❌ Section heading without the category prefix. Makes the sidebar harder to scan.

---

## Excluding a file from ingestion

Two ways:

1. **Prefix with underscore** (`_STYLE.md`, `_DRAFT.md`) and add the prefix or filename slug to `ChunkMetadataHelper.ExcludedFilePatterns`.
2. Add a unique substring of the filename (e.g. `dotnet-interview-prep-v2`) to the same array.

Both are at [interview-bot-api/Services/ChunkMetadataHelper.cs](../Services/ChunkMetadataHelper.cs#L27-L47).

---

## After editing any `.md` file

Re-ingest the knowledge base — there is no incremental update. The whole `knowledge_chunks` table is `TRUNCATE`d and rebuilt.

```bash
curl -X POST http://localhost:5267/api/ingest -H "X-Admin-Key: <key>"
```

This takes ~5 minutes for ~130 chunks because each chunk runs through HuggingFace (3 embeddings) and Groq (5 question variants).
