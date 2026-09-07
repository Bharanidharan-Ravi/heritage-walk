namespace ArchaeoTrails.Domain.Enums
{
    // TODO(form-generator): PendingPayment rows that never reach Paid/Failed
    // (user closed the tab after paying, before /submit was called) should be
    // reconciled by a Razorpay webhook — see docs/form-generator/MASTER_PROMPT.md §3.
    public enum SubmissionStatus
    {
        PendingPayment = 0,
        Paid = 1,
        Failed = 2
    }
}
