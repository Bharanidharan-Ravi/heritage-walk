using ArchaeoTrails.Application.Features.Contact;
using ArchaeoTrails.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ArchaeoTrails.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ContactController : ControllerBase
    {
        private readonly IEmailService _emailService;

        // Inject the interface, NOT the concrete class
        public ContactController(IEmailService emailService)
        {
            _emailService = emailService;
        }

        [HttpPost("send")]
        public IActionResult SendEmail([FromBody] ContactRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.UserEmail) || string.IsNullOrWhiteSpace(request.Message))
            {
                return BadRequest(new { status = "error", message = "Invalid form data." });
            }

            // FIRE AND FORGET: 
            // We start the email process on a background thread but do NOT 'await' it.
            _ = Task.Run(() => _emailService.SendContactEmailAsync(request));

            // Instantly return a 200 OK to the React frontend
            return Ok(new { status = "success" });
        }
    }
}
