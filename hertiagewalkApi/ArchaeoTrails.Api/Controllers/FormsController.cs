using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Forms;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Domain.Constants;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace ArchaeoTrails.Api.Controllers
{
    /// <summary>
    /// Pay-to-submit form generator, plus admin/employee-only management
    /// endpoints. See docs/form-generator/MASTER_PROMPT.md for the full spec
    /// and what's still stubbed (Razorpay + QR generation are fake until
    /// their NuGet packages + keys are added).
    /// </summary>
    [ApiController]
    [Route("api/forms")]
    public class FormsController : ControllerBase
    {
        private readonly IFormTemplateRepository _formTemplateRepository;
        private readonly IFormSubmissionRepository _formSubmissionRepository;
        private readonly IPaymentService _paymentService;
        private readonly IQrCodeService _qrCodeService;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;

        public FormsController(
            IFormTemplateRepository formTemplateRepository,
            IFormSubmissionRepository formSubmissionRepository,
            IPaymentService paymentService,
            IQrCodeService qrCodeService,
            IEmailService emailService,
            IConfiguration configuration)
        {
            _formTemplateRepository = formTemplateRepository;
            _formSubmissionRepository = formSubmissionRepository;
            _paymentService = paymentService;
            _qrCodeService = qrCodeService;
            _emailService = emailService;
            _configuration = configuration;
        }

        // POST /api/forms  (Admin/Employee only)
        [HttpPost]
        [Authorize(Roles = Roles.StaffPolicy)]
        public async Task<IActionResult> CreateForm([FromBody] CreateFormTemplateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title) || request.Fields.Count == 0)
            {
                return BadRequest(new { status = "error", message = "Title and at least one field are required." });
            }

            var slug = Slugify(request.Title) + "-" + Guid.NewGuid().ToString("N")[..6];

            var template = new FormTemplate
            {
                Title = request.Title,
                Slug = slug,
                FieldsJson = JsonSerializer.Serialize(request.Fields),
                Price = request.Price,
                Currency = request.Currency
            };

            await _formTemplateRepository.CreateAsync(template);

            return Ok(new { status = "success", slug = template.Slug });
        }

        // GET /api/forms/{slug}  (public)
        [HttpGet("{slug}")]
        public async Task<IActionResult> GetForm(string slug)
        {
            var template = await _formTemplateRepository.GetBySlugAsync(slug);
            if (template is null) return NotFound();

            var dto = new FormDto
            {
                Title = template.Title,
                Slug = template.Slug,
                Fields = JsonSerializer.Deserialize<System.Collections.Generic.List<FormFieldDefinition>>(template.FieldsJson) ?? new(),
                Price = template.Price,
                Currency = template.Currency
            };

            return Ok(dto);
        }

        // GET /api/forms/{slug}/qr  (public) — TODO(form-generator): stubbed, returns an empty PNG until QRCoder is wired up.
        [HttpGet("{slug}/qr")]
        public async Task<IActionResult> GetQrCode(string slug)
        {
            var template = await _formTemplateRepository.GetBySlugAsync(slug);
            if (template is null) return NotFound();

            var siteUrl = _configuration["PublicSiteUrl"] ?? "https://archaeotrails.com";
            var formUrl = $"{siteUrl}/forms/{template.Slug}";

            var png = _qrCodeService.GeneratePng(formUrl);
            return File(png, "image/png");
        }

        // POST /api/forms/{slug}/order  (public)
        [HttpPost("{slug}/order")]
        public async Task<IActionResult> CreateOrder(string slug, [FromBody] CreateOrderRequest _)
        {
            var template = await _formTemplateRepository.GetBySlugAsync(slug);
            if (template is null) return NotFound();

            // Price is authoritative from the server-stored FormTemplate — never
            // accept an amount from the client here.
            var orderId = await _paymentService.CreateOrderAsync(template.Price, template.Currency);

            return Ok(new CreateOrderResponse
            {
                OrderId = orderId,
                Amount = template.Price,
                Currency = template.Currency,
                RazorpayKeyId = _configuration["Razorpay:KeyId"] ?? string.Empty
            });
        }

        // POST /api/forms/{slug}/submit  (public)
        [HttpPost("{slug}/submit")]
        public async Task<IActionResult> SubmitForm(string slug, [FromBody] SubmitFormRequest request)
        {
            var template = await _formTemplateRepository.GetBySlugAsync(slug);
            if (template is null) return NotFound();

            // THE ONLY SOURCE OF TRUTH for "did they pay" — never trust the
            // client's mere presence of a payment id as success.
            var isVerified = _paymentService.VerifySignature(
                request.RazorpayOrderId, request.RazorpayPaymentId, request.RazorpaySignature);

            if (!isVerified)
            {
                return BadRequest(new SubmitFormResponse
                {
                    Success = false,
                    Message = "Payment could not be verified."
                });
            }

            var submission = new FormSubmission
            {
                FormTemplateId = default, // set below once template.Id is known
                DataJson = JsonSerializer.Serialize(request.FormData),
                SubmitterName = request.SubmitterName,
                SubmitterEmail = request.SubmitterEmail,
                AmountPaid = template.Price,
                Currency = template.Currency,
                RazorpayOrderId = request.RazorpayOrderId,
                RazorpayPaymentId = request.RazorpayPaymentId,
                Status = SubmissionStatus.Paid
            };
            submission.FormTemplateId = template.Id;

            await _formSubmissionRepository.CreateAsync(submission);

            // Fire-and-forget, same pattern as ContactController — the caller
            // shouldn't wait on SMTP, and a failed email must not undo the
            // already-saved, already-paid submission.
            _ = Task.Run(() => _emailService.SendFormSubmissionOwnerEmailAsync(template, submission));
            _ = Task.Run(() => _emailService.SendFormSubmissionConfirmationEmailAsync(template, submission));

            return Ok(new SubmitFormResponse { Success = true, SubmissionId = submission.Id });
        }

        // GET /api/forms  (Admin/Employee only) — every template incl. inactive.
        [HttpGet]
        [Authorize(Roles = Roles.StaffPolicy)]
        public async Task<IActionResult> ListForms()
        {
            var templates = await _formTemplateRepository.GetAllAsync();
            var result = new List<AdminFormListItemDto>(templates.Count);

            foreach (var template in templates)
            {
                var submissions = await _formSubmissionRepository.GetByTemplateIdAsync(template.Id);
                result.Add(new AdminFormListItemDto
                {
                    Id = template.Id,
                    Title = template.Title,
                    Slug = template.Slug,
                    Price = template.Price,
                    Currency = template.Currency,
                    IsActive = template.IsActive,
                    CreatedAt = template.CreatedAt,
                    SubmissionCount = submissions.Count
                });
            }

            return Ok(result);
        }

        // PUT /api/forms/{id}/status  (Admin/Employee only) — activate/deactivate a form.
        [HttpPut("{id:guid}/status")]
        [Authorize(Roles = Roles.StaffPolicy)]
        public async Task<IActionResult> UpdateFormStatus(Guid id, [FromBody] UpdateFormStatusRequest request)
        {
            var template = await _formTemplateRepository.GetByIdAsync(id);
            if (template is null) return NotFound();

            template.IsActive = request.IsActive;
            await _formTemplateRepository.UpdateAsync(template);

            return Ok(new { status = "success" });
        }

        // GET /api/forms/{id}/submissions  (Admin/Employee only)
        [HttpGet("{id:guid}/submissions")]
        [Authorize(Roles = Roles.StaffPolicy)]
        public async Task<IActionResult> ListSubmissions(Guid id)
        {
            var template = await _formTemplateRepository.GetByIdAsync(id);
            if (template is null) return NotFound();

            var submissions = await _formSubmissionRepository.GetByTemplateIdAsync(id);
            var result = submissions.Select(s => new AdminFormSubmissionDto
            {
                Id = s.Id,
                FormData = JsonSerializer.Deserialize<Dictionary<string, string>>(s.DataJson) ?? new(),
                SubmitterName = s.SubmitterName,
                SubmitterEmail = s.SubmitterEmail,
                AmountPaid = s.AmountPaid,
                Currency = s.Currency,
                Status = s.Status.ToString(),
                CreatedAt = s.CreatedAt
            });

            return Ok(result);
        }

        private static string Slugify(string title) =>
            new string(title.ToLowerInvariant().Select(c => char.IsLetterOrDigit(c) ? c : '-').ToArray())
                .Trim('-');
    }
}
