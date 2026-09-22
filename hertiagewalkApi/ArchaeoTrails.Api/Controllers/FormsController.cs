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
        private readonly IExperienceTemplateRepository _experienceTemplateRepository;
        private readonly IPaymentService _paymentService;
        private readonly IQrCodeService _qrCodeService;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly IExperienceEventPublisher _experienceEvents;

        public FormsController(
            IFormTemplateRepository formTemplateRepository,
            IFormSubmissionRepository formSubmissionRepository,
            IExperienceTemplateRepository experienceTemplateRepository,
            IPaymentService paymentService,
            IQrCodeService qrCodeService,
            IEmailService emailService,
            IConfiguration configuration,
            IExperienceEventPublisher experienceEvents)
        {
            _formTemplateRepository = formTemplateRepository;
            _formSubmissionRepository = formSubmissionRepository;
            _experienceTemplateRepository = experienceTemplateRepository;
            _paymentService = paymentService;
            _qrCodeService = qrCodeService;
            _emailService = emailService;
            _configuration = configuration;
            _experienceEvents = experienceEvents;
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

            if (request.RequiresPayment && request.Price <= 0)
            {
                return BadRequest(new { status = "error", message = "A paid form needs a price above zero." });
            }

            var slug = Slugify(request.Title) + "-" + Guid.NewGuid().ToString("N")[..6];

            var template = new FormTemplate
            {
                Title = request.Title,
                Description = request.Description,
                Slug = slug,
                FieldsJson = JsonSerializer.Serialize(request.Fields),
                RequiresPayment = request.RequiresPayment,
                Price = request.RequiresPayment ? request.Price : 0m,
                Currency = request.Currency
            };

            await _formTemplateRepository.CreateAsync(template);

            return Ok(new { status = "success", id = template.Id, slug = template.Slug });
        }

        // GET /api/forms/{id}  (Admin/Employee only) — full field definitions,
        // for editing a form (e.g. the Experience Builder's embedded
        // registration-fields panel loading an already-linked form back in).
        [HttpGet("{id:guid}")]
        [Authorize(Roles = Roles.StaffPolicy)]
        public async Task<IActionResult> GetFormById(Guid id)
        {
            var template = await _formTemplateRepository.GetByIdAsync(id);
            if (template is null) return NotFound();

            return Ok(new FormDto
            {
                Id = template.Id,
                Title = template.Title,
                Description = template.Description,
                Slug = template.Slug,
                Fields = ParseFields(template),
                RequiresPayment = template.RequiresPayment,
                Price = template.Price,
                Currency = template.Currency
            });
        }

        // PUT /api/forms/{id}  (Admin/Employee only) — replaces title/description/
        // fields/payment on an existing form. Same shape and validation as Create;
        // the slug never changes so any already-shared link/QR keeps working.
        [HttpPut("{id:guid}")]
        [Authorize(Roles = Roles.StaffPolicy)]
        public async Task<IActionResult> UpdateForm(Guid id, [FromBody] CreateFormTemplateRequest request)
        {
            var template = await _formTemplateRepository.GetByIdAsync(id);
            if (template is null) return NotFound();

            if (string.IsNullOrWhiteSpace(request.Title) || request.Fields.Count == 0)
            {
                return BadRequest(new { status = "error", message = "Title and at least one field are required." });
            }
            if (request.RequiresPayment && request.Price <= 0)
            {
                return BadRequest(new { status = "error", message = "A paid form needs a price above zero." });
            }

            template.Title = request.Title;
            template.Description = request.Description;
            template.FieldsJson = JsonSerializer.Serialize(request.Fields);
            template.RequiresPayment = request.RequiresPayment;
            template.Price = request.RequiresPayment ? request.Price : 0m;
            template.Currency = request.Currency;

            await _formTemplateRepository.UpdateAsync(template);

            return Ok(new { status = "success", id = template.Id, slug = template.Slug });
        }

        // GET /api/forms/{slug}  (public)
        [HttpGet("{slug}")]
        public async Task<IActionResult> GetForm(string slug)
        {
            var template = await _formTemplateRepository.GetBySlugAsync(slug);
            if (template is null || !template.IsActive) return NotFound();

            var dto = new FormDto
            {
                Id = template.Id,
                Title = template.Title,
                Description = template.Description,
                Slug = template.Slug,
                Fields = ParseFields(template),
                RequiresPayment = template.RequiresPayment,
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
            if (template is null || !template.IsActive) return NotFound();

            if (!template.RequiresPayment)
            {
                return BadRequest(new { status = "error", message = "This form is free — submit it directly." });
            }

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
            if (template is null || !template.IsActive) return NotFound();

            // Required fields are enforced here as well as in the browser — on a
            // free form there is no payment step standing between a scripted
            // POST and a saved row.
            var missing = FindMissingRequiredFields(template, request.FormData);
            if (missing.Count > 0)
            {
                return BadRequest(new SubmitFormResponse
                {
                    Success = false,
                    Message = $"Please fill in: {string.Join(", ", missing)}."
                });
            }

            // A form linked to an Experience: a Private booking must name one of
            // that experience's still-free Private dates, and takes it off the
            // public list once saved. Checked before payment verification so a
            // taken date is rejected up front.
            var linkedExperience = await _experienceTemplateRepository.GetByLinkedFormTemplateIdAsync(template.Id);
            DateTime? bookedSlot = null;
            if (linkedExperience is not null)
            {
                var (slot, slotError) = await ResolvePrivateSlotAsync(linkedExperience, template.Id, request.Slot);
                if (slotError is not null)
                {
                    return BadRequest(new SubmitFormResponse { Success = false, Message = slotError });
                }
                bookedSlot = slot;
            }

            if (template.RequiresPayment)
            {
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
            }

            var submission = new FormSubmission
            {
                FormTemplateId = template.Id,
                DataJson = JsonSerializer.Serialize(request.FormData),
                SubmitterName = request.SubmitterName,
                SubmitterEmail = request.SubmitterEmail,
                BookedSlot = bookedSlot,
                // A free form never records money, whatever the client sent.
                AmountPaid = template.RequiresPayment ? template.Price : 0m,
                Currency = template.Currency,
                RazorpayOrderId = template.RequiresPayment ? request.RazorpayOrderId : string.Empty,
                RazorpayPaymentId = template.RequiresPayment ? request.RazorpayPaymentId : null,
                Status = template.RequiresPayment ? SubmissionStatus.Paid : SubmissionStatus.Submitted
            };

            // Every form's default path, unchanged. Only a form linked to a
            // capacity-limited Experience (Experiences module) takes the
            // concurrency-safe branch below — see IFormSubmissionRepository.
            if (linkedExperience is not null && linkedExperience.CapacityTotal.HasValue)
            {
                var reserved = await _formSubmissionRepository.TryCreateWithCapacityAsync(submission, linkedExperience.Id);
                if (reserved is null)
                {
                    return BadRequest(new SubmitFormResponse
                    {
                        Success = false,
                        Message = "Sorry, this is fully booked."
                    });
                }

                // The atomic decrement already happened inside
                // TryCreateWithCapacityAsync (see EfFormSubmissionRepository)
                // — compute the new counts from the in-memory entity rather
                // than re-reading SQL just to report them.
                var remaining = linkedExperience.CapacityRemaining - 1;
                var booked = linkedExperience.CapacityTotal - remaining;
                await _experienceEvents.BookingUpdatedAsync(linkedExperience.Id, booked ?? 0, remaining);
            }
            else
            {
                await _formSubmissionRepository.CreateAsync(submission);
            }

            // Fire-and-forget, same pattern as ContactController — the caller
            // shouldn't wait on SMTP, and a failed email must not undo the
            // already-saved, already-paid submission.
            _ = Task.Run(() => _emailService.SendFormSubmissionOwnerEmailAsync(template, submission));

            // The email field is a normal block now, so the form author is free
            // to remove it. The owner still gets their copy; there is simply
            // nobody to send the submitter's confirmation to.
            if (!string.IsNullOrWhiteSpace(submission.SubmitterEmail))
            {
                _ = Task.Run(() => _emailService.SendFormSubmissionConfirmationEmailAsync(template, submission));
            }

            return Ok(new SubmitFormResponse { Success = true, SubmissionId = submission.Id });
        }

        /// <summary>
        /// Validates the submitted Private date against the experience. Group
        /// bookings (no slot) pass through as (null, null); a Private-only
        /// experience with no slot is an error. Not atomic against two people
        /// taking the same last date at the same instant.
        /// </summary>
        private async Task<(DateTime? Slot, string? Error)> ResolvePrivateSlotAsync(
            ExperienceTemplate experience, Guid formTemplateId, string? rawSlot)
        {
            if (string.IsNullOrWhiteSpace(rawSlot))
            {
                return experience.RegistrationType == RegistrationType.Private
                    ? (null, "Please choose a date for your private booking.")
                    : (null, null);
            }

            if (experience.RegistrationType == RegistrationType.Group)
            {
                return (null, "Private bookings aren't offered for this experience.");
            }
            if (!DateTime.TryParse(rawSlot, System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal,
                    out var parsed))
            {
                return (null, "That date isn't valid.");
            }

            var booked = await _formSubmissionRepository.GetBookedSlotsAsync(formTemplateId);
            var available = ExperiencesController.AvailablePrivateSlots(experience.PrivateSlotsJson, booked);
            if (!available.Any(d => d.Date == parsed.Date))
            {
                return (null, "Sorry, that date is no longer available. Please choose another.");
            }
            return (parsed.Date, null);
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
                    RequiresPayment = template.RequiresPayment,
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

        private static List<FormFieldDefinition> ParseFields(FormTemplate template) =>
            JsonSerializer.Deserialize<List<FormFieldDefinition>>(template.FieldsJson) ?? new();

        /// <summary>
        /// Labels of the required, answer-collecting fields the submitter left blank.
        /// Display-only blocks (heading/paragraph/divider) collect nothing, so they
        /// are never required.
        ///
        /// A "group" block holds no answer of its own — its sub-fields do, under
        /// dotted keys ("address.pincode") — so it is checked by descending into
        /// its children rather than by looking for its own name.
        /// </summary>
        private static List<string> FindMissingRequiredFields(
            FormTemplate template, Dictionary<string, string> formData)
        {
            var missing = new List<string>();

            foreach (var field in ParseFields(template))
            {
                if (IsDisplayOnly(field.Type)) continue;

                if (field.Type == "group")
                {
                    foreach (var child in field.Children ?? new List<FormFieldDefinition>())
                    {
                        if (!child.Required) continue;
                        CheckOne(child, $"{field.Name}.{child.Name}", $"{field.Label} — {child.Label}");
                    }
                    continue;
                }

                if (!field.Required) continue;
                CheckOne(field, field.Name, field.Label);
            }

            return missing;

            void CheckOne(FormFieldDefinition field, string key, string label)
            {
                if (!formData.TryGetValue(key, out var value) || string.IsNullOrWhiteSpace(value))
                {
                    missing.Add(string.IsNullOrWhiteSpace(label) ? key : label);
                }
            }
        }

        private static bool IsDisplayOnly(string type) =>
            type is "heading" or "paragraph" or "divider";

        private static string Slugify(string title) =>
            new string(title.ToLowerInvariant().Select(c => char.IsLetterOrDigit(c) ? c : '-').ToArray())
                .Trim('-');
    }
}
