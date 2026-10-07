// src/Component/Config/bookingConfirmation.config.jsx
// Copy + theme for the /booking/:ref page (BookingStatusView.jsx) — where the
// visitor lands after Cashfree checkout. See
// docs/form-generator/CASHFREE_BOOKING_PLAN.md §6.

export const bookingConfirmationConfig = {
  theme: {
    sectionBackground: "#0F161E",
    textColor: "#F4F1EA",
    accentColor: "#C19D60",
    cardBackground: "rgba(255, 255, 255, 0.04)",
    cardBorder: "rgba(193, 157, 96, 0.3)",
    successColor: "#6FCF97",
    errorColor: "#EB7A7A",
    buttonBackground: "#C19D60",
    buttonText: "#0F161E",
  },

  // How long to keep re-checking a pending payment, and how often.
  pollIntervalMs: 2500,
  pollTimeoutMs: 30000,

  content: {
    loadingTitle: "Checking your booking…",
    pendingTitle: "Confirming your payment…",
    pendingText: "This usually takes a few seconds. Please don't close this page.",
    slowTitle: "Still waiting for the bank",
    slowText: "Your payment is taking longer than usual to confirm. Keep your booking ID — we'll update it as soon as the bank confirms.",
    // Still pending and the Cashfree order is open — they likely never finished paying.
    unpaidTitle: "Payment not received yet",
    unpaidText: (holdUntil) =>
      `If you didn't finish paying, you can complete it now — your spot is held until ${holdUntil}. ` +
      "If you already paid, there's no need to pay again; this page will update once the bank confirms.",
    // Countdown shown while an unpaid booking still holds its spot.
    holdTimerLabel: "Spot held for",
    resumePaymentLabel: "Complete payment",
    resumingLabel: "Opening payment…",
    retryErrorText: "We couldn't reopen the payment. Please try again.",
    paymentWindowBlockedText:
      "The payment window couldn't load. Check your internet connection or pause your ad blocker for this site, then try again.",
    paidTitle: "Booking Confirmed",
    paidText: (firstName) =>
      `${firstName ? `Thank you, ${firstName}!` : "Thank you!"} You're all set — a confirmation email with your booking ID is on its way.`,
    failedTitle: "Payment didn't go through",
    failedText: "No money was taken for this booking. You can try booking again.",
    expiredTitle: "This booking hold expired",
    expiredText: "The payment wasn't completed in time, so the spot was released. You can book again.",
    notFoundTitle: "Booking not found",
    notFoundText: "Check the booking ID and try again.",

    bookingIdLabel: "Booking ID",
    copyLabel: "Copy",
    copiedLabel: "Copied",
    experienceLabel: "Experience",
    dateLabel: "Date",
    guestsLabel: "Guests",
    typeLabel: "Booking type",
    amountLabel: "Amount paid",
    totalLabel: "Total",
    backToExperienceLabel: "Back to experience",
    bookAgainLabel: "Book again",
    homeLabel: "Back to home",
  },
};
