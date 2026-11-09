# Industrial IoT Monitoring

## Local secrets

The web application requires a PostgreSQL connection string, a JWT signing key,
and passwords for its development users. Keep these values outside source
control with the ASP.NET Core Secret Manager:

```bash
dotnet user-secrets set "ConnectionStrings:Default" "<connection-string>" --project IndustrialIoT.Web
dotnet user-secrets set "Jwt:Key" "$(openssl rand -base64 48)" --project IndustrialIoT.Web
dotnet user-secrets set "Jwt:DemoUsers:0:Password" "<operator-password>" --project IndustrialIoT.Web
dotnet user-secrets set "Jwt:DemoUsers:1:Password" "<viewer-password>" --project IndustrialIoT.Web
```

User Secrets are for local development only. Configure production secrets with
the deployment platform's secret manager or environment variables.
