using ArchaeoTrails.Application.Features.Bookings;
using ArchaeoTrails.Application.Features.Contact;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Domain.Entities;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading.Tasks;

namespace ArchaeoTrails.Infrastructure.Services
{
    public class ZohoEmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public ZohoEmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<bool> SendContactEmailAsync(ContactRequest request)
        {
            try
            {
                // Read settings from appsettings.json
                var smtpServer = _configuration["EmailSettings:SmtpServer"];
                var smtpPort = int.Parse(_configuration["EmailSettings:SmtpPort"]!);
                var senderEmail = _configuration["EmailSettings:SenderEmail"];
                var senderName = _configuration["EmailSettings:SenderName"];
                var appPassword = _configuration["EmailSettings:AppPassword"];

                var message = new MailMessage
                {
                    From = new MailAddress(senderEmail!, senderName),
                    Subject = $"New Heritage Trail Inquiry from {request.UserName}",
                    Body = $"Name: {request.UserName}\nEmail: {request.UserEmail}\n\nMessage:\n{request.Message}",
                    IsBodyHtml = false
                };

                // Send to yourself
                message.To.Add(senderEmail!);
                // Reply to the user
                message.ReplyToList.Add(new MailAddress(request.UserEmail));

                using var client = new SmtpClient(smtpServer, smtpPort);
                client.EnableSsl = true;
                client.Credentials = new NetworkCredential(senderEmail, appPassword);

                await client.SendMailAsync(message);
                return true;
            }
            catch
            {
                // In a production app, you would log the exception here
                return false;
            }
        }

        // TODO(form-generator): dry stub — sends a plain-text placeholder mail
        // reusing the same SMTP settings as SendContactEmailAsync. Replace the
        // body with a real HTML template (form title, submitted answers,
        // amount paid) once the feature goes live.
        public async Task<bool> SendFormSubmissionOwnerEmailAsync(FormTemplate form, FormSubmission submission)
        {
            try
            {
                var senderEmail = _configuration["EmailSettings:SenderEmail"];
                var senderName = _configuration["EmailSettings:SenderName"];
                var appPassword = _configuration["EmailSettings:AppPassword"];
                var smtpServer = _configuration["EmailSettings:SmtpServer"];
                var smtpPort = int.Parse(_configuration["EmailSettings:SmtpPort"]!);

                var message = new MailMessage
                {
                    From = new MailAddress(senderEmail!, senderName),
                    Subject = form.RequiresPayment
                        ? $"New paid submission: {form.Title}"
                        : $"New submission: {form.Title}",
                    Body = $"Form: {form.Title}\nSubmitter: {submission.SubmitterName} <{submission.SubmitterEmail}>\n" +
                           (form.RequiresPayment
                               ? $"Amount paid: {submission.AmountPaid} {submission.Currency}\n"
                               : "This is a free form — no payment was taken.\n") +
                           $"Data: {submission.DataJson}",
                    IsBodyHtml = false
                };
                message.To.Add(senderEmail!);

                using var client = new SmtpClient(smtpServer, smtpPort) { EnableSsl = true };
                client.Credentials = new NetworkCredential(senderEmail, appPassword);
                await client.SendMailAsync(message);
                return true;
            }
            catch
            {
                // TODO(form-generator): log instead of swallowing — a failed
                // owner notification after a successful payment must not be silent.
                return false;
            }
        }

        public async Task<bool> SendBookingConfirmationEmailAsync(BookingConfirmationEmail booking)
        {
            if (string.IsNullOrWhiteSpace(booking.SubmitterEmail))
            {
                return false;
            }

            var firstName = booking.SubmitterName?.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            var html = new StringBuilder()
                .Append("<div style=\"font-family:Georgia,serif;max-width:560px;margin:auto;color:#1F2933\">")
                .Append("<h2 style=\"color:#8A6A35;margin-bottom:4px\">Booking Confirmed</h2>")
                .Append($"<p>Hi {Html(firstName ?? "there")},</p>")
                .Append($"<p>Thank you for booking with Archaeo Trails — your payment was received and your spot is confirmed.</p>")
                .Append("<p style=\"font-size:13px;color:#6B7280;margin:20px 0 4px\">YOUR BOOKING ID</p>")
                .Append($"<p style=\"font-size:26px;font-family:monospace;font-weight:bold;color:#8A6A35;margin:0 0 16px\">{Html(booking.BookingRef)}</p>")
                .Append(BookingTable(booking))
                .Append("<p>Please keep this booking ID handy — show it on the day of the walk.</p>");
            if (!string.IsNullOrWhiteSpace(booking.BookingUrl))
            {
                html.Append($"<p><a href=\"{Html(booking.BookingUrl)}\" style=\"color:#8A6A35\">View your booking</a></p>");
            }
            html.Append($"<p>— {Html(_configuration["EmailSettings:SenderName"])}</p></div>");

            return await SendHtmlAsync(booking.SubmitterEmail, $"Booking confirmed: {booking.ExperienceTitle} ({booking.BookingRef})", html.ToString());
        }

        public async Task<bool> SendBookingOwnerEmailAsync(BookingConfirmationEmail booking)
        {
            var html = new StringBuilder()
                .Append("<div style=\"font-family:Arial,sans-serif;max-width:640px\">")
                .Append($"<h3>New paid booking {Html(booking.BookingRef)}</h3>")
                .Append(BookingTable(booking))
                .Append("<table cellpadding=\"4\" style=\"border-collapse:collapse;font-size:14px;margin-top:12px\">")
                .Append(Row("Name", booking.SubmitterName))
                .Append(Row("Email", booking.SubmitterEmail))
                .Append(Row("Phone", booking.SubmitterPhone))
                .Append("</table>");
            if (!string.IsNullOrWhiteSpace(booking.DataJson))
            {
                html.Append($"<p style=\"font-size:12px;color:#6B7280\">Form answers: {Html(booking.DataJson)}</p>");
            }
            html.Append("</div>");

            return await SendHtmlAsync(_configuration["EmailSettings:SenderEmail"]!,
                $"New booking {booking.BookingRef}: {booking.ExperienceTitle} × {booking.Quantity}", html.ToString(),
                replyTo: booking.SubmitterEmail);
        }

        private static string BookingTable(BookingConfirmationEmail b) =>
            "<table cellpadding=\"6\" style=\"border-collapse:collapse;font-size:15px;width:100%\">" +
            Row("Experience", b.ExperienceTitle) +
            (b.ExperienceDate.HasValue ? Row("Date", b.ExperienceDate.Value.ToString("dddd, d MMMM yyyy")) : "") +
            Row("Booking type", b.RegistrationType) +
            Row("Guests", b.Quantity.ToString()) +
            Row("Amount paid", $"{b.Currency} {b.Amount:0.##}") +
            "</table>";

        private static string Row(string label, string? value) =>
            string.IsNullOrWhiteSpace(value) ? "" :
            $"<tr><td style=\"color:#6B7280;border-bottom:1px solid #E5E7EB\">{label}</td>" +
            $"<td style=\"border-bottom:1px solid #E5E7EB\"><b>{Html(value)}</b></td></tr>";

        private static string Html(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);

        private async Task<bool> SendHtmlAsync(string to, string subject, string html, string? replyTo = null)
        {
            try
            {
                var senderEmail = _configuration["EmailSettings:SenderEmail"];
                var senderName = _configuration["EmailSettings:SenderName"];
                var appPassword = _configuration["EmailSettings:AppPassword"];
                var smtpServer = _configuration["EmailSettings:SmtpServer"];
                var smtpPort = int.Parse(_configuration["EmailSettings:SmtpPort"]!);

                using var message = new MailMessage
                {
                    From = new MailAddress(senderEmail!, senderName),
                    Subject = subject,
                    Body = html,
                    IsBodyHtml = true
                };
                message.To.Add(to);
                if (!string.IsNullOrWhiteSpace(replyTo))
                {
                    message.ReplyToList.Add(new MailAddress(replyTo));
                }

                using var client = new SmtpClient(smtpServer, smtpPort) { EnableSsl = true };
                client.Credentials = new NetworkCredential(senderEmail, appPassword);
                await client.SendMailAsync(message);
                return true;
            }
            catch
            {
                return false;
            }
        }

        // TODO(form-generator): dry stub — see note on SendFormSubmissionOwnerEmailAsync above.
        public async Task<bool> SendFormSubmissionConfirmationEmailAsync(FormTemplate form, FormSubmission submission)
        {
            if (string.IsNullOrWhiteSpace(submission.SubmitterEmail))
            {
                return false;
            }

            try
            {
                var senderEmail = _configuration["EmailSettings:SenderEmail"];
                var senderName = _configuration["EmailSettings:SenderName"];
                var appPassword = _configuration["EmailSettings:AppPassword"];
                var smtpServer = _configuration["EmailSettings:SmtpServer"];
                var smtpPort = int.Parse(_configuration["EmailSettings:SmtpPort"]!);

                var message = new MailMessage
                {
                    From = new MailAddress(senderEmail!, senderName),
                    Subject = $"You're confirmed: {form.Title}",
                    Body = $"Hi {submission.SubmitterName},\n\n" +
                           (form.RequiresPayment
                               ? $"Thanks — your payment of {submission.AmountPaid} {submission.Currency} for " +
                                 $"\"{form.Title}\" was received and your form has been submitted successfully."
                               : $"Thanks — your response to \"{form.Title}\" has been submitted successfully.") +
                           $"\n\n— {senderName}",
                    IsBodyHtml = false
                };
                message.To.Add(submission.SubmitterEmail);

                using var client = new SmtpClient(smtpServer, smtpPort) { EnableSsl = true };
                client.Credentials = new NetworkCredential(senderEmail, appPassword);
                await client.SendMailAsync(message);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
