using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using ArchaeoTrails.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace ArchaeoTrails.Application.Tests
{
    public class CashfreeWebhookTests
    {
        private const string Secret = "test-secret-key";
        private const string Timestamp = "1746427759733";
        private const string Body =
            "{\"data\":{\"order\":{\"order_id\":\"AT-7K3Q9M\",\"order_amount\":1500.00}," +
            "\"payment\":{\"cf_payment_id\":5114910349718,\"payment_status\":\"SUCCESS\"}}," +
            "\"event_time\":\"2026-10-06T12:00:00+05:30\",\"type\":\"PAYMENT_SUCCESS_WEBHOOK\"}";

        private static CashfreePaymentGateway Gateway(string? secret = Secret)
        {
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?> { ["Cashfree:SecretKey"] = secret })
                .Build();
            return new CashfreePaymentGateway(new HttpClient(), config, NullLogger<CashfreePaymentGateway>.Instance);
        }

        private static string Sign(string timestamp, string body, string secret = Secret)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            return Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(timestamp + body)));
        }

        [Fact]
        public void ValidSignature_ReadsOrderAndPayment()
        {
            var e = Gateway().ParseWebhook(Body, Timestamp, Sign(Timestamp, Body));

            Assert.True(e.SignatureValid);
            Assert.Equal("PAYMENT_SUCCESS_WEBHOOK", e.EventType);
            Assert.Equal("AT-7K3Q9M", e.OrderId);
            Assert.Equal("5114910349718", e.PaymentId);
        }

        [Fact]
        public void TamperedBody_IsRejected()
        {
            var signature = Sign(Timestamp, Body);
            var tampered = Body.Replace("1500.00", "1.00");

            Assert.False(Gateway().ParseWebhook(tampered, Timestamp, signature).SignatureValid);
        }

        [Fact]
        public void WrongTimestamp_IsRejected()
        {
            Assert.False(Gateway().ParseWebhook(Body, "1746427759999", Sign(Timestamp, Body)).SignatureValid);
        }

        [Fact]
        public void SignedWithAnotherKey_IsRejected()
        {
            Assert.False(Gateway().ParseWebhook(Body, Timestamp, Sign(Timestamp, Body, "someone-else")).SignatureValid);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("REPLACE_ME")]
        public void UnconfiguredSecret_RejectsEverything(string? secret)
        {
            // Even a "signature" made with the placeholder itself must not pass.
            var e = Gateway(secret).ParseWebhook(Body, Timestamp, Sign(Timestamp, Body, "REPLACE_ME"));

            Assert.False(e.SignatureValid);
        }

        [Theory]
        [InlineData("Cashfree:Sandbox:SecretKey")]
        [InlineData("Cashfree:Production:SecretKey")]
        public void EitherEnvironmentsSecret_Verifies(string key)
        {
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Cashfree:Sandbox:SecretKey"] = "sandbox-secret",
                    ["Cashfree:Production:SecretKey"] = "production-secret"
                })
                .Build();
            var gateway = new CashfreePaymentGateway(new HttpClient(), config, NullLogger<CashfreePaymentGateway>.Instance);
            var secret = config[key]!;

            Assert.True(gateway.ParseWebhook(Body, Timestamp, Sign(Timestamp, Body, secret)).SignatureValid);
            Assert.False(gateway.ParseWebhook(Body, Timestamp, Sign(Timestamp, Body, "someone-else")).SignatureValid);
        }

        [Fact]
        public void MissingHeaders_AreRejected()
        {
            Assert.False(Gateway().ParseWebhook(Body, "", "").SignatureValid);
        }
    }
}
