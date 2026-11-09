using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using IndustrialIoT.Web.Auth;

namespace IndustrialIoT.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IOptions<JwtSettings> jwtOptions, IJwtService jwt) : ControllerBase
{
    [HttpPost("login")]
    public ActionResult<object> Login([FromBody] LoginRequest req)
    {
        var settings = jwtOptions.Value;

        var user = settings.DemoUsers.FirstOrDefault(u =>
            string.Equals(u.Username, req.Username, StringComparison.OrdinalIgnoreCase) &&
            u.Password == req.Password);

        if (user is null)
            return Unauthorized(new { error = "Invalid credentials" });

        var token = jwt.CreateToken(user.Username, user.Role);
        return Ok(new { access_token = token, role = user.Role });
    }
}
