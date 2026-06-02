using System.Reflection;
using DbUp;
using DbUp.Engine;

namespace FirstTest.Api.Migrations;

public static class DatabaseMigrator
{
    /// <summary>
    /// Runs all pending DbUp migration scripts (embedded *.sql resources)
    /// against the target PostgreSQL database. Creates the database if missing.
    /// </summary>
    public static void Run(string connectionString, ILogger logger)
    {
        EnsureDatabase.For.PostgresqlDatabase(connectionString);

        var upgrader = DeployChanges.To
            .PostgresqlDatabase(connectionString)
            .WithScriptsEmbeddedInAssembly(Assembly.GetExecutingAssembly())
            .WithTransactionPerScript()
            .LogToConsole()
            .Build();

        DatabaseUpgradeResult result = upgrader.PerformUpgrade();

        if (!result.Successful)
        {
            logger.LogError(result.Error, "Database migration failed.");
            throw result.Error;
        }

        logger.LogInformation("Database migration completed successfully.");
    }
}
