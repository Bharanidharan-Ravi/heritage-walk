using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using ArchaeoTrails.Application.Features.Forms;

namespace ArchaeoTrails.Application.Services
{
    /// <summary>
    /// Pure booking/form checks shared by FormsController, ExperiencesController
    /// and BookingService, so a rule can't drift between the old /submit flow
    /// and the Pay Now booking flow.
    /// </summary>
    public static class BookingRules
    {
        /// <summary>
        /// The experience's Private dates minus the ones already taken — a date
        /// can be booked once. Duplicate dates (e.g. a morning and an evening
        /// batch) each take one booking.
        /// </summary>
        public static List<DateTime> AvailablePrivateSlots(string privateSlotsJson, IEnumerable<DateTime> booked)
        {
            var all = (JsonSerializer.Deserialize<List<DateTime>>(privateSlotsJson) ?? new()).OrderBy(d => d).ToList();
            foreach (var taken in booked)
            {
                var i = all.FindIndex(d => d.Date == taken.Date);
                if (i >= 0) all.RemoveAt(i);
            }
            return all;
        }

        /// <summary>
        /// Labels of the required, answer-collecting fields the submitter left blank.
        /// Display-only blocks (heading/paragraph/divider) collect nothing, so they
        /// are never required.
        ///
        /// A "group" block holds no answer of its own — its sub-fields do, under
        /// dotted keys ("address.pincode") — so it is checked by descending into
        /// its children rather than by looking for its own name.
        /// </summary>
        public static List<string> FindMissingRequiredFields(
            IEnumerable<FormFieldDefinition> fields, Dictionary<string, string> formData)
        {
            var missing = new List<string>();

            foreach (var field in fields)
            {
                if (IsDisplayOnly(field.Type)) continue;

                if (field.Type == "group")
                {
                    foreach (var child in field.Children ?? new List<FormFieldDefinition>())
                    {
                        if (!child.Required) continue;
                        CheckOne($"{field.Name}.{child.Name}", $"{field.Label} — {child.Label}");
                    }
                    continue;
                }

                if (!field.Required) continue;
                CheckOne(field.Name, field.Label);
            }

            return missing;

            void CheckOne(string key, string label)
            {
                if (!formData.TryGetValue(key, out var value) || string.IsNullOrWhiteSpace(value))
                {
                    missing.Add(string.IsNullOrWhiteSpace(label) ? key : label);
                }
            }
        }

        /// <summary>
        /// A 10-digit Indian mobile number from whatever the visitor typed
        /// ("+91 98765 43210", "098765-43210" …), or null if it isn't one.
        /// </summary>
        public static string? NormalizeIndianMobile(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;
            var digits = new string(raw.Where(char.IsDigit).ToArray());
            if (digits.Length == 12 && digits.StartsWith("91")) digits = digits[2..];
            else if (digits.Length == 11 && digits.StartsWith('0')) digits = digits[1..];
            return digits.Length == 10 && digits[0] >= '6' ? digits : null;
        }

        private static bool IsDisplayOnly(string type) =>
            type is "heading" or "paragraph" or "divider";
    }
}
