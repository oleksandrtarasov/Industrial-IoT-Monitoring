namespace IndustrialIoT.Web.Auth;

public class JwtSettings
{
    public string Issuer { get; set; } = default!;
    public string Audience { get; set; } = default!;
    public string Key { get; set; } = default!;
    public int AccessTokenMinutes { get; set; } = 60;

    public List<DemoUser> DemoUsers { get; set; } = new();
    public class DemoUser { public string Username { get; set; } = ""; public string Password { get; set; } = ""; public string Role { get; set; } = "Viewer"; }
}
