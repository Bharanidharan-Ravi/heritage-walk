using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace ArchaeoTrails.Api.Debugging
{
    /// <summary>
    /// "Debug" mode: turns bare 401/403 responses and unhandled exceptions into
    /// JSON bodies that say what actually went wrong (missing header, expired
    /// token, wrong role, stack trace, ...). Enabled by Debug:DetailedErrors=true
    /// (set in appsettings.Development.json / user-secrets). Never enable in
    /// production — the bodies leak internals.
    /// </summary>
    public static class DebugErrors
    {
        private const string AuthFailureKey = "Debug.AuthFailure";

        private static readonly JsonSerializerOptions Json = new() { WriteIndented = true };

        public static bool IsEnabled(IConfiguration config) =>
            config.GetValue<bool>("Debug:DetailedErrors");

        /// <summary>Hooks the JWT events so 401/403 explain themselves. Call inside AddJwtBearer.</summary>
        public static void Attach(JwtBearerEvents events, bool enabled)
        {
            if (!enabled) return;

            events.OnAuthenticationFailed = context =>
            {
                context.HttpContext.Items[AuthFailureKey] = context.Exception.GetType().Name + ": " + context.Exception.Message;
                return Task.CompletedTask;
            };

            events.OnChallenge = async context =>
            {
                context.HandleResponse();
                var request = context.HttpContext.Request;
                var header = request.Headers.Authorization.ToString();
                context.HttpContext.Items.TryGetValue(AuthFailureKey, out var failure);

                string reason =
                    string.IsNullOrEmpty(header) ? "No Authorization header was sent. In Swagger click Authorize and paste the token from POST /api/auth/login." :
                    !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) ? "Authorization header is present but does not start with 'Bearer '." :
                    failure is not null ? "Token was rejected." :
                    "Token could not be authenticated.";

                await Write(context.HttpContext, 401, new
                {
                    status = 401,
                    error = "Unauthorized",
                    reason,
                    authorizationHeaderPresent = !string.IsNullOrEmpty(header),
                    tokenFailure = failure,
                    jwtError = context.Error,
                    jwtErrorDescription = context.ErrorDescription,
                    method = request.Method,
                    path = request.Path.Value
                });
            };

            events.OnForbidden = async context =>
            {
                var user = context.HttpContext.User;
                await Write(context.HttpContext, 403, new
                {
                    status = 403,
                    error = "Forbidden",
                    reason = "Authenticated, but the account's role is not allowed on this endpoint.",
                    user = user.Identity?.Name,
                    roles = user.FindAll(ClaimTypes.Role).Select(c => c.Value),
                    path = context.HttpContext.Request.Path.Value
                });
            };
        }

        /// <summary>Catches unhandled exceptions and returns type, message, inner exceptions and stack trace.</summary>
        public static void UseDebugExceptions(this WebApplication app)
        {
            app.Use(async (context, next) =>
            {
                try
                {
                    await next();
                }
                catch (Exception ex)
                {
                    app.Logger.LogError(ex, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);
                    if (context.Response.HasStarted) throw;
                    context.Response.Clear();
                    await Write(context, 500, new
                    {
                        status = 500,
                        error = ex.GetType().FullName,
                        message = ex.Message,
                        innerExceptions = Inner(ex),
                        stackTrace = ex.StackTrace,
                        method = context.Request.Method,
                        path = context.Request.Path.Value
                    });
                }
            });
        }

        private static IEnumerable<string> Inner(Exception ex)
        {
            for (var e = ex.InnerException; e is not null; e = e.InnerException)
                yield return e.GetType().FullName + ": " + e.Message;
        }

        private static Task Write(HttpContext context, int status, object body)
        {
            context.Response.StatusCode = status;
            context.Response.ContentType = "application/json";
            return context.Response.WriteAsync(JsonSerializer.Serialize(body, Json));
        }
    }
}
