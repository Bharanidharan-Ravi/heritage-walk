// src/Component/Config/form.config.jsx
// Config for the pay-to-submit Form Generator page (dry scaffold).
// See docs/form-generator/MASTER_PROMPT.md for the full feature spec.

export const formConfig = {
  theme: {
    sectionBackground: "#0F161E",
    textColor: "#F4F1EA",
    accentColor: "#C19D60",
    inputBackground: "rgba(255, 255, 255, 0.05)",
    inputBorder: "rgba(193, 157, 96, 0.3)",
    buttonBackground: "#C19D60",
    buttonText: "#0F161E",
  },

  content: {
    loadingMessage: "Loading form...",
    notFoundMessage: "This form is no longer available.",

    // Paid forms (requiresPayment === true)
    paidNotice: (amount, currency) => `${currency} ${amount} — payment required to submit.`,
    payButtonLabel: (amount, currency) => `Pay ${currency} ${amount} & Submit`,
    payingMessage: "Processing payment...",
    successMessage: "Payment received — your form has been submitted!",
    paymentFailedMessage: "Payment could not be verified. Please try again.",

    // Free forms (requiresPayment === false)
    freeNotice: "No payment needed — just fill it in and send.",
    submitButtonLabel: "Submit",
    submittingMessage: "Submitting...",
    freeSuccessMessage: "Thank you — your response has been submitted!",

    genericErrorMessage: "Something went wrong. Please try again.",
  },
};
