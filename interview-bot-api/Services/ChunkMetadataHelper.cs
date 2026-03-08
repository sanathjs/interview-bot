// ─────────────────────────────────────────────────────────────────────────────
// Add this static helper class anywhere in the Services folder
// File: Services/ChunkMetadataHelper.cs
// ─────────────────────────────────────────────────────────────────────────────

namespace interview_bot_api.Services;

public static class ChunkMetadataHelper
{
    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "what","the","is","are","was","were","and","or","in","of",
        "to","for","a","an","be","been","have","has","had","do",
        "does","did","how","why","when","where","which","who",
        "that","this","these","those","with","from","by","on",
        "at","its","it","you","your","we","our","they","their",
        "can","could","would","should","will","not","but","any",
        "all","use","used","using","between","difference","about"
    };

    /// <summary>
    /// Derives a clean topic name from the source file name.
    /// "dotnet-interview-qa.md" → "dotnet-interview-qa"
    /// "ai-rag.md"              → "ai-rag"
    /// "career-journey.md"      → "career-journey"
    /// </summary>
    public static string ExtractTopic(string sourceFile)
    {
        return Path.GetFileNameWithoutExtension(sourceFile).ToLower();
    }

    /// <summary>
    /// Extracts keyword tags from a section heading.
    /// "What is the difference between var and dynamic in C#?"
    /// → ["var", "dynamic", "c#"]
    ///
    /// Also includes meaningful words from the first line of chunk text
    /// so even short headings get good coverage.
    /// </summary>
    public static string[] ExtractTags(string sectionTitle, string chunkText)
    {
        // Combine heading + first line of chunk for richer tag coverage
        var firstLine = chunkText.Split('\n').FirstOrDefault() ?? "";
        var source    = $"{sectionTitle} {firstLine}";

        var tags = source
            .ToLower()
            // Replace punctuation with spaces, keep # for C#
            .Replace("c#", "csharp")
            .Replace(".net", "dotnet")
            // Split on non-alphanumeric except hyphen
            .Split(new[] { ' ', '?', '.', ',', '(', ')', '/', '\'', '"', ':', ';', '!' },
                   StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 1)                       // keep "c#" → "csharp" (7 chars), skip single chars
            .Where(w => !StopWords.Contains(w))             // remove stop words
            .Where(w => !w.All(char.IsDigit))               // remove pure numbers
            .Distinct()
            .Take(20)                                        // cap at 20 tags per chunk
            .ToArray();

        return tags;
    }
}