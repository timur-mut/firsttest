using FirstTest.Api.Data;
using FirstTest.Api.Endpoints;
using FirstTest.Api.Migrations;

var builder = WebApplication.CreateBuilder(args);

// --- Configuration ---------------------------------------------------------
var connectionString = builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException(
        "Connection string 'Postgres' is not configured.");

// --- Services --------------------------------------------------------------
builder.Services.AddSingleton<IDbConnectionFactory>(
    _ => new NpgsqlConnectionFactory(connectionString));
builder.Services.AddScoped<ITodoRepository, TodoRepository>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

const string CorsPolicy = "ClientCors";
builder.Services.AddCors(options =>
    options.AddPolicy(CorsPolicy, policy =>
    {
        var origins = builder.Configuration["Cors:AllowedOrigins"]?
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            ?? ["http://localhost:5173"];
        policy.WithOrigins(origins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    }));

var app = builder.Build();

// --- Run database migrations on startup ------------------------------------
if (builder.Configuration.GetValue("RunMigrationsOnStartup", true))
{
    DatabaseMigrator.Run(connectionString, app.Logger);
}

// --- Pipeline --------------------------------------------------------------
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(CorsPolicy);

app.MapGet("/health", () => Results.Ok(new { status = "healthy" }))
   .WithTags("System");

app.MapTodoEndpoints();

app.Run();
