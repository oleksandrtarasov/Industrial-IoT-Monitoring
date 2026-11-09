using IndustrialIoT.Application.Commands;
using IndustrialIoT.Application.Measurements;
using IndustrialIoT.Infrastructure;
using IndustrialIoT.Infrastructure.Commands;
using IndustrialIoT.Infrastructure.Measurements;
using IndustrialIoT.Infrastructure.Seeding;
using IndustrialIoT.Web.Auth;
using IndustrialIoT.Web.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// DB
var conn = builder.Configuration.GetConnectionString("Default")
           ?? throw new InvalidOperationException(
               "ConnectionStrings:Default must be configured outside source control.");
builder.Services.AddDbContext<AppDbContext>(opt => opt.UseNpgsql(conn));

builder.Services.AddScoped<IMeasurementService, MeasurementService>();
builder.Services.AddScoped<ICommandService, CommandService>();

// Settings
var jwtSection = builder.Configuration.GetSection("Jwt");
builder.Services
    .AddOptions<CommandExecutionSettings>()
    .Bind(builder.Configuration.GetSection("CommandExecution"))
    .Validate(settings => settings.PollIntervalSeconds > 0, "PollIntervalSeconds must be greater than zero.")
    .Validate(settings => settings.BatchSize > 0, "BatchSize must be greater than zero.")
    .Validate(settings => settings.MaxAttempts > 0, "MaxAttempts must be greater than zero.")
    .Validate(settings => settings.BaseBackoffSeconds > 0, "BaseBackoffSeconds must be greater than zero.")
    .Validate(settings => settings.ExecutionTimeoutSeconds > 0, "ExecutionTimeoutSeconds must be greater than zero.")
    .ValidateOnStart();

builder.Services.Configure<JwtSettings>(jwtSection);
var jwtSettings = jwtSection.Get<JwtSettings>()
    ?? throw new InvalidOperationException("Jwt configuration is required.");

if (string.IsNullOrWhiteSpace(jwtSettings.Issuer) ||
    string.IsNullOrWhiteSpace(jwtSettings.Audience))
{
    throw new InvalidOperationException("Jwt issuer and audience must be configured.");
}

if (string.IsNullOrWhiteSpace(jwtSettings.Key) ||
    Encoding.UTF8.GetByteCount(jwtSettings.Key) < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key must be configured outside source control and contain at least 32 bytes.");
}

if (jwtSettings.DemoUsers.Count == 0 ||
    jwtSettings.DemoUsers.Any(user =>
        string.IsNullOrWhiteSpace(user.Username) ||
        string.IsNullOrWhiteSpace(user.Password) ||
        string.IsNullOrWhiteSpace(user.Role)))
{
    throw new InvalidOperationException(
        "Every demo user must have a username, password, and role configured.");
}

// JWT
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("OperatorOnly", p => p.RequireRole("Operator"));
    options.AddPolicy("ViewerOrOperator", p => p.RequireRole("Viewer", "Operator"));
});

// JWT service
builder.Services.AddSingleton(jwtSettings);
builder.Services.AddSingleton<IJwtService, JwtService>();

// Swagger security
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "IndustrialIoT API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Wpisz: Bearer {twój token JWT}"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.Configure<ModbusSettings>(
    builder.Configuration.GetSection("Modbus"));

builder.Services.AddHostedService<ModbusPollingService>();
builder.Services.AddHostedService<CommandExecutorHostedService>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await DataSeeder.SeedAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
