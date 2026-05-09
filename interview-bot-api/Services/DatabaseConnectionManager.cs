using Npgsql;
using Pgvector.Npgsql;

namespace interview_bot_api.Services;

/// <summary>
/// Manages primary (Supabase) and fallback (Neon) database connections.
/// Automatically switches to fallback when primary is unreachable,
/// and retries primary after a 5-minute cooldown.
/// </summary>
public class DatabaseConnectionManager
{
    private readonly string _primaryConnStr;
    private readonly string? _fallbackConnStr;
    private readonly ILogger<DatabaseConnectionManager> _logger;

    private volatile bool _usingFallback;
    private DateTime _retryPrimaryAt = DateTime.MinValue;

    public bool HasFallback => !string.IsNullOrEmpty(_fallbackConnStr);
    public bool IsUsingFallback => _usingFallback;
    public string ActiveDb => _usingFallback ? "fallback (Neon)" : "primary (Supabase)";

    public DatabaseConnectionManager(
        IConfiguration config,
        ILogger<DatabaseConnectionManager> logger)
    {
        _primaryConnStr = config["DATABASE_URL"]!;
        _fallbackConnStr = config["FALLBACK_DATABASE_URL"]; // null = no fallback configured
        _logger = logger;
    }

    /// <summary>
    /// Opens a connection, falling back to the secondary DB on failure.
    /// Returns a DbConnection that disposes both the connection and data source.
    /// </summary>
    public async Task<DbConnection> OpenConnectionAsync()
    {
        // After 5-min cooldown, optimistically try primary again
        if (_usingFallback && DateTime.UtcNow >= _retryPrimaryAt)
        {
            _logger.LogInformation("Retrying primary DB after cooldown");
            _usingFallback = false;
        }

        var connStr = _usingFallback ? _fallbackConnStr! : _primaryConnStr;

        try
        {
            var ds = BuildDataSource(connStr);
            var conn = await ds.OpenConnectionAsync();
            return new DbConnection(ds, conn);
        }
        catch (Exception ex) when (HasFallback && !_usingFallback)
        {
            _logger.LogWarning(ex,
                "Primary DB (Supabase) unreachable — switching to fallback (Neon) for 5 min");
            _usingFallback = true;
            _retryPrimaryAt = DateTime.UtcNow.AddMinutes(5);

            var fallbackDs = BuildDataSource(_fallbackConnStr!);
            var fallbackConn = await fallbackDs.OpenConnectionAsync();
            return new DbConnection(fallbackDs, fallbackConn);
        }
    }

    /// <summary>Lightweight SELECT 1 probe used by /health and /ping.</summary>
    public async Task<string?> ProbeAsync()
    {
        try
        {
            await using var db = await OpenConnectionAsync();
            await using var cmd = new NpgsqlCommand("SELECT 1", db.Connection);
            await cmd.ExecuteScalarAsync();
            return null; // success
        }
        catch (Exception ex)
        {
            return ex.Message;
        }
    }

    private static NpgsqlDataSource BuildDataSource(string connStr)
    {
        var builder = new NpgsqlDataSourceBuilder(connStr);
        builder.UseVector();
        return builder.Build();
    }
}

/// <summary>
/// Disposable wrapper that owns both the NpgsqlDataSource and NpgsqlConnection.
/// Dispose this to properly clean up both.
/// </summary>
public sealed class DbConnection : IAsyncDisposable
{
    public NpgsqlConnection Connection { get; }
    private readonly NpgsqlDataSource _dataSource;

    internal DbConnection(NpgsqlDataSource ds, NpgsqlConnection conn)
    {
        _dataSource = ds;
        Connection = conn;
    }

    public async ValueTask DisposeAsync()
    {
        await Connection.DisposeAsync();
        await _dataSource.DisposeAsync();
    }
}
