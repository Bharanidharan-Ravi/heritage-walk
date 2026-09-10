using System.Text.RegularExpressions;

namespace ArchaeoTrails.Domain.Constants
{
    /// <summary>
    /// The shape of an admin-panel login handle. Usernames are entered
    /// manually by an Admin and are deliberately independent of the account's
    /// email address, so they need their own rules — kept here (rather than in
    /// the service) so the seeder, the create path and the rename path all
    /// agree, and so the message shown to the Admin is written once.
    ///
    /// Keep <see cref="Pattern"/> a subset of the AllowedUserNameCharacters
    /// configured on Identity in Program.cs.
    /// </summary>
    public static class UserNameRules
    {
        public const int MinLength = 3;
        public const int MaxLength = 32;

        public const string Pattern = @"^[A-Za-z0-9._-]{3,32}$";

        public const string Description =
            "Username must be 3–32 characters and use only letters, digits, dot, underscore or hyphen.";

        private static readonly Regex Validator =
            new(Pattern, RegexOptions.Compiled | RegexOptions.CultureInvariant);

        public static bool IsValid(string? userName) =>
            !string.IsNullOrWhiteSpace(userName) && Validator.IsMatch(userName);
    }
}
