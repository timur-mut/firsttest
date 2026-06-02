using System.Data;
using Npgsql;

namespace FirstTest.Api.Data;

public sealed class NpgsqlConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;

    public NpgsqlConnectionFactory(string connectionString)
        => _connectionString = connectionString;

    public IDbConnection CreateConnection() => new NpgsqlConnection(_connectionString);
}
