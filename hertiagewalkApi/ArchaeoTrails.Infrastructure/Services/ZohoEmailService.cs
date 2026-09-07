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
                    Subject = $"New paid submission: {form.Title}",
                    Body = $"Form: {form.Title}\nSubmitter: {submission.SubmitterName} <{submission.SubmitterEmail}>\n" +
                           $"Amount paid: {submission.AmountPaid} {submission.Currency}\nData: {submission.DataJson}",
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
                    Body = $"Hi {submission.SubmitterName},\n\nThanks — your payment of " +
                           $"{submission.AmountPaid} {submission.Currency} for \"{form.Title}\" was received " +
                           $"and your form has been submitted successfully.\n\n— {senderName}",
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
